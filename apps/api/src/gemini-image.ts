/**
 * Gemini image generation (opt-in alternative to Pixabay).
 *
 * Uses the Gemini 2.5 Flash Image model to generate scene-specific vertical
 * images. Generated images are saved to uploads/ai-images/ and served as
 * local URLs so the renderer can load them without CORS or hotlinking issues.
 *
 * Requires: GEMINI_API_KEY env var.
 * Optional: API_BASE_URL env var (default: http://localhost:8080).
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads/ai-images");

const MODEL = "gemini-2.5-flash-preview-05-20";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function isGeminiImageEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getApiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
}

// ── Prompt construction ────────────────────────────────────────────────────────

const MOOD_STYLES: Record<string, {
  lighting: string;
  atmosphere: string;
  colorGrading: string;
  cameraStyle: string;
}> = {
  energetic: {
    lighting: "bold directional light, high contrast, vibrant backlight or rim light",
    atmosphere: "electric, high-energy, dynamic motion blur hints in background",
    colorGrading: "punchy saturation, warm highlights, deep shadows",
    cameraStyle: "wide-angle 24mm, low angle looking up, strong leading lines",
  },
  calm: {
    lighting: "soft diffused natural light, gentle window light, golden hour warmth",
    atmosphere: "serene, peaceful, still air, soft bokeh background",
    colorGrading: "muted, desaturated pastels, warm neutral tones",
    cameraStyle: "50mm standard lens, eye-level composition, shallow depth of field",
  },
  inspiring: {
    lighting: "golden hour sunlight, God rays, warm backlight glowing through",
    atmosphere: "uplifting, hopeful, open sky, sense of vast possibility",
    colorGrading: "warm orange and gold tones, lifted shadows, airy highlights",
    cameraStyle: "35mm lens, horizon visible, sky occupying upper third",
  },
  professional: {
    lighting: "clean studio three-point lighting, soft fill, minimal shadows",
    atmosphere: "polished, corporate, modern, precise",
    colorGrading: "neutral white balance, clean highlights, no color cast",
    cameraStyle: "85mm portrait lens, straight-on or slight elevation, clean background",
  },
  playful: {
    lighting: "bright even lighting, colorful accent lights, fun colored gels",
    atmosphere: "joyful, lively, vibrant, celebratory",
    colorGrading: "high saturation, vivid complementary colors, bright whites",
    cameraStyle: "wide 28mm, dynamic angle, colorful props in frame",
  },
  dramatic: {
    lighting: "chiaroscuro side lighting, single hard key light, deep shadows",
    atmosphere: "intense, brooding, high stakes, cinematic tension",
    colorGrading: "desaturated with one dominant hue, crushed blacks, teal and orange",
    cameraStyle: "70mm, low angle, extreme foreground subject, compressed background",
  },
  luxury: {
    lighting: "soft elegant rim light, warm ambient glow, subtle specular highlights",
    atmosphere: "exclusive, premium, tasteful, quiet sophistication",
    colorGrading: "rich blacks, champagne golds, dark neutral palette",
    cameraStyle: "85-105mm, precise composition, shallow depth revealing texture",
  },
  minimal: {
    lighting: "clean even natural light, soft overcast, no harsh shadows",
    atmosphere: "airy, spacious, focused, uncluttered",
    colorGrading: "high-key, white tones, monochromatic with single accent",
    cameraStyle: "50mm, centered composition, generous negative space",
  },
  documentary: {
    lighting: "available natural light, realistic and unposed",
    atmosphere: "authentic, raw, journalistic, real-world texture",
    colorGrading: "natural, slightly desaturated, film-like grain",
    cameraStyle: "35mm handheld feel, candid framing, environmental context",
  },
};

const ARCHETYPE_COMPOSITION: Record<string, string> = {
  CINEMATIC_HERO:
    "Full-frame cinematic establishing shot. Strong foreground subject in lower third, " +
    "sweeping background fills upper two-thirds. Epic scale, strong depth layers.",
  PRODUCT_SPOTLIGHT:
    "Clean product-focused composition. Subject centered or rule-of-thirds. " +
    "Minimal background — soft gradient or subtle texture. Studio or lifestyle context.",
  LAYERED_CARD:
    "Abstract textural background with depth. Layered planes of color and light. " +
    "Bokeh or soft geometric forms. Rich enough to layer text and UI cards on top.",
  SPLIT_PANEL:
    "Vertically split composition with two visually distinct halves. " +
    "Left: darker toned side. Right: lighter, airy side. Clean center divide.",
};

/** Convert a hex color to approximate descriptive tone for the prompt. */
function hexToTone(hex: string): string {
  const c = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (max + min) / 2;

  if (lum < 40) return "deep black tones";
  if (lum > 215) return "bright white tones";

  const sat = max === min ? 0 : (max - min) / (lum < 128 ? max + min : 510 - max - min);
  if (sat < 0.15) return lum < 128 ? "dark grey tones" : "light neutral tones";

  if (r > g && r > b) return r - b > 60 ? "warm red-orange tones" : "rose tones";
  if (g > r && g > b) return g - b > 60 ? "green tones" : "teal-green tones";
  if (b > r && b > g) return b - r > 60 ? "deep blue tones" : "purple-blue tones";
  if (r > b && g > b) return "golden yellow tones";
  if (r > g && b > g) return "magenta-purple tones";
  return "cyan-teal tones";
}

export interface ImagePromptOpts {
  brief: string;
  sceneName: string;
  scenePurpose?: string;
  visualConcept?: string;
  layers?: string[];
  archetype?: string;
  headline?: string;
  mood?: string;
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  placeholderSubject?: string;
}

/**
 * Build a comprehensive, scene-specific image generation prompt.
 * Every parameter drives a specific quality dimension of the output.
 */
export function buildImagePrompt(opts: ImagePromptOpts): string {
  const {
    brief,
    sceneName,
    scenePurpose,
    visualConcept,
    layers,
    archetype,
    headline,
    mood = "professional",
    primaryColor,
    accentColor,
    bgColor,
    placeholderSubject,
  } = opts;

  const moodKey = mood.toLowerCase().split(/[^a-z]/)[0];
  const moodStyle = MOOD_STYLES[moodKey] ?? MOOD_STYLES.professional;
  const archetypeComp = archetype ? (ARCHETYPE_COMPOSITION[archetype] ?? "") : "";

  // ── Subject derivation ─────────────────────────────────────────────────────
  // Best source → least specific, in priority order
  const subjectLines: string[] = [];
  if (visualConcept) subjectLines.push(visualConcept);
  if (scenePurpose) subjectLines.push(`Scene purpose: ${scenePurpose}`);
  if (headline) subjectLines.push(`Key message: "${headline}"`);
  if (layers && layers.length > 0) {
    const relevant = layers.filter(
      (l) => !l.toLowerCase().includes("text") && !l.toLowerCase().includes("shadow")
    ).slice(0, 3);
    if (relevant.length > 0) subjectLines.push(`Visual layers: ${relevant.join("; ")}`);
  }
  if (placeholderSubject) subjectLines.push(`Subject: ${placeholderSubject}`);
  if (subjectLines.length === 0) subjectLines.push(`Scene: ${sceneName}`);

  // ── Color palette ──────────────────────────────────────────────────────────
  const colorParts: string[] = [];
  if (primaryColor) colorParts.push(`dominant ${hexToTone(primaryColor)} (${primaryColor})`);
  if (accentColor) colorParts.push(`accent ${hexToTone(accentColor)} (${accentColor})`);
  if (bgColor) colorParts.push(`background echoing ${hexToTone(bgColor)}`);
  const colorSection = colorParts.length > 0
    ? `Color palette: ${colorParts.join(", ")}, harmoniously blended.`
    : "";

  // ── Compose the full prompt ────────────────────────────────────────────────
  const lines = [
    // 1. Core subject — what the image is about
    `SUBJECT: ${subjectLines.join(". ")}.`,
    `Video brief context: "${brief.slice(0, 120)}".`,

    // 2. Composition and framing
    `COMPOSITION: ${archetypeComp || "Vertical portrait 9:16 (1080×1920 pixels), full-bleed background suitable for overlaying text and UI elements on top. Strong visual hierarchy, clear subject, generous negative space in lower and upper thirds for text overlay."}`,

    // 3. Lighting
    `LIGHTING: ${moodStyle.lighting}.`,

    // 4. Atmosphere and mood
    `MOOD & ATMOSPHERE: ${moodStyle.atmosphere}. Emotional tone: ${mood}.`,

    // 5. Color grading
    `COLOR GRADING: ${moodStyle.colorGrading}.`,
    colorSection,

    // 6. Camera and technical specs
    `CAMERA: ${moodStyle.cameraStyle}. Shot on a professional full-frame mirrorless camera. ` +
    `Ultra-high resolution 4K, tack-sharp focus on subject, smooth background rendering. ` +
    `HDR dynamic range, professional color depth.`,

    // 7. Style and quality
    `STYLE: Photorealistic, editorial quality, magazine-grade photography. ` +
    `Professional commercial photography. Highly detailed textures. ` +
    `Natural light physics, realistic shadows and highlights. ` +
    `Shot for a premium short-form vertical social media video (Instagram Reels / TikTok).`,

    // 8. Hard exclusions
    `EXCLUDE: No text, no words, no letters, no numbers, no logos, no watermarks, ` +
    `no borders, no frames, no UI elements, no overlays. ` +
    `No low quality, no blurry backgrounds unless intentional bokeh, no distortion, no lens flare artifacts.`,
  ];

  const prompt = lines.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  console.log(`[gemini-image] prompt (${prompt.length} chars): ${prompt.slice(0, 300)}...`);
  return prompt;
}

// ── Image generation ───────────────────────────────────────────────────────────

/**
 * Generate an image using Gemini 2.5 Flash Image, save it locally, and return
 * a public URL. Returns null if generation fails (caller should fall back to Pixabay).
 */
export async function generateGeminiImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    console.warn(`[gemini-image] fetch error: ${(err as Error).message}`);
    return null;
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    console.warn(`[gemini-image] API error ${resp.status}: ${body.slice(0, 200)}`);
    return null;
  }

  let json: Record<string, unknown>;
  try {
    json = await resp.json() as Record<string, unknown>;
  } catch {
    console.warn("[gemini-image] invalid JSON response");
    return null;
  }

  const candidates = json.candidates as { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] | undefined;
  const parts = candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    console.warn("[gemini-image] no image in response");
    return null;
  }

  const { mimeType = "image/jpeg", data } = imagePart.inlineData;
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const filename = `${crypto.randomBytes(10).toString("hex")}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(data, "base64"));
  } catch (err) {
    console.warn(`[gemini-image] write error: ${(err as Error).message}`);
    return null;
  }

  const publicUrl = `${getApiBaseUrl()}/uploads/ai-images/${filename}`;
  console.log(`[gemini-image] generated → ${publicUrl}`);
  return publicUrl;
}
