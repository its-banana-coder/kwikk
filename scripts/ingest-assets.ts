#!/usr/bin/env tsx
/**
 * Unified asset ingestion pipeline.
 *
 * Drop files into the source folders at the repo root, then run this script.
 * It validates, repairs where possible, copies to apps/api/system/, and seeds
 * the assets table with clean relative URLs.
 *
 * Source folders → destination → asset type in DB
 * ─────────────────────────────────────────────────
 *  svg_animations/ → system/svg-animations/ → svg_animation
 *  images/         → system/images/         → image
 *  videos/         → system/videos/         → video
 *
 * Usage:
 *   tsx scripts/ingest-assets.ts                  # process all folders
 *   tsx scripts/ingest-assets.ts --type svg        # only svg_animations/
 *   tsx scripts/ingest-assets.ts --type image      # only images/
 *   tsx scripts/ingest-assets.ts --type video      # only videos/
 *   tsx scripts/ingest-assets.ts --dry-run         # preview, no writes
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, "..");
const SYSTEM_DIR = path.join(ROOT, "apps/api/system");

const DRY_RUN  = process.argv.includes("--dry-run");
const TYPE_ARG = (() => {
  const i = process.argv.indexOf("--type");
  return i !== -1 ? process.argv[i + 1] : null;
})();

// ── Asset type definitions ────────────────────────────────────────────────────

type AssetKind = "svg_animation" | "image" | "video";

interface KindConfig {
  label: string;
  sourceDir: string;       // relative to repo root
  destSubdir: string;      // inside apps/api/system/
  urlPrefix: string;       // path prefix in served URL
  dbType: AssetKind;
  validExts: Set<string>;
  validate: (filePath: string, content: string | null) => ValidateResult;
  repair:   (content: string, filename: string) => string;
}

interface ValidateResult {
  ok: boolean;
  repaired: boolean;
  notes: string[];
}

// ── SVG validation/repair ─────────────────────────────────────────────────────

function validateSvg(_filePath: string, content: string | null): ValidateResult {
  if (!content) return { ok: false, repaired: false, notes: ["could not read file"] };
  if (!/<svg[\s>]/i.test(content)) return { ok: false, repaired: false, notes: ["no <svg> root element"] };
  return { ok: true, repaired: false, notes: [] };
}

/**
 * Short deterministic prefix from filename — base36, 5 chars.
 * Used to namespace all IDs in an SVG so multiple animations on the same page
 * never share an ID, which would corrupt SMIL animations.
 */
function svgPrefix(filename: string): string {
  let h = 5381;
  for (const c of filename) h = (((h << 5) + h) ^ c.charCodeAt(0)) >>> 0;
  return h.toString(36).slice(0, 5);
}

/**
 * Rewrite every id="…" and every reference to it throughout the SVG.
 * Handles: href="#id", xlink:href="#id", url(#id), SMIL begin/end="id.event".
 */
function scopeIds(content: string, prefix: string): string {
  // Collect all defined IDs
  const ids: string[] = [];
  const defRe = /\bid="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = defRe.exec(content)) !== null) ids.push(m[1]);
  if (ids.length === 0) return content;

  // Sort longest-first so a shorter ID substring doesn't partially replace a longer one
  ids.sort((a, b) => b.length - a.length);

  let out = content;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const newId = `${prefix}-${id}`;
    // id="…" definition
    out = out.replace(new RegExp(`\\bid="${esc}"`, "g"), `id="${newId}"`);
    // href="#…"
    out = out.replace(new RegExp(`href="#${esc}"`, "g"), `href="#${newId}"`);
    // xlink:href="#…"
    out = out.replace(new RegExp(`xlink:href="#${esc}"`, "g"), `xlink:href="#${newId}"`);
    // url(#…) — fill, clip-path, filter, mask, etc.
    out = out.replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${newId})`);
    // SMIL begin/end attributes: "idValue.begin", "idValue.end", "idValue.click", etc.
    out = out.replace(new RegExp(`(begin|end)="([^"]*?)${esc}\\.`, "g"), `$1="$2${newId}.`);
  }
  return out;
}

function repairSvg(content: string, filename: string): string {
  let out = content;
  const repairs: string[] = [];

  // 1. Remove script tags
  const scriptsBefore = (out.match(/<script[\s\S]*?<\/script>/gi) ?? []).length;
  if (scriptsBefore > 0) {
    out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
    repairs.push(`removed ${scriptsBefore} <script> tag(s)`);
  }

  // 2. Ensure xmlns
  if (!out.match(/xmlns=/i)) {
    out = out.replace(/<svg([^>]*)>/i, '<svg$1 xmlns="http://www.w3.org/2000/svg">');
    repairs.push("added xmlns");
  }

  // 3. Add viewBox from width/height if missing
  const svgTagMatch = out.match(/<svg([^>]*)>/i);
  if (svgTagMatch && !/viewBox=/i.test(svgTagMatch[1])) {
    const wm = svgTagMatch[1].match(/width=["']([0-9.]+)/i);
    const hm = svgTagMatch[1].match(/height=["']([0-9.]+)/i);
    if (wm && hm) {
      out = out.replace(/<svg([^>]*)>/i, `<svg$1 viewBox="0 0 ${parseFloat(wm[1])} ${parseFloat(hm[1])}">`);
      repairs.push("added viewBox from width/height");
    }
  }

  // 4. Scope all IDs to this file — prevents SMIL animation cross-contamination
  //    when multiple SVGs are present in the same DOM.
  const prefix = svgPrefix(filename);
  const scoped = scopeIds(out, prefix);
  if (scoped !== out) {
    repairs.push(`scoped IDs with prefix "${prefix}"`);
    out = scoped;
  }

  if (repairs.length > 0) {
    process.stdout.write(`             repairs: ${repairs.join("; ")}\n`);
  }

  return out;
}

// ── Image validation ──────────────────────────────────────────────────────────

function validateImage(_filePath: string, _content: string | null): ValidateResult {
  // Content-level image validation would require a binary parser.
  // Extension check is done at the config level; trust it here.
  return { ok: true, repaired: false, notes: [] };
}

// ── Video validation ──────────────────────────────────────────────────────────

function validateVideo(_filePath: string, _content: string | null): ValidateResult {
  return { ok: true, repaired: false, notes: [] };
}

// ── Kind configs ──────────────────────────────────────────────────────────────

const KINDS: KindConfig[] = [
  {
    label:     "SVG Animations",
    sourceDir: "svg_animations",
    destSubdir:"svg-animations",
    urlPrefix: "/system/svg-animations",
    dbType:    "svg_animation",
    validExts: new Set([".svg"]),
    validate:  validateSvg,
    repair:    repairSvg,
  },
  {
    label:     "Images",
    sourceDir: "images",
    destSubdir:"images",
    urlPrefix: "/system/images",
    dbType:    "image",
    validExts: new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]),
    validate:  validateImage,
    repair:    (c, _f) => c,  // images are binary; repair is a no-op for SVG images too
  },
  {
    label:     "Videos",
    sourceDir: "videos",
    destSubdir:"videos",
    urlPrefix: "/system/videos",
    dbType:    "video",
    validExts: new Set([".mp4", ".webm", ".mov", ".m4v"]),
    validate:  validateVideo,
    repair:    (c, _f) => c,
  },
];


// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitle(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const STOPWORDS = new Set(["a","an","the","of","on","in","at","to","and","or","with","for","from","via"]);
function toTags(filename: string): string[] {
  const base = filename.replace(/\.[^.]+$/, "");
  return base.toLowerCase().split(/[\s\-_.]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function mimeType(ext: string, dbType: AssetKind): string {
  const map: Record<string, string> = {
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif":  "image/gif",
    ".avif": "image/avif",
    ".mp4":  "video/mp4",
    ".webm": "video/webm",
    ".mov":  "video/quicktime",
    ".m4v":  "video/mp4",
  };
  return map[ext] ?? (dbType === "video" ? "video/mp4" : "image/jpeg");
}

// ── Per-kind ingestion ────────────────────────────────────────────────────────

interface IngestStats {
  label: string;
  inserted: number;
  skipped: number;
  invalid: number;
}

async function ingestKind(kind: KindConfig, pool: pg.Pool): Promise<IngestStats> {
  const sourceDir = path.join(ROOT, kind.sourceDir);
  const destDir   = path.join(SYSTEM_DIR, kind.destSubdir);

  const stats: IngestStats = { label: kind.label, inserted: 0, skipped: 0, invalid: 0 };

  if (!fs.existsSync(sourceDir)) {
    console.log(`  [${kind.label}] source folder not found: ${sourceDir} — skipping`);
    return stats;
  }

  const files = fs.readdirSync(sourceDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return kind.validExts.has(ext);
  });

  if (files.length === 0) {
    console.log(`  [${kind.label}] no files found in ${kind.sourceDir}/`);
    return stats;
  }

  console.log(`\n── ${kind.label} (${files.length} files) ${"─".repeat(40 - kind.label.length)}`);

  if (!DRY_RUN) fs.mkdirSync(destDir, { recursive: true });

  for (const file of files) {
    const srcPath  = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    const ext      = path.extname(file).toLowerCase();
    const isBinary = kind.dbType === "video" || (kind.dbType === "image" && ext !== ".svg");

    // Read content (text for SVG/images-that-are-SVG, null for binary)
    const rawContent: string | null = isBinary ? null : fs.readFileSync(srcPath, "utf-8");

    // Validate
    const result = kind.validate(srcPath, rawContent);
    if (!result.ok) {
      console.log(`  INVALID  ${file}: ${result.notes.join("; ")}`);
      stats.invalid++;
      continue;
    }

    // Repair if text-based
    const finalContent = rawContent !== null ? kind.repair(rawContent, file) : null;
    const wasRepaired  = finalContent !== null && finalContent !== rawContent;

    const url      = `${kind.urlPrefix}/${encodeURIComponent(file)}`;
    const name     = toTitle(file);
    const tags     = toTags(file);
    const mime     = mimeType(ext, kind.dbType);
    const fileSize = fs.statSync(srcPath).size;

    if (DRY_RUN) {
      const flag = wasRepaired ? " [repaired]" : "";
      console.log(`  DRY-RUN  ${name}${flag}  →  ${url}`);
      stats.inserted++;
      continue;
    }

    // Check for existing entry
    const existing = await pool.query(
      "SELECT id FROM assets WHERE url = $1 AND deleted_at IS NULL",
      [url]
    );
    if (existing.rows.length > 0) {
      console.log(`  SKIP     ${name}`);
      stats.skipped++;
      continue;
    }

    // Write to destination
    if (finalContent !== null) {
      fs.writeFileSync(destPath, finalContent, "utf-8");
    } else {
      fs.copyFileSync(srcPath, destPath);
    }

    // Insert into DB
    await pool.query(
      `INSERT INTO assets (name, type, url, file_path, size, mime_type, description, tags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)`,
      [name, kind.dbType, url, destPath, fileSize, mime, `${kind.label}: ${name}`, tags]
    );

    const flag = wasRepaired ? " [repaired]" : "";
    console.log(`  INSERT   ${name}${flag}`);
    stats.inserted++;
  }

  return stats;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const typeMap: Record<string, string> = {
    svg:   "svg_animation",
    image: "image",
    video: "video",
  };
  const filterDbType = TYPE_ARG ? typeMap[TYPE_ARG] : null;
  if (TYPE_ARG && !filterDbType) {
    console.error(`Unknown --type "${TYPE_ARG}". Valid: svg, image, video`);
    process.exit(1);
  }

  const kinds = filterDbType ? KINDS.filter((k) => k.dbType === filterDbType) : KINDS;

  if (DRY_RUN) console.log("DRY RUN — no files written, no DB changes\n");

  const pool = DRY_RUN
    ? null
    : new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/kwikk" });

  const allStats: IngestStats[] = [];
  for (const kind of kinds) {
    const stats = await ingestKind(kind, pool as pg.Pool);
    allStats.push(stats);
  }

  if (pool) await pool.end();

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("  INGESTION SUMMARY");
  console.log("═".repeat(50));
  let totalInserted = 0, totalSkipped = 0, totalInvalid = 0;
  for (const s of allStats) {
    console.log(`  ${s.label.padEnd(20)} inserted=${s.inserted}  skipped=${s.skipped}  invalid=${s.invalid}`);
    totalInserted += s.inserted;
    totalSkipped  += s.skipped;
    totalInvalid  += s.invalid;
  }
  console.log("─".repeat(50));
  console.log(`  ${"TOTAL".padEnd(20)} inserted=${totalInserted}  skipped=${totalSkipped}  invalid=${totalInvalid}`);
  console.log("═".repeat(50));

  if (DRY_RUN) console.log("\nRe-run without --dry-run to apply.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
