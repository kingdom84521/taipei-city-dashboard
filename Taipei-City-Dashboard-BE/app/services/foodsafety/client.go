package foodsafety

// TWCC client — ports the prompt-building + HTTP-calling logic from
// twcc_food_safety_api.js into Go.
//
// We DO NOT reuse the heavier app/services/ai pipeline because:
//   1. This call is a one-shot, non-streaming, non-tool-using prompt — the
//      session machinery in ai_service.go (tool loop, heartbeats, AIChatLog)
//      is overkill.
//   2. The endpoint is public (no user/session id), and we want a tight
//      timeout + clean fallback path on any error.
//
// The TWCC base URL + API key come from global.TWCC (env-driven).

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"TaipeiCityDashboardBE/global"
	"TaipeiCityDashboardBE/logs"
)

const twccChatPath = "/models/conversation"

type twccMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type twccParameters struct {
	MaxNewTokens     int     `json:"max_new_tokens"`
	Temperature      float64 `json:"temperature"`
	TopK             int     `json:"top_k"`
	TopP             float64 `json:"top_p"`
	FrequencePenalty float64 `json:"frequence_penalty"`
}

type twccRequest struct {
	Model      string         `json:"model"`
	Messages   []twccMessage  `json:"messages"`
	Parameters twccParameters `json:"parameters"`
}

type twccChoiceMessage struct {
	Content string `json:"content"`
}

type twccChoice struct {
	Message twccChoiceMessage `json:"message"`
}

type twccResponse struct {
	Choices []twccChoice      `json:"choices"`
	Message twccChoiceMessage `json:"message"`
	Content string            `json:"content"`
}

// buildPrompt mirrors buildPrompt() in twcc_food_safety_api.js. types is
// expected to be already normalized (deduped + sorted) by the caller.
func buildPrompt(types []string, rows []rawRow) (system, user string) {
	n := len(types)
	weight := round4(100.0 / float64(n))

	formula := make([]string, 0, n)
	for _, t := range types {
		nb := NORM_BASE[t]
		formula = append(formula, fmt.Sprintf("- %s（%s）：已正規化為 0~100 分，權重 %.4f 分（佔 %.1f%%）",
			t, nb.Label, weight, 100.0/float64(n)))
	}

	var dataBlock strings.Builder
	for i, r := range rows {
		c, ins, ca, e := normalizeRow(r)
		perType := map[string]float64{
			"課程":   c,
			"檢驗":   ins,
			"癌症篩檢": ca,
			"優良評核": e,
		}
		var total float64
		parts := make([]string, 0, n)
		for _, t := range types {
			v := perType[t]
			parts = append(parts, fmt.Sprintf("%s=%g", t, v))
			total += v
		}
		total = round2(total / float64(n))
		dataBlock.WriteString(fmt.Sprintf("%s%s：%s、total=%g",
			r.City, r.District, strings.Join(parts, "、"), total))
		if i != len(rows)-1 {
			dataBlock.WriteByte('\n')
		}
	}

	system = "你是一個資料排序助手。你只能輸出純 JSON 格式，不能有任何其他文字、說明、markdown、代碼塊符號（不能有 ```）。"

	user = fmt.Sprintf(`以下各行政區的分數已預先計算完畢，請直接依照 total 欄位由高到低排序後輸出純 JSON。

【本次選取維度（共 %d 項，各佔 %.4f 分）】
%s
【計分規則】
- 每個維度已正規化為 0~100 後取平均，total = (%s) ÷ %d
- 直接使用下方 total 值排序，不需重新計算

【各行政區預算分數】
%s

【輸出格式】（key = 城市+區名，value = total 分數）
{"臺北市中正區": 63.88, "新北市板橋區": 40.57, ...}

請按 total 由高到低排序，輸出完整 %d 個行政區，只輸出 JSON。`,
		n, weight, strings.Join(formula, "\n"),
		strings.Join(types, " + "), n,
		dataBlock.String(),
		len(rows))

	return system, user
}

func round4(v float64) float64 {
	return float64(int(v*10000+0.5)) / 10000
}

// callTWCC posts the prompt to TWCC and returns the parsed
// {"city+district": total_score, ...} map.
func callTWCC(ctx context.Context, types []string, rows []rawRow) (map[string]float64, error) {
	if global.TWCC.ApiKey == "" || global.TWCC.ApiKey == "default_your_twcc_api_key_here" {
		return nil, errors.New("TWCC_API_KEY not configured")
	}

	system, user := buildPrompt(types, rows)
	reqBody := twccRequest{
		Model: global.TWCC.Model,
		Messages: []twccMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		Parameters: twccParameters{
			MaxNewTokens:     2000,
			Temperature:      0.1,
			TopK:             50,
			TopP:             1,
			FrequencePenalty: 1,
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := strings.TrimRight(global.TWCC.ApiUrl, "/") + twccChatPath
	timeout := time.Duration(global.TWCC.Timeout) * time.Second
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+global.TWCC.ApiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("twcc http: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("twcc status %d: %s", resp.StatusCode, truncate(string(respBody), 200))
	}

	var parsed twccResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("parse envelope: %w", err)
	}
	raw := firstNonEmpty(
		func() string {
			if len(parsed.Choices) > 0 {
				return parsed.Choices[0].Message.Content
			}
			return ""
		}(),
		parsed.Message.Content,
		parsed.Content,
	)
	if raw == "" {
		return nil, errors.New("twcc returned empty content")
	}

	cleaned := stripCodeFences(raw)
	scores := make(map[string]float64)
	if err := json.Unmarshal([]byte(cleaned), &scores); err != nil {
		return nil, fmt.Errorf("parse scores: %w (raw: %q)", err, truncate(cleaned, 120))
	}
	if len(scores) == 0 {
		return nil, errors.New("twcc parsed scores empty")
	}
	logs.FInfo("foodsafety: TWCC returned %d district scores for types=%v", len(scores), types)
	return scores, nil
}

func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "```json", "")
	s = strings.ReplaceAll(s, "```", "")
	return strings.TrimSpace(s)
}

func firstNonEmpty(parts ...string) string {
	for _, p := range parts {
		if p != "" {
			return p
		}
	}
	return ""
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
