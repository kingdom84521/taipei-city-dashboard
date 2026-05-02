// Package foodsafety computes per-district food-safety scores for the
// /api/v1/crosscompare/scores endpoint. Two-tier strategy:
//   1. Build a prompt over the in-process DISTRICT_DATA + NORM_BASE constants
//      and call TWCC LLM to get a sorted total_score per district.
//   2. On any TWCC error (auth / network / parse / empty), fall back to the
//      bundled district_combined_scores.json which has all 15 type-combinations
//      pre-computed offline.
//
// The bundled JSON also serves as the single source of truth for the raw
// district fields (courses, inspected, food_businesses, cancer_clinics,
// excellent_count, etc.) consumed by the FE popup. Even on the TWCC happy
// path we read those from JSON; TWCC is only authoritative for the ordered
// total_score map.
package foodsafety

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

//go:embed data/district_combined_scores.json
var districtCombinedScoresJSON []byte

// NormBase mirrors NORM_BASE from twcc_food_safety_api.js exactly.
// Values are pre-computed maxima from the offline dataset.
type NormBase struct {
	Max         float64
	Label       string
	Unit        string
	JSONKey     string // matches keys used in district_combined_scores.json
	ColumnFE    string // FE-facing snake_case column for popup breakdown
	ColumnRaw   string // raw JSON row column the score is derived from
}

var NORM_BASE = map[string]NormBase{
	"課程":   {Max: 59, Label: "HACCP + 衛生講習課程總數", Unit: "堂", JSONKey: "課程", ColumnFE: "course_score", ColumnRaw: "courses"},
	"檢驗":   {Max: 16.4557, Label: "食品業者檢驗完成率", Unit: "%", JSONKey: "檢驗", ColumnFE: "inspection_score", ColumnRaw: "inspection_rate"},
	"癌症篩檢": {Max: 403, Label: "六項癌症篩檢院所數總和", Unit: "間", JSONKey: "癌症篩檢", ColumnFE: "cancer_score", ColumnRaw: "cancer_clinics"},
	"優良評核": {Max: 307, Label: "衛生優良評核業者家數", Unit: "家", JSONKey: "優良評核", ColumnFE: "excellent_score", ColumnRaw: "excellent_count"},
}

// AllTypes returns the canonical set of base scoring dimensions.
// Order is alphabetical (sorted) so prompt-building and combination lookup
// are deterministic — ABC == BAC == CBA per the original JS contract.
func AllTypes() []string {
	t := make([]string, 0, len(NORM_BASE))
	for k := range NORM_BASE {
		t = append(t, k)
	}
	sort.Strings(t)
	return t
}

// Row is the FE-facing shape (snake_case JSON tags). Fields beyond the
// original 11-column schema are added for the new 4-dimension data.
// course_score and inspection_score are kept for back-compat with the existing
// FE popup; they are derived from raw values on every read.
type Row struct {
	Rank            int     `json:"rank"`
	City            string  `json:"city"`
	District        string  `json:"district"`
	Courses         int     `json:"courses"`
	FoodBusinesses  int     `json:"food_businesses"`
	Inspected       int     `json:"inspected"`
	NotInspected    int     `json:"not_inspected"`
	InspectionRate  float64 `json:"inspection_rate"`
	CancerClinics   int     `json:"cancer_clinics"`
	ExcellentCount  int     `json:"excellent_count"`
	CourseScore     float64 `json:"course_score"`
	InspectionScore float64 `json:"inspection_score"`
	CancerScore     float64 `json:"cancer_score"`
	ExcellentScore  float64 `json:"excellent_score"`
	TotalScore      float64 `json:"total_score"`
}

// rawRow is the shape inside district_combined_scores.json
// combinations[].all_districts_ranked[].
type rawRow struct {
	Rank           int     `json:"rank"`
	City           string  `json:"city"`
	District       string  `json:"district"`
	Courses        int     `json:"courses"`
	FoodBusinesses int     `json:"food_businesses"`
	Inspected      int     `json:"inspected"`
	NotInspected   int     `json:"not_inspected"`
	InspectionRate float64 `json:"inspection_rate"`
	CancerClinics  int     `json:"cancer_clinics"`
	ExcellentCount int     `json:"excellent_count"`
	TotalScore     float64 `json:"total_score"`
}

type rawCombination struct {
	Type             []string `json:"type"`
	AllDistricts     []rawRow `json:"all_districts_ranked"`
	TaipeiRanked     []rawRow `json:"taipei_ranked"`
	NewTaipeiRanked  []rawRow `json:"new_taipei_ranked"`
}

type rawFile struct {
	Combinations []rawCombination `json:"combinations"`
}

var parsedFallback rawFile

func init() {
	if err := json.Unmarshal(districtCombinedScoresJSON, &parsedFallback); err != nil {
		// Static asset is malformed — boot-time failure (panic). Caught in CI by
		// `go build && ./TaipeiCityDashboardBE` smoke.
		panic(fmt.Errorf("foodsafety: parse embedded district_combined_scores.json: %w", err))
	}
	if len(parsedFallback.Combinations) == 0 {
		panic("foodsafety: embedded district_combined_scores.json has no combinations")
	}
}

// fallbackCombination returns the rawRow slice matching the requested type
// set from the JSON file. Type set comparison is order-independent (matches
// the JS file's `[...new Set(types)].sort()` semantics).
func fallbackCombination(types []string) ([]rawRow, error) {
	want := normalizeTypes(types)
	if len(want) == 0 {
		return nil, fmt.Errorf("foodsafety: empty type set")
	}
	for _, c := range parsedFallback.Combinations {
		if equalSortedTypes(normalizeTypes(c.Type), want) {
			return c.AllDistricts, nil
		}
	}
	return nil, fmt.Errorf("foodsafety: no fallback combination for types %v", types)
}

// normalizeTypes returns a deduplicated, sorted copy of the input.
// Mirrors `[...new Set(selectedTypes)].sort()` from the JS reference.
func normalizeTypes(in []string) []string {
	seen := make(map[string]struct{}, len(in))
	out := make([]string, 0, len(in))
	for _, t := range in {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		if _, dup := seen[t]; dup {
			continue
		}
		if _, ok := NORM_BASE[t]; !ok {
			// Unknown type — silently drop. Caller's whitelist is the gate.
			continue
		}
		seen[t] = struct{}{}
		out = append(out, t)
	}
	sort.Strings(out)
	return out
}

func equalSortedTypes(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// normalizeRow computes the four per-dimension normalized scores (0-100) for
// a row's raw values. Mirrors normalizeDistricts() from twcc_food_safety_api.js.
func normalizeRow(r rawRow) (course, inspection, cancer, excellent float64) {
	course = round2(float64(r.Courses) / NORM_BASE["課程"].Max * 100)
	// 檢驗 in the JS reference is `insp / total * 100 / max * 100` — the JSON
	// already has that intermediate `inspection_rate` field, so we compute
	// `inspection_rate / max * 100` directly.
	inspection = round2(r.InspectionRate / NORM_BASE["檢驗"].Max * 100)
	cancer = round2(float64(r.CancerClinics) / NORM_BASE["癌症篩檢"].Max * 100)
	excellent = round2(float64(r.ExcellentCount) / NORM_BASE["優良評核"].Max * 100)
	return
}

func round2(v float64) float64 {
	// Mirror parseFloat(x.toFixed(2)) from the JS reference.
	return float64(int(v*100+0.5)) / 100
}

// rawToRow projects a JSON row into the FE-facing Row shape, computing the
// four per-dimension scores so the popup has them regardless of which
// combination produced total_score.
func rawToRow(r rawRow) Row {
	c, i, ca, e := normalizeRow(r)
	return Row{
		Rank:            r.Rank,
		City:            r.City,
		District:        r.District,
		Courses:         r.Courses,
		FoodBusinesses:  r.FoodBusinesses,
		Inspected:       r.Inspected,
		NotInspected:    r.NotInspected,
		InspectionRate:  r.InspectionRate,
		CancerClinics:   r.CancerClinics,
		ExcellentCount:  r.ExcellentCount,
		CourseScore:     c,
		InspectionScore: i,
		CancerScore:     ca,
		ExcellentScore:  e,
		TotalScore:      r.TotalScore,
	}
}

// applyTWCCRanking takes a fallback rowset (which carries raw data + a stable
// total_score) and overlays the TWCC-returned `{"臺北市中正區": 63.88, ...}`
// map. Districts not present in twccScores keep their JSON total_score; ranks
// are recomputed across the union by descending TotalScore.
func applyTWCCRanking(rows []rawRow, twccScores map[string]float64) []Row {
	out := make([]Row, 0, len(rows))
	for _, r := range rows {
		row := rawToRow(r)
		if s, ok := twccScores[r.City+r.District]; ok {
			row.TotalScore = s
		}
		out = append(out, row)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].TotalScore > out[j].TotalScore
	})
	for i := range out {
		out[i].Rank = i + 1
	}
	return out
}

// fallbackRows projects the JSON-only rows into the FE-facing Row shape.
// Ranks are taken verbatim from the JSON (offline pre-computed).
func fallbackRows(rows []rawRow) []Row {
	out := make([]Row, 0, len(rows))
	for _, r := range rows {
		out = append(out, rawToRow(r))
	}
	return out
}
