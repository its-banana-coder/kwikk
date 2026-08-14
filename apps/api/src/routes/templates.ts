import { Hono } from "hono";
import { query, queryOne } from "../db.js";
import { embedAndStore } from "../embed.js";
import { validateProjectDocument } from "@kwikk/scene-graph";
import type { ProjectDocument } from "@kwikk/shared-types";
const DEFAULT_USER_ID = 2;

type TemplateRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail_url: string;
  estimated_duration_ms: number;
  scene_count: number;
  difficulty: string;
  document: unknown;
};

export const templateRoutes = new Hono();

// GET /v1/templates?q=&category=&limit=50
templateRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const category = c.req.query("category") ?? "";
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10) || 50, 100);

  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const n = params.length;
    conditions.push(
      `(lower(name) LIKE $${n} OR lower(description) LIKE $${n} OR lower(category) LIKE $${n}` +
      ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
    );
  }

  if (category && category !== "All") {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  params.push(limit);
  const rows = await query<TemplateRow>(
    `SELECT id, name, description, category, tags, thumbnail_url,
            estimated_duration_ms, scene_count, difficulty, document
     FROM templates
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return c.json(rows);
});

// POST /v1/templates — add a new reusable template. Body: { title, document,
// category?, tags?, difficulty? }. Used by the MCP `add_template` tool so an
// AI client can contribute finished ProjectDocuments to the catalog.
templateRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    title?: string; document?: ProjectDocument; category?: string; tags?: string[]; difficulty?: string;
  } | null;
  if (!body?.title || !body?.document) {
    return c.json({ error: "title and document are required" }, 400);
  }

  const errors = validateProjectDocument(body.document);
  if (errors.length > 0) {
    return c.json({ error: `document validation failed:\n${errors.map((e) => `• ${e}`).join("\n")}` }, 400);
  }

  const sceneCount = body.document.scenes?.length ?? 0;
  const estimatedDurationMs = (body.document.scenes ?? []).reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  const template = await queryOne<TemplateRow & { id: number }>(
    `INSERT INTO templates (name, description, category, tags, document, estimated_duration_ms, scene_count, difficulty)
     VALUES ($1, '', $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      body.title,
      body.category ?? "",
      body.tags ?? [],
      body.document,
      estimatedDurationMs,
      sceneCount,
      body.difficulty ?? "Beginner",
    ]
  );
  if (!template) return c.json({ error: "insert failed" }, 500);

  const embedText = [template.name, template.category, ...(template.tags ?? [])].filter(Boolean).join(" ");
  embedAndStore("templates", template.id, embedText);

  return c.json(template, 201);
});

// POST /v1/templates/:id/fork — auth required, creates a user-owned project copy
templateRoutes.post("/:id/fork", async (c) => {
  const rawId = c.req.param("id") ?? "";
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return c.json({ error: "invalid id" }, 400);

  const template = await queryOne<Pick<TemplateRow, "name" | "document">>(
    "SELECT name, document FROM templates WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!template) return c.json({ error: "template not found" }, 404);

  const project = await queryOne<{ id: number }>(
    "INSERT INTO projects (title, status, meta, user_id) VALUES ($1, 'ready', $2, $3) RETURNING id",
    [template.name, template.document, DEFAULT_USER_ID]
  );
  if (!project) return c.json({ error: "failed to create project" }, 500);

  return c.json({ id: project.id }, 201);
});
