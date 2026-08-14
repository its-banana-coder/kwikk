/**
 * Executes tool calls from the LLM.
 * Static tools return immediately from in-process data.
 * Dynamic tools query Postgres.
 * The output tool validates + saves the ProjectDocument.
 */

import { query, queryOne } from "./db.js";
import { executeStaticTool } from "@kwikk/llm-context";
import { validateProjectDocument, DEFAULT_VIEWPORT } from "@kwikk/scene-graph";
import type { ProjectDocument, ElementType } from "@kwikk/shared-types";
import { ensureLocalAsset } from "./routes/assets.js";

export type ToolCallInput = Record<string, unknown>;

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export const PROJECT_SAVED_SENTINEL = "__project_saved__";

/**
 * Normalize an AI-generated ProjectDocument before validation.
 * Fixes common model quirks without changing the semantic meaning.
 * Also expands server-side defaults so the LLM doesn't have to output them:
 *   - layout: rotation/scale/opacity default to 0/1/1
 *   - animations: missing id auto-generated from element id + type + index
 *   - timelineTracks: generated from scenes if absent
 */
// Infer semanticRole from element id/type when model omits it
function inferSemanticRole(id: string, type: string): string {
  const lower = id.toLowerCase();
  if (lower.includes("background") || lower.includes("backdrop")) return "background";
  if (lower.includes("logo")) return "brand_logo";
  if (lower.includes("hero") && type === "image") return "hero_image";
  if (lower.includes("hero")) return "headline";
  if (lower.includes("headline") || lower.includes("title")) return "headline";
  if (lower.includes("subtitle") || lower.includes("sub")) return "subtitle";
  if (lower.includes("caption")) return "supporting_caption";
  if (lower.includes("cta") || lower.includes("button")) return "cta";
  if (lower.includes("icon")) return "icon_element";
  if (lower.includes("divider")) return "divider";
  if (lower.includes("body") || lower.includes("copy") || lower.includes("text")) return "body_copy";
  if (type === "shape" && (lower.includes("panel") || lower.includes("card"))) return "panel";
  if (type === "shape" && lower.includes("badge")) return "badge";
  if (type === "shape" && lower.includes("cursor")) return "cursor";
  if (type === "shape" && (lower.includes("dot") || lower.includes("pill") || lower.includes("header"))) return "decorative_shape";
  if (type === "image") return "hero_image";
  if (type === "shape") return "decorative_shape";
  return "body_copy";
}

async function normalizeDocument(doc: ProjectDocument): Promise<ProjectDocument> {
  // Filter out scenes that are clearly malformed (element IDs used as scene IDs,
  // or empty elements array with a non-scene-like id).
  // Also parse scenes that were stored as JSON strings (model sometimes wraps them).
  const rawScenes = (doc.scenes ?? []).flatMap((rawScene, sceneIdx) => {
    // Parse if the LLM output the scene as a JSON string inside the array
    let scene = rawScene as Record<string, unknown>;
    if (typeof rawScene === "string") {
      try { scene = JSON.parse(rawScene) as Record<string, unknown>; } catch { return []; }
    }
    // Generate a fallback id from name or index rather than dropping
    if (!scene.id) {
      const nameSlug = String(scene.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
      scene = { ...scene, id: nameSlug || `scene_${sceneIdx}` };
    }
    // Element-style IDs (e.g. "el_scene_fix_2_hero_phrase") sneaking in as scenes
    if (String(scene.id).startsWith("el_") && (!scene.elements || (scene.elements as unknown[]).length === 0)) return [];
    return [scene as unknown as typeof rawScene];
  });

  const scenes = rawScenes.map((scene) => {
    // LLM sometimes uses "duration" instead of "durationMs", or omits it entirely — fill default
    const raw = scene as Record<string, unknown>;
    const dur = Number(raw.durationMs ?? raw.duration ?? 0);
    return { ...scene, durationMs: dur > 0 ? dur : 5000 } as typeof scene;
  }).map((scene) => ({
    ...scene,
    elements: (scene.elements ?? []).map((el, elIdx) => {
      // Auto-generate element id if missing
      const elId = el.id ?? `${(scene as Record<string,unknown>).id}_el_${elIdx}`;

      // Fill layout defaults so LLM can omit them
      const layout = { ...{ rotation: 0, scale: 1, opacity: 1 }, ...el.layout };

      // A stale schema hint (buildSteppedAssemblySystemContext) documented `opacity` as a style
      // field instead of a layout field — LayoutProps.opacity is the only one CSSSceneRenderer
      // actually applies as alpha; StyleProps has no `opacity` at all. When the LLM followed that
      // hint and layout.opacity was never explicitly set (so it just got the 1.0 default above),
      // honor the style-level value as the real intent instead of silently discarding it — this is
      // exactly what turned semi-transparent scrim overlays into fully opaque blocks hiding the
      // image/video behind them.
      const styleOpacity = (el.style as Record<string, unknown> | undefined)?.opacity;
      if (typeof styleOpacity === "number" && el.layout?.opacity === undefined) {
        layout.opacity = styleOpacity;
      }

      // Auto-generate animation ids if missing (use elId, not el.id, since el.id may be absent)
      const animations = (el.animations ?? []).map((anim, i) => ({
        ...anim,
        id: anim.id ?? `${elId}_${anim.type}_${i}`,
      }));

      // Coerce invalid element types — model sometimes uses semanticRole as type
      const TYPE_COERCE: Record<string, string> = {
        icon_element: "image",
        icon: "image",
        background_image: "image",
        product_image: "image",
        hero_image: "image",
        brand_logo: "image",
        cta_backdrop: "shape",
        scene_backdrop: "shape",
        divider: "shape",
      };
      const type = (TYPE_COERCE[el.type] ?? el.type) as ElementType;

      // Infer semanticRole if model omitted it
      const semanticRole = el.semanticRole ?? inferSemanticRole(String(elId), type);

      // Coerce string content → { text }. Shallow-copied (not the raw el.content reference)
      // since localizeDocumentAssets() below rewrites .src/.fillImageSrc in place on this
      // object once download-and-localize completes — mutating the caller's original input
      // would be a surprising side effect if the same rawDoc were reused elsewhere.
      const content =
        typeof el.content === "string"
          ? { text: el.content }
          : { ...(el.content ?? {}) };

      // Normalize shape fill: fillColor / background / fill → backgroundColor, the only fill
      // color field CSSSceneRenderer's buildShapeContent (and StyleProps) actually recognizes.
      // A prior version of this wrote to a `style.fill` key that isn't part of StyleProps at
      // all — the renderer silently ignored it and every such shape fell back to its hardcoded
      // default fill (#334155), which is why AI-generated scrim/backdrop shapes kept rendering
      // as a flat blue-gray block instead of their intended color.
      let style = el.style as Record<string, unknown> | undefined;
      if (style && type === "shape") {
        const fillColor = style.fillColor ?? style.background ?? style.fill;
        if (fillColor !== undefined && style.backgroundColor === undefined) {
          style = { ...style, backgroundColor: fillColor };
        }
      }

      return { ...el, id: elId, type, semanticRole, layout, animations, content, style: style ?? {} };
    }),
  }));

  // Deduplicate element IDs across all scenes — stepped generator can produce collisions
  const seenElIds = new Set<string>();
  const dedupedScenes = scenes.map((scene) => ({
    ...scene,
    elements: scene.elements.map((el) => {
      if (!seenElIds.has(el.id)) { seenElIds.add(el.id); return el; }
      let suffix = 2;
      while (seenElIds.has(`${el.id}_${suffix}`)) suffix++;
      const newId = `${el.id}_${suffix}`;
      seenElIds.add(newId);
      return { ...el, id: newId };
    }),
  }));

  // Generate timelineTracks from scenes if the LLM omitted them
  const timelineTracks = (() => {
    if (doc.timelineTracks?.length) return doc.timelineTracks;
    let startMs = 0;
    return scenes.map((scene) => {
      const track = { id: `track_${scene.id}`, sceneId: scene.id, startMs, durationMs: scene.durationMs, layer: 0 };
      startMs += scene.durationMs;
      return track;
    });
  })();

  const normalized = { ...doc, scenes: dedupedScenes, timelineTracks, viewport: doc.viewport ?? DEFAULT_VIEWPORT };
  return localizeDocumentAssets(normalized);
}

/**
 * Downloads every external image/video src an AI-generated document points at (Pixabay CDN
 * links, etc.) into the local asset library and rewrites content.src/fillImageSrc + scene
 * background.imageSrc to the resulting /uploads/ URL — so the editor/renderer never has to
 * fetch a remote host on first paint. Processes elements sequentially (not Promise.all) so
 * a background photo reused across multiple scenes hits the ensureLocalAsset cache instead
 * of racing multiple downloads of the same URL (see the source_url unique index).
 */
async function localizeDocumentAssets(doc: ProjectDocument): Promise<ProjectDocument> {
  const baseUrl = process.env.ASSET_BASE_URL ?? "http://localhost:8080";
  const scenes: typeof doc.scenes = [];
  for (const scene of doc.scenes ?? []) {
    const elements: typeof scene.elements = [];
    for (const el of scene.elements ?? []) {
      if (!el.content?.src && !el.content?.fillImageSrc) {
        elements.push(el);
        continue;
      }
      const content = { ...el.content };
      if (content.src) content.src = await ensureLocalAsset(content.src, baseUrl);
      if (content.fillImageSrc) content.fillImageSrc = await ensureLocalAsset(content.fillImageSrc, baseUrl);
      elements.push({ ...el, content });
    }
    const background = scene.background?.imageSrc
      ? { ...scene.background, imageSrc: await ensureLocalAsset(scene.background.imageSrc, baseUrl) }
      : scene.background;
    scenes.push({ ...scene, elements, background });
  }
  return { ...doc, scenes };
}

function slimElement(el: Record<string, unknown>) {
  const style = el.style as Record<string, unknown> | undefined;
  const layout = el.layout as Record<string, unknown> | undefined;
  const content = el.content as Record<string, unknown> | undefined;
  const slim: Record<string, unknown> = { type: el.type, semanticRole: el.semanticRole };
  if (layout) slim.layout = { x: layout.x, y: layout.y, w: layout.width, h: layout.height, z: layout.zIndex };
  if (style) {
    const s: Record<string, unknown> = {};
    for (const k of ["fontFamily", "fontSize", "fontWeight", "color", "textAlign", "backgroundColor", "opacity"]) {
      if (style[k] !== undefined) s[k] = style[k];
    }
    if (Object.keys(s).length) slim.style = s;
  }
  if (content?.text) slim.text = content.text;
  return slim;
}

// meta/annotations on inspiration_examples are free-form JSONB — callers (MCP zod validation
// aside) can still write a bare string where an array is expected (e.g. mood: "editorial"
// instead of mood: ["editorial"]). Coerce defensively so one malformed row doesn't crash
// search_inspiration for every caller.
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v) return [v];
  return [];
}

function slimExampleData(kind: string, data: unknown): string {
  try {
    if (kind === "typography") {
      const elements = Array.isArray(data) ? data : [];
      return JSON.stringify(elements.map((el) => slimElement(el as Record<string, unknown>)), null, 2);
    }
    if (kind === "scene") {
      const scene = data as Record<string, unknown>;
      return JSON.stringify({
        background: scene.background,
        elements: (scene.elements as unknown[] ?? []).map((el) => slimElement(el as Record<string, unknown>)),
      }, null, 2);
    }
    if (kind === "video") {
      const project = data as Record<string, unknown>;
      const scenes = Array.isArray(project.scenes) ? (project.scenes as Record<string, unknown>[]) : [];
      const maxScenes = 6;
      return JSON.stringify({
        viewport: project.viewport,
        brandTheme: project.brandTheme,
        sceneCount: scenes.length,
        scenes: scenes.slice(0, maxScenes).map((scene) => ({
          id: scene.id,
          name: scene.name,
          durationMs: scene.durationMs,
          background: scene.background,
          elements: (scene.elements as unknown[] ?? []).map((el) => slimElement(el as Record<string, unknown>)),
        })),
        ...(scenes.length > maxScenes ? { note: `${scenes.length - maxScenes} more scene(s) omitted — fetch with get_inspiration_example for the full project.` } : {}),
      }, null, 2);
    }
  } catch { /* fall through */ }
  return "";
}

export async function executeTool(
  name: string,
  input: ToolCallInput,
  context?: { userId?: number }
): Promise<ToolResult> {
  const staticNames = [
    "list_animation_types",
    "list_compositions",
    "list_transitions",
    "list_typography_pairs",
    "describe_coordinate_system",
    "list_visual_effects",
    "describe_custom_css_animation",
  ];
  if (staticNames.includes(name)) {
    return { ok: true, data: executeStaticTool(name, input) };
  }

  switch (name) {
    // ── Dynamic tools ──────────────────────────────────────────────────────────

    case "search_icons": {
      const q = String(input.query ?? "").trim();
      const style = String(input.style ?? "duotone");
      const limit = Math.min(Number(input.limit ?? 10), 50);
      const like = `%${q.toLowerCase()}%`;

      const rows = await query<{ name: string; style: string; tags: string[] }>(
        `SELECT name, style, tags FROM icons
         WHERE style = $1
           AND (lower(name) LIKE $2 OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $2))
           AND deleted_at IS NULL
         ORDER BY name LIMIT $3`,
        [style, like, limit]
      );
      return { ok: true, data: rows };
    }

    case "search_fonts": {
      const q = String(input.query ?? "").trim();
      const role = input.semantic_role as string | undefined;
      const industry = input.industry as string | undefined;
      const pairCategory = input.pair_category as string | undefined;
      const pairRole = input.pair_role as string | undefined;

      type FontRow = { id: string; family: string; label: string; category: string; subcategory: string | null; pair_category: string | null; pair_role: string | null; weight: number | null; style: string | null };

      const joins: string[] = [];
      const wheres: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      if (q) {
        joins.push(`LEFT JOIN font_tags ft_q ON ft_q.font_id = f.id`);
        wheres.push(`(lower(f.family) LIKE $${p} OR lower(f.label) LIKE $${p} OR lower(ft_q.tag) LIKE $${p})`);
        params.push(`%${q.toLowerCase()}%`); p++;
      }
      if (role) {
        joins.push(`JOIN font_semantic_roles fsr ON fsr.font_id = f.id AND fsr.semantic_role = $${p} AND fsr.score >= 0.5`);
        params.push(role); p++;
      }
      if (industry) {
        joins.push(`JOIN font_industry_scores fis ON fis.font_id = f.id AND fis.industry = $${p} AND fis.score >= 0.5`);
        params.push(industry); p++;
      }
      if (pairCategory) { wheres.push(`f.pair_category = $${p}`); params.push(pairCategory); p++; }
      if (pairRole)     { wheres.push(`f.pair_role = $${p}`);     params.push(pairRole);     p++; }

      let sql = `SELECT DISTINCT f.id, f.family, f.label, f.category, f.subcategory, f.pair_category, f.pair_role, fw.weight, fw.style
                 FROM fonts f LEFT JOIN font_weights fw ON fw.font_id = f.id`;
      if (joins.length) sql += " " + joins.join(" ");
      if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
      sql += ` ORDER BY f.label, fw.weight LIMIT $${p}`;
      params.push(25);

      const rows = await query<FontRow>(sql, params);

      const order: string[] = [];
      const byId = new Map<string, { family: string; label: string; category: string; subcategory: string | null; pair_category: string | null; pair_role: string | null; weights: { weight: number; style: string }[]; tags: string[] }>();
      for (const r of rows) {
        if (!byId.has(r.id)) {
          order.push(r.id);
          byId.set(r.id, { family: r.family, label: r.label, category: r.category, subcategory: r.subcategory, pair_category: r.pair_category, pair_role: r.pair_role, weights: [], tags: [] });
        }
        if (r.weight != null && r.style != null) byId.get(r.id)!.weights.push({ weight: r.weight, style: r.style });
      }

      // Fetch tags for the returned fonts
      if (order.length > 0) {
        const ph = order.map((_, i) => `$${i + 1}`).join(",");
        const tags = await query<{ font_id: string; tag: string }>(
          `SELECT font_id, tag FROM font_tags WHERE font_id IN (${ph})`, order
        );
        for (const t of tags) byId.get(t.font_id)?.tags.push(t.tag);
      }

      return { ok: true, data: order.map((id) => byId.get(id)!) };
    }

    case "search_inspiration": {
      const kind = String(input.kind ?? "").trim();
      const tagsRaw = Array.isArray(input.tags) ? (input.tags as string[]) : [];
      const contentNiche = String(input.content_niche ?? "").trim();

      const conditions: string[] = ["deleted_at IS NULL"];
      const params: unknown[] = [];

      if (kind === "typography" || kind === "scene" || kind === "video") {
        params.push(kind);
        conditions.push(`kind = $${params.length}`);
      }

      if (tagsRaw.length > 0) {
        params.push(tagsRaw);
        conditions.push(`meta->'tags' ?| $${params.length}`);
      }

      if (contentNiche) {
        params.push(contentNiche);
        params.push("general");
        const n1 = params.length - 1;
        const n2 = params.length;
        conditions.push(`(meta->'contentNiches' ? $${n1} OR meta->'contentNiches' ? $${n2})`);
      }

      params.push(2);
      type ExRow = { id: string; kind: string; label: string; description: string; meta: Record<string, unknown>; font_pair: Record<string, unknown> | null; data: unknown; annotations: Record<string, unknown> };
      const rows = await query<ExRow>(
        `SELECT id, kind, label, description, meta, font_pair, data, annotations
         FROM inspiration_examples
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params
      );

      if (rows.length === 0) {
        return { ok: true, data: "No matching inspiration examples found for those criteria." };
      }

      const formatted = rows.map((row) => {
        const a = row.annotations ?? {};
        const m = row.meta ?? {};
        const parts: string[] = [
          `[${row.kind.toUpperCase()} EXAMPLE: ${row.id}] ${row.label}`,
          row.description,
        ];
        const tags = asStringArray(m.tags);
        const mood = asStringArray(m.mood);
        if (tags.length) parts.push(`Tags: ${tags.join(", ")}`);
        if (mood.length) parts.push(`Mood: ${mood.join(", ")}`);
        if (row.kind === "typography" && row.font_pair) {
          const fp = row.font_pair as { headline?: string; body?: string; tone?: string };
          parts.push(`Font pair: ${fp.headline} (headline) + ${fp.body} (body) | Tone: ${fp.tone}`);
        }
        if (row.data) parts.push("DATA:\n" + slimExampleData(row.kind, row.data));
        const annotParts: string[] = [];
        const whatMakesItGood = asStringArray(a.whatMakesItGood);
        const keyDecisions = asStringArray(a.keyDecisions);
        const remixHints = asStringArray(a.remixHints);
        if (whatMakesItGood.length) annotParts.push("WHY THIS WORKS:\n" + whatMakesItGood.map((s) => `• ${s}`).join("\n"));
        if (keyDecisions.length) annotParts.push("KEY DECISIONS:\n" + keyDecisions.map((s) => `• ${s}`).join("\n"));
        if (remixHints.length) annotParts.push("REMIX THIS:\n" + remixHints.map((s) => `• ${s}`).join("\n"));
        if (annotParts.length) parts.push(annotParts.join("\n\n"));
        return parts.join("\n");
      }).join("\n\n---\n\n");

      return { ok: true, data: formatted };
    }

    case "get_brand_theme": {
      // font_family in DB is a category slug — resolve to real font names for the LLM
      const FONT_PAIR_MAP: Record<string, { headline: string; body: string }> = {
        modern:    { headline: "Space Grotesk", body: "Geist" },
        premium:   { headline: "Playfair Display", body: "Outfit" },
        bold:      { headline: "Bebas Neue", body: "DM Sans" },
        playful:   { headline: "Poppins", body: "Manrope" },
        minimal:   { headline: "Inter", body: "Inter" },
        cinematic: { headline: "Montserrat", body: "Merriweather" },
        editorial: { headline: "DM Serif Display", body: "Outfit" },
        energetic: { headline: "Oswald", body: "IBM Plex Sans" },
      };

      type BrandKit = {
        primary_color: string; secondary_color: string; accent_color: string;
        font_family: string; motion_style: string; subtitle_style: string;
        logo_url: string; brand_name: string;
      };
      const kit = context?.userId
        ? await queryOne<BrandKit>(
            "SELECT * FROM brand_kits WHERE user_id = $1 AND deleted_at IS NULL ORDER BY id LIMIT 1",
            [context.userId]
          ) ?? await queryOne<BrandKit>(
            "SELECT * FROM brand_kits WHERE deleted_at IS NULL ORDER BY id LIMIT 1"
          )
        : await queryOne<BrandKit>(
            "SELECT * FROM brand_kits WHERE deleted_at IS NULL ORDER BY id LIMIT 1"
          );
      const raw = kit ?? {
        primary_color: "#F59E0B", secondary_color: "#18181B", accent_color: "#FAFAFA",
        font_family: "modern", motion_style: "dynamic", subtitle_style: "minimal",
        logo_url: "", brand_name: "",
      };
      const pair = FONT_PAIR_MAP[raw.font_family] ?? FONT_PAIR_MAP.modern;
      return {
        ok: true,
        data: {
          ...raw,
          headline_font: pair.headline,
          body_font: pair.body,
        },
      };
    }

    case "search_pixabay_images": {
      const q = String(input.query ?? "").trim();
      if (!q) return { ok: false, error: "query is required" };
      if (!process.env.PIXABAY_API_KEY) {
        return { ok: false, error: "PIXABAY_API_KEY not configured — use a descriptive imageSrc placeholder instead" };
      }
      const { searchImages } = await import("./pixabay.js");
      const results = await searchImages(q, {
        image_type: input.image_type as string | undefined,
        orientation: input.orientation as string | undefined,
        per_page: 8,
      });
      return {
        ok: true,
        data: results.map((r) => ({
          id: r.id,
          // webformatURL is the Pixabay CDN URL designed for direct web embedding
          // (no hotlink protection). largeImageURL requires a Pixabay referrer header
          // and fails in both the editor renderer and export pipeline.
          url: r.webformatURL,
          preview: r.previewURL,
          tags: r.tags,
          width: r.imageWidth,
          height: r.imageHeight,
        })),
      };
    }

    case "search_pixabay_videos": {
      const q = String(input.query ?? "").trim();
      if (!q) return { ok: false, error: "query is required" };
      if (!process.env.PIXABAY_API_KEY) {
        return { ok: false, error: "PIXABAY_API_KEY not configured" };
      }
      const { searchVideos } = await import("./pixabay.js");
      const results = await searchVideos(q, {
        orientation: input.orientation as string | undefined,
        per_page: 6,
      });
      return {
        ok: true,
        data: results.map((r) => ({
          id: r.id,
          url: r.videos.medium?.url ?? r.videos.small?.url ?? "",
          tags: r.tags,
          duration: r.duration,
        })),
      };
    }

    case "search_pixabay_audio": {
      const q = String(input.query ?? "").trim();
      if (!q) return { ok: false, error: "query is required" };
      if (!process.env.PIXABAY_API_KEY) {
        return { ok: false, error: "PIXABAY_API_KEY not configured" };
      }
      const { searchAudio } = await import("./pixabay.js");
      const results = await searchAudio(q, {
        genre: input.genre as string | undefined,
        per_page: 6,
      });
      return {
        ok: true,
        data: results.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.audio_url,
          duration: r.duration,
          genre: r.genre,
          tags: r.tags,
        })),
      };
    }

    case "list_assets": {
      type Asset = { id: number; name: string; type: string; url: string; mime_type: string };
      const typeFilter = input.type as string | undefined;
      let rows: Asset[];
      if (typeFilter) {
        rows = await query<Asset>(
          "SELECT id, name, type, url, mime_type FROM assets WHERE type = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
          [typeFilter]
        );
      } else {
        rows = await query<Asset>(
          "SELECT id, name, type, url, mime_type FROM assets WHERE deleted_at IS NULL ORDER BY created_at DESC"
        );
      }
      return { ok: true, data: rows };
    }

    case "search_animations": {
      const q = String(input.query ?? "").trim();
      const category = String(input.category ?? "").trim();
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (q) {
        const like = `%${q.toLowerCase()}%`;
        params.push(like);
        const n = params.length;
        conditions.push(
          `(lower(label) LIKE $${n} OR lower(description) LIKE $${n}` +
          ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
        );
      }
      if (category) {
        params.push(category);
        conditions.push(`category = $${params.length}`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = await query<{ id: string; label: string; category: string; description: string; tags: string[]; suitable_for: string[] }>(
        `SELECT id, label, category, description, tags, suitable_for FROM animations ${where} ORDER BY category, label`,
        params
      );
      return { ok: true, data: rows };
    }

    case "list_motion_presets": {
      const q = String(input.query ?? "").trim();
      const category = String(input.category ?? "").trim();
      const conditions: string[] = ["deleted_at IS NULL"];
      const params: unknown[] = [];
      if (q) {
        const like = `%${q.toLowerCase()}%`;
        params.push(like);
        const n = params.length;
        conditions.push(
          `(lower(name) LIKE $${n} OR lower(description) LIKE $${n} OR lower(category) LIKE $${n}` +
          ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
        );
      }
      if (category) {
        params.push(category);
        conditions.push(`category = $${params.length}`);
      }
      const rows = await query<{ id: number; name: string; description: string; category: string; tags: string[]; animations: unknown }>(
        `SELECT id, name, description, category, tags, animations
         FROM motion_presets WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT 50`,
        params
      );
      return { ok: true, data: rows };
    }

    case "search_templates": {
      const q = String(input.query ?? "").trim();
      const category = String(input.category ?? "").trim();
      const conditions: string[] = ["deleted_at IS NULL"];
      const params: unknown[] = [];
      if (q) {
        const like = `%${q.toLowerCase()}%`;
        params.push(like);
        const n = params.length;
        conditions.push(
          `(lower(name) LIKE $${n} OR lower(description) LIKE $${n} OR lower(category) LIKE $${n}` +
          ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
        );
      }
      if (category) {
        params.push(category);
        conditions.push(`category = $${params.length}`);
      }
      const rows = await query<{ id: number; name: string; description: string; category: string; tags: string[]; thumbnail_url: string; difficulty: string }>(
        `SELECT id, name, description, category, tags, thumbnail_url, difficulty
         FROM templates WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT 30`,
        params
      );
      return { ok: true, data: rows };
    }

    case "search_backgrounds": {
      const q = String(input.query ?? "").trim();
      const typeFilter = String(input.type ?? "").trim();
      const conditions: string[] = ["source IN ('stock', 'css')", "deleted_at IS NULL"];
      const params: unknown[] = [];
      if (typeFilter) {
        params.push(typeFilter);
        conditions.push(`type = $${params.length}`);
      }
      if (q) {
        const like = `%${q.toLowerCase()}%`;
        params.push(like);
        const n = params.length;
        conditions.push(
          `(lower(name) LIKE $${n} OR lower(category) LIKE $${n}` +
          ` OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $${n}))`
        );
      }
      params.push(30);
      const rows = await query<{ id: number; name: string; type: string; category: string; tags: string[]; url: string; thumbnail_url: string; source: string }>(
        `SELECT id, name, type, category, tags, url, thumbnail_url, source FROM assets
         WHERE ${conditions.join(" AND ")}
         ORDER BY CASE WHEN source = 'css' THEN 0 ELSE 1 END, id DESC LIMIT $${params.length}`,
        params
      );
      return { ok: true, data: rows };
    }

    // ── Output tool ────────────────────────────────────────────────────────────

    case "create_project": {
      const title = String(input.title ?? "Untitled").trim();
      const rawDoc = input.document as ProjectDocument | undefined;

      if (!rawDoc) return { ok: false, error: "document is required" };

      // Normalize the document before validation so small AI inconsistencies don't fail
      const document = await normalizeDocument(rawDoc);

      const errors = validateProjectDocument(document);
      if (errors.length > 0) {
        return {
          ok: false,
          error: `ProjectDocument validation failed:\n${errors.map((e) => `• ${e}`).join("\n")}\nFix these errors and call create_project again.`,
        };
      }

      const row = context?.userId
        ? await queryOne<{ id: number }>(
            "INSERT INTO projects (title, status, meta, user_id) VALUES ($1, 'ready', $2, $3) RETURNING id",
            [title, document, context.userId]
          )
        : await queryOne<{ id: number }>(
            "INSERT INTO projects (title, status, meta) VALUES ($1, 'ready', $2) RETURNING id",
            [title, document]
          );

      return {
        ok: true,
        data: {
          [PROJECT_SAVED_SENTINEL]: true,
          projectId: row!.id,
          title,
        },
      };
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
