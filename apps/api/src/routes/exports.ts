import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { query, queryOne, execute } from "../db.js";
import { runExportJob, type ExportPreset } from "../export-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, "../..");
const EXPORTS_DIR = path.join(API_ROOT, "uploads", "exports");

const DEFAULT_USER_ID = 2;

export const exportRoutes = new Hono();

type ExportJob = {
  id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  status: string;
  progress: number;
  fps: number;
  preset: string;
  output_path: string;
  error: string;
};

/** Attaches an absolute, fetchable downloadUrl (null until the job is done) — derived from the
 *  request's own origin so it's correct behind any host/port/tunnel, not hardcoded. */
function withDownloadUrl<T extends ExportJob>(c: { req: { url: string } }, job: T) {
  const downloadUrl = job.status === "done" ? `${new URL(c.req.url).origin}/v1/exports/${job.id}/download` : null;
  return { ...job, downloadUrl };
}

// ─── POST /v1/exports — trigger a new export job ──────────────────────────────

exportRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    projectId: number;
    fps?: number;
    preset?: ExportPreset;
  } | null;

  if (!body?.projectId) return c.json({ error: "projectId is required" }, 400);

  const project = await queryOne<{ id: number; title: string; meta: unknown }>(
    "SELECT id, title, meta FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [body.projectId],
  );
  if (!project) return c.json({ error: "project not found" }, 404);

  const fps = body.fps ?? 30;
  const preset = body.preset ?? "1080p";

  const job = await queryOne<ExportJob>(
    `INSERT INTO export_jobs (project_id, fps, preset, user_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [body.projectId, fps, preset, DEFAULT_USER_ID],
  );
  if (!job) return c.json({ error: "failed to create job" }, 500);

  const responseBody = withDownloadUrl(c, job);

  void (async () => {
    const projectDoc = project.meta as Parameters<typeof runExportJob>[1];

    const onProgress = async (pct: number) => {
      await execute(
        "UPDATE export_jobs SET progress = $1, updated_at = NOW() WHERE id = $2",
        [pct, job.id],
      );
    };

    try {
      await execute(
        "UPDATE export_jobs SET status = 'rendering', updated_at = NOW() WHERE id = $1",
        [job.id],
      );

      const result = await runExportJob(job.id, projectDoc, { fps, preset }, onProgress);

      await execute(
        "UPDATE export_jobs SET status = 'done', progress = 100, output_path = $1, updated_at = NOW() WHERE id = $2",
        [result.relativePath, job.id],
      );
      console.log(`[export] job ${job.id} done → ${result.outputPath}`);
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[export] job ${job.id} failed: ${msg}`);
      await execute(
        "UPDATE export_jobs SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2",
        [msg, job.id],
      );
    }
  })();

  return c.json(responseBody, 201);
});

// ─── GET /v1/exports — list export jobs ──────────────────────────────────────

exportRoutes.get("/", async (c) => {
  const rows = await query<ExportJob>(
    `SELECT ej.*, p.title AS project_title
     FROM export_jobs ej
     JOIN projects p ON p.id = ej.project_id
     WHERE ej.user_id = $1
     ORDER BY ej.created_at DESC
     LIMIT 50`,
    [DEFAULT_USER_ID]
  );
  return c.json(rows.map((job) => withDownloadUrl(c, job)));
});

// ─── GET /v1/exports/:id — get job status ─────────────────────────────────────

exportRoutes.get("/:id", async (c) => {
  const job = await queryOne<ExportJob & { project_title: string }>(
    `SELECT ej.*, p.title AS project_title
     FROM export_jobs ej
     JOIN projects p ON p.id = ej.project_id
     WHERE ej.id = $1`,
    [c.req.param("id")],
  );
  if (!job) return c.json({ error: "not found" }, 404);
  return c.json(withDownloadUrl(c, job));
});

// ─── GET /v1/exports/:id/download — stream the MP4 ───────────────────────────

exportRoutes.get("/:id/download", async (c) => {
  const job = await queryOne<ExportJob>(
    "SELECT * FROM export_jobs WHERE id = $1",
    [c.req.param("id")],
  );
  if (!job) return c.json({ error: "not found" }, 404);
  if (job.status !== "done") return c.json({ error: "export not ready" }, 400);

  const filePath = path.join(EXPORTS_DIR, path.basename(job.output_path));
  if (!fs.existsSync(filePath)) return c.json({ error: "file missing" }, 404);

  const stat = fs.statSync(filePath);
  c.header("Content-Type", "video/mp4");
  c.header("Content-Length", String(stat.size));
  c.header("Content-Disposition", `attachment; filename="export_${job.id}.mp4"`);

  return stream(c, async (s) => {
    const readStream = fs.createReadStream(filePath);
    for await (const chunk of readStream) {
      await s.write(chunk as Uint8Array);
    }
  });
});
