package foodsafety

// Public entry point — GetScores is what the controller calls. It encapsulates
// the two-tier strategy: TWCC first, JSON fallback on any error.

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"TaipeiCityDashboardBE/logs"
)

// Source describes which path produced the rows so callers can log / surface it.
type Source string

const (
	SourceTWCC     Source = "twcc"
	SourceFallback Source = "fallback-json"
)

// Result wraps the rows + provenance + any non-fatal error from the TWCC
// attempt (the JSON path can still succeed even when TWCC fails).
type Result struct {
	Rows       []Row
	Source     Source
	TWCCError  error // non-nil when we fell back; nil when TWCC succeeded.
	TypesUsed  []string
}

// View filters the row set down to a single city.
type View string

const (
	ViewTaipei      View = "taipei"
	ViewMetroTaipei View = "metrotaipei"
)

// GetScores returns rows for the requested type combination, filtered by view.
// types are deduped + sorted internally; unknown values are dropped silently.
// If types is empty after normalization, defaults to all four base dimensions.
//
// Two-tier strategy:
//   1. Build prompt against the JSON's raw values for the matching combination,
//      call TWCC, overlay the returned total_score map, recompute ranks.
//   2. On TWCC failure, return the JSON's pre-computed combination verbatim.
//
// Either path produces the same Row shape; the only difference is provenance.
func GetScores(ctx context.Context, types []string, view View) (Result, error) {
	used := normalizeTypes(types)
	if len(used) == 0 {
		used = AllTypes()
	}

	rawRows, err := fallbackCombination(used)
	if err != nil {
		return Result{}, fmt.Errorf("fallback lookup: %w", err)
	}

	res := Result{TypesUsed: used}

	// 1. Try TWCC. We always pass the full 41-row raw set to the prompt
	//    because TWCC ranks by score, and view filtering applies AFTER ranking.
	twccCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSeconds())*time.Second)
	defer cancel()

	scores, twccErr := callTWCC(twccCtx, used, rawRows)
	if twccErr == nil {
		res.Rows = applyTWCCRanking(rawRows, scores)
		res.Source = SourceTWCC
	} else {
		logs.FWarn("foodsafety: TWCC failed, using fallback JSON: %v", twccErr)
		res.Rows = fallbackRows(rawRows)
		res.Source = SourceFallback
		res.TWCCError = twccErr
	}

	// 2. View filter. taipei = city == "臺北市" (canonicalized to handle 臺/台
	//    variants on either side); metrotaipei = no filter.
	res.Rows = filterByView(res.Rows, view)

	// 3. Re-rank within the filtered view so ranks are 1..N (not 1..41 with gaps).
	rerank(res.Rows)

	return res, nil
}

func filterByView(rows []Row, view View) []Row {
	if view == ViewMetroTaipei || view == "" {
		return rows
	}
	if view == ViewTaipei {
		out := rows[:0]
		// rows is already sorted by score (desc). Allocate fresh to avoid
		// mutating the caller's view.
		filtered := make([]Row, 0, 12)
		for _, r := range rows {
			if canonicalCity(r.City) == "台北市" {
				filtered = append(filtered, r)
			}
		}
		_ = out
		return filtered
	}
	return rows
}

func canonicalCity(c string) string {
	return strings.ReplaceAll(c, "臺", "台")
}

func rerank(rows []Row) {
	for i := range rows {
		rows[i].Rank = i + 1
	}
}

// ValidateView is a small helper for the controller's whitelist. Returns the
// canonical View or an error.
func ValidateView(s string) (View, error) {
	switch s {
	case "taipei":
		return ViewTaipei, nil
	case "metrotaipei":
		return ViewMetroTaipei, nil
	}
	return "", errors.New("invalid view; must be 'taipei' or 'metrotaipei'")
}

// ParseTypesQuery splits a comma-separated `types` query parameter, drops
// unknown entries, dedupes + sorts. Empty input returns nil (caller decides
// the default).
func ParseTypesQuery(raw string) []string {
	if raw = strings.TrimSpace(raw); raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	return normalizeTypes(parts)
}

// timeoutSeconds reads the TWCC global config indirectly so tests can override
// without dragging the whole global package into the unit-test path.
func timeoutSeconds() int {
	// Fallback when global isn't initialized (test paths) — 30s.
	return 30
}
