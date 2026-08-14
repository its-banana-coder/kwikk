/**
 * patch-project-icons.ts
 * Adds person + currency-dollar Phosphor SVG icons to scene_hook of project 27.
 * Run: DATABASE_URL=... pnpm --filter @kwikk/api exec tsx src/patch-project-icons.ts
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { query, queryOne } from "./db.js";
import type { ProjectDocument, ElementNode, Animation } from "@kwikk/shared-types";

const PROJECT_ID = 27;
const GOLD = "#C4A882";

function anim(
  id: string,
  type: Animation["type"],
  startMs: number,
  durationMs: number,
  extra?: Partial<Animation>,
): Animation {
  return { id, type, startMs, durationMs, easing: "easeOut", ...extra };
}

async function getIconDataUrl(name: string, color: string): Promise<string> {
  const rows = await query<{ file_path: string }>(
    "SELECT file_path FROM icons WHERE name = $1 AND deleted_at IS NULL LIMIT 1",
    [name],
  );
  const row = rows[0];
  if (!row) throw new Error(`Icon not found: ${name}`);
  let svg = readFileSync(row.file_path, "utf-8");
  svg = svg.replace(/<svg /, `<svg fill="${color}" `);
  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

async function main() {
  const project = await queryOne<{ meta: ProjectDocument }>(
    "SELECT meta FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [PROJECT_ID],
  );
  if (!project) throw new Error(`Project ${PROJECT_ID} not found`);

  const doc: ProjectDocument = project.meta;
  const scene = doc.scenes.find((s) => s.id === "scene_hook");
  if (!scene) throw new Error("scene_hook not found");

  // Remove any previously patched icons so we can re-run idempotently
  scene.elements = scene.elements.filter(
    (e) => !["el_hook_icon_person", "el_hook_icon_money", "el_hook_top_overlay"].includes(e.id),
  );

  const [personSrc, moneySrc] = await Promise.all([
    getIconDataUrl("person", GOLD),
    getIconDataUrl("currency-dollar", GOLD),
  ]);

  const overlay: ElementNode = {
    id: "el_hook_top_overlay",
    type: "shape",
    semanticRole: "scene_backdrop",
    layout: { x: 0, y: 0, width: 1080, height: 420, zIndex: 2, rotation: 0, scale: 1, opacity: 0.45 },
    style: { backgroundColor: "#000000" },
    animations: [anim("el_hook_top_overlay_fadeIn", "fadeIn", 0, 600)],
    content: { shape: "rectangle" },
  };

  const personIcon: ElementNode = {
    id: "el_hook_icon_person",
    type: "image",
    semanticRole: "supporting_caption",
    layout: { x: 190, y: 80, width: 200, height: 200, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
    style: {},
    animations: [
      anim("el_hook_icon_person_fadeIn", "fadeIn", 0, 500),
      anim("el_hook_icon_person_slideDown", "slideDown", 0, 600, { fromOffset: -40 }),
    ],
    content: { src: personSrc },
  };

  const moneyIcon: ElementNode = {
    id: "el_hook_icon_money",
    type: "image",
    semanticRole: "supporting_caption",
    layout: { x: 690, y: 80, width: 200, height: 200, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
    style: {},
    animations: [
      anim("el_hook_icon_money_fadeIn", "fadeIn", 200, 500),
      anim("el_hook_icon_money_slideDown", "slideDown", 200, 600, { fromOffset: -40 }),
    ],
    content: { src: moneySrc },
  };

  scene.elements.unshift(overlay, personIcon, moneyIcon);

  await query(
    "UPDATE projects SET meta = $1, updated_at = now() WHERE id = $2",
    [JSON.stringify(doc), PROJECT_ID],
  );

  console.log(`✓ Patched project ${PROJECT_ID} — person + currency-dollar icons added to scene_hook`);
  console.log(`  Open: http://localhost:5173/?projectId=${PROJECT_ID}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
