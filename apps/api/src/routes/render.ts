import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runInlineExport, type ExportPreset } from "../export-runner.js";
import type { ProjectDocument } from "@kwikk/shared-types";

export const renderRoutes = new Hono();

/**
 * POST /v1/render/export
 *
 * Accepts a full ProjectDocument inline (no DB project ID required).
 * Streams progress as SSE events, then returns the download URL.
 *
 * Body: { project: ProjectDocument, fps?: number, preset?: ExportPreset }
 *
 * SSE event data shapes:
 *   { type: "progress", pct: number }          — 0–100 during render
 *   { type: "done",     url: string }           — relative URL to download the MP4
 *   { type: "error",    message: string }       — something went wrong
 */
renderRoutes.post("/export", async (c) => {
  let body: { project?: ProjectDocument; fps?: number; preset?: string } | null = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!body?.project) return c.json({ error: "project is required" }, 400);

  const project = body.project;
  const fps = Math.min(60, Math.max(1, Number(body.fps ?? 30)));
  const preset = (body.preset ?? "1080p") as ExportPreset;

  return streamSSE(c, async (stream) => {
    try {
      const result = await runInlineExport(project, { fps, preset }, async (pct) => {
        await stream.writeSSE({ data: JSON.stringify({ type: "progress", pct }) });
      });

      await stream.writeSSE({
        data: JSON.stringify({ type: "done", url: `/uploads/${result.relativePath}` }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[render/export] failed:", message);
      try {
        await stream.writeSSE({ data: JSON.stringify({ type: "error", message }) });
      } catch { /* stream may already be closed */ }
    }
  });
});
