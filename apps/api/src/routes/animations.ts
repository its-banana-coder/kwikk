import { Hono } from "hono";
import { query } from "../db.js";

type AnimationRow = {
  id: string;
  label: string;
  category: string;
  description: string;
  tags: string[];
  suitable_for: string[];
};

export const animationRoutes = new Hono();

// GET /v1/animations?q=&category=
animationRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const category = c.req.query("category") ?? "";

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const n = params.length;
    conditions.push(
      `(lower(label) LIKE $${n} OR lower(description) LIKE $${n}` +
      ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
    );
  }

  if (category && category !== "All") {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<AnimationRow>(
    `SELECT id, label, category, description, tags, suitable_for
     FROM animations ${where}
     ORDER BY category, label`,
    params
  );

  return c.json(rows);
});
