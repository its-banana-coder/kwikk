#!/usr/bin/env tsx
import path from "node:path";
import { getPool } from "./db.js";
import { syncBeautifulWebType } from "./beautifulWebType.js";

function parseArgs(argv: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, "true");
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const upsertDb = args.get("upsert-db") !== "false";

  try {
    const result = await syncBeautifulWebType({
      sourceDir: args.get("source-dir"),
      targetFontDir: args.get("target-font-dir")
        ? path.resolve(args.get("target-font-dir")!)
        : undefined,
      cloneIfMissing: args.get("clone-if-missing") !== "false",
      upsertDb,
      dryRun: args.get("dry-run") === "true",
    });

    console.log(`Synced ${result.fontCount} beautiful-web-type families.`);
    console.log(`Source: ${result.sourceDir}`);
    console.log(`Copied families: ${result.copiedFamilyCount}`);
    console.log(`Copied files: ${result.copiedFileCount}`);
    console.log(`DB upserts: ${result.upsertedCount}`);
  } finally {
    if (upsertDb) {
      await getPool().end().catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
