#!/usr/bin/env tsx
/**
 * Seed / backfill Pixabay backgrounds into the backgrounds table.
 * Safe to re-run: updates thumbnail_url for existing rows, inserts missing ones.
 * Run: pnpm --filter @kwikk/api exec tsx src/scripts/seed-backgrounds.ts
 */

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

import { getPool, initDb } from "../db.js";
import { embed, toVectorLiteral } from "../embed.js";

const QUERIES = [
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

const PER_QUERY = 200;
const INCLUDE_VIDEOS = true;

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

async function fetchImages(key: string, q: string): Promise<PixabayImageHit[]> {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("per_page", String(Math.min(PER_QUERY, 200)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pixabay images ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { hits: PixabayImageHit[] }).hits ?? [];
}

async function fetchVideos(key: string, q: string): Promise<PixabayVideoHit[]> {
  const url = new URL("https://pixabay.com/api/videos/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  url.searchParams.set("per_page", String(Math.min(PER_QUERY, 100)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pixabay videos ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { hits: PixabayVideoHit[] }).hits ?? [];
}

async function upsert(pool: ReturnType<typeof getPool>, {
  name, type, category, tags, url, thumbnailUrl, pixabayId,
}: {
  name: string; type: "image" | "video"; category: string;
  tags: string[]; url: string; thumbnailUrl: string; pixabayId: number;
}): Promise<{ id: number; action: "inserted" | "updated" | "skipped" }> {
  // Update existing stock row if thumbnail is empty
  const upd = await pool.query<{ id: number }>(
    `UPDATE assets SET thumbnail_url = $1
     WHERE source = 'stock' AND pixabay_id = $2 AND (thumbnail_url IS NULL OR thumbnail_url = '')
     RETURNING id`,
    [thumbnailUrl, pixabayId]
  );
  if (upd.rows.length > 0) return { id: upd.rows[0].id, action: "updated" };

  // Insert if not yet in table
  const ins = await pool.query<{ id: number }>(
    `INSERT INTO assets (name, type, source, category, tags, url, thumbnail_url, file_path, pixabay_id, size, mime_type, description)
     SELECT $1, $2, 'stock', $3, $4, $5, $6, '', $7, 0, '', ''
     WHERE NOT EXISTS (SELECT 1 FROM assets WHERE pixabay_id = $7)
     RETURNING id`,
    [name, type, category, tags, url, thumbnailUrl, pixabayId]
  );
  if (ins.rows.length > 0) return { id: ins.rows[0].id, action: "inserted" };

  return { id: 0, action: "skipped" };
}

async function run() {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) { console.error("PIXABAY_API_KEY not set"); process.exit(1); }

  await initDb();
  const pool = getPool();

  let totalUpdated = 0, totalInserted = 0, totalSkipped = 0;

  for (const { q, category } of QUERIES) {
    console.log(`\n[${category}] "${q}"`);
    let qUpdated = 0, qInserted = 0, qSkipped = 0;

    try {
      const imageHits = await fetchImages(key, q);
      for (const hit of imageHits) {
        const tags = hit.tags.split(",").map((t) => t.trim()).filter(Boolean);
        const name = tags.slice(0, 3).join(", ") || q;
        const url = hit.largeImageURL || hit.webformatURL;
        if (!url) { qSkipped++; continue; }

        const { id, action } = await upsert(pool, {
          name, type: "image", category, tags, url,
          thumbnailUrl: hit.previewURL || hit.webformatURL,
          pixabayId: hit.id,
        });

        if (action === "inserted") {
          qInserted++;
          const vec = await embed(`${name} background ${category} ${tags.join(" ")}`);
          if (vec) await pool.query(`UPDATE assets SET embedding=$1::vector WHERE id=$2`, [toVectorLiteral(vec), id]);
        } else if (action === "updated") {
          qUpdated++;
        } else {
          qSkipped++;
        }
      }

      if (INCLUDE_VIDEOS) {
        const videoHits = await fetchVideos(key, q);
        for (const hit of videoHits) {
          const tags = hit.tags.split(",").map((t) => t.trim()).filter(Boolean);
          const name = tags.slice(0, 3).join(", ") || q;
          const url = hit.videos.large?.url || hit.videos.medium?.url || hit.videos.small?.url;
          if (!url) { qSkipped++; continue; }

          const thumbnailUrl = hit.picture_id
            ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
            : "";
          const pixabayId = -(hit.id);

          const { id, action } = await upsert(pool, {
            name, type: "video", category, tags, url, thumbnailUrl, pixabayId,
          });

          if (action === "inserted") {
            qInserted++;
            const vec = await embed(`${name} background video ${category} ${tags.join(" ")}`);
            if (vec) await pool.query(`UPDATE assets SET embedding=$1::vector WHERE id=$2`, [toVectorLiteral(vec), id]);
          } else if (action === "updated") {
            qUpdated++;
          } else {
            qSkipped++;
          }
        }
      }
    } catch (e) {
      console.error(`  ERROR: ${(e as Error).message}`);
    }

    console.log(`  inserted=${qInserted}  updated=${qUpdated}  skipped=${qSkipped}`);
    totalInserted += qInserted;
    totalUpdated += qUpdated;
    totalSkipped += qSkipped;

    // Pixabay free tier: ~100 req/min — small pause between query batches
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone. inserted=${totalInserted}  updated=${totalUpdated}  skipped=${totalSkipped}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
