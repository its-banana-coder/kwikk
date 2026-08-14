#!/usr/bin/env tsx
/**
 * Seed CSS background patterns from pattern-craft into the assets table.
 * - Generates PNG thumbnails (640×360) via Puppeteer for the stock library
 * - Stores the raw CSS style object as css_style JSONB for live rendering and customisation
 * - Stores an SVG data URL as `url` (full-res, infinitely scalable, zero bytes on disk)
 *
 * Run: pnpm --filter @kwikk/api exec tsx src/scripts/seed-css-backgrounds.ts
 */

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

import { getPool, initDb, queryOne } from "../db.js";
import { embed, toVectorLiteral } from "../embed.js";
import { buildCssBackgroundAssetSeed, getCssBackgroundCatalog, type CssBackgroundCatalogEntry } from "../cssBackgroundCatalog.js";

// Puppeteer is a dev dep — dynamic import so the script stays loadable without it
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = await import("puppeteer").then((m) => m.default);

const __dir = path.dirname(fileURLToPath(import.meta.url));
const THUMB_DIR = path.resolve(__dir, "../../uploads/css-patterns");
const THUMB_W = 640;
const THUMB_H = 360;
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8080";
const CONCURRENCY = 8;

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function styleToCSS(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join(";\n    ");
}

function extractKeyframes(style: Record<string, string>): string {
  // Patterns with animation reference keyframes by name but don't embed them in style.
  // Known keyframe blocks for the two animated patterns in pattern-craft:
  const animations: Record<string, string> = {
    aurora: `@keyframes aurora {
      0% { transform: scale(1) rotate(0deg); opacity: 0.5; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
      100% { transform: scale(1) rotate(360deg); opacity: 0.5; }
    }`,
    "crystal-shimmer": `@keyframes crystal-shimmer {
      0%, 100% { background-position: 0% 0%, 0% 0%, 0% 0%, 50% 50%; }
      25% { background-position: 10% 10%, -10% 10%, 0% 0%, 50% 50%; }
      50% { background-position: 20% 0%, -20% 0%, 0% 0%, 50% 50%; }
      75% { background-position: 10% -10%, -10% -10%, 0% 0%, 50% 50%; }
    }`,
  };

  const animValue = style.animation ?? "";
  const blocks: string[] = [];
  for (const [name, block] of Object.entries(animations)) {
    if (animValue.includes(name)) blocks.push(block);
  }
  return blocks.join("\n");
}

function buildHtml(entry: CssBackgroundCatalogEntry): string {
  const css = styleToCSS(entry.style);
  const keyframes = extractKeyframes(entry.style);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
${keyframes}
body { width: ${THUMB_W}px; height: ${THUMB_H}px; overflow: hidden; }
.bg { width: 100%; height: 100%; ${css}; }
</style></head><body><div class="bg"></div></body></html>`;
}

async function screenshotPattern(
  page: Awaited<ReturnType<typeof puppeteer.launch>> extends { newPage(): Promise<infer P> } ? P : never,
  entry: CssBackgroundCatalogEntry,
  outPath: string,
): Promise<void> {
  await page.setViewport({ width: THUMB_W, height: THUMB_H, deviceScaleFactor: 1 });
  await page.setContent(buildHtml(entry), { waitUntil: "domcontentloaded" });
  // One animation frame so gradients and filters fully composite
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
  await (page as any).screenshot({ path: outPath, clip: { x: 0, y: 0, width: THUMB_W, height: THUMB_H }, type: "png" });
}

async function run() {
  mkdirSync(THUMB_DIR, { recursive: true });
  await initDb();
  const pool = getPool();
  const catalog = getCssBackgroundCatalog();
  console.log(`Seeding ${catalog.length} CSS patterns...`);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    headless: true,
  });

  let inserted = 0, updated = 0, failed = 0;

  // Process in batches for concurrency
  for (let i = 0; i < catalog.length; i += CONCURRENCY) {
    const batch = catalog.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (entry) => {
      const page = await browser.newPage();
      try {
        // Generate PNG thumbnail
        const safeId = entry.id.replace(/[^a-z0-9-]/gi, "_");
        const thumbPath = path.join(THUMB_DIR, `${safeId}.png`);
        const thumbUrl = `${API_BASE}/uploads/css-patterns/${safeId}.png`;

        await screenshotPattern(page, entry, thumbPath);

        // Build seed and override thumbnailUrl with the real PNG URL
        const seed = buildCssBackgroundAssetSeed(entry);
        seed.thumbnailUrl = thumbUrl;

        // Upsert by file_path
        const existing = await queryOne<{ id: number }>(
          `SELECT id FROM assets WHERE source = 'css' AND file_path = $1 AND deleted_at IS NULL`,
          [seed.filePath]
        );

        let assetId: number;
        if (existing) {
          assetId = existing.id;
          await pool.query(
            `UPDATE assets
             SET name=$1, type=$2, category=$3, tags=$4, url=$5, thumbnail_url=$6,
                 mime_type=$7, description=$8, color_palette=$9, css_style=$10::jsonb, updated_at=NOW()
             WHERE id=$11`,
            [seed.name, seed.type, seed.category, seed.tags, seed.url, seed.thumbnailUrl,
             seed.mimeType, seed.description, seed.colorPalette, JSON.stringify(seed.cssStyle), assetId]
          );
          updated++;
        } else {
          const row = await queryOne<{ id: number }>(
            `INSERT INTO assets
               (name, type, source, category, tags, url, thumbnail_url, file_path,
                size, mime_type, description, color_palette, css_style)
             VALUES ($1,$2,'css',$3,$4,$5,$6,$7,0,$8,$9,$10,$11::jsonb)
             RETURNING id`,
            [seed.name, seed.type, seed.category, seed.tags, seed.url, seed.thumbnailUrl,
             seed.filePath, seed.mimeType, seed.description, seed.colorPalette,
             JSON.stringify(seed.cssStyle)]
          );
          if (!row) return;
          assetId = row.id;
          inserted++;
        }

        // Embedding (fire-and-forget — fails silently when API is misconfigured)
        const vec = await embed(seed.embedText);
        if (vec) {
          await pool.query(`UPDATE assets SET embedding=$1::vector WHERE id=$2`, [toVectorLiteral(vec), assetId]);
        }

        process.stdout.write(`  [${existing ? "update" : "insert"}] ${entry.id}\n`);
      } catch (e) {
        console.error(`  [ERROR] ${entry.id}: ${(e as Error).message}`);
        failed++;
      } finally {
        await page.close();
      }
    }));
  }

  await browser.close();
  console.log(`\nDone. inserted=${inserted}  updated=${updated}  failed=${failed}`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
