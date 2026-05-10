package exporter

import (
	"strings"
	"testing"
)

func TestBuildExportPlan(t *testing.T) {
	tests := []struct {
		name     string
		req      FrameRenderRequest
		validate func(t *testing.T, plan ExportPlan)
	}{
		{
			name: "basic export plan",
			req: FrameRenderRequest{
				ProjectID: "proj_1",
				OutputKey: "output.mp4",
				FPS:       30,
				Width:     1920,
				Height:    1080,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				if !strings.Contains(plan.FramePattern, "/tmp/proj_1/frame-") {
					t.Errorf("unexpected frame pattern: %s", plan.FramePattern)
				}
				if plan.OutputPath != "/tmp/proj_1.mp4" {
					t.Errorf("unexpected output path: %s", plan.OutputPath)
				}
				if len(plan.FFmpegCommand) == 0 {
					t.Error("ffmpeg command should not be empty")
				}
			},
		},
		{
			name: "frame pattern includes project id",
			req: FrameRenderRequest{
				ProjectID: "my_project_123",
				OutputKey: "output.mp4",
				FPS:       60,
				Width:     3840,
				Height:    2160,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				if !strings.Contains(plan.FramePattern, "my_project_123") {
					t.Errorf("frame pattern should include project id: %s", plan.FramePattern)
				}
				if !strings.Contains(plan.OutputPath, "my_project_123") {
					t.Errorf("output path should include project id: %s", plan.OutputPath)
				}
			},
		},
		{
			name: "ffmpeg command has correct fps",
			req: FrameRenderRequest{
				ProjectID: "proj_fps",
				OutputKey: "output.mp4",
				FPS:       24,
				Width:     1280,
				Height:    720,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				foundFPS := false
				for i, arg := range plan.FFmpegCommand {
					if arg == "-framerate" && i+1 < len(plan.FFmpegCommand) {
						if plan.FFmpegCommand[i+1] == "24" {
							foundFPS = true
						}
					}
				}
				if !foundFPS {
					t.Errorf("ffmpeg command should contain -framerate 24, got: %v", plan.FFmpegCommand)
				}
			},
		},
		{
			name: "ffmpeg command has correct resolution",
			req: FrameRenderRequest{
				ProjectID: "proj_res",
				OutputKey: "output.mp4",
				FPS:       30,
				Width:     1024,
				Height:    576,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				foundScale := false
				for i, arg := range plan.FFmpegCommand {
					if arg == "-vf" && i+1 < len(plan.FFmpegCommand) {
						if strings.Contains(plan.FFmpegCommand[i+1], "1024:576") {
							foundScale = true
						}
					}
				}
				if !foundScale {
					t.Errorf("ffmpeg command should contain scale=1024:576, got: %v", plan.FFmpegCommand)
				}
			},
		},
		{
			name: "ffmpeg command structure",
			req: FrameRenderRequest{
				ProjectID: "proj_struct",
				OutputKey: "output.mp4",
				FPS:       30,
				Width:     1920,
				Height:    1080,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				if plan.FFmpegCommand[0] != "ffmpeg" {
					t.Errorf("first command should be ffmpeg, got: %s", plan.FFmpegCommand[0])
				}

				hasFrameInput := false
				hasPixFormat := false
				hasVFilter := false

				for i, arg := range plan.FFmpegCommand {
					if arg == "-i" && i+1 < len(plan.FFmpegCommand) {
						if strings.Contains(plan.FFmpegCommand[i+1], "frame-") {
							hasFrameInput = true
						}
					}
					if arg == "-pix_fmt" && i+1 < len(plan.FFmpegCommand) {
						if plan.FFmpegCommand[i+1] == "yuv420p" {
							hasPixFormat = true
						}
					}
					if arg == "-vf" {
						hasVFilter = true
					}
				}

				if !hasFrameInput {
					t.Error("ffmpeg command should have frame input")
				}
				if !hasPixFormat {
					t.Error("ffmpeg command should have yuv420p pixel format")
				}
				if !hasVFilter {
					t.Error("ffmpeg command should have video filter")
				}

				lastArg := plan.FFmpegCommand[len(plan.FFmpegCommand)-1]
				if lastArg != plan.OutputPath {
					t.Errorf("last argument should be output path, got: %s", lastArg)
				}
			},
		},
		{
			name: "high fps value",
			req: FrameRenderRequest{
				ProjectID: "proj_highfps",
				OutputKey: "output.mp4",
				FPS:       120,
				Width:     1920,
				Height:    1080,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				foundFPS := false
				for i, arg := range plan.FFmpegCommand {
					if arg == "-framerate" && i+1 < len(plan.FFmpegCommand) {
						if plan.FFmpegCommand[i+1] == "120" {
							foundFPS = true
						}
					}
				}
				if !foundFPS {
					t.Errorf("ffmpeg command should contain -framerate 120")
				}
			},
		},
		{
			name: "4k resolution",
			req: FrameRenderRequest{
				ProjectID: "proj_4k",
				OutputKey: "output.mp4",
				FPS:       30,
				Width:     3840,
				Height:    2160,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				foundScale := false
				for i, arg := range plan.FFmpegCommand {
					if arg == "-vf" && i+1 < len(plan.FFmpegCommand) {
						if strings.Contains(plan.FFmpegCommand[i+1], "3840:2160") {
							foundScale = true
						}
					}
				}
				if !foundScale {
					t.Errorf("ffmpeg command should contain scale=3840:2160")
				}
			},
		},
		{
			name: "vertical video resolution",
			req: FrameRenderRequest{
				ProjectID: "proj_vertical",
				OutputKey: "output.mp4",
				FPS:       30,
				Width:     1080,
				Height:    1920,
			},
			validate: func(t *testing.T, plan ExportPlan) {
				foundScale := false
				for i, arg := range plan.FFmpegCommand {
					if arg == "-vf" && i+1 < len(plan.FFmpegCommand) {
						if strings.Contains(plan.FFmpegCommand[i+1], "1080:1920") {
							foundScale = true
						}
					}
				}
				if !foundScale {
					t.Errorf("ffmpeg command should contain scale=1080:1920")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := BuildExportPlan(tt.req)
			tt.validate(t, plan)
		})
	}
}

func TestFramePatternFormat(t *testing.T) {
	req := FrameRenderRequest{
		ProjectID: "test_project",
		OutputKey: "output.mp4",
		FPS:       30,
		Width:     1920,
		Height:    1080,
	}

	plan := BuildExportPlan(req)

	if !strings.Contains(plan.FramePattern, "%06d") {
		t.Errorf("frame pattern should use %%06d format: %s", plan.FramePattern)
	}

	if !strings.HasSuffix(plan.FramePattern, ".png") {
		t.Errorf("frame pattern should end with .png: %s", plan.FramePattern)
	}
}

func TestOutputPathFormat(t *testing.T) {
	req := FrameRenderRequest{
		ProjectID: "my_proj_123",
		OutputKey: "output.mp4",
		FPS:       30,
		Width:     1920,
		Height:    1080,
	}

	plan := BuildExportPlan(req)

	if !strings.HasPrefix(plan.OutputPath, "/tmp/") {
		t.Errorf("output path should start with /tmp/: %s", plan.OutputPath)
	}

	if !strings.HasSuffix(plan.OutputPath, ".mp4") {
		t.Errorf("output path should end with .mp4: %s", plan.OutputPath)
	}

	if !strings.Contains(plan.OutputPath, "my_proj_123") {
		t.Errorf("output path should contain project id: %s", plan.OutputPath)
	}
}

func BenchmarkBuildExportPlan(b *testing.B) {
	req := FrameRenderRequest{
		ProjectID: "benchmark_proj",
		OutputKey: "output.mp4",
		FPS:       30,
		Width:     1920,
		Height:    1080,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		BuildExportPlan(req)
	}
}
