#!/usr/bin/env tsx
/**
 * Seeds the font DB from directories already present in data/fonts/.
 *
 * Two cases handled:
 *  1. Font already in DB (id matches slug) but local_path is NULL → UPDATE local_path only.
 *  2. Font directory has no DB row at all → INSERT a minimal record derived from filenames.
 *
 * Usage:
 *   tsx scripts/seed-disk-fonts.ts              # process all dirs
 *   tsx scripts/seed-disk-fonts.ts --dry-run    # preview, no writes
 */

import { config } from "dotenv";
config({ path: "apps/api/.env" });

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { ensureSchema, insertFont } from "@kwikk/font-manager";
import type { FontCategory, FontStyle, FontInsert } from "@kwikk/font-manager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FONTS_DIR = path.join(ROOT, "data", "fonts");
const DRY_RUN = process.argv.includes("--dry-run");

const FONT_EXTS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugToFamily(slug: string): string {
  return slug
    .replace(/[[\]]/g, "")           // strip brackets from e.g. [visions]-regular
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface WeightEntry { weight: number; style: FontStyle; file_path: string; }

function scanWeights(dir: string): WeightEntry[] {
  const entries: WeightEntry[] = [];
  if (!fs.existsSync(dir)) return entries;

  for (const fname of fs.readdirSync(dir)) {
    const ext = path.extname(fname).toLowerCase();
    if (!FONT_EXTS.has(ext)) continue;

    const base = path.basename(fname, ext).toLowerCase();
    const match = base.match(/^(\d{3})([-_]italic)?$/i);
    if (match) {
      entries.push({
        weight: parseInt(match[1], 10),
        style: match[2] ? "italic" : "normal",
        file_path: path.join(dir, fname),
      });
    } else {
      // Fallback: infer from weight name keywords
      const wmap: Record<string, number> = {
        thin: 100, extralight: 200, ultralight: 200, light: 300,
        regular: 400, roman: 400, medium: 500, semibold: 600, demibold: 600,
        bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900,
      };
      let weight = 400;
      for (const [name, w] of Object.entries(wmap)) {
        if (base.includes(name)) { weight = w; break; }
      }
      const isItalic = /italic|oblique/i.test(base);
      entries.push({ weight, style: isItalic ? "italic" : "normal", file_path: path.join(dir, fname) });
    }
  }
  return entries;
}

function guessCategory(_slug: string): FontCategory {
  // Without reading the font binary we can't reliably guess category,
  // so default to sans-serif — can be corrected later per-font.
  return "sans-serif";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/kwikk",
  });

  if (!DRY_RUN) await ensureSchema();

  // Load all existing font IDs, families, and local_path status
  const { rows: existing } = await pool.query<{ id: string; family: string; local_path: string | null }>(
    "SELECT id, family, local_path FROM fonts"
  );
  const dbById = new Map(existing.map((r) => [r.id, r.local_path]));
  // family (lowercase) → id, so we can detect family collisions
  const dbByFamily = new Map(existing.map((r) => [r.family.toLowerCase(), r.id]));

  // Scan data/fonts/
  const entries = fs.readdirSync(FONTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const slug of entries) {
    const dir = path.join(FONTS_DIR, slug);
    const weights = scanWeights(dir);

    if (weights.length === 0) {
      console.log(`  skip  ${slug} (no font files found)`);
      skipped++;
      continue;
    }

    const inDb = dbById.has(slug);
    const hasPath = dbById.get(slug) != null;

    if (inDb && hasPath) {
      // Already fully registered — nothing to do
      skipped++;
      continue;
    }

    if (inDb && !hasPath) {
      // Just update local_path
      console.log(`  patch ${slug} → set local_path`);
      if (!DRY_RUN) {
        await pool.query("UPDATE fonts SET local_path = $1, updated_at = NOW() WHERE id = $2", [dir, slug]);
      }
      updated++;
      continue;
    }

    // Not in DB by id — check for family collision (slug like "foo!" vs DB id "foo")
    const family = slugToFamily(slug);
    const collisionId = dbByFamily.get(family.toLowerCase());
    if (collisionId) {
      // Family already exists under a different id — just patch that record's local_path
      const existingPath = dbById.get(collisionId);
      if (!existingPath) {
        console.log(`  patch ${collisionId} (family match for slug ${slug}) → set local_path`);
        if (!DRY_RUN) {
          await pool.query(
            "UPDATE fonts SET local_path = $1, updated_at = NOW() WHERE id = $2",
            [dir, collisionId]
          );
        }
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // Truly new — insert minimal record
    const category = guessCategory(slug);
    const insert: FontInsert = {
      id: slug,
      family,
      label: family,
      category,
      source: "custom",
      license: "OFL-1.1",
      local_path: dir,
      weights: weights.map(({ weight, style, file_path }) => ({ weight, style, file_path })),
      tags: [category, slug],
      industry_scores: {},
      semantic_roles: { body: 0.5, headline: 0.5, display: 0.5 },
    };

    console.log(`  insert ${slug} (${weights.length} weight file${weights.length === 1 ? "" : "s"})`);
    if (!DRY_RUN) {
      await insertFont(insert);
    }
    inserted++;
  }

  await pool.end();

  console.log("\nDone.");
  console.log(`  Updated  (local_path set): ${updated}`);
  console.log(`  Inserted (new records):    ${inserted}`);
  console.log(`  Skipped:                   ${skipped}`);
  if (DRY_RUN) console.log("  (dry-run — no changes written)");
}

main().catch((err) => { console.error(err); process.exit(1); });
