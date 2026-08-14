import { Hono } from "hono";
import { query } from "../db.js";

type Background = {
  id: number;
  name: string;
  type: string;
  category: string;
  tags: string[];
  url: string;
  thumbnail_url: string;
  source: string;
  css_style: Record<string, string> | null;
};

export const backgroundRoutes = new Hono();

backgroundRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const typeFilter = (c.req.query("type") ?? "").trim();
  const limit = Math.min(parseInt(c.req.query("limit") ?? "120", 10), 500);

  const conditions: string[] = ["source IN ('stock', 'css')", "deleted_at IS NULL"];
  const params: unknown[] = [];

  if (typeFilter) {
    params.push(typeFilter);
    conditions.push(`type = $${params.length}`);
  }

  if (q) {
    const like = `%${q.toLowerCase()}%`;
    params.push(like);
    const n = params.length;
    conditions.push(
      `(lower(name) LIKE $${n} OR lower(category) LIKE $${n}` +
      ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
    );
  }

  const where = conditions.join(" AND ");
  const rows = await query<Background>(
    `SELECT id, name, type, category, tags, url, thumbnail_url, source, css_style FROM assets
     WHERE ${where}
     ORDER BY CASE WHEN source = 'css' THEN 0 ELSE 1 END, id DESC
     LIMIT ${limit}`,
    params
  );

  return c.json(rows);
});
