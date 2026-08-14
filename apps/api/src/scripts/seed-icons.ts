#!/usr/bin/env tsx
/**
 * Seed Phosphor icons into PostgreSQL.
 * Run: pnpm tsx src/scripts/seed-icons.ts
 *
 * Scans phosphor-icons/SVGs/{style}/ and batch-upserts into the icons table.
 * Safe to re-run (ON CONFLICT DO NOTHING).
 */

import { config } from "dotenv";
config();

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_ROOT = path.resolve(__dirname, "../../../../phosphor-icons/SVGs");
const STYLES = ["bold", "duotone", "fill", "light", "regular", "thin"];
const BATCH_SIZE = 500;

function extractName(filename: string, style: string): string | null {
  if (!filename.endsWith(".svg")) return null;
  const base = filename.slice(0, -4); // strip .svg
  // regular style: just "acorn" — other styles: "acorn-duotone"
  if (style === "regular") return base;
  const suffix = `-${style}`;
  return base.endsWith(suffix) ? base.slice(0, -suffix.length) : base;
}

function tagsFromName(name: string): string[] {
  return name.split("-").filter(Boolean);
}

type Row = { name: string; style: string; file_path: string; tags: string[] };

async function seed() {
  const pool = getPool();
  let total = 0;

  for (const style of STYLES) {
    const dir = path.join(ICONS_ROOT, style);
    let files: string[];
    try {
      files = readdirSync(dir);
    } catch {
      console.warn(`[seed-icons] skipping missing dir: ${dir}`);
      continue;
    }

    const rows: Row[] = [];
    for (const file of files) {
      // skip Windows Zone.Identifier sidecar files
      if (file.includes(":")) continue;
      const name = extractName(file, style);
      if (!name) continue;
      rows.push({
        name,
        style,
        file_path: path.join(dir, file),
        tags: tagsFromName(name),
      });
    }

    // Insert in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders = batch.map((r, idx) => {
        const base = idx * 4;
        values.push(r.name, r.style, r.file_path, r.tags);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });

      await pool.query(
        `INSERT INTO icons (name, style, file_path, tags)
         VALUES ${placeholders.join(", ")}
         ON CONFLICT (name, style) DO NOTHING`,
        values
      );
      total += batch.length;
    }

    console.log(`[seed-icons] ${style}: ${rows.length} icons`);
  }

  console.log(`[seed-icons] done — ${total} rows processed`);
  await pool.end();
}

seed().catch((err) => {
  console.error("[seed-icons] failed:", err);
  process.exit(1);
});
