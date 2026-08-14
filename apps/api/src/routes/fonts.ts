import { Hono } from "hono";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { query, queryOne, execute, dataDir } from "../db.js";
import { embedAndStore } from "../embed.js";

type FontRow = {
  id: string;
  family: string;
  label: string;
  category: string;
  subcategory: string | null;
  source: string;
  license: string;
  google_font_family: string | null;
  cdn_url: string | null;
  semantic_metadata: Record<string, unknown> | null;
  weight: number | null;
  style: string | null;
};

type FontSummary = {
  id: string;
  family: string;
  label: string;
  category: string;
  subcategory: string | null;
  source: string;
  license: string;
  google_font_family: string | null;
  cdn_url: string | null;
  semantic_metadata: Record<string, unknown> | null;
  weights: { weight: number; style: string }[];
  tags: string[];
  industry_scores: Record<string, number>;
  semantic_roles: Record<string, number>;
};

const CONTENT_TYPES: Record<string, string> = {
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export const fontRoutes = new Hono();

fontRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const category = c.req.query("category");
  const source = c.req.query("source");
  const industry = c.req.query("industry");
  const role = c.req.query("role");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10) || 50, 500);
  const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;

  // 1. Get the list of matched distinct font IDs that match the criteria (paginated correctly)
  let idSql = `SELECT DISTINCT f.id, f.label FROM fonts f`;
  const joins: string[] = [];
  const wheres: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (q) {
    joins.push(`LEFT JOIN font_tags ft_q ON ft_q.font_id = f.id`);
    wheres.push(`(lower(f.family) LIKE $${p} OR lower(f.label) LIKE $${p} OR lower(ft_q.tag) LIKE $${p})`);
    params.push(`%${q.toLowerCase()}%`); p++;
  }
  if (category) { wheres.push(`f.category = $${p}`); params.push(category); p++; }
  if (source)   { wheres.push(`f.source = $${p}`);   params.push(source);   p++; }
  if (industry) {
    joins.push(`JOIN font_industry_scores fis ON fis.font_id = f.id AND fis.industry = $${p}`);
    params.push(industry); p++;
  }
  if (role) {
    joins.push(`JOIN font_semantic_roles fsr ON fsr.font_id = f.id AND fsr.semantic_role = $${p}`);
    params.push(role); p++;
  }

  if (joins.length) idSql += " " + joins.join(" ");
  if (wheres.length) idSql += " WHERE " + wheres.join(" AND ");
  idSql += ` ORDER BY f.label LIMIT $${p} OFFSET $${p + 1}`;
  params.push(limit, offset);

  const matchedFonts = await query<{ id: string }>(idSql, params);

  if (matchedFonts.length === 0) {
    return c.json({ fonts: [] });
  }

  const fontIds = matchedFonts.map((f) => f.id);

  // 2. Fetch all weights and style detail for these matched font families
  const fontPlaceholders = fontIds.map((_, i) => `$${i + 1}`).join(",");
  const sql = `
    SELECT f.id, f.family, f.label, f.category, f.subcategory,
           f.source, f.license, f.google_font_family, f.cdn_url, f.semantic_metadata,
           fw.weight, fw.style
    FROM fonts f
    LEFT JOIN font_weights fw ON fw.font_id = f.id
    WHERE f.id IN (${fontPlaceholders})
    ORDER BY f.label, fw.weight`;

  const rows = await query<FontRow>(sql, fontIds);

  // Group into summaries
  const order: string[] = [];
  const byId = new Map<string, FontSummary>();

  for (const r of rows) {
    if (!byId.has(r.id)) {
      order.push(r.id);
      byId.set(r.id, {
        id: r.id,
        family: r.family,
        label: r.label,
        category: r.category,
        subcategory: r.subcategory,
        source: r.source,
        license: r.license,
        google_font_family: r.google_font_family,
        cdn_url: r.cdn_url,
        semantic_metadata: r.semantic_metadata,
        weights: [],
        tags: [],
        industry_scores: {},
        semantic_roles: {},
      });
    }
    if (r.weight != null && r.style != null) {
      byId.get(r.id)!.weights.push({ weight: r.weight, style: r.style });
    }
  }

  // Fetch satellite data for each returned font
  if (order.length > 0) {
    const placeholders = order.map((_, i) => `$${i + 1}`).join(",");

    const tags = await query<{ font_id: string; tag: string }>(
      `SELECT font_id, tag FROM font_tags WHERE font_id IN (${placeholders})`,
      order
    );
    for (const t of tags) byId.get(t.font_id)?.tags.push(t.tag);

    const industries = await query<{ font_id: string; industry: string; score: number }>(
      `SELECT font_id, industry, score FROM font_industry_scores WHERE font_id IN (${placeholders})`,
      order
    );
    for (const i of industries) {
      const s = byId.get(i.font_id);
      if (s) s.industry_scores[i.industry] = i.score;
    }

    const roles = await query<{ font_id: string; semantic_role: string; score: number }>(
      `SELECT font_id, semantic_role, score FROM font_semantic_roles WHERE font_id IN (${placeholders})`,
      order
    );
    for (const r of roles) {
      const s = byId.get(r.font_id);
      if (s) s.semantic_roles[r.semantic_role] = r.score;
    }
  }

  return c.json({ fonts: order.map((id) => byId.get(id)!) });
});

// POST /v1/fonts — register a new font pointing at externally-hosted files
// (no binary font parsing — weights carry a cdnUrl each). Used by the MCP
// `add_font` tool.
fontRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    family?: string;
    label?: string;
    category?: string;
    subcategory?: string;
    weights?: { weight: number; style?: string; cdnUrl?: string }[];
    tags?: string[];
    industryScores?: Record<string, number>;
    semanticRoles?: Record<string, number>;
  } | null;

  if (!body?.family || !body?.label || !body?.category) {
    return c.json({ error: "family, label, and category are required" }, 400);
  }
  if (!Array.isArray(body.weights) || body.weights.length === 0) {
    return c.json({ error: "weights must be a non-empty array of { weight, style?, cdnUrl? }" }, 400);
  }

  const id = body.family.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const existing = await queryOne<{ id: string }>("SELECT id FROM fonts WHERE id = $1 OR family = $2", [id, body.family]);
  if (existing) return c.json({ error: `font already registered: ${existing.id}` }, 409);

  await execute(
    `INSERT INTO fonts (id, family, label, category, subcategory, source)
     VALUES ($1, $2, $3, $4, $5, 'external')`,
    [id, body.family, body.label, body.category, body.subcategory ?? null]
  );

  for (const w of body.weights) {
    await execute(
      `INSERT INTO font_weights (font_id, weight, style, s3_key) VALUES ($1, $2, $3, $4)
       ON CONFLICT (font_id, weight, style) DO NOTHING`,
      [id, w.weight, w.style ?? "normal", w.cdnUrl ?? null]
    );
  }
  for (const tag of body.tags ?? []) {
    await execute(`INSERT INTO font_tags (font_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, tag]);
  }
  for (const [industry, score] of Object.entries(body.industryScores ?? {})) {
    await execute(
      `INSERT INTO font_industry_scores (font_id, industry, score) VALUES ($1, $2, $3)
       ON CONFLICT (font_id, industry) DO UPDATE SET score = $3`,
      [id, industry, score]
    );
  }
  for (const [role, score] of Object.entries(body.semanticRoles ?? {})) {
    await execute(
      `INSERT INTO font_semantic_roles (font_id, semantic_role, score) VALUES ($1, $2, $3)
       ON CONFLICT (font_id, semantic_role) DO UPDATE SET score = $3`,
      [id, role, score]
    );
  }

  const embedText = [body.label, body.category, body.subcategory, ...(body.tags ?? [])].filter(Boolean).join(" ");
  embedAndStore("fonts", id, embedText);

  return c.json({ id }, 201);
});

fontRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const font = await queryOne<{
    id: string; family: string; label: string; category: string;
    subcategory: string | null; source: string; license: string;
    designer: string | null; foundry: string | null; year_released: number | null;
    google_font_family: string | null; cdn_url: string | null;
    specimen_text: string | null;
    semantic_metadata: Record<string, unknown> | null;
  }>("SELECT * FROM fonts WHERE id = $1", [id]);
  if (!font) return c.json({ error: "not found" }, 404);

  const [weights, tags, industries, roles, pairings] = await Promise.all([
    query<{ weight: number; style: string }>(
      "SELECT weight, style FROM font_weights WHERE font_id = $1 ORDER BY weight", [id]),
    query<{ tag: string }>("SELECT tag FROM font_tags WHERE font_id = $1", [id]),
    query<{ industry: string; score: number }>(
      "SELECT industry, score FROM font_industry_scores WHERE font_id = $1", [id]),
    query<{ semantic_role: string; score: number }>(
      "SELECT semantic_role, score FROM font_semantic_roles WHERE font_id = $1", [id]),
    query<{ paired_family: string; role: string; compatibility_score: number }>(
      "SELECT paired_family, role, compatibility_score FROM font_pairings WHERE font_id = $1", [id]),
  ]);

  return c.json({
    ...font,
    weights,
    tags: tags.map((t) => t.tag),
    industry_scores: Object.fromEntries(industries.map((i) => [i.industry, i.score])),
    semantic_roles: Object.fromEntries(roles.map((r) => [r.semantic_role, r.score])),
    pairings,
  });
});

fontRoutes.get("/:family/file/:weight", (c) => {
  const family = c.req.param("family");
  const weightStr = c.req.param("weight");
  const style = c.req.query("style") ?? "normal";

  const weight = parseInt(weightStr, 10);
  if (!weight || weight <= 0) return c.json({ error: "invalid weight" }, 400);

  const slug = family.toLowerCase().replace(/ /g, "-");
  const styleSuffix = style === "italic" ? "-italic" : "";
  const dir = path.join(dataDir, "fonts", slug);

  let filePath: string | null = null;
  for (const ext of [".ttf", ".otf", ".woff2", ".woff"]) {
    const p = path.join(dir, `${weightStr}${styleSuffix}${ext}`);
    if (existsSync(p)) { filePath = p; break; }
  }

  if (!filePath) return c.json({ error: "font file not found" }, 404);

  const ext = path.extname(filePath);
  const ct = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const stream = createReadStream(filePath);
  return new Response(stream as unknown as ReadableStream, {
    headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400" },
  });
});
