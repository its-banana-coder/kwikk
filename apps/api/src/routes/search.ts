import { Hono } from "hono";
import { getPool } from "../db.js";
import { embed, toVectorLiteral } from "../embed.js";

type SearchType = "icon" | "font" | "asset" | "template" | "background" | "animation" | "composition";
const ALL_TYPES: SearchType[] = ["icon", "font", "asset", "template", "background", "animation", "composition"];

type SearchHit = {
  type: SearchType;
  id: string | number;
  name: string;
  score: number;
  meta: Record<string, unknown>;
};

function normalizeHitId(id: unknown): string | number {
  if (typeof id === "number") return id;
  const stringId = String(id);
  const numericId = Number(stringId);
  return Number.isNaN(numericId) ? stringId : numericId;
}

export const searchRoutes = new Hono();

/**
 * GET /v1/search?q=vibrant coffee brand&type=icon,asset&limit=10
 */
searchRoutes.get("/", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ results: [] });

  const typeParam = c.req.query("type");
  const types: SearchType[] = typeParam
    ? (typeParam.split(",").filter((t) => ALL_TYPES.includes(t as SearchType)) as SearchType[])
    : ALL_TYPES;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "10", 10) || 10, 50);

  const vec = await embed(q);
  if (vec) {
    return c.json({ results: await semanticSearch(types, vec, limit), mode: "semantic" });
  }

  return c.json({ results: await textSearch(types, q, limit), mode: "text" });
});

async function semanticSearch(
  types: SearchType[],
  vec: number[],
  limit: number
): Promise<SearchHit[]> {
  const vecLiteral = toVectorLiteral(vec);
  const perType = Math.ceil(limit / types.length);
  const all: SearchHit[] = [];

  await Promise.all(
    types.map(async (type) => {
      try {
        const rows = await queryTypeVec(type, vecLiteral, perType);
        all.push(...rows);
      } catch (e) {
        console.warn(`[search] semantic failed for ${type}:`, (e as Error).message);
      }
    })
  );

  return all.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function queryTypeVec(
  type: SearchType,
  vecLiteral: string,
  limit: number
): Promise<SearchHit[]> {
  let sql: string;
  let params: unknown[];

  switch (type) {
    case "icon":
      sql = `
        SELECT id, name, style, tags,
               1 - (embedding <=> $1::vector) AS score
        FROM icons
        WHERE deleted_at IS NULL AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;

    case "font":
      sql = `
        SELECT id, family AS name, label, category, semantic_metadata,
               1 - (embedding <=> $1::vector) AS score
        FROM fonts
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;

    case "asset":
      sql = `
        SELECT id, name, type, url, mime_type, description, tags,
               1 - (embedding <=> $1::vector) AS score
        FROM assets
        WHERE source = 'upload' AND deleted_at IS NULL AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;

    case "template":
      sql = `
        SELECT id, name, description, category, tags, thumbnail_url,
               estimated_duration_ms, scene_count, difficulty,
               1 - (embedding <=> $1::vector) AS score
        FROM templates
        WHERE deleted_at IS NULL AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;

    case "background":
      sql = `
        SELECT id, name, type, category, tags, url, thumbnail_url,
               1 - (embedding <=> $1::vector) AS score
        FROM assets
        WHERE source IN ('stock', 'css') AND deleted_at IS NULL AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;

    case "animation":
      sql = `
        SELECT id, label AS name, category, tags, suitable_for,
               1 - (embedding <=> $1::vector) AS score
        FROM animations
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;

    case "composition":
      sql = `
        SELECT id, label AS name, description, use_cases, tags, default_size,
               1 - (embedding <=> $1::vector) AS score
        FROM composition_catalog
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2`;
      params = [vecLiteral, limit];
      break;
  }

  const res = await getPool().query(sql, params);
  return res.rows.map((r) => {
    const { id, name, score, ...rest } = r;
    return { type, id: normalizeHitId(id), name: String(name), score: Number(score), meta: rest };
  });
}

async function textSearch(
  types: SearchType[],
  q: string,
  limit: number
): Promise<SearchHit[]> {
  const like = `%${q.toLowerCase()}%`;
  const perType = Math.ceil(limit / types.length);
  const all: SearchHit[] = [];

  await Promise.all(
    types.map(async (type) => {
      try {
        const rows = await queryTypeText(type, like, perType);
        all.push(...rows);
      } catch (e) {
        console.warn(`[search] text search failed for ${type}:`, (e as Error).message);
      }
    })
  );

  return all.slice(0, limit);
}

async function queryTypeText(
  type: SearchType,
  like: string,
  limit: number
): Promise<SearchHit[]> {
  let sql: string;
  let params: unknown[];

  switch (type) {
    case "icon":
      sql = `SELECT id, name, style, tags FROM icons
             WHERE deleted_at IS NULL AND (lower(name) LIKE $1 OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $1))
             LIMIT $2`;
      params = [like, limit];
      break;

    case "font":
      sql = `SELECT id, family AS name, label, category, semantic_metadata FROM fonts
             WHERE lower(family) LIKE $1 OR lower(label) LIKE $1
               OR EXISTS (
                 SELECT 1
                 FROM jsonb_each_text(COALESCE(semantic_metadata, '{}'::jsonb)) md
                 WHERE lower(md.value) LIKE $1
               )
             LIMIT $2`;
      params = [like, limit];
      break;

    case "asset":
      sql = `SELECT id, name, type, url, mime_type, description, tags FROM assets
             WHERE source = 'upload' AND deleted_at IS NULL AND (lower(name) LIKE $1 OR lower(description) LIKE $1)
             LIMIT $2`;
      params = [like, limit];
      break;

    case "template":
      sql = `SELECT id, name, description, category, tags, thumbnail_url,
                    estimated_duration_ms, scene_count, difficulty
             FROM templates
             WHERE deleted_at IS NULL AND (lower(name) LIKE $1 OR lower(description) LIKE $1
               OR lower(category) LIKE $1
               OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $1))
             LIMIT $2`;
      params = [like, limit];
      break;

    case "background":
      sql = `SELECT id, name, type, category, tags, url, thumbnail_url FROM assets
             WHERE source IN ('stock', 'css') AND deleted_at IS NULL AND (lower(name) LIKE $1 OR lower(category) LIKE $1
               OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $1))
             LIMIT $2`;
      params = [like, limit];
      break;

    case "animation":
      sql = `SELECT id, label AS name, category, tags, suitable_for FROM animations
             WHERE lower(label) LIKE $1 OR lower(description) LIKE $1
               OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $1)
             LIMIT $2`;
      params = [like, limit];
      break;

    case "composition":
      sql = `SELECT id, label AS name, description, use_cases, tags, default_size FROM composition_catalog
             WHERE lower(label) LIKE $1 OR lower(description) LIKE $1
             LIMIT $2`;
      params = [like, limit];
      break;
  }

  const res = await getPool().query(sql, params);
  return res.rows.map((r) => {
    const { id, name, ...rest } = r;
    return { type, id: normalizeHitId(id), name: String(name), score: 0, meta: rest };
  });
}
