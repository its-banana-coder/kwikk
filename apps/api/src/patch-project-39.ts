/**
 * One-off patch for project 39 — fixes all bad image elements:
 *  - icon_element with hallucinated base64 PNG → correct SVG from icon catalog
 *  - hero_image with hallucinated base64 PNG → real Pixabay photo
 *  - icon_element with empty src → correct SVG from icon catalog
 *
 * Run: pnpm --filter @kwikk/api exec tsx src/patch-project-39.ts
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { queryOne, query } from "./db.js";
import { searchImages } from "./pixabay.js";
import type { ProjectDocument } from "@kwikk/shared-types";

const PROJECT_ID = 39;

// Map scene_id → best icon name from the duotone catalog
const SCENE_ICON_MAP: Record<string, { name: string; color: string }> = {
  scene_item_1:  { name: "clock",        color: "#a78bfa" }, // Post at Peak Hours
  scene_item_2:  { name: "music-notes",  color: "#a78bfa" }, // Ride Trending Sounds
  scene_item_4:  { name: "hash",         color: "#a78bfa" }, // Master Hashtag Strategy
  scene_tension: { name: "lightbulb",    color: "#f59e0b" }, // The Plot Twist Setup
};

// Map scene_id → Pixabay query for hero_image elements
const SCENE_PHOTO_MAP: Record<string, string> = {
  scene_item_3: "person phone social media engagement hook",
};

async function getIconDataUrl(name: string, color: string): Promise<string | null> {
  const rows = await query<{ file_path: string }>(
    "SELECT file_path FROM icons WHERE name = $1 AND style = 'duotone' AND deleted_at IS NULL LIMIT 1",
    [name]
  );
  const row = rows[0];
  if (!row) {
    console.warn(`  Icon not found: ${name}`);
    return null;
  }
  let svg = readFileSync(row.file_path, "utf-8");
  svg = svg.replace(/<svg /, `<svg fill="${color}" `);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function getPixabayUrl(query: string): Promise<string | null> {
  const results = await searchImages(query, { orientation: "vertical", per_page: 5 });
  return results[0]?.webformatURL ?? null;
}

async function main() {
  const project = await queryOne<{ meta: ProjectDocument }>(
    "SELECT meta FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [PROJECT_ID]
  );
  if (!project) throw new Error(`Project ${PROJECT_ID} not found`);

  const doc: ProjectDocument = project.meta;
  let changed = 0;

  for (const scene of doc.scenes) {
    for (const el of scene.elements) {
      if (el.type !== "image") continue;

      const src = el.content?.src ?? "";
      const isBadSrc = !src.startsWith("https://") && !src.startsWith("http://");
      if (!isBadSrc) continue;

      if (el.semanticRole === "icon_element" || el.semanticRole?.includes("icon")) {
        const iconSpec = SCENE_ICON_MAP[scene.id];
        if (!iconSpec) {
          console.log(`  [skip] ${scene.id}/${el.id} — no icon mapping`);
          continue;
        }
        console.log(`  [icon] ${scene.id}/${el.id} → ${iconSpec.name}`);
        const dataUrl = await getIconDataUrl(iconSpec.name, iconSpec.color);
        if (dataUrl) {
          el.content = { ...el.content, src: dataUrl };
          changed++;
        }
      } else if (el.semanticRole === "hero_image" || el.semanticRole === "product_image") {
        const pixQuery = SCENE_PHOTO_MAP[scene.id] ?? scene.name;
        console.log(`  [photo] ${scene.id}/${el.id} → Pixabay: "${pixQuery}"`);
        const url = await getPixabayUrl(pixQuery);
        if (url) {
          el.content = { ...el.content, src: url };
          changed++;
          console.log(`    → ${url.slice(0, 70)}`);
        } else {
          console.warn(`    → no results`);
        }
      }
    }
  }

  if (changed === 0) {
    console.log("Nothing to patch.");
    return;
  }

  await queryOne(
    "UPDATE projects SET meta = $1, updated_at = now() WHERE id = $2",
    [JSON.stringify(doc), PROJECT_ID]
  );

  console.log(`\n✓ Patched ${changed} element(s) in project ${PROJECT_ID}`);
  console.log(`  Open: http://localhost:5173/?projectId=${PROJECT_ID}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
