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
	"errors"
	"net/http"

	"TaipeiCityDashboardBE/app/models"
	"TaipeiCityDashboardBE/logs"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type crossCompareScoresQuery struct {
	View string `form:"view"`
}

/*
GetCrossCompareScores returns the v2.3 district-level cross-compare scores.
GET /api/v1/crosscompare/scores?view=taipei      -> 12 rows (only 臺北市)
GET /api/v1/crosscompare/scores?view=metrotaipei -> 41 rows (臺北市 + 新北市)
Public-readable, like /dashboard GETs.
*/
func GetCrossCompareScores(c *gin.Context) {
	var q crossCompareScoresQuery
	_ = c.ShouldBindQuery(&q)

	if q.View != "taipei" && q.View != "metrotaipei" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid view. Must be 'taipei' or 'metrotaipei'.",
		})
		return
	}

	rows, err := models.GetCrossCompareScores(q.View)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": err.Error()})
			return
		}
		logs.FError("GetCrossCompareScores DB error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": rows})
}
