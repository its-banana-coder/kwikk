#!/usr/bin/env tsx
/**
 * Scrape free-for-commercial-use fonts from 1001fonts.com and insert them
 * into the kwikk font-manager database.
 *
 * Usage:
 *   pnpm tsx scripts/scrape-1001fonts.ts
 *   pnpm tsx scripts/scrape-1001fonts.ts --pages 3 --start-page 2
 *   pnpm tsx scripts/scrape-1001fonts.ts --limit 20 --dry-run
 *
 * Options:
 *   --pages N         Listing pages to crawl (default: 5, total ~554 pages)
 *   --start-page N    First listing page number (default: 1)
 *   --limit N         Stop after inserting N new fonts (default: unlimited)
 *   --dry-run         Discover fonts without downloading or inserting
 *   --delay-ms N      Milliseconds between HTTP requests (default: 1500)
 *   --no-skip         Re-download fonts already in the DB
 *
 * The script is resumable: fonts already in the DB are skipped by default.
 * Temp dirs are cleaned up even on error.
 */

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { insertFont, storeLocal, getDb } from "@kwikk/font-manager";
import type { FontInsert, FontCategory } from "@kwikk/font-manager";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const m = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n && !n.startsWith("--")) { m.set(k, n); i++; }
      else m.set(k, "true");
    }
  }
  return {
    pages:        parseInt(m.get("pages")      ?? "5"),
    startPage:    parseInt(m.get("start-page") ?? "1"),
    limit:        parseInt(m.get("limit")      ?? "0"), // 0 = unlimited
    dryRun:       m.get("dry-run")  === "true",
    delayMs:      parseInt(m.get("delay-ms")   ?? "1500"),
    skipExisting: m.get("no-skip") !== "true",
  };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

// Must look like a real browser or the site returns a minimal no-content shell
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Listing page parsing
// ---------------------------------------------------------------------------

/**
 * Extract font slugs from a listing page.
 * The download links are the reliable source: href=/download/{slug}.zip
 * Font names are derived from the image alt text near each download link.
 */
function parseListingPage(html: string): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();

  const re = /href=\/download\/([a-z0-9][a-z0-9-]*)\.zip/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// Detail page parsing
// ---------------------------------------------------------------------------

interface DetailInfo {
  name: string;
  category: FontCategory;
  tags: string[];
  designer: string | null;
}

/**
 * Parse a 1001fonts font detail page.
 *
 * Name:     <h1 id=typeface-detail-title ...>Font Name Font Family</h1>
 * Category: first <a> link inside the "General" category section
 *           <span id=category-general-label>General</span> ... <a href=/serif-fonts.html>Serif</a>
 * Tags:     all category links across all sections
 * Designer: text after "by " in the author section, or inside an element with class="author>"
 */
function parseDetailPage(html: string, fallbackName: string): DetailInfo {
  // Font name
  const h1Match = /id=typeface-detail-title[^>]*>([^<]+)/i.exec(html);
  const name = h1Match
    ? h1Match[1].replace(/\s*font\s*(family|face)?\s*$/i, "").trim()
    : fallbackName;

  // All category links: href=/{slug}-fonts.html or href=/{slug}+{more}-fonts.html
  const catLinks: string[] = [];
  const catRe = /href=\/([a-z0-9][a-z0-9+_-]*)-fonts?\.html[^>]*>([^<]{2,40})</gi;
  let cm: RegExpExecArray | null;
  while ((cm = catRe.exec(html)) !== null) {
    const label = cm[2].trim().toLowerCase();
    // Skip navigation-only slugs
    if (["free-for-commercial-use", "free", "all", "new", "popular"].includes(cm[1])) continue;
    catLinks.push(label);
  }

  // Primary category comes from the "General" section (first match in that block)
  const generalSection = /category-general-label[^]*?category-[a-z]+-label/.exec(html)?.[0] ?? "";
  const firstCatInGeneral = /href=\/([a-z0-9-]+)-fonts?\.html[^>]*>([^<]+)/.exec(generalSection);
  const primaryRaw = firstCatInGeneral ? firstCatInGeneral[2].trim() : catLinks[0] ?? "";
  const category = inferCategory(primaryRaw);

  const tags = [...new Set(catLinks)].slice(0, 8);

  // Designer: look for "by FullName" near the author block
  // Patterns: ">Raymond Larabie<" inside class=author or "by Raymond Larabie"
  let designer: string | null = null;
  const authorMatch = /class=author[^>]*>([^<]{2,60})</.exec(html);
  if (authorMatch) {
    designer = authorMatch[1].trim();
  } else {
    const byMatch = /\bby\s+([A-Z][a-zA-Z\s]{2,40}?)(?:\s*<|\s*\n)/.exec(html);
    if (byMatch) designer = byMatch[1].trim();
  }

  return { name, category, tags, designer };
}

function inferCategory(raw: string): FontCategory {
  const s = raw.toLowerCase();
  if (/sans[- ]serif|grotesque|gothic/.test(s)) return "sans-serif";
  if (/\bserif\b|slab|old.?style|transitional/.test(s)) return "serif";
  if (/mono|code|techno|typewriter/.test(s)) return "monospace";
  if (/script|handwrit|calligr|brush|cursive/.test(s)) return "handwriting";
  return "display";
}

// ---------------------------------------------------------------------------
// Font file scanning
// ---------------------------------------------------------------------------

interface WeightFile { weight: number; style: "normal" | "italic"; filePath: string; }

const WEIGHT_NAMES: [string, number][] = [
  ["thin", 100], ["hairline", 100], ["extralight", 200], ["ultralight", 200],
  ["light", 300], ["medium", 500], ["semibold", 600], ["demibold", 600],
  ["extrabold", 800], ["ultrabold", 800], ["black", 900], ["heavy", 900],
  ["bold", 700], ["regular", 400], ["normal", 400],
];

function scanFontFiles(dir: string): WeightFile[] {
  const all: WeightFile[] = [];
  collectFontFiles(dir, all);
  const seen = new Set<string>();
  return all.filter((f) => {
    const k = `${f.weight}-${f.style}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function collectFontFiles(dir: string, out: WeightFile[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { collectFontFiles(full, out); continue; }
    const ext = path.extname(entry.name).toLowerCase();
    if (![".ttf", ".otf"].includes(ext)) continue;
    out.push(classifyFontFile(entry.name, full));
  }
}

function classifyFontFile(fname: string, filePath: string): WeightFile {
  const base = path.basename(fname, path.extname(fname)).toLowerCase();
  const numMatch = base.match(/^(\d{3})([-_]italic)?$/i);
  if (numMatch) return { weight: parseInt(numMatch[1]), style: numMatch[2] ? "italic" : "normal", filePath };

  let weight = 400;
  for (const [name, w] of WEIGHT_NAMES) {
    if (base.includes(name)) { weight = w; break; }
  }
  const isItalic = /italic|oblique/.test(base);
  return { weight, style: isItalic ? "italic" : "normal", filePath };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function existsInDb(id: string): Promise<boolean> {
  try {
    const pool = getDb();
    const { rows } = await pool.query("SELECT id FROM fonts WHERE id = $1", [id]);
    return rows.length > 0;
  } catch { return false; }
}

function defaultSemanticRoles(cat: FontCategory): Record<string, number> {
  switch (cat) {
    case "sans-serif":  return { headline: 0.7, body: 0.85, caption: 0.8 };
    case "serif":       return { headline: 0.8, body: 0.8,  caption: 0.7 };
    case "monospace":   return { code: 0.95, caption: 0.6, body: 0.4 };
    case "handwriting": return { accent: 0.9, headline: 0.6, display: 0.7 };
    case "display":     return { display: 0.9, headline: 0.75, accent: 0.7 };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const BASE = "https://www.1001fonts.com";
  const LISTING = (p: number) => `${BASE}/free-for-commercial-use-fonts.html?page=${p}`;

  console.log("1001fonts commercial-free font scraper");
  console.log(`  Pages:     ${args.startPage}–${args.startPage + args.pages - 1}`);
  console.log(`  Limit:     ${args.limit || "unlimited"}`);
  console.log(`  Dry run:   ${args.dryRun}`);
  console.log(`  Delay:     ${args.delayMs}ms\n`);

  let inserted = 0, skipped = 0, errors = 0;

  outer:
  for (let page = args.startPage; page < args.startPage + args.pages; page++) {
    if (args.limit > 0 && inserted >= args.limit) break;

    console.log(`\nPage ${page}: ${LISTING(page)}`);

    let listingHtml: string;
    try {
      listingHtml = await fetchText(LISTING(page));
    } catch (e) {
      console.error(`  Failed to fetch listing: ${e}`);
      break;
    }

    const slugs = parseListingPage(listingHtml);
    console.log(`  Found ${slugs.length} fonts`);
    if (slugs.length === 0) { console.log("  Empty page — stopping."); break; }

    for (const slug of slugs) {
      if (args.limit > 0 && inserted >= args.limit) break outer;

      if (args.skipExisting && await existsInDb(slug)) {
        process.stdout.write(`  [${slug}] already in DB\n`);
        skipped++;
        continue;
      }

      if (args.dryRun) {
        process.stdout.write(`  [${slug}] (dry run)\n`);
        inserted++;
        continue;
      }

      await sleep(args.delayMs);

      // Fetch detail page for name + metadata
      let detail: DetailInfo = {
        name: slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
        category: "display",
        tags: [],
        designer: null,
      };
      try {
        const detailHtml = await fetchText(`${BASE}/${slug}-font.html`);
        detail = parseDetailPage(detailHtml, detail.name);
        await sleep(args.delayMs);
      } catch (e) {
        console.warn(`  [${slug}] detail page error: ${e}`);
      }

      // Download and extract zip
      const tmpDir = path.join(os.tmpdir(), `kwikk-${slug}-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        process.stdout.write(`  [${slug}] ${detail.name} ... `);

        const zipPath = path.join(tmpDir, `${slug}.zip`);
        const zipData = await fetchBytes(`${BASE}/download/${slug}.zip`);
        fs.writeFileSync(zipPath, zipData);

        const unzipResult = spawnSync("unzip", ["-o", "-q", "-d", tmpDir, zipPath]);
        if (unzipResult.status !== 0) {
          throw new Error(`unzip failed: ${unzipResult.stderr?.toString().trim()}`);
        }

        const weightFiles = scanFontFiles(tmpDir);
        if (weightFiles.length === 0) {
          console.log("no TTF/OTF found, skipped");
          errors++;
          continue;
        }

        const weightEntries: FontInsert["weights"] = [];
        for (const wf of weightFiles) {
          const stored = storeLocal(wf.filePath, detail.name, wf.weight, wf.style);
          weightEntries.push({ weight: wf.weight, style: wf.style, file_path: stored.file_path ?? undefined });
        }

        await insertFont({
          id: slug,
          family: detail.name,
          label: detail.name,
          category: detail.category,
          source: "commercial",
          license: "free-commercial",
          designer: detail.designer ?? undefined,
          weights: weightEntries,
          tags: detail.tags,
          industry_scores: {},
          semantic_roles: defaultSemanticRoles(detail.category),
        });

        const wSummary = weightFiles.map((w) => `${w.weight}${w.style === "italic" ? "i" : ""}`).join(", ");
        console.log(`inserted (${detail.category}, [${wSummary}])`);
        inserted++;

      } catch (e) {
        console.log(`ERROR: ${e}`);
        errors++;
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
