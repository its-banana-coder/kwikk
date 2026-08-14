#!/usr/bin/env tsx
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { insertFont, storeLocal, storeS3, ensureSchema } from "@kwikk/font-manager";
import type { FontCategory, FontSource, FontStyle, FontInsert } from "@kwikk/font-manager";

// Tiny CLI arg parser
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

function opt(key: string, args: Map<string, string>, fallback = ""): string {
  return args.get(key) ?? fallback;
}

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
      files.push({ weight, style: isItalic ? "italic" : "normal", filePath: path.join(dir, fname) });
    }
  }
  return files;
}

function titleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  
  const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
  const MONOREPO_ROOT = path.resolve(SCRIPTS_DIR, "..");
  const fallbackQueueDir = path.join(MONOREPO_ROOT, "data", "fonts", "import-queue");

  const queueDir = opt("dir", args);
  const storage = opt("storage", args, "local") as "local" | "s3";
  const defaultCategory = opt("category", args, "display") as FontCategory;
  const defaultLicense = opt("license", args, "OFL-1.1");
  const defaultSource = opt("source", args, "custom") as FontSource;

  const absoluteQueueDir = queueDir ? path.resolve(queueDir) : fallbackQueueDir;
  if (!fs.existsSync(absoluteQueueDir)) {
    console.error(`Queue directory does not exist: ${absoluteQueueDir}`);
    process.exit(1);
  }

  console.log(`Scanning queue directory: ${absoluteQueueDir}`);
  const items = fs.readdirSync(absoluteQueueDir, { withFileTypes: true });
  const subdirs = items.filter((item) => item.isDirectory()).map((item) => item.name);

  if (subdirs.length === 0) {
    console.log("No subdirectories found in queue directory.");
    console.error("Please place font files inside a subdirectory named after the Font Family.");
    console.error("Example: data/fonts/import-queue/CS-Brooklyn/CS-Brooklyn-Regular.ttf");
    process.exit(1);
  }

  await ensureSchema();

  let successCount = 0;

  for (const dirName of subdirs) {
    const dirPath = path.join(absoluteQueueDir, dirName);
    const ttfFiles = scanTtfDir(dirPath);
    if (ttfFiles.length === 0) {
      console.log(`Skipping directory "${dirName}": No TTF/OTF/WOFF/WOFF2 files found.`);
      continue;
    }

    const familyName = titleCase(dirName);
    const id = dirName.toLowerCase().replace(/\s+/g, "-");

    console.log(`\nProcessing font family: "${familyName}" (${id})`);
    console.log(`Found ${ttfFiles.length} file(s) under ${dirName}:`);

    const weightEntries: FontInsert["weights"] = [];

    for (const f of ttfFiles) {
      console.log(`  - ${f.weight}${f.style === "italic" ? "-italic" : ""} — ${path.basename(f.filePath)}`);
      let stored: { file_path: string | null; s3_key: string | null };
      if (storage === "s3") {
        console.log(`    Uploading to S3...`);
        stored = await storeS3(f.filePath, familyName, f.weight, f.style);
      } else {
        stored = storeLocal(f.filePath, familyName, f.weight, f.style);
        console.log(`    Copied to ${stored.file_path}`);
      }
      weightEntries.push({
        weight: f.weight,
        style: f.style,
        file_path: stored.file_path ?? undefined,
        s3_key: stored.s3_key ?? undefined,
      });
    }

    const input: FontInsert = {
      id,
      family: familyName,
      label: familyName,
      category: defaultCategory,
      source: defaultSource,
      license: defaultLicense,
      weights: weightEntries,
      tags: [id, defaultCategory],
      industry_scores: { tech: 0.5, editorial: 0.5 },
      semantic_roles: { headline: 0.8, body: 0.5 },
      pairings: [],
    };

    console.log(`Inserting "${familyName}" into PostgreSQL database...`);
    try {
      await insertFont(input);
      console.log(`Successfully imported "${familyName}"!`);
      successCount++;
    } catch (err) {
      console.error(`Failed to insert "${familyName}":`, err);
    }
  }

  console.log(`\nImport complete. Successfully imported ${successCount} font families.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
