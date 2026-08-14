/**
 * seed-template.ts
 * Builds a cinematic video project in code + real Pixabay images.
 * Run: DATABASE_URL=... pnpm --filter @kwikk/api exec tsx src/seed-template.ts
 */

import "dotenv/config";
import { buildSequentialTimelineTracks, validateProjectDocument } from "@kwikk/scene-graph";
import type { Scene, ElementNode, Animation, ProjectDocument } from "@kwikk/shared-types";
import { searchImages } from "./pixabay.js";
import { queryOne } from "./db.js";

/*
async function getIconDataUrl(name: string, color: string): Promise<string> {
  const rows = await query<{ file_path: string }>(
    "SELECT file_path FROM icons WHERE name = $1 AND deleted_at IS NULL LIMIT 1",
    [name],
  );
  const row = rows[0];
  if (!row) throw new Error(`Icon not found: ${name}`);
  let svg = readFileSync(row.file_path, "utf-8");
  // Inject fill/stroke colour so the icon renders in the desired colour
  svg = svg.replace(/<svg /, `<svg fill="${color}" `);
  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
*/

// ─── Design constants ─────────────────────────────────────────────────────────

const HEADLINE = "Playfair Display";
const BODY = "Outfit";
const GOLD = "#C4A882";
const CREAM = "#E7D3B1";
const WHITE = "#ffffff";
const DIM = "#888888";
const DARK = "#111111";

function anim(
  id: string,
  type: Animation["type"],
  startMs: number,
  durationMs: number,
  extra?: Partial<Animation>,
): Animation {
  return { id, type, startMs, durationMs, easing: "easeOut", ...extra };
}

// ─── Pixabay helper ───────────────────────────────────────────────────────────

async function getImage(query: string): Promise<string | null> {
  const hits = await searchImages(query, { orientation: "vertical", image_type: "photo", per_page: 5 });
  return hits[0]?.largeImageURL ?? null;
}

// ─── Scene builders ───────────────────────────────────────────────────────────

function buildHookScene(imageSrc: string): Scene {
  // CINEMATIC_HERO — full-bleed image with dark lower-third overlay + staggered text
  return {
    id: "scene_hook",
    name: "The Shocking Truth",
    durationMs: 4000,
    background: { color: "#0a0a0a" },
    transition: { type: "glitch_cut", durationMs: 200 },
    elements: [
      // z1 — full-bleed hero image (parallax: slow entrance)
      {
        id: "el_hook_img",
        type: "image",
        semanticRole: "hero_image",
        layout: { x: 0, y: 0, width: 1080, height: 1920, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
        style: { filters: { cinematic: true, vignette: 0.55, brightness: 0.5 } },
        animations: [anim("el_hook_img_zoomIn_0", "zoomIn", 0, 700, { fromOffset: 20 })],
        content: { src: imageSrc },
      },
      // z2 — dark top overlay for icon readability
      {
        id: "el_hook_top_overlay",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: 0, y: 0, width: 1080, height: 400, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: "#000000", opacity: 0.45 },
        animations: [anim("el_hook_top_overlay_fadeIn_0", "fadeIn", 0, 600)],
        content: { shape: "rectangle" },
      },
      // z5 — human icon (upper-left)
      {
        id: "el_hook_icon_human",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 180, y: 100, width: 220, height: 220, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 160,
          fontFamily: BODY,
          fontWeight: 400,
          textAlign: "center",
          color: WHITE,
        },
        animations: [
          anim("el_hook_icon_human_fadeIn_0", "fadeIn", 0, 500),
          anim("el_hook_icon_human_slideDown_0", "slideDown", 0, 600, { fromOffset: -40 }),
        ],
        content: { text: "👤" },
      },
      // z5 — money icon (upper-right)
      {
        id: "el_hook_icon_money",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 680, y: 100, width: 220, height: 220, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 160,
          fontFamily: BODY,
          fontWeight: 400,
          textAlign: "center",
          color: WHITE,
        },
        animations: [
          anim("el_hook_icon_money_fadeIn_0", "fadeIn", 200, 500),
          anim("el_hook_icon_money_slideDown_0", "slideDown", 200, 600, { fromOffset: -40 }),
        ],
        content: { text: "💰" },
      },
      // z3 — dark gradient overlay over lower half (readability for text)
      {
        id: "el_hook_overlay",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: 0, y: 860, width: 1080, height: 1060, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: "#000000", opacity: 0.65 },
        animations: [anim("el_hook_overlay_fadeIn_0", "fadeIn", 0, 500)],
        content: { shape: "rectangle" },
      },
      // z4 — gold accent bar (slides right, fast — foreground accent)
      {
        id: "el_hook_bar",
        type: "shape",
        semanticRole: "divider",
        layout: { x: 92, y: 1020, width: 160, height: 5, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: GOLD },
        animations: [anim("el_hook_bar_slideRight_0", "slideRight", 100, 300, { fromOffset: 60 })],
        content: { shape: "rectangle" },
      },
      // z5 — headline (vertical axis, main message)
      {
        id: "el_hook_title",
        type: "text",
        semanticRole: "hook_title",
        layout: { x: 92, y: 1055, width: 896, height: 270, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 100,
          fontFamily: HEADLINE,
          fontWeight: 900,
          textAlign: "left",
          color: WHITE,
          textShadow: { offsetX: 0, offsetY: 6, blur: 30, color: "#000000", alpha: 0.9 },
        },
        animations: [anim("el_hook_title_slideUp_0", "slideUp", 200, 450, { fromOffset: 70 })],
        content: { text: "95% Stay Broke Forever" },
      },
      // z6 — subtitle (400ms — follows headline)
      {
        id: "el_hook_sub",
        type: "text",
        semanticRole: "hook_subtitle",
        layout: { x: 92, y: 1360, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 48,
          fontFamily: BODY,
          fontWeight: 400,
          textAlign: "left",
          color: "#d0d0d0",
          textShadow: { offsetX: 0, offsetY: 3, blur: 12, color: "#000000", alpha: 0.7 },
        },
        animations: [anim("el_hook_sub_slideUp_0", "slideUp", 400, 500, { fromOffset: 50 })],
        content: { text: "And it's not your fault" },
      },
      // z7 — teaser (pattern interrupt at 1800ms)
      {
        id: "el_hook_teaser",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 92, y: 1530, width: 896, height: 75, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 40, fontFamily: BODY, fontWeight: 500, textAlign: "left", color: GOLD },
        animations: [anim("el_hook_teaser_fadeIn_0", "fadeIn", 1800, 600)],
        content: { text: "Here are the 5 laws they never taught you ↓" },
      },
    ] as ElementNode[],
  };
}

function buildLaw1Scene(): Scene {
  // TYPOGRAPHIC_STATEMENT — warm luxury dark, vertical axis
  return {
    id: "scene_law1",
    name: "Law 1 — Pay Yourself First",
    durationMs: 6500,
    background: { color: DARK },
    transition: { type: "slide_left", durationMs: 400 },
    elements: [
      {
        id: "el_law1_glow",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: -100, y: 600, width: 900, height: 900, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: GOLD, borderRadius: 999, filters: { blur: 140 }, blendMode: "screen", opacity: 0.12 },
        animations: [anim("el_law1_glow_fadeIn_0", "fadeIn", 0, 800)],
        content: { shape: "circle" },
      },
      {
        id: "el_law1_label",
        type: "text",
        semanticRole: "section_title",
        layout: { x: 92, y: 760, width: 896, height: 80, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 44, fontFamily: BODY, fontWeight: 700, textAlign: "center", color: GOLD, letterSpacing: 6 },
        animations: [anim("el_law1_label_slideUp_0", "slideUp", 0, 350, { fromOffset: 40 })],
        content: { text: "LAW #1" },
      },
      {
        id: "el_law1_divider",
        type: "shape",
        semanticRole: "divider",
        layout: { x: 460, y: 862, width: 160, height: 4, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: GOLD },
        animations: [anim("el_law1_divider_slideRight_0", "slideRight", 80, 300, { fromOffset: 60 })],
        content: { shape: "rectangle" },
      },
      {
        id: "el_law1_hero",
        type: "text",
        semanticRole: "hero_phrase",
        layout: { x: 40, y: 890, width: 1000, height: 260, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 96,
          fontFamily: HEADLINE,
          fontWeight: 800,
          textAlign: "center",
          color: CREAM,
          textShadow: { offsetX: 0, offsetY: 6, blur: 30, color: "#000000", alpha: 0.8 },
        },
        animations: [anim("el_law1_hero_slideUp_0", "slideUp", 200, 500, { fromOffset: 70 })],
        content: { text: "Pay Yourself First" },
      },
      {
        id: "el_law1_body",
        type: "text",
        semanticRole: "body_copy",
        layout: { x: 92, y: 1185, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 48, fontFamily: BODY, fontWeight: 400, textAlign: "center", color: DIM },
        animations: [anim("el_law1_body_slideUp_0", "slideUp", 400, 500, { fromOffset: 50 })],
        content: { text: "Before bills. Before anyone else." },
      },
      {
        id: "el_law1_interrupt",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 92, y: 1390, width: 896, height: 130, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 44,
          fontFamily: BODY,
          fontWeight: 500,
          textAlign: "center",
          color: WHITE,
          backgroundColor: "rgba(196,168,130,0.12)",
          borderRadius: 16,
        },
        animations: [anim("el_law1_interrupt_slideUp_0", "slideUp", 2800, 600, { fromOffset: 50 })],
        content: {
          richText: [
            { text: "Even ", style: { color: DIM, fontWeight: 400 } },
            { text: "$50/month", style: { color: GOLD, fontWeight: 700, highlight: "rgba(196,168,130,0.2)", highlightRadius: 6 } },
            { text: " becomes ", style: { color: DIM, fontWeight: 400 } },
            { text: "$500K", style: { color: GOLD, fontWeight: 700 } },
            { text: " by 60", style: { color: DIM, fontWeight: 400 } },
          ],
        },
      },
    ] as ElementNode[],
  };
}

function buildLaw2Scene(): Scene {
  // TYPOGRAPHIC_STATEMENT — giant stat, purple deep bg, scale axis
  return {
    id: "scene_law2",
    name: "Law 2 — The Compound Effect",
    durationMs: 6000,
    background: { color: "#1a0a2e" },
    transition: { type: "zoom_in", durationMs: 400 },
    elements: [
      {
        id: "el_law2_glow",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: 200, y: 300, width: 680, height: 680, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: "#7C3AED", borderRadius: 999, filters: { blur: 130 }, blendMode: "screen", opacity: 0.25 },
        animations: [anim("el_law2_glow_fadeIn_0", "fadeIn", 0, 900)],
        content: { shape: "circle" },
      },
      {
        id: "el_law2_label",
        type: "text",
        semanticRole: "section_title",
        layout: { x: 92, y: 620, width: 896, height: 80, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 44, fontFamily: BODY, fontWeight: 700, textAlign: "center", color: "#A78BFA", letterSpacing: 6 },
        animations: [anim("el_law2_label_slideUp_0", "slideUp", 0, 350, { fromOffset: 40 })],
        content: { text: "LAW #2" },
      },
      {
        id: "el_law2_stat",
        type: "text",
        semanticRole: "hero_phrase",
        layout: { x: 40, y: 720, width: 1000, height: 400, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 200,
          fontFamily: HEADLINE,
          fontWeight: 900,
          textAlign: "center",
          color: WHITE,
          textGradient: { type: "linear", angle: 90, stops: [{ offset: 0, color: "#A78BFA" }, { offset: 1, color: GOLD }] },
          textShadow: { offsetX: 0, offsetY: 8, blur: 60, color: "#000000", alpha: 0.9 },
        },
        animations: [anim("el_law2_stat_zoomIn_0", "zoomIn", 0, 550)],
        content: { text: "10×" },
      },
      {
        id: "el_law2_title",
        type: "text",
        semanticRole: "section_title",
        layout: { x: 92, y: 1155, width: 896, height: 110, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 60,
          fontFamily: HEADLINE,
          fontWeight: 700,
          textAlign: "center",
          color: CREAM,
          textShadow: { offsetX: 0, offsetY: 4, blur: 20, color: "#000000", alpha: 0.6 },
        },
        animations: [anim("el_law2_title_slideUp_0", "slideUp", 200, 450, { fromOffset: 60 })],
        content: { text: "The Compound Effect" },
      },
      {
        id: "el_law2_body",
        type: "text",
        semanticRole: "body_copy",
        layout: { x: 92, y: 1295, width: 896, height: 90, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 44, fontFamily: BODY, fontWeight: 400, textAlign: "center", color: DIM },
        animations: [anim("el_law2_body_fadeIn_0", "fadeIn", 400, 500)],
        content: { text: "Start at 25 vs 35 = 4× more wealth" },
      },
      {
        id: "el_law2_interrupt",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 92, y: 1480, width: 896, height: 90, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 40, fontFamily: BODY, fontWeight: 500, textAlign: "center", color: "#A78BFA" },
        animations: [anim("el_law2_interrupt_slideLeft_0", "slideLeft", 2500, 600, { fromOffset: 80 })],
        content: { text: "Time is the only asset you can't buy back." },
      },
    ] as ElementNode[],
  };
}

function buildLaw3Scene(imageSrc: string): Scene {
  // LAYERED_CARD — real image in top half, richText income streams below
  return {
    id: "scene_law3",
    name: "Law 3 — Multiple Income Streams",
    durationMs: 6000,
    background: { color: "#0c1445" },
    transition: { type: "whip_pan_left", durationMs: 300 },
    elements: [
      // z2 — card shape (slides right — horizontal axis)
      {
        id: "el_law3_card",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: 60, y: 320, width: 960, height: 1200, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
        style: {
          backgroundColor: "#0f1a4a",
          borderRadius: 32,
          filters: { dropShadow: { color: "#000000", blur: 60, alpha: 0.4, offsetX: 0, offsetY: 20 } },
        },
        animations: [anim("el_law3_card_slideRight_0", "slideRight", 0, 600, { fromOffset: 60 })],
        content: { shape: "rectangle" },
      },
      // z3 — real image fills top half of card
      {
        id: "el_law3_img",
        type: "image",
        semanticRole: "hero_image",
        layout: { x: 60, y: 320, width: 960, height: 620, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        style: {
          borderRadius: 32,
          filters: { cinematic: true, vignette: 0.3, brightness: 0.85 },
        },
        animations: [anim("el_law3_img_slideRight_0", "slideRight", 0, 600, { fromOffset: 60 })],
        content: { src: imageSrc },
      },
      // z4 — gold accent stripe across bottom of image
      {
        id: "el_law3_stripe",
        type: "shape",
        semanticRole: "divider",
        layout: { x: 60, y: 904, width: 960, height: 6, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: GOLD },
        animations: [anim("el_law3_stripe_slideRight_0", "slideRight", 100, 400, { fromOffset: 60 })],
        content: { shape: "rectangle" },
      },
      // z4 — label
      {
        id: "el_law3_label",
        type: "text",
        semanticRole: "section_title",
        layout: { x: 92, y: 958, width: 896, height: 72, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 40, fontFamily: BODY, fontWeight: 700, textAlign: "center", color: GOLD, letterSpacing: 6 },
        animations: [anim("el_law3_label_slideRight_0", "slideRight", 150, 350, { fromOffset: 50 })],
        content: { text: "LAW #3" },
      },
      // z5 — hero phrase (horizontal axis)
      {
        id: "el_law3_hero",
        type: "text",
        semanticRole: "hero_phrase",
        layout: { x: 92, y: 1055, width: 896, height: 190, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 80,
          fontFamily: HEADLINE,
          fontWeight: 800,
          textAlign: "center",
          color: WHITE,
          textShadow: { offsetX: 0, offsetY: 4, blur: 20, color: "#000000", alpha: 0.7 },
        },
        animations: [anim("el_law3_hero_slideLeft_0", "slideLeft", 300, 500, { fromOffset: 70 })],
        content: { text: "3 Income Streams" },
      },
      // z6 — richText highlight row
      {
        id: "el_law3_body",
        type: "text",
        semanticRole: "body_copy",
        layout: { x: 92, y: 1280, width: 896, height: 110, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 44, fontFamily: BODY, fontWeight: 500, textAlign: "center", color: WHITE },
        animations: [anim("el_law3_body_fadeIn_0", "fadeIn", 500, 500)],
        content: {
          richText: [
            { text: "Active", style: { color: CREAM, fontWeight: 700, highlight: "rgba(196,168,130,0.25)", highlightRadius: 8 } },
            { text: "  +  ", style: { color: DIM, fontWeight: 400 } },
            { text: "Passive", style: { color: "#60A5FA", fontWeight: 700, highlight: "rgba(96,165,250,0.2)", highlightRadius: 8 } },
            { text: "  +  ", style: { color: DIM, fontWeight: 400 } },
            { text: "Portfolio", style: { color: "#A78BFA", fontWeight: 700, highlight: "rgba(167,139,250,0.2)", highlightRadius: 8 } },
          ],
        },
      },
      // z7 — pattern interrupt at 2200ms
      {
        id: "el_law3_interrupt",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 92, y: 1435, width: 896, height: 75, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 40, fontFamily: BODY, fontWeight: 400, textAlign: "center", color: DIM },
        animations: [anim("el_law3_interrupt_fadeIn_0", "fadeIn", 2200, 600)],
        content: { text: "The median millionaire has 7. Average person: 1." },
      },
    ] as ElementNode[],
  };
}

function buildStatScene(imageSrc: string): Scene {
  // CINEMATIC_HERO — brutal emotional stat over a powerful image
  return {
    id: "scene_stat",
    name: "The Brutal Reality",
    durationMs: 5000,
    background: { color: "#0a0a0a" },
    transition: { type: "flash_cut", durationMs: 150 },
    elements: [
      // z1 — full-bleed image
      {
        id: "el_stat_img",
        type: "image",
        semanticRole: "background_image",
        layout: { x: 0, y: 0, width: 1080, height: 1920, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
        style: { filters: { cinematic: true, vignette: 0.6, brightness: 0.4, contrast: 1.1 } },
        animations: [anim("el_stat_img_fadeIn_0", "fadeIn", 0, 700)],
        content: { src: imageSrc },
      },
      // z3 — dark overlay
      {
        id: "el_stat_overlay",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: 0, y: 700, width: 1080, height: 1220, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: "#000000", opacity: 0.72 },
        animations: [anim("el_stat_overlay_fadeIn_0", "fadeIn", 0, 400)],
        content: { shape: "rectangle" },
      },
      // z4 — label
      {
        id: "el_stat_label",
        type: "text",
        semanticRole: "section_title",
        layout: { x: 92, y: 800, width: 896, height: 75, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 40, fontFamily: BODY, fontWeight: 700, textAlign: "center", color: "#FCA5A5", letterSpacing: 4 },
        animations: [anim("el_stat_label_slideUp_0", "slideUp", 0, 350, { fromOffset: 40 })],
        content: { text: "THE BRUTAL REALITY" },
      },
      // z5 — giant age stat (scale axis)
      {
        id: "el_stat_hero",
        type: "text",
        semanticRole: "hero_phrase",
        layout: { x: 40, y: 890, width: 1000, height: 300, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 160,
          fontFamily: HEADLINE,
          fontWeight: 900,
          textAlign: "center",
          color: WHITE,
          textShadow: { offsetX: 0, offsetY: 10, blur: 50, color: "#000000", alpha: 1 },
        },
        animations: [anim("el_stat_hero_zoomIn_0", "zoomIn", 0, 500)],
        content: { text: "37 yrs" },
      },
      // z6 — what it means
      {
        id: "el_stat_body",
        type: "text",
        semanticRole: "body_copy",
        layout: { x: 92, y: 1220, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 48,
          fontFamily: BODY,
          fontWeight: 400,
          textAlign: "center",
          color: "#FDE68A",
          textShadow: { offsetX: 0, offsetY: 3, blur: 12, color: "#000000", alpha: 0.7 },
        },
        animations: [anim("el_stat_body_slideUp_0", "slideUp", 200, 500, { fromOffset: 60 })],
        content: { text: "Average age of the first millionaire" },
      },
      // z7 — contrast (pattern interrupt at 2000ms)
      {
        id: "el_stat_contrast",
        type: "text",
        semanticRole: "supporting_caption",
        layout: { x: 92, y: 1400, width: 896, height: 90, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 42, fontFamily: BODY, fontWeight: 500, textAlign: "center", color: "#FCA5A5" },
        animations: [anim("el_stat_contrast_fadeIn_0", "fadeIn", 2000, 600)],
        content: { text: "Average savings start age: 38. Do the math." },
      },
    ] as ElementNode[],
  };
}

function buildCtaScene(): Scene {
  // MINIMAL_BOLD — gold bg, scale axis, triumphant
  return {
    id: "scene_cta",
    name: "Your Move",
    durationMs: 4000,
    background: { color: GOLD },
    transition: { type: "fade", durationMs: 400 },
    elements: [
      {
        id: "el_cta_circle_big",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: 720, y: -120, width: 560, height: 560, zIndex: 1, rotation: 0, scale: 1, opacity: 0.07 },
        style: { backgroundColor: WHITE, borderRadius: 999 },
        animations: [anim("el_cta_circle_big_fadeIn_0", "fadeIn", 0, 500)],
        content: { shape: "circle" },
      },
      {
        id: "el_cta_circle_sm",
        type: "shape",
        semanticRole: "scene_backdrop",
        layout: { x: -80, y: 1600, width: 320, height: 320, zIndex: 1, rotation: 0, scale: 1, opacity: 0.07 },
        style: { backgroundColor: WHITE, borderRadius: 999 },
        animations: [anim("el_cta_circle_sm_fadeIn_0", "fadeIn", 0, 500)],
        content: { shape: "circle" },
      },
      {
        id: "el_cta_title",
        type: "text",
        semanticRole: "cta_label",
        layout: { x: 60, y: 820, width: 960, height: 280, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        style: {
          fontSize: 96,
          fontFamily: HEADLINE,
          fontWeight: 900,
          textAlign: "center",
          color: DARK,
          textShadow: { offsetX: 0, offsetY: 4, blur: 16, color: "rgba(0,0,0,0.2)", alpha: 1 },
        },
        animations: [anim("el_cta_title_zoomIn_0", "zoomIn", 0, 380)],
        content: { text: "5 Laws. Mastered." },
      },
      {
        id: "el_cta_body",
        type: "text",
        semanticRole: "body_copy",
        layout: { x: 92, y: 1140, width: 896, height: 90, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 44, fontFamily: BODY, fontWeight: 500, textAlign: "center", color: "#3d2b1a" },
        animations: [anim("el_cta_body_slideUp_0", "slideUp", 200, 450, { fromOffset: 50 })],
        content: { text: "Laws #4 & #5 drop tomorrow" },
      },
      {
        id: "el_cta_btn_bg",
        type: "shape",
        semanticRole: "cta_backdrop",
        layout: { x: 200, y: 1380, width: 680, height: 140, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        style: { backgroundColor: DARK, borderRadius: 48 },
        animations: [anim("el_cta_btn_bg_zoomIn_0", "zoomIn", 400, 350)],
        content: { shape: "rectangle" },
      },
      {
        id: "el_cta_btn_text",
        type: "text",
        semanticRole: "cta_button",
        layout: { x: 200, y: 1388, width: 680, height: 124, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        style: { fontSize: 52, fontFamily: HEADLINE, fontWeight: 700, textAlign: "center", color: GOLD },
        animations: [anim("el_cta_btn_text_zoomIn_0", "zoomIn", 400, 350)],
        content: { text: "Follow Now" },
      },
    ] as ElementNode[],
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("Fetching Pixabay images...");

  const [hookImg, law3Img, statImg] = await Promise.all([
    getImage("person sitting alone thinking money wealth dark dramatic"),
    getImage("entrepreneur multiple laptop screens working office"),
    getImage("clock time running out hourglass sand dramatic"),
  ]);

  console.log(`  hook image:  ${hookImg ?? "no result — using placeholder"}`);
  console.log(`  law3 image:  ${law3Img ?? "no result — using placeholder"}`);
  console.log(`  stat image:  ${statImg ?? "no result — using placeholder"}`);

  const scenes: Scene[] = [
    buildHookScene(hookImg ?? "person_dark_thinking"),
    buildLaw1Scene(),
    buildLaw2Scene(),
    buildLaw3Scene(law3Img ?? "entrepreneur_desk"),
    buildStatScene(statImg ?? "clock_time_dramatic"),
    buildCtaScene(),
  ];

  const timelineTracks = buildSequentialTimelineTracks(scenes);

  const doc: ProjectDocument = {
    id: "template_money_laws_v2",
    name: "5 Laws of Money",
    viewport: { width: 1080, height: 1920 },
    scenes,
    timelineTracks,
  };

  const errors = validateProjectDocument(doc);
  if (errors.length > 0) {
    console.error("\nValidation errors:");
    errors.forEach((e) => console.error(" •", e));
    process.exit(1);
  }

  const title = "5 Laws of Money That Schools Don't Teach";
  const row = await queryOne<{ id: number }>(
    "INSERT INTO projects (title, status, meta) VALUES ($1, 'ready', $2) RETURNING id",
    [title, doc],
  );

  console.log(`\n✓ Done!`);
  console.log(`  Title: ${title}`);
  console.log(`  Project ID: ${row?.id}`);
  console.log(`  Open in editor: http://localhost:5173/?projectId=${row?.id}\n`);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
