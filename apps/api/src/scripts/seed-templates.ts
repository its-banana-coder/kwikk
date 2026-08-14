#!/usr/bin/env tsx
/**
 * Seed curated templates into the templates table.
 * Run: pnpm --filter @kwikk/api exec tsx src/scripts/seed-templates.ts
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

import { getPool, initDb } from "../db.js";
import { embed, toVectorLiteral } from "../embed.js";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__dir, "../../../..");

const TEMPLATES = [
  {
    file: "first_hour_project.json",
    name: "Protect Your First Hour",
    description: "Optimize your mornings, avoid digital distractions, and configure deep focus work zones for maximum daily impact.",
    category: "Productivity",
    difficulty: "Beginner",
    thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80",
    tags: ["productivity", "morning routine", "focus", "digital wellness"],
  },
  {
    file: "exampleProject.json",
    name: "Quick Start Example",
    description: "A simple starter template to explore the scene graph, animations, and subtitle system.",
    category: "Tutorial",
    difficulty: "Beginner",
    thumbnail_url: "https://images.unsplash.com/photo-1600267185393-1082f0e0b82c?w=600&auto=format&fit=crop&q=80",
    tags: ["starter", "example", "tutorial", "beginner"],
  },
];

async function run() {
  await initDb();
  const pool = getPool();

  for (const tmpl of TEMPLATES) {
    const filePath = path.join(MONOREPO_ROOT, tmpl.file);
    let doc: unknown;
    try {
      doc = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      console.log(`  SKIP  ${tmpl.file} — file not found`);
      continue;
    }

    const docAny = doc as any;
    const scenes: any[] = docAny.scenes ?? [];
    const sceneCount = scenes.length;
    const estimatedDurationMs = scenes.reduce((s: number, sc: any) => s + (sc.durationMs ?? 3000), 0);

    // Check if already exists
    const existing = await pool.query<{ id: number }>(
      "SELECT id FROM templates WHERE name = $1 AND deleted_at IS NULL LIMIT 1",
      [tmpl.name]
    );

    let id: number;
    if (existing.rows.length > 0) {
      id = existing.rows[0].id;
      await pool.query(
        `UPDATE templates SET description=$1, category=$2, tags=$3, thumbnail_url=$4, document=$5,
           estimated_duration_ms=$6, scene_count=$7, difficulty=$8, updated_at=NOW()
         WHERE id=$9`,
        [tmpl.description, tmpl.category, tmpl.tags, tmpl.thumbnail_url, doc,
         estimatedDurationMs, sceneCount, tmpl.difficulty, id]
      );
      console.log(`  UPDATE  "${tmpl.name}"  id=${id}  scenes=${sceneCount}  dur=${(estimatedDurationMs / 1000).toFixed(1)}s`);
    } else {
      const res = await pool.query<{ id: number }>(
        `INSERT INTO templates (name, description, category, tags, thumbnail_url, document,
                                estimated_duration_ms, scene_count, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [tmpl.name, tmpl.description, tmpl.category, tmpl.tags, tmpl.thumbnail_url, doc,
         estimatedDurationMs, sceneCount, tmpl.difficulty]
      );
      id = res.rows[0].id;
      console.log(`  INSERT  "${tmpl.name}"  id=${id}  scenes=${sceneCount}  dur=${(estimatedDurationMs / 1000).toFixed(1)}s`);
    }

    // Generate and store embedding
    const embedText = `${tmpl.name} ${tmpl.category} ${tmpl.description} ${tmpl.tags.join(" ")}`;
    const vec = await embed(embedText);
    if (vec) {
      await pool.query(
        `UPDATE templates SET embedding = $1::vector WHERE id = $2`,
        [toVectorLiteral(vec), id]
      );
      console.log(`          embedding stored`);
    } else {
      console.log(`          embedding skipped (no embed API)`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
