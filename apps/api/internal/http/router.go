package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kawadhiya21/kwikk/apps/api/internal/exporter"
)

func NewRouter() *gin.Engine {
	router := gin.Default()

	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "kwikk-api",
		})
	})

	router.GET("/v1/architecture", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"editor":          "React + TypeScript + Zustand",
			"renderer":        "PixiJS deterministic scene renderer",
			"timeline":        "semantic-first sequencing layer",
			"export_pipeline": "Pixi frame output -> FFmpeg -> MP4",
			"ai_contract": []string{
				"create_hook_scene",
				"increase_pacing",
				"insert_cta",
				"apply_motion_pack",
				"blur_sensitive_region",
			},
		})
	})

	router.POST("/v1/exports/plan", func(ctx *gin.Context) {
		var req exporter.FrameRenderRequest
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		plan := exporter.BuildExportPlan(req)
		ctx.JSON(http.StatusOK, plan)
	})

	return router
}
