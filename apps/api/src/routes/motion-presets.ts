import { Hono } from "hono";
import { query, queryOne } from "../db.js";
import { embedAndStore } from "../embed.js";

type MotionPresetRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  animations: unknown;
};

export const motionPresetRoutes = new Hono();

// GET /v1/motion-presets?q=&category=&limit=50
motionPresetRoutes.get("/", async (c) => {
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
  const rows = await query<MotionPresetRow>(
    `SELECT id, name, description, category, tags, animations
     FROM motion_presets
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return c.json(rows);
});

// POST /v1/motion-presets — save a new reusable motion preset. Body:
// { name, description?, category?, tags?, animations }. Used by the editor's
// "save as preset" control and the MCP `add_motion_preset` tool.
motionPresetRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    animations?: unknown;
  } | null;

  if (!body?.name) return c.json({ error: "name is required" }, 400);

  const animations = body.animations;
  const validShape = Array.isArray(animations) && animations.length > 0 && animations.every(
    (a) => a && typeof a === "object" &&
      typeof (a as Record<string, unknown>).type === "string" &&
      typeof (a as Record<string, unknown>).startMs === "number" &&
      typeof (a as Record<string, unknown>).durationMs === "number"
  );
  if (!validShape) {
    return c.json({ error: "animations must be a non-empty array of { type, startMs, durationMs, ... }" }, 400);
  }

  const preset = await queryOne<MotionPresetRow>(
    `INSERT INTO motion_presets (name, description, category, tags, animations)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [body.name, body.description ?? "", body.category ?? "", body.tags ?? [], JSON.stringify(animations)]
  );
  if (!preset) return c.json({ error: "insert failed" }, 500);

  const embedText = [preset.name, preset.category, ...(preset.tags ?? [])].filter(Boolean).join(" ");
  embedAndStore("motion_presets", preset.id, embedText);

  return c.json(preset, 201);
});
