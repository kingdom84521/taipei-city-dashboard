// Package models stores the models for the postgreSQL databases.
/*
Developed By Taipei Urban Intelligence Center 2023-2024

// Lead Developer:  Igor Ho (Full Stack Engineer)
// Systems & Auth: Ann Shih (Systems Engineer)
// Data Pipelines:  Iima Yu (Data Scientist)
// Design and UX: Roy Lin (Prev. Consultant), Chu Chen (Researcher)
// Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
*/
package models

// CrossCompareDistrictScore is one row of the v2.3 cross-compare district score
// table. Schema is flat (no geometry); FE joins by (city, district) onto the
// existing tp_district / metrotaipei_town Mapbox vector tile features.
type CrossCompareDistrictScore struct {
	City            string  `json:"city"             gorm:"column:city;type:varchar(16);primaryKey;not null"`
	District        string  `json:"district"         gorm:"column:district;type:varchar(32);primaryKey;not null"`
	Rank            int     `json:"rank"             gorm:"column:rank;type:integer;not null"`
	Courses         int     `json:"courses"          gorm:"column:courses;type:integer;not null;default:0"`
	FoodBusinesses  int     `json:"food_businesses"  gorm:"column:food_businesses;type:integer;not null;default:0"`
	Inspected       int     `json:"inspected"        gorm:"column:inspected;type:integer;not null;default:0"`
	NotInspected    int     `json:"not_inspected"    gorm:"column:not_inspected;type:integer;not null;default:0"`
	InspectionRate  float64 `json:"inspection_rate"  gorm:"column:inspection_rate;type:numeric(7,4);not null;default:0"`
	CourseScore     float64 `json:"course_score"     gorm:"column:course_score;type:numeric(6,2);not null;default:0"`
	InspectionScore float64 `json:"inspection_score" gorm:"column:inspection_score;type:numeric(6,2);not null;default:0"`
	TotalScore      float64 `json:"total_score"      gorm:"column:total_score;type:numeric(6,2);not null;default:0"`
}

// TableName pins the table name so plural inflection cannot drift.
func (CrossCompareDistrictScore) TableName() string {
	return "crosscompare_district_score"
}

// GetCrossCompareScores returns rows ordered by rank ASC. view is one of
// "taipei" (filters city = '臺北市', expect 12 rows) or "metrotaipei"
// (no filter, expect 41 rows). Caller is responsible for whitelisting view.
func GetCrossCompareScores(view string) (rows []CrossCompareDistrictScore, err error) {
	q := DBManager.Order("rank ASC")
	if view == "taipei" {
		q = q.Where("city = ?", "臺北市")
	}
	err = q.Find(&rows).Error
	return rows, err
}
