// Package controllers stores all the controllers for the Gin router.
/*
Developed By Taipei Urban Intelligence Center 2023-2024

// Lead Developer:  Igor Ho (Full Stack Engineer)
// Systems & Auth: Ann Shih (Systems Engineer)
// Data Pipelines:  Iima Yu (Data Scientist)
// Design and UX: Roy Lin (Prev. Consultant), Chu Chen (Researcher)
// Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
*/
package controllers

import (
	"net/http"

	"TaipeiCityDashboardBE/app/services/foodsafety"
	"TaipeiCityDashboardBE/logs"

	"github.com/gin-gonic/gin"
)

type crossCompareScoresQuery struct {
	View  string `form:"view"`
	Types string `form:"types"` // CSV: 課程,檢驗,癌症篩檢,優良評核 (any subset; empty = all four)
}

/*
GetCrossCompareScores returns the v2.3 district-level cross-compare scores.

Strategy: try TWCC LLM with the requested type combination first; on any TWCC
error fall back to the bundled district_combined_scores.json (offline
pre-computed for all 15 type combinations).

GET /api/v1/crosscompare/scores?view=taipei                       -> 12 rows (only 臺北市)
GET /api/v1/crosscompare/scores?view=metrotaipei                  -> 41 rows (臺北市 + 新北市)
GET /api/v1/crosscompare/scores?view=metrotaipei&types=課程,檢驗   -> same shape, score = 課程+檢驗 combined

Public-readable, like /dashboard GETs.
*/
func GetCrossCompareScores(c *gin.Context) {
	var q crossCompareScoresQuery
	_ = c.ShouldBindQuery(&q)

	view, err := foodsafety.ValidateView(q.View)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": err.Error(),
		})
		return
	}

	types := foodsafety.ParseTypesQuery(q.Types)

	res, err := foodsafety.GetScores(c.Request.Context(), types, view)
	if err != nil {
		logs.FError("GetCrossCompareScores service error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   res.Rows,
		"meta": gin.H{
			"source":     string(res.Source),
			"types":      res.TypesUsed,
			"view":       string(view),
			"twcc_error": twccErrorString(res.TWCCError),
		},
	})
}

func twccErrorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
