package exporter

import "fmt"

type FrameRenderRequest struct {
	ProjectID string `json:"projectId"`
	OutputKey string `json:"outputKey"`
	FPS       int    `json:"fps"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}

type ExportPlan struct {
	FramePattern  string   `json:"framePattern"`
	OutputPath    string   `json:"outputPath"`
	FFmpegCommand []string `json:"ffmpegCommand"`
}

func BuildExportPlan(req FrameRenderRequest) ExportPlan {
	framePattern := fmt.Sprintf("/tmp/%s/frame-%%06d.png", req.ProjectID)
	outputPath := fmt.Sprintf("/tmp/%s.mp4", req.ProjectID)

	return ExportPlan{
		FramePattern: framePattern,
		OutputPath:   outputPath,
		FFmpegCommand: []string{
			"ffmpeg",
			"-framerate", fmt.Sprintf("%d", req.FPS),
			"-i", framePattern,
			"-pix_fmt", "yuv420p",
			"-vf", fmt.Sprintf("scale=%d:%d", req.Width, req.Height),
			outputPath,
		},
	}
}

