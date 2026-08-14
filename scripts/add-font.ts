#!/usr/bin/env tsx
/**
 * Add a font to the kwikk font database.
 *
 * Usage:
 *   pnpm tsx scripts/add-font.ts \
 *     --id            "neue-haas-grotesk" \
 *     --family        "Neue Haas Grotesk" \
 *     --label         "Neue Haas Grotesk" \
 *     --category      sans-serif \
 *     --subcategory   grotesque \
 *     --source        commercial \
 *     --license       "proprietary" \
 *     --designer      "Max Miedinger" \
 *     --foundry       "Linotype" \
 *     --year          1957 \
 *     --tags          "professional,neutral,editorial,corporate" \
 *     --industries    "fashion:0.9,luxury:0.9,editorial:0.85,tech:0.7" \
 *     --roles         "headline:0.85,body:0.9,caption:0.85" \
 *     --pairings      "Bodoni Moda:heading_body:0.9,Inter:heading_body:0.85" \
 *     --specimen      "The quick brown fox jumps" \
 *     --ttf-dir       ./fonts/neue-haas \
 *     --storage       local
 *
 * For Google Fonts (no TTF files needed):
 *   pnpm tsx scripts/add-font.ts \
 *     --id "dm-mono" --family "DM Mono" --label "DM Mono" \
 *     --category monospace --source google --license "OFL-1.1" \
 *     --google-family "DM Mono" \
 *     --weights "300,400,500" \
 *     --tags "technical,developer,minimal" \
 *     --industries "tech:0.9,saas:0.85" \
 *     --roles "code:0.95,caption:0.7,body:0.5"
 *
 * Storage backends:
 *   local  — copies TTF files to $KWIKK_DATA_DIR/fonts/<slug>/
 *   s3     — uploads to $S3_BUCKET/fonts/<slug>/
 *            (requires S3_BUCKET, and optionally S3_ENDPOINT, S3_REGION,
 *             AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 */
import path from "node:path";
import fs from "node:fs";
import { insertFont, storeLocal, storeS3 } from "@kwikk/font-manager";
import type { FontCategory, FontSource, FontStyle, FontPairingRole, FontInsert } from "@kwikk/font-manager";

// ---------------------------------------------------------------------------
// Tiny CLI arg parser
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        map.set(key, next);
        i++;
      } else {
        map.set(key, "true");
      }
    }
  }
  return map;
}

function require_(key: string, args: Map<string, string>): string {
  const v = args.get(key);
  if (!v) { console.error(`Missing required argument: --${key}`); process.exit(1); }
  return v;
}

function opt(key: string, args: Map<string, string>, fallback = ""): string {
  return args.get(key) ?? fallback;
}

// ---------------------------------------------------------------------------
// TTF directory walker — finds {weight}[-italic].{ext} files
// ---------------------------------------------------------------------------

interface TtfFile { weight: number; style: FontStyle; filePath: string; }

function scanTtfDir(dir: string): TtfFile[] {
  const files: TtfFile[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const fname of fs.readdirSync(dir)) {
    const ext = path.extname(fname).toLowerCase();
    if (![".ttf", ".otf", ".woff", ".woff2"].includes(ext)) continue;

    const base = path.basename(fname, ext).toLowerCase();
    // Expect filenames like: 400.ttf, 700-italic.ttf, 300_italic.otf, etc.
    const match = base.match(/^(\d{3})([-_]italic)?$/i);
    if (match) {
      files.push({
        weight: parseInt(match[1], 10),
        style: match[2] ? "italic" : "normal",
        filePath: path.join(dir, fname),
      });
    } else {
      // Fallback: try to infer from common weight names in filename
      const wmap: Record<string, number> = {
        thin: 100, extralight: 200, light: 300, regular: 400,
        medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
      };
      let weight = 400;
      for (const [name, w] of Object.entries(wmap)) {
        if (base.includes(name)) { weight = w; break; }
      }
      const isItalic = base.includes("italic") || base.includes("oblique");
      console.warn(`  ⚠ Could not parse weight from "${fname}", inferred ${weight}${isItalic ? "-italic" : ""}`);
      files.push({ weight, style: isItalic ? "italic" : "normal", filePath: path.join(dir, fname) });
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  const id       = require_("id", args);
  const family   = require_("family", args);
  const label    = require_("label", args);
  const category = require_("category", args) as FontCategory;
  const source   = require_("source", args) as FontSource;
  const license  = require_("license", args);

  const storage = (opt("storage", args, "local")) as "local" | "s3";
  const ttfDir  = opt("ttf-dir", args);

  // Build weight list
  const weightsArg = opt("weights", args);
  let weightEntries: FontInsert["weights"] = [];

  if (ttfDir) {
    const ttfFiles = scanTtfDir(ttfDir);
    if (ttfFiles.length === 0) {
      console.error(`No font files found in ${ttfDir}`);
      process.exit(1);
    }

    console.log(`Found ${ttfFiles.length} font file(s) in ${ttfDir}:`);
    for (const f of ttfFiles) {
      console.log(`  ${f.weight}${f.style === "italic" ? "-italic" : ""} — ${f.filePath}`);
    }

    for (const f of ttfFiles) {
      let stored: { file_path: string | null; s3_key: string | null };
      if (storage === "s3") {
        console.log(`  Uploading ${path.basename(f.filePath)} to S3...`);
        stored = await storeS3(f.filePath, family, f.weight, f.style);
      } else {
        stored = storeLocal(f.filePath, family, f.weight, f.style);
        console.log(`  Copied to ${stored.file_path}`);
      }
      weightEntries.push({
        weight: f.weight,
        style: f.style,
        file_path: stored.file_path ?? undefined,
        s3_key: stored.s3_key ?? undefined,
      });
    }
  } else if (weightsArg) {
    // Google Fonts or CDN fonts — no files, just weight numbers
    weightEntries = weightsArg.split(",").map((w) => {
      const parts = w.trim().split("-");
      return {
        weight: parseInt(parts[0], 10),
        style: (parts[1] === "italic" ? "italic" : "normal") as FontStyle,
      };
    });
  } else {
    weightEntries = [{ weight: 400, style: "normal" }];
  }

  // Parse tags
  const tags = opt("tags", args)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Parse industries: "fashion:0.9,luxury:0.8"
  const industry_scores: Record<string, number> = {};
  for (const pair of opt("industries", args).split(",").filter(Boolean)) {
    const [k, v] = pair.trim().split(":");
    if (k && v) industry_scores[k.trim()] = parseFloat(v.trim());
  }

  // Parse semantic roles: "headline:0.9,body:0.85"
  const semantic_roles: Record<string, number> = {};
  for (const pair of opt("roles", args).split(",").filter(Boolean)) {
    const [k, v] = pair.trim().split(":");
    if (k && v) semantic_roles[k.trim()] = parseFloat(v.trim());
  }

  // Parse pairings: "Playfair Display:heading_body:0.9,Inter:heading_body:0.85"
  const pairings: FontInsert["pairings"] = [];
  for (const entry of opt("pairings", args).split(",").filter(Boolean)) {
    const parts = entry.trim().split(":");
    if (parts.length >= 3) {
      pairings.push({
        paired_family: parts.slice(0, -2).join(":"), // font names don't have ":" but be safe
        role: parts[parts.length - 2] as FontPairingRole,
        compatibility_score: parseFloat(parts[parts.length - 1]),
      });
    }
  }

  const input: FontInsert = {
    id,
    family,
    label,
    category,
    subcategory: opt("subcategory", args) || undefined,
    source,
    license,
    designer:          opt("designer", args)       || undefined,
    foundry:           opt("foundry", args)         || undefined,
    year_released:     parseInt(opt("year", args))  || undefined,
    google_font_family: opt("google-family", args)  || undefined,
    cdn_url:           opt("cdn-url", args)          || undefined,
    specimen_text:     opt("specimen", args)          || undefined,
    weights: weightEntries,
    tags,
    industry_scores,
    semantic_roles,
    pairings,
  };

  console.log(`\nInserting font "${label}" (${id}) into database...`);
  await insertFont(input);
  console.log("Done.");
  console.log("\nSummary:");
  console.log(`  Family:   ${family}`);
  console.log(`  Category: ${category}`);
  console.log(`  Source:   ${source} / ${license}`);
  console.log(`  Weights:  ${weightEntries.map((w) => `${w.weight}${w.style === "italic" ? "i" : ""}`).join(", ")}`);
  console.log(`  Tags:     ${tags.join(", ")}`);
  console.log(`  Industries: ${Object.entries(industry_scores).map(([k, v]) => `${k}:${v}`).join(", ")}`);
  console.log(`  Roles:    ${Object.entries(semantic_roles).map(([k, v]) => `${k}:${v}`).join(", ")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
