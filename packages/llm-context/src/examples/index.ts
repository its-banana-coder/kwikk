/**
 * LLM Inspiration Example Framework
 *
 * Three granularities:
 *   typography — text-element hierarchy: font pair, sizing, effects, spacing
 *   scene      — a single complete scene with all 6 layers and annotations
 *   video      — a full multi-scene ProjectDocument with narrative notes
 *
 * Workflow:
 *   1. Create content in the kwikk editor
 *   2. Export the scene/project JSON
 *   3. Call registerExample() with the JSON + metadata + annotations
 *   4. Use queryExamples() + buildExamplesSection() to inject into LLM prompts
 */

import type { ElementNode, ProjectDocument, Scene } from "@kwikk/shared-types";
import type { VisualLanguage } from "../index.js";
import type {
  AnyExample,
  ContentNiche,
  ExampleMeta,
  ExampleQuery,
  MotionAxis,
  PaletteFamily,
  SceneExample,
  ScenePosition,
  TypographyExample,
  VideoExample,
} from "./types.js";
import { SCENE_ARCHETYPE_EXAMPLES } from "./scene_archetypes.js";
import { TYPOGRAPHY_EXAMPLES } from "./typography.js";

// ─── Registry ─────────────────────────────────────────────────────────────────

const _registry: AnyExample[] = [
  ...SCENE_ARCHETYPE_EXAMPLES,
  ...TYPOGRAPHY_EXAMPLES,
];

/** Register a new example in the library. Call this from content type / motion pattern files. */
export function registerExample(example: AnyExample): void {
  if (_registry.find((e) => e.id === example.id)) {
    throw new Error(`Example with id "${example.id}" already registered.`);
  }
  _registry.push(example);
}

/** Return all registered examples (read-only snapshot). */
export function getAllExamples(): AnyExample[] {
  return [..._registry];
}

// ─── Ingestion helpers ────────────────────────────────────────────────────────
// Use these to quickly wrap editor-exported JSON into framework examples.

/**
 * Create a TypographyExample from a list of text ElementNode objects (editor-exported).
 * The `elements` array should contain 2-4 text elements showing the hierarchy.
 */
export function createTypographyExample(
  id: string,
  label: string,
  fontPair: { headline: string; body: string; tone: string },
  meta: ExampleMeta,
  elements: ElementNode[],
  annotations: TypographyExample["annotations"],
): TypographyExample {
  return {
    kind: "typography",
    id,
    label,
    description: `${fontPair.headline} + ${fontPair.body} — ${fontPair.tone}`,
    fontPair,
    meta,
    elements,
    annotations,
  };
}

/**
 * Create a SceneExample from an editor-exported Scene object.
 * `subcategory` is the archetype name: CINEMATIC_HERO, TYPOGRAPHIC_STATEMENT, etc.
 */
export function createSceneExample(
  id: string,
  subcategory: string,
  label: string,
  description: string,
  meta: ExampleMeta,
  scene: Scene,
  annotations: SceneExample["annotations"],
): SceneExample {
  return { kind: "scene", id, subcategory, label, description, meta, scene, annotations };
}

/**
 * Create a VideoExample from an editor-exported ProjectDocument.
 * Only `name`, `viewport`, and `scenes` are used — other fields are stripped.
 */
export function createVideoExample(
  id: string,
  label: string,
  description: string,
  meta: ExampleMeta,
  project: Pick<ProjectDocument, "name" | "viewport" | "scenes">,
  annotations: VideoExample["annotations"],
): VideoExample {
  return { kind: "video", id, label, description, meta, project, annotations };
}

// ─── MetaBuilder helpers ──────────────────────────────────────────────────────
// Convenience constructors so you don't have to type ExampleMeta manually.

export function meta(
  tags: string[],
  mood: string[],
  palette: PaletteFamily,
  scenePosition: ScenePosition,
  motionAxis: MotionAxis,
  contentNiches: ContentNiche[],
  difficulty: ExampleMeta["difficulty"],
  visualLanguage?: VisualLanguage,
): ExampleMeta {
  return { tags, mood, palette, scenePosition, motionAxis, contentNiches, difficulty, visualLanguage };
}

// ─── Query engine ─────────────────────────────────────────────────────────────

function matchesMeta(example: AnyExample, query: ExampleQuery): boolean {
  const m = example.meta;

  if (query.kind) {
    const kinds = Array.isArray(query.kind) ? query.kind : [query.kind];
    if (!kinds.includes(example.kind as AnyExample["kind"])) return false;
  }

  if (query.tags && query.tags.length > 0) {
    if (!query.tags.some((t) => m.tags.includes(t))) return false;
  }

  if (query.mood && query.mood.length > 0) {
    if (!query.mood.some((mood) => m.mood.includes(mood))) return false;
  }

  if (query.palette && m.palette !== query.palette) return false;

  if (query.scenePosition && m.scenePosition !== query.scenePosition && m.scenePosition !== "any") {
    return false;
  }

  if (query.motionAxis && m.motionAxis !== query.motionAxis && m.motionAxis !== "mixed") {
    return false;
  }

  if (query.contentNiche && !m.contentNiches.includes(query.contentNiche) && !m.contentNiches.includes("general")) {
    return false;
  }

  if (query.visualLanguage && m.visualLanguage && m.visualLanguage !== query.visualLanguage) {
    return false;
  }

  return true;
}

/**
 * Query the example library.
 * Multiple criteria are ANDed together (except tags/mood which are ORed within themselves).
 */
export function queryExamples(query: ExampleQuery = {}): AnyExample[] {
  const results = _registry.filter((e) => matchesMeta(e, query));
  return query.maxResults ? results.slice(0, query.maxResults) : results;
}

// ─── Formatter ────────────────────────────────────────────────────────────────

function formatMeta(meta: ExampleMeta): string {
  const lines: string[] = [];
  if (meta.tags?.length) lines.push(`Tags: ${meta.tags.join(", ")}`);
  if (meta.mood?.length) lines.push(`Mood: ${meta.mood.join(", ")}`);
  lines.push(`Palette: ${meta.palette} | Position: ${meta.scenePosition} | Motion: ${meta.motionAxis}`);
  if (meta.contentNiches?.length) lines.push(`Niches: ${meta.contentNiches.join(", ")} | Difficulty: ${meta.difficulty}`);
  if (meta.visualLanguage) lines.push(`Visual language: ${meta.visualLanguage}`);
  return lines.join("\n");
}

function formatAnnotations(a: { whatMakesItGood?: string[]; keyDecisions?: string[]; remixHints?: string[]; avoidPatterns?: string[] }): string {
  const sections: string[] = [];
  if (a.whatMakesItGood?.length) sections.push("WHY THIS WORKS:\n" + a.whatMakesItGood.map((s) => `• ${s}`).join("\n"));
  if (a.keyDecisions?.length) sections.push("KEY DECISIONS:\n" + a.keyDecisions.map((s) => `• ${s}`).join("\n"));
  if (a.remixHints?.length) sections.push("REMIX THIS:\n" + a.remixHints.map((s) => `• ${s}`).join("\n"));
  if (a.avoidPatterns?.length) sections.push("AVOID:\n" + a.avoidPatterns.map((s) => `• ${s}`).join("\n"));
  return sections.join("\n\n");
}

function formatTypographyExample(ex: TypographyExample): string {
  const header = `═══ TYPOGRAPHY EXAMPLE: ${ex.id} — ${ex.label} ═══`;
  const sep = "─".repeat(Math.min(header.length, 72));
  const fontLine = `Font pair: ${ex.fontPair.headline} (headline) + ${ex.fontPair.body} (body) | Tone: ${ex.fontPair.tone}`;
  const elements = JSON.stringify(ex.elements, null, 2);
  return [
    header,
    sep,
    fontLine,
    formatMeta(ex.meta),
    "",
    "ELEMENTS JSON (these text elements demonstrate the hierarchy):",
    elements,
    "",
    formatAnnotations(ex.annotations),
    sep,
  ].join("\n");
}

function formatSceneExample(ex: SceneExample): string {
  const header = `═══ SCENE EXAMPLE: ${ex.id} — ${ex.label} ═══`;
  const sep = "─".repeat(Math.min(header.length, 72));
  const scene = JSON.stringify(ex.scene, null, 2);
  return [
    header,
    sep,
    `Archetype: ${ex.subcategory}`,
    ex.description,
    formatMeta(ex.meta),
    "",
    "SCENE JSON:",
    scene,
    "",
    formatAnnotations(ex.annotations),
    sep,
  ].join("\n");
}

function formatVideoExample(ex: VideoExample): string {
  const header = `═══ VIDEO EXAMPLE: ${ex.id} — ${ex.label} ═══`;
  const sep = "─".repeat(Math.min(header.length, 72));
  const project = JSON.stringify(ex.project, null, 2);
  const a = ex.annotations;
  const annotParts: string[] = [];
  if (a.narrative) annotParts.push(`NARRATIVE: ${a.narrative}`);
  if (a.scenePacing?.length) annotParts.push("SCENE PACING:\n" + a.scenePacing.map((s) => `• ${s}`).join("\n"));
  if (a.motionPhilosophy) annotParts.push(`MOTION PHILOSOPHY: ${a.motionPhilosophy}`);
  if (a.paletteRationale) annotParts.push(`PALETTE RATIONALE: ${a.paletteRationale}`);
  if (a.remixHints?.length) annotParts.push("REMIX THIS:\n" + a.remixHints.map((s) => `• ${s}`).join("\n"));
  const annot = annotParts.join("\n\n");
  return [
    header,
    sep,
    ex.description,
    formatMeta(ex.meta),
    "",
    "PROJECT JSON:",
    project,
    "",
    annot,
    sep,
  ].join("\n");
}

/**
 * Format a single example for LLM consumption.
 * Produces annotated text with the JSON and teaching notes.
 */
export function formatExampleForLLM(example: AnyExample): string {
  switch (example.kind) {
    case "typography": return formatTypographyExample(example);
    case "scene":      return formatSceneExample(example);
    case "video":      return formatVideoExample(example);
  }
}

/**
 * Build an EXAMPLES block for injection into LLM generation prompts.
 * Query the library, format the results, and return a ready-to-inject string.
 *
 * @param query  Optional filter criteria. Pass an empty object for all examples.
 * @param header Optional section header. Defaults to a generic intro.
 */
export function buildExamplesSection(
  query: ExampleQuery = {},
  header?: string,
): string {
  const examples = queryExamples(query);
  if (examples.length === 0) return "";

  const intro = header ?? `INSPIRATION EXAMPLES — ${examples.length} curated example(s) matching your generation context. Study these — especially WHY THEY WORK and the KEY DECISIONS. Use them as inspiration, not templates to copy literally.`;

  const blocks = examples.map(formatExampleForLLM).join("\n\n");

  return `${intro}\n\n${blocks}`;
}

// ─── API loader ───────────────────────────────────────────────────────────────

/**
 * Fetch examples from the API and register them into the in-memory registry.
 * Call this once at generation-pipeline startup (server-side only).
 *
 * @param apiBase  Base URL of the API server, e.g. "http://localhost:8080"
 * @param query    Optional filter to only load relevant examples
 */
export async function loadExamplesFromAPI(
  apiBase: string,
  query: ExampleQuery = {},
): Promise<number> {
  const params = new URLSearchParams();
  if (query.kind) params.set("kind", Array.isArray(query.kind) ? query.kind.join(",") : query.kind);
  if (query.tags?.length) params.set("tags", query.tags.join(","));
  if (query.palette) params.set("palette", query.palette);
  if (query.scenePosition) params.set("scene_position", query.scenePosition);
  if (query.contentNiche) params.set("content_niche", query.contentNiche);
  if (query.maxResults) params.set("limit", String(query.maxResults));

  const url = `${apiBase}/v1/examples?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`loadExamplesFromAPI: ${res.status} ${await res.text()}`);

  const { examples } = await res.json() as { examples: AnyExample[] };
  let registered = 0;
  for (const ex of examples) {
    if (!_registry.find((e) => e.id === ex.id)) {
      _registry.push(ex);
      registered++;
    }
  }
  return registered;
}

// Re-export types for convenience
export type {
  AnyExample,
  ExampleCategory,
  ExampleMeta,
  ExampleQuery,
  SceneExample,
  TypographyExample,
  VideoExample,
} from "./types.js";
