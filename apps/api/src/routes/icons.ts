import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, queryOne, execute } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM_ICONS_DIR = path.resolve(__dirname, "../../system/custom-icons");

type DbIcon = {
  id: number;
  name: string;
  style: string;
  file_path: string;
  tags: string[];
};

export const iconRoutes = new Hono();

// GET /v1/icons?q=airplane&style=duotone&limit=60&offset=0
iconRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const style = c.req.query("style") ?? "duotone";
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") ?? "60", 10) || 60, 1), 200);
  const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;

  let rows: Pick<DbIcon, "name" | "style" | "tags">[];

  if (q) {
    const like = `%${q.toLowerCase()}%`;
    rows = await query<Pick<DbIcon, "name" | "style" | "tags">>(
      `SELECT name, style, tags FROM icons
       WHERE style = $1
         AND (lower(name) LIKE $2 OR EXISTS (
               SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $2
             ))
         AND deleted_at IS NULL
       ORDER BY name LIMIT $3 OFFSET $4`,
      [style, like, limit, offset]
    );
  } else {
    rows = await query<Pick<DbIcon, "name" | "style" | "tags">>(
      "SELECT name, style, tags FROM icons WHERE style = $1 AND deleted_at IS NULL ORDER BY name LIMIT $2 OFFSET $3",
      [style, limit, offset]
    );
  }

  return c.json({ icons: rows });
});

// POST /v1/icons — add a new icon. Body: { name, style, svg } or { name, style, url }
// (raw SVG markup, or a URL the server fetches). Used by the MCP `add_icon` tool.
iconRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    name?: string; style?: string; svg?: string; url?: string; tags?: string[];
  } | null;

  const name = body?.name?.trim();
  const style = body?.style?.trim();
  if (!name || !style) return c.json({ error: "name and style are required" }, 400);
  if (!body?.svg && !body?.url) return c.json({ error: "either svg (raw markup) or url is required" }, 400);

  let svg = body.svg ?? "";
  if (!svg && body.url) {
    const res = await fetch(body.url).catch(() => null);
    if (!res?.ok) return c.json({ error: "failed to fetch url" }, 400);
    svg = await res.text();
  }
  if (!svg.includes("<svg")) return c.json({ error: "not valid SVG content" }, 400);

  await mkdir(path.join(CUSTOM_ICONS_DIR, style), { recursive: true });
  const filePath = path.join(CUSTOM_ICONS_DIR, style, `${name}-${style}.svg`);
  await writeFile(filePath, svg, "utf-8");

  await execute(
    `INSERT INTO icons (name, style, file_path, tags) VALUES ($1, $2, $3, $4)
     ON CONFLICT (name, style) DO UPDATE SET file_path = $3, tags = $4, updated_at = NOW()`,
    [name, style, filePath, body.tags ?? []]
  );

  return c.json({ name, style }, 201);
});

// GET /v1/icons/:name/svg?color=4f46e5
iconRoutes.get("/:name/svg", async (c) => {
  const name = c.req.param("name");
  const color = (c.req.query("color") ?? "000000").replace(/^#/, "");

  const icon = await queryOne<Pick<DbIcon, "file_path">>(
    "SELECT file_path FROM icons WHERE name = $1 AND deleted_at IS NULL LIMIT 1",
    [name]
  );

  if (!icon) return c.json({ error: "icon not found" }, 404);

  let svg: string;
  try {
    svg = readFileSync(icon.file_path, "utf-8");
  } catch {
    return c.json({ error: "cannot read svg file" }, 500);
  }

  svg = svg.replace("<svg ", `<svg style="color:#${color}" `);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
});
