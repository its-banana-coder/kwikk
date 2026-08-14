/**
 * Local image analysis utilities — no LLM involved.
 *
 * adaptSceneToImage   — for scenes with a full-bleed background photo:
 *   hides any opaque backdrop shapes entirely, then sets text to a
 *   high-contrast colour + strong textShadow so the image shows through.
 *
 * injectCssBackground — for scenes with no image at all:
 *   picks a CSS background from the existing DB catalog and applies it,
 *   so plain-colour scenes get visual richness without an LLM call.
 */

import sharp from "sharp";
import { queryOne } from "./db.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * SVG+foreignObject data URLs (used by the CSS asset catalog) can't be rendered
 * as CSS background-image. Extract the raw `background:` value from the inner div.
 */
function extractCssFromSvgDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith("data:image/svg+xml")) return null;
  try {
    const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const svg = decodeURIComponent(encoded);
    const m = svg.match(/style="[^"]*background:\s*([^";]+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/** Relative luminance of a hex colour, 0 (black) → 1 (white). */
function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Average luminance of the bottom 60% of an image — where text overlays live.
 * Returns a value in [0, 1]; throws if the image can't be fetched/decoded.
 */
async function analyzeImageBrightness(url: string): Promise<number> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching image`);
  const buf = Buffer.from(await res.arrayBuffer());

  const img = sharp(buf);
  const meta = await img.metadata();
  const h = meta.height ?? 1920;
  const w = meta.width ?? 1080;

  const top = Math.floor(h * 0.4);
  const stats = await img
    .extract({ left: 0, top, width: w, height: h - top })
    .greyscale()
    .stats();

  return (stats.channels[0]?.mean ?? 128) / 255;
}

// ── 1. Adapt image-backed scenes ─────────────────────────────────────────────

/**
 * For scenes with a full-bleed background_image:
 * - Hides every large backdrop shape (opacity → 0) so the photo shows fully.
 * - Sets text colour to high contrast + strong textShadow for legibility.
 * - Boosts fontWeight to ≥ 700 on any text that isn't already bold.
 */
export async function adaptSceneToImage(scene: Record<string, unknown>): Promise<void> {
  const elements = Array.isArray(scene.elements)
    ? (scene.elements as Record<string, unknown>[])
    : [];

  const bgImage = elements.find(
    (el) =>
      el.type === "image" &&
      el.semanticRole === "background_image" &&
      Number((el.layout as Record<string, unknown>)?.width) >= 900
  );
  if (!bgImage) return;

  const src = String((bgImage.content as Record<string, unknown>)?.src ?? "");
  if (!src.startsWith("https://")) return;

  let luminance: number;
  try {
    luminance = await analyzeImageBrightness(src);
  } catch (err) {
    console.warn(`[image-analysis] skipping "${scene.name}": ${(err as Error).message}`);
    return;
  }

  console.log(`[image-analysis] "${scene.name}" bottom-60% luminance: ${luminance.toFixed(3)}`);

  const isDark = luminance < 0.50;

  // ── Hide all large backdrop overlays ─────────────────────────────────────
  for (const el of elements) {
    if (el.type !== "shape") continue;
    const role = String(el.semanticRole ?? "");
    if (role !== "scene_backdrop" && role !== "overlay") continue;
    // Leave small accent bars / button shapes alone
    if (Number((el.layout as Record<string, unknown>)?.height ?? 0) < 600) continue;

    (el.style as Record<string, unknown>).opacity = 0;
  }

  // ── Contrasting text + strong shadow ─────────────────────────────────────
  for (const el of elements) {
    if (el.type !== "text") continue;
    const style = el.style as Record<string, unknown>;

    if (isDark) {
      style.color = "#FFFFFF";
      style.textShadow = { offsetX: 0, offsetY: 2, blur: 20, color: "#000000", alpha: 0.75 };
      // Ensure bold enough to read on a busy photo
      if (Number(style.fontWeight ?? 600) < 700) style.fontWeight = 700;
    } else {
      // Light / bright image
      style.color = "#1A1A1A";
      if (style.textEffect === "glow") delete style.textEffect;
      style.textShadow = { offsetX: 0, offsetY: 1, blur: 10, color: "#ffffff", alpha: 0.8 };
      if (Number(style.fontWeight ?? 600) < 700) style.fontWeight = 700;
    }
  }
}

// ── 2. Inject CSS background for imageless scenes ────────────────────────────

// Curated pool: vivid/nature-appropriate backgrounds split by scene mood.
// Names match what's already seeded in the DB.
const DARK_SCENE_NAMES = [
  "Cosmic Aurora", "Northern Aurora", "Midnight Mist", "Midnight Ember",
  "Deep Ocean Glow", "Tropical Dusk Glow", "Aurora Midnight Glow",
  "Indigo Cosmos Glow", "Aurora Mystic Mist", "Moonlit Fog",
  "Ocean Abyss Glow", "Dark Radial Glow", "Emerald Depths Glow",
  "Midnight Aurora Glow", "Cosmic Nebula", "Emerald Void", "Azure Depths",
];

const LIGHT_SCENE_NAMES = [
  "Ocean Breeze Fade", "Aurora Dream Vivid Bloom", "Aurora Dream Soft Harmony",
  "Aurora Dream Diagonal Flow", "Cotton Candy Sky", "Spring Meadow Mist",
  "Soft Morning Mist", "Peachy Sunrise Glow", "Soft Pastel Dream",
  "Aurora Silk Fade", "Dreamy Sunset Gradient", "Dreamy Sky Pink Glow",
  "Morning Haze", "Pastel Wave", "Mint Fresh Breeze",
];

/**
 * For scenes that have no real background image (no background_image element
 * with an https:// src, and no background.imageSrc already set):
 * - Skips CTA scenes (they should stay branded/clean).
 * - Picks a CSS background from the existing DB catalog that suits the scene's
 *   mood (dark vs light, inferred from background.color).
 * - Sets scene.background.imageSrc to the SVG data-URL stored in the DB so
 *   the renderer picks it up without any new assets.
 * - Adds a subtle textShadow to all text for legibility on the gradient.
 */
export async function injectCssBackground(scene: Record<string, unknown>): Promise<void> {
  const elements = Array.isArray(scene.elements)
    ? (scene.elements as Record<string, unknown>[])
    : [];

  // Skip if there's already a real background image
  const hasRealImage = elements.some(
    (el) =>
      el.type === "image" &&
      el.semanticRole === "background_image" &&
      String((el.content as Record<string, unknown>)?.src ?? "").startsWith("https://")
  );
  if (hasRealImage) return;

  const bg = (scene.background as Record<string, unknown> | undefined) ?? {};
  if (String(bg.imageSrc ?? "").startsWith("data:") || String(bg.imageSrc ?? "").startsWith("https://")) return;

  // CTA scenes should keep their branded look
  const nameLower = String(scene.name ?? "").toLowerCase();
  if (nameLower.includes("cta") || nameLower.includes("call to action")) return;

  // Infer scene mood from its solid background colour
  const bgColor = String(bg.color ?? "#111111");
  const lum = hexLuminance(bgColor);
  const isDark = lum < 0.15; // truly dark background

  const namePool = isDark ? DARK_SCENE_NAMES : LIGHT_SCENE_NAMES;
  // Pick a random name from the pool and look it up in the DB
  const shuffled = [...namePool].sort(() => Math.random() - 0.5);

  let row: { url: string } | undefined;
  for (const name of shuffled.slice(0, 6)) {
    row = await queryOne<{ url: string }>(
      "SELECT url FROM assets WHERE source = 'css' AND name = $1 LIMIT 1",
      [name]
    );
    if (row?.url) break;
  }

  if (!row?.url) {
    // Fallback: any effects/gradients CSS background
    row = await queryOne<{ url: string }>(
      "SELECT url FROM assets WHERE source = 'css' AND category IN ('effects','gradients') ORDER BY RANDOM() LIMIT 1",
      []
    );
  }

  if (!row?.url) return;

  // Extract the raw CSS gradient from the SVG+foreignObject data URL stored in the DB.
  // SVGs with <foreignObject> are blocked by browsers when used as background-image,
  // so we store the CSS value directly in cssBackground instead.
  const cssValue = extractCssFromSvgDataUrl(row.url) ?? undefined;
  scene.background = cssValue
    ? { ...bg, cssBackground: cssValue }
    : { ...bg, imageSrc: row.url };
  console.log(`[image-analysis] injected CSS background into "${scene.name}" (${isDark ? "dark" : "light"} mood)`);

  // Ensure text is legible on the gradient
  for (const el of elements) {
    if (el.type !== "text") continue;
    const style = el.style as Record<string, unknown>;
    if (!style.textShadow) {
      style.textShadow = isDark
        ? { offsetX: 0, offsetY: 2, blur: 14, color: "#000000", alpha: 0.55 }
        : { offsetX: 0, offsetY: 1, blur: 8, color: "#000000", alpha: 0.3 };
    }
  }
}
