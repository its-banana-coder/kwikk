import { Hono } from "hono";
import { query, queryOne } from "../db.js";

type ExampleRow = {
  id: string;
  kind: string;
  subcategory: string | null;
  label: string;
  description: string;
  meta: unknown;
  font_pair: unknown;
  data: unknown;
  annotations: unknown;
};

export const exampleRoutes = new Hono();

/**
 * GET /v1/examples
 * Query params: kind, tags (comma-separated), palette, scene_position, content_niche, limit
 */
exampleRoutes.get("/", async (c) => {
  const kind = c.req.query("kind") ?? "";
  const tags = (c.req.query("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const palette = c.req.query("palette") ?? "";
  const scenePosition = c.req.query("scene_position") ?? "";
  const contentNiche = c.req.query("content_niche") ?? "";
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20", 10) || 20, 100);

  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];

  if (kind) {
    params.push(kind);
    conditions.push(`kind = $${params.length}`);
  }

  if (tags.length > 0) {
    params.push(tags);
    conditions.push(`meta->'tags' ?| $${params.length}`);
  }

  if (palette) {
    params.push(palette);
    conditions.push(`meta->>'palette' = $${params.length}`);
  }

  if (scenePosition) {
    params.push(scenePosition);
    conditions.push(`(meta->>'scenePosition' = $${params.length} OR meta->>'scenePosition' = 'any')`);
  }

  if (contentNiche) {
    params.push(contentNiche);
    params.push("general");
    const n1 = params.length - 1;
    const n2 = params.length;
    conditions.push(`(meta->'contentNiches' ? $${n1} OR meta->'contentNiches' ? $${n2})`);
  }

  params.push(limit);
  const rows = await query<ExampleRow>(
    `SELECT id, kind, subcategory, label, description, meta, font_pair, data, annotations
     FROM inspiration_examples
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return c.json({ examples: rows.map(rowToExample) });
});

/** GET /v1/examples/:id */
exampleRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await queryOne<ExampleRow>(
    `SELECT id, kind, subcategory, label, description, meta, font_pair, data, annotations
     FROM inspiration_examples WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(rowToExample(row));
});

/** POST /v1/examples — save an editor-created example */
exampleRoutes.post("/", async (c) => {
  const body = await c.req.json() as {
    id: string;
    kind: string;
    subcategory?: string;
    label: string;
    description?: string;
    meta: unknown;
    fontPair?: unknown;
    data: unknown;
    annotations: unknown;
  };

  if (!body.id || !body.kind || !body.label || !body.data || !body.meta || !body.annotations) {
    return c.json({ error: "Missing required fields: id, kind, label, meta, data, annotations" }, 400);
  }

  if (!["typography", "scene", "video"].includes(body.kind)) {
    return c.json({ error: "kind must be typography, scene, or video" }, 400);
  }

  const row = await queryOne<{ id: string }>(
    `INSERT INTO inspiration_examples (id, kind, subcategory, label, description, meta, font_pair, data, annotations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       kind = EXCLUDED.kind,
       subcategory = EXCLUDED.subcategory,
       label = EXCLUDED.label,
       description = EXCLUDED.description,
       meta = EXCLUDED.meta,
       font_pair = EXCLUDED.font_pair,
       data = EXCLUDED.data,
       annotations = EXCLUDED.annotations,
       updated_at = NOW(),
       deleted_at = NULL
     RETURNING id`,
    [
      body.id,
      body.kind,
      body.subcategory ?? null,
      body.label,
      body.description ?? "",
      JSON.stringify(body.meta),
      body.fontPair ? JSON.stringify(body.fontPair) : null,
      JSON.stringify(body.data),
      JSON.stringify(body.annotations),
    ],
  );

  return c.json({ id: row?.id }, 201);
});

/** DELETE /v1/examples/:id — soft-delete */
exampleRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await queryOne(
    `UPDATE inspiration_examples SET deleted_at = NOW() WHERE id = $1`,
    [id],
  );
  return c.json({ ok: true });
});

function rowToExample(row: ExampleRow) {
  const base = {
    id: row.id,
    kind: row.kind,
    label: row.label,
    description: row.description,
    meta: row.meta,
    annotations: row.annotations,
  };
  if (row.kind === "typography") {
    return { ...base, fontPair: row.font_pair, elements: row.data };
  }
  if (row.kind === "scene") {
    return { ...base, subcategory: row.subcategory, scene: row.data };
  }
  return { ...base, project: row.data };
}
