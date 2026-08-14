/**
 * Admin routes — protected by ADMIN_TOKEN env var.
 * These are operational endpoints: reembed catalogs, backfill data, etc.
 *
 * Usage:
 *   curl -X POST http://localhost:8080/v1/admin/reembed \
 *     -H "Authorization: Bearer $ADMIN_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"tables": ["animations","composition_catalog","fonts","icons","assets"]}'
 */

import { Hono } from "hono";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../db.js";
import { embed, toVectorLiteral, embedAndStore } from "../embed.js";
import { buildCssBackgroundAssetSeed, getCssBackgroundCatalog } from "../cssBackgroundCatalog.js";

const __adminDir = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__adminDir, "../../../..");

export const adminRoutes = new Hono();

function checkAdminToken(authHeader: string | undefined): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false; // must be explicitly set
  return authHeader === `Bearer ${token}`;
}

type ReembedTable = "animations" | "composition_catalog" | "fonts" | "icons" | "assets" | "templates";

const REEMBED_QUERIES: Record<ReembedTable, string> = {
  animations: `
    SELECT id, label || ' animation ' || category || ' ' || description || ' ' || array_to_string(tags, ' ') AS text
    FROM animations WHERE embedding IS NULL`,
  composition_catalog: `
    SELECT id, label || ' composition ' || description || ' ' || array_to_string(use_cases, ' ') || ' ' || array_to_string(tags, ' ') AS text
    FROM composition_catalog WHERE embedding IS NULL`,
  fonts: `
    SELECT f.id,
      f.family || ' ' || f.label || ' ' || f.category
        || COALESCE(' ' || f.pair_category, '')
        || COALESCE(' ' || f.pair_role, '')
        || ' ' || COALESCE(
          (
            SELECT string_agg(value, ' ')
            FROM jsonb_each_text(COALESCE(f.semantic_metadata, '{}'::jsonb))
          ),
          ''
        )
        || ' ' || COALESCE(string_agg(DISTINCT ft.tag, ' '), '')
        || ' ' || COALESCE(f.specimen_text, '') AS text
    FROM fonts f
    LEFT JOIN font_tags ft ON ft.font_id = f.id
    WHERE f.embedding IS NULL
    GROUP BY f.id`,
  icons: `
    SELECT id, name || ' icon ' || style || ' ' || array_to_string(tags, ' ') AS text
    FROM icons WHERE embedding IS NULL AND deleted_at IS NULL LIMIT 5000`,
  assets: `
    SELECT id, name || ' ' || type || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '') || ' ' || array_to_string(tags, ' ') AS text
    FROM assets WHERE embedding IS NULL AND deleted_at IS NULL`,
  templates: `
    SELECT id, name || ' ' || category || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' ') AS text
    FROM templates WHERE embedding IS NULL AND deleted_at IS NULL`,
};

adminRoutes.post("/reembed", async (c) => {
  if (!checkAdminToken(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => ({})) as { tables?: string[]; limit?: number };
  const requestedTables = (body.tables ?? Object.keys(REEMBED_QUERIES)) as ReembedTable[];
  const batchLimit = Math.min(body.limit ?? 500, 2000);
  const pool = getPool();

  const report: Record<string, { queued: number; error?: string }> = {};

  for (const table of requestedTables) {
    const sql = REEMBED_QUERIES[table];
    if (!sql) { report[table] = { queued: 0, error: "unknown table" }; continue; }

    let rows: { id: string | number; text: string }[];
    try {
      const res = await pool.query(sql + ` LIMIT ${batchLimit}`);
      rows = res.rows as { id: string | number; text: string }[];
    } catch (e) {
      report[table] = { queued: 0, error: (e as Error).message };
      continue;
    }

    report[table] = { queued: rows.length };

    // Fire-and-forget — embed in background, don't block HTTP response
    void (async () => {
      for (const row of rows) {
        try {
          const vec = await embed(row.text);
          if (!vec) continue;
          await pool.query(
            `UPDATE ${table} SET embedding = $1::vector WHERE id = $2`,
            [toVectorLiteral(vec), row.id]
          );
        } catch (e) {
          console.warn(`[admin/reembed] ${table}#${row.id} failed:`, (e as Error).message);
        }
      }
      console.log(`[admin/reembed] ${table}: finished ${rows.length} rows`);
    })();
  }

  return c.json({ status: "started", report });
});

// ── Pixabay background seeding ────────────────────────────────────────────────

interface PixabayImageHit {
  id: number;
  tags: string;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
}

interface PixabayVideoHit {
  id: number;
  tags: string;
  picture_id: string;
  videos: { large?: { url: string }; medium?: { url: string }; small?: { url: string } };
}

const DEFAULT_BG_QUERIES = [
  { q: "abstract background",     category: "abstract" },
  { q: "gradient background",     category: "gradient" },
  { q: "dark background",         category: "dark" },
  { q: "neon lights background",  category: "neon" },
  { q: "geometric pattern",       category: "geometric" },
  { q: "bokeh background",        category: "bokeh" },
  { q: "minimal background",      category: "minimal" },
  { q: "texture background",      category: "texture" },
  { q: "particles background",    category: "particles" },
  { q: "smoke background",        category: "smoke" },
  { q: "galaxy space background", category: "space" },
  { q: "water abstract",          category: "water" },
  { q: "fire abstract",           category: "fire" },
  { q: "city lights background",  category: "urban" },
];

async function fetchPixabayImages(key: string, q: string, perPage: number): Promise<PixabayImageHit[]> {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("per_page", String(Math.min(perPage, 200)));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pixabay images API ${res.status}: ${await res.text()}`);
  const data = await res.json() as { hits: PixabayImageHit[] };
  return data.hits ?? [];
}

async function fetchPixabayVideos(key: string, q: string, perPage: number): Promise<PixabayVideoHit[]> {
  const url = new URL("https://pixabay.com/api/videos/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("per_page", String(Math.min(perPage, 100)));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pixabay videos API ${res.status}: ${await res.text()}`);
  const data = await res.json() as { hits: PixabayVideoHit[] };
  return data.hits ?? [];
}

async function upsertBackground(pool: ReturnType<typeof getPool>, {
  name, type, category, tags, url, thumbnailUrl, pixabayId,
}: {
  name: string; type: "image" | "video"; category: string;
  tags: string[]; url: string; thumbnailUrl: string; pixabayId: number;
}): Promise<number | null> {
  const res = await pool.query<{ id: number }>(
    `INSERT INTO assets (name, type, source, category, tags, url, thumbnail_url, file_path, pixabay_id, size, mime_type, description)
     SELECT $1, $2, 'stock', $3, $4, $5, $6, '', $7, 0, '', ''
     WHERE NOT EXISTS (SELECT 1 FROM assets WHERE pixabay_id = $7)
     RETURNING id`,
    [name, type, category, tags, url, thumbnailUrl, pixabayId]
  );
  return res.rows[0]?.id ?? null;
}

/**
 * POST /v1/admin/seed-backgrounds
 * Body (optional): { queries?: [{q, category}][], perQuery?: number, includeVideos?: boolean }
 *
 * Fetches abstract backgrounds from Pixabay, inserts into the assets-backed background catalog with
 * rich tag/category metadata, and fires off embedding generation for semantic search.
 */
adminRoutes.post("/seed-backgrounds", async (c) => {
  if (!checkAdminToken(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return c.json({ error: "PIXABAY_API_KEY not set" }, 500);

  const body = await c.req.json().catch(() => ({})) as {
    queries?: Array<{ q: string; category: string }>;
    perQuery?: number;
    includeVideos?: boolean;
  };

  const queries = body.queries ?? DEFAULT_BG_QUERIES;
  const perQuery = Math.min(body.perQuery ?? 200, 200);
  const includeVideos = body.includeVideos ?? true;
  const pool = getPool();

  const report: Record<string, { images: number; videos: number; skipped: number; error?: string }> = {};
  let totalInserted = 0;

  for (const { q, category } of queries) {
    const entry: { images: number; videos: number; skipped: number; error?: string } = { images: 0, videos: 0, skipped: 0 };
    report[q] = entry;

    try {
      // Images
      const imageHits = await fetchPixabayImages(key, q, perQuery);
      for (const hit of imageHits) {
        const tags = hit.tags.split(",").map((t) => t.trim()).filter(Boolean);
        const name = [tags[0], tags[1], tags[2]].filter(Boolean).join(", ") || q;
        const url = hit.largeImageURL || hit.webformatURL;
        if (!url) { entry.skipped++; continue; }

        const id = await upsertBackground(pool, {
          name, type: "image", category, tags, url,
          thumbnailUrl: hit.previewURL || hit.webformatURL,
          pixabayId: hit.id,
        });

        if (id !== null) {
          entry.images++;
          totalInserted++;
          embedAndStore("assets", id, `${name} background ${category} ${tags.join(" ")}`);
        } else {
          entry.skipped++;
        }
      }

      // Videos — use negative offset of 2B to avoid collisions with image IDs
      if (includeVideos) {
        const videoHits = await fetchPixabayVideos(key, q, Math.min(perQuery, 100));
        for (const hit of videoHits) {
          const tags = hit.tags.split(",").map((t) => t.trim()).filter(Boolean);
          const name = [tags[0], tags[1], tags[2]].filter(Boolean).join(", ") || q;
          const url = hit.videos.large?.url || hit.videos.medium?.url || hit.videos.small?.url;
          if (!url) { entry.skipped++; continue; }

          const thumbUrl = hit.picture_id
            ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
            : "";

          // Video pixabay IDs stored as negative to not collide with image IDs
          const videoPixabayId = -(hit.id);
          const id = await upsertBackground(pool, {
            name, type: "video", category, tags, url,
            thumbnailUrl: thumbUrl,
            pixabayId: videoPixabayId,
          });

          if (id !== null) {
            entry.videos++;
            totalInserted++;
            embedAndStore("assets", id, `${name} background video ${category} ${tags.join(" ")}`);
          } else {
            entry.skipped++;
          }
        }
      }
    } catch (e) {
      entry.error = (e as Error).message;
      console.error(`[admin/seed-backgrounds] query "${q}" failed:`, (e as Error).message);
    }

    // Pixabay rate-limit: ~100 req/min on free tier — small delay between queries
    await new Promise((r) => setTimeout(r, 300));
  }

  return c.json({ status: "done", totalInserted, report });
});

adminRoutes.post("/seed-css-backgrounds", async (c) => {
  if (!checkAdminToken(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const pool = getPool();
  const catalog = getCssBackgroundCatalog();
  let inserted = 0;
  let updated = 0;
  let embedded = 0;

  for (const entry of catalog) {
    const asset = buildCssBackgroundAssetSeed(entry);
    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM assets WHERE source = 'css' AND file_path = $1 AND deleted_at IS NULL LIMIT 1`,
      [asset.filePath]
    );

    let assetId = existing.rows[0]?.id;

    if (assetId) {
      await pool.query(
        `UPDATE assets
         SET name = $1,
             type = $2,
             category = $3,
             tags = $4,
             url = $5,
             thumbnail_url = $6,
             mime_type = $7,
             description = $8,
             color_palette = $9,
             updated_at = NOW()
         WHERE id = $10`,
        [
          asset.name,
          asset.type,
          asset.category,
          asset.tags,
          asset.url,
          asset.thumbnailUrl,
          asset.mimeType,
          asset.description,
          asset.colorPalette,
          assetId,
        ]
      );
      updated++;
    } else {
      const res = await pool.query<{ id: number }>(
        `INSERT INTO assets (
           name, type, source, category, tags, url, thumbnail_url, file_path,
           size, mime_type, description, color_palette
         )
         VALUES ($1, $2, 'css', $3, $4, $5, $6, $7, 0, $8, $9, $10)
         RETURNING id`,
        [
          asset.name,
          asset.type,
          asset.category,
          asset.tags,
          asset.url,
          asset.thumbnailUrl,
          asset.filePath,
          asset.mimeType,
          asset.description,
          asset.colorPalette,
        ]
      );
      assetId = res.rows[0]?.id;
      if (assetId) inserted++;
    }

    if (assetId) {
      embedAndStore("assets", assetId, asset.embedText);
      embedded++;
    }
  }

  return c.json({ status: "done", inserted, updated, embedded, total: catalog.length });
});

// ── Template seeding ──────────────────────────────────────────────────────────

const SEED_TEMPLATES = [
  {
    file: "first_hour_project.json",
    name: "Protect Your First Hour",
    description: "Optimize your mornings, avoid digital distractions, and configure deep focus work zones for maximum daily impact.",
    category: "Productivity",
    difficulty: "Beginner",
    thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80",
    tags: ["productivity", "morning routine", "focus", "digital wellness"],
  },
  {
    file: "exampleProject.json",
    name: "Quick Start Example",
    description: "A simple starter template to explore the scene graph, animations, and subtitle system.",
    category: "Tutorial",
    difficulty: "Beginner",
    thumbnail_url: "https://images.unsplash.com/photo-1600267185393-1082f0e0b82c?w=600&auto=format&fit=crop&q=80",
    tags: ["starter", "example", "tutorial", "beginner"],
  },
];

/**
 * POST /v1/admin/seed-templates
 * Reads template JSON files from the monorepo root and upserts them into
 * the templates table with full metadata + embeddings.
 */
adminRoutes.post("/seed-templates", async (c) => {
  if (!checkAdminToken(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const pool = getPool();
  const report: Record<string, { status: string; id?: number; error?: string }> = {};

  for (const tmpl of SEED_TEMPLATES) {
    const filePath = path.join(MONOREPO_ROOT, tmpl.file);
    let doc: unknown;
    try {
      doc = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (e) {
      report[tmpl.file] = { status: "skipped", error: `file not found: ${filePath}` };
      continue;
    }

    const docAny = doc as any;
    const scenes: any[] = docAny.scenes ?? [];
    const sceneCount = scenes.length;
    const estimatedDurationMs = scenes.reduce((sum: number, s: any) => sum + (s.durationMs ?? 3000), 0);

    try {
      // Check if template with this name already exists (non-deleted)
      const existing = await pool.query<{ id: number }>(
        "SELECT id FROM templates WHERE name = $1 AND deleted_at IS NULL LIMIT 1",
        [tmpl.name]
      );

      let id: number;
      if (existing.rows.length > 0) {
        id = existing.rows[0].id;
        await pool.query(
          `UPDATE templates SET description=$1, category=$2, tags=$3, thumbnail_url=$4, document=$5,
             estimated_duration_ms=$6, scene_count=$7, difficulty=$8, updated_at=NOW()
           WHERE id=$9`,
          [tmpl.description, tmpl.category, tmpl.tags, tmpl.thumbnail_url, doc,
           estimatedDurationMs, sceneCount, tmpl.difficulty, id]
        );
        report[tmpl.file] = { status: "updated", id };
      } else {
        const res = await pool.query<{ id: number }>(
          `INSERT INTO templates (name, description, category, tags, thumbnail_url, document,
                                  estimated_duration_ms, scene_count, difficulty)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [tmpl.name, tmpl.description, tmpl.category, tmpl.tags, tmpl.thumbnail_url, doc,
           estimatedDurationMs, sceneCount, tmpl.difficulty]
        );
        id = res.rows[0]?.id;
        report[tmpl.file] = { status: "inserted", id };
      }

      // Fire-and-forget embedding
      if (id) {
        const embedText = `${tmpl.name} ${tmpl.category} ${tmpl.description} ${tmpl.tags.join(" ")}`;
        embedAndStore("templates", id, embedText);
      }
    } catch (e) {
      report[tmpl.file] = { status: "error", error: (e as Error).message };
    }
  }

  return c.json({ status: "done", report });
});

// Quick status: how many rows still have no embedding per table
adminRoutes.get("/reembed/status", async (c) => {
  if (!checkAdminToken(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const tables: ReembedTable[] = ["animations", "composition_catalog", "fonts", "icons", "assets", "templates"];
  const pool = getPool();
  const status: Record<string, { total: number; embedded: number; missing: number }> = {};

  await Promise.all(
    tables.map(async (table) => {
      try {
        const res = await pool.query(
          `SELECT COUNT(*) AS total, COUNT(embedding) AS embedded FROM ${table}`
        );
        const row = res.rows[0] as { total: string; embedded: string };
        const total = parseInt(row.total, 10);
        const embedded = parseInt(row.embedded, 10);
        status[table] = { total, embedded, missing: total - embedded };
      } catch {
        status[table] = { total: 0, embedded: 0, missing: 0 };
      }
    })
  );

  return c.json(status);
});
