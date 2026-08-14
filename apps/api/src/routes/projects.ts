import { Hono } from "hono";
import { query, queryOne, execute } from "../db.js";
import { applyOperation, ensureProjectDocumentDefaults, type EditorOperation } from "@kwikk/scene-graph";
import type { ProjectDocument } from "@kwikk/shared-types";
import { ensureLocalAsset, requestBaseUrl } from "./assets.js";

type Project = {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  status: string;
  thumbnail: string;
  duration_ms: number;
  meta: unknown;
  user_id: number | null;
};

// EditorOperation["operation"] values — kept in sync with the union in
// @kwikk/scene-graph. applyOperation() silently no-ops on an unrecognized
// operation name (see its `default:` case), so this endpoint must reject
// unknown names itself rather than let a typo look like a successful edit.
const KNOWN_OPERATIONS = new Set([
  "patch_element", "add_element", "delete_element", "duplicate_element",
  "duplicate_scene", "add_animation", "update_animation", "delete_animation",
  "set_element_motion_preset", "patch_text_spans", "add_scene", "delete_scene",
  "clear_scene_elements", "reorder_scenes", "update_scene", "update_scene_duration",
  "set_brand_theme", "crop_image", "set_image_frame", "toggle_element_lock",
  "toggle_element_visibility", "set_element_timing", "add_subtitle", "set_video_trim",
  "set_video_playback_rate", "set_scene_transition", "set_scene_sfx",
  "add_asset", "delete_asset", "update_asset_metadata", "add_audio_track",
  "delete_audio_track", "update_audio_track", "set_text_curve", "apply_scene_motion_preset",
  "add_composition", "delete_composition", "update_composition", "apply_temporal_design",
  "apply_cinematic_palette", "apply_font_system", "set_scene_rhythm",
]);

export const projectRoutes = new Hono();

/**
 * Rewrites external image/video URLs (e.g. Pixabay CDN links) an operation is about to write
 * into content.src/fillImageSrc or scene background.imageSrc into local /uploads/ URLs before
 * applyOperation() runs — so live edits (not just create_project) get the same "load instantly
 * from this server" treatment as AI-generated documents. applyOperation itself stays a pure,
 * synchronous reducer (CLAUDE.md constraint #3); this async preprocessing happens only here,
 * the one place operations enter the system from a network caller.
 */
async function localizeOperationAssets(op: EditorOperation, baseUrl: string): Promise<EditorOperation> {
  switch (op.operation) {
    case "add_element": {
      if (!op.content?.src && !op.content?.fillImageSrc) return op;
      const content = { ...op.content };
      if (content.src) content.src = await ensureLocalAsset(content.src, baseUrl);
      if (content.fillImageSrc) content.fillImageSrc = await ensureLocalAsset(content.fillImageSrc, baseUrl);
      return { ...op, content };
    }
    case "patch_element": {
      if (!op.patch.content?.src && !op.patch.content?.fillImageSrc) return op;
      const content = { ...op.patch.content };
      if (content.src) content.src = await ensureLocalAsset(content.src, baseUrl);
      if (content.fillImageSrc) content.fillImageSrc = await ensureLocalAsset(content.fillImageSrc, baseUrl);
      return { ...op, patch: { ...op.patch, content } };
    }
    case "update_scene": {
      if (!op.patch.background?.imageSrc) return op;
      const imageSrc = await ensureLocalAsset(op.patch.background.imageSrc, baseUrl);
      return { ...op, patch: { ...op.patch, background: { ...op.patch.background, imageSrc } } };
    }
    default:
      return op;
  }
}

projectRoutes.get("/", async (c) => {
  const rows = await query<Project>(
    "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC",
    []
  );
  return c.json(rows);
});

projectRoutes.get("/:id", async (c) => {
  const project = await queryOne<Project>(
    "SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [c.req.param("id")]
  );
  if (!project) return c.json({ message: "not found" }, 404);
  return c.json(project);
});

// Backfills required-but-droppable ElementNode fields (style, animations) before a document
// is written to storage. create_project already normalizes via tool-executor's
// normalizeDocument(), but the plain POST/PUT here are the editor's raw save path — a
// full-document overwrite with no defaulting of its own — so they're the other place a
// document can enter storage and must guarantee the same invariant.
function normalizeMeta(meta: unknown): unknown {
  if (!meta || typeof meta !== "object" || !Array.isArray((meta as { scenes?: unknown }).scenes)) return meta;
  return ensureProjectDocumentDefaults(meta as ProjectDocument);
}

projectRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.title) return c.json({ message: "title is required" }, 400);
  const project = await queryOne<Project>(
    "INSERT INTO projects (title, status, meta, user_id) VALUES ($1, 'draft', $2, $3) RETURNING *",
    [body.title, normalizeMeta(body.meta) ?? {}, body.userId ?? null]
  );
  return c.json(project, 201);
});

projectRoutes.put("/:id", async (c) => {
  const project = await queryOne<Project>(
    "SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [c.req.param("id")]
  );
  if (!project) return c.json({ message: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const meta = body.meta !== undefined ? normalizeMeta(body.meta) : project.meta;
  const updated = await queryOne<Project>(
    `UPDATE projects
     SET title = $1, status = $2, meta = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [
      body.title ?? project.title,
      body.status ?? project.status,
      meta,
      project.id,
    ]
  );
  return c.json(updated);
});

// POST /v1/projects/:id/operations — apply one EditorOperation to the project's
// ProjectDocument and persist the result. The one server-side surface that lets
// MCP (or any external caller) edit a project through the same structured
// pipeline the human editor uses (CLAUDE.md constraint #2).
projectRoutes.post("/:id/operations", async (c) => {
  const project = await queryOne<Project>(
    "SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [c.req.param("id")]
  );
  if (!project) return c.json({ message: "not found" }, 404);

  const body = await c.req.json().catch(() => null) as (EditorOperation & { motionPresetId?: string | number }) | null;
  if (!body || typeof body.operation !== "string") {
    return c.json({ message: "body must be an EditorOperation object" }, 400);
  }
  if (!KNOWN_OPERATIONS.has(body.operation)) {
    return c.json({ message: `unknown operation: ${body.operation}` }, 400);
  }

  let op: EditorOperation = body;

  // set_element_motion_preset now applies a saved catalog preset by id — the DB lookup
  // has to happen here (the API layer) rather than in the pure scene-graph reducer.
  if (body.operation === "set_element_motion_preset" && body.motionPresetId !== undefined) {
    const preset = await queryOne<{ id: number; name: string; animations: unknown }>(
      "SELECT id, name, animations FROM motion_presets WHERE id = $1 AND deleted_at IS NULL",
      [body.motionPresetId]
    );
    if (!preset) return c.json({ message: "motion preset not found" }, 404);

    const animations = (preset.animations as Array<Record<string, unknown>>).map((a, i) => ({
      ...a,
      id: `${preset.id}_${i}_${crypto.randomUUID().slice(0, 8)}`,
    }));

    op = { ...body, motionPreset: preset.name, animations } as EditorOperation;
  }

  op = await localizeOperationAssets(op, requestBaseUrl(c));

  const updatedDocument = applyOperation(project.meta as ProjectDocument, op);
  const updated = await queryOne<Project>(
    `UPDATE projects SET meta = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [updatedDocument, project.id]
  );
  return c.json(updated);
});

projectRoutes.delete("/:id", async (c) => {
  const res = await execute(
    "UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    [c.req.param("id")]
  );
  if (res.rowCount === 0) return c.json({ message: "not found" }, 404);
  return new Response(null, { status: 204 });
});
