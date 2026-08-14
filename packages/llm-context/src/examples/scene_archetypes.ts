import type { Animation, AnimationType, ElementNode, ElementType, LayoutProps, Scene, SemanticLayerType, StyleProps, TemporalZone } from "@kwikk/shared-types";
import type { SceneExample } from "./types.js";

function anim(id: string, type: AnimationType, startMs: number, durationMs: number, extra?: Partial<Animation>): Animation {
  return { id, type, startMs, durationMs, easing: "easeOut", ...extra };
}

function el(
  id: string,
  type: ElementType,
  semanticRole: string,
  semanticLayer: SemanticLayerType,
  temporalZone: TemporalZone | undefined,
  layout: LayoutProps,
  style: StyleProps,
  animations: Animation[],
  content?: ElementNode["content"],
): ElementNode {
  const node: ElementNode = { id, type, semanticRole, semanticLayer, layout, style, animations };
  if (temporalZone) node.temporalZone = temporalZone;
  if (content) node.content = content;
  return node;
}

// ─── CINEMATIC_HERO ────────────────────────────────────────────────────────────

const cinematicHeroScene: Scene = {
  id: "scene_finance_hook",
  name: "Finance Hook",
  durationMs: 5000,
  background: { color: "#0a0a0f", color2: "#1a0a2e", gradientAngle: 145, gradientAngleSpeed: 0.4 },
  transition: { type: "glitch_cut", durationMs: 200 },
  rhythmPattern: "burst",
  dominantFocalId: "el_fh_title",
  elements: [
    // z1 atmospheric: warm gold glow orb — depth without image elements
    el("el_fh_glow", "shape", "scene_backdrop", "atmospheric", undefined,
      { x: -80, y: 700, width: 760, height: 760, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#C4A882", borderRadius: 999, filters: { blur: 140 }, blendMode: "screen" },
      [anim("a_fh_glow", "atmosphere_pulse", 0, 99999, { amplitude: 0.07, speed: 0.3 })],
      { shape: "circle" }),
    // z2 background_motion: full-bleed hero image, slow parallax drift
    el("el_fh_img", "image", "hero_image", "background_motion", undefined,
      { x: 0, y: 0, width: 1080, height: 1920, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
      { filters: { cinematic: true, vignette: 0.6, brightness: 0.45 } },
      [
        anim("a_fh_img_fade", "fadeIn", 0, 700),
        anim("a_fh_img_drift", "depth_drift", 0, 99999, { amplitude: 10, speed: 0.5 }),
      ],
      { src: "person_dark_office_ambition" }),
    // z3 focal: dark scrim over lower 60% for text legibility
    el("el_fh_scrim", "shape", "scene_backdrop", "focal", undefined,
      { x: 0, y: 760, width: 1080, height: 1160, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#000000" },
      [anim("a_fh_scrim_fade", "fadeIn", 0, 600)],
      { shape: "rectangle" }),
    // z4 secondary_motion: gold bar draws in before headline
    el("el_fh_bar", "shape", "divider", "secondary_motion", "hook",
      { x: 92, y: 1040, width: 140, height: 5, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#C4A882" },
      [anim("a_fh_bar", "draw_in", 80, 350)],
      { shape: "rectangle" }),
    // z5 typography: hook_title — depth_charge (NOT slideUp)
    el("el_fh_title", "text", "hook_title", "typography", "hook",
      { x: 92, y: 1080, width: 896, height: 320, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 104, fontFamily: "Playfair Display", fontWeight: 900, textAlign: "left",
        color: "#ffffff",
        textShadow: { offsetX: 0, offsetY: 6, blur: 28, color: "#000000", alpha: 0.85 },
        textEffect: "shadow_stack", textEffectColor: "#C4A882",
      },
      [anim("a_fh_title", "depth_charge", 0, 550, { easing: "easeOut" })],
      { text: "95% Stay Broke Forever" }),
    // z6 typography: subtitle with momentum_carry
    el("el_fh_sub", "text", "hook_subtitle", "typography", "reveal",
      { x: 92, y: 1440, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 52, fontFamily: "Outfit", fontWeight: 400, textAlign: "left", color: "#d0d0d0",
        textShadow: { offsetX: 0, offsetY: 3, blur: 12, color: "#000000", alpha: 0.6 },
      },
      [anim("a_fh_sub", "momentum_carry", 300, 500, { easing: "cinematicEaseOut" })],
      { text: "Here are the 5 laws they never taught" }),
    // z7 pattern interrupt at 2000ms — mandatory for scenes ≥ 5s
    el("el_fh_interrupt", "text", "supporting_caption", "typography", "emphasis",
      { x: 92, y: 1590, width: 896, height: 72, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 40, fontFamily: "Outfit", fontWeight: 600, textAlign: "left", color: "#C4A882" },
      [anim("a_fh_interrupt", "pop_in", 2000, 300)],
      { text: "Law #1 changed everything ↓" }),
    // z8 depth: foreground fast accent line
    el("el_fh_depth", "shape", "divider", "depth", "payoff",
      { x: 92, y: 1700, width: 300, height: 4, zIndex: 8, rotation: 0, scale: 1, opacity: 0.4 },
      { backgroundColor: "#ffffff" },
      [anim("a_fh_depth", "zip_in", 2100, 250)],
      { shape: "rectangle" }),
  ],
};

// ─── TYPOGRAPHIC_STATEMENT ─────────────────────────────────────────────────────

const typographicStatementScene: Scene = {
  id: "scene_ai_fact",
  name: "AI Breakthrough Fact",
  durationMs: 6000,
  background: { color: "#0B1020", color2: "#111827", gradientAngle: 160, gradientAngleSpeed: 0.3 },
  transition: { type: "whip_pan_left", durationMs: 280 },
  rhythmPattern: "sweep",
  dominantFocalId: "el_ts_headline",
  elements: [
    el("el_ts_glow", "shape", "scene_backdrop", "atmospheric", undefined,
      { x: 80, y: 400, width: 920, height: 920, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#60A5FA", borderRadius: 999, filters: { blur: 150 }, blendMode: "screen" },
      [anim("a_ts_glow", "atmosphere_pulse", 0, 99999, { amplitude: 0.06, speed: 0.25 })],
      { shape: "circle" }),
    el("el_ts_geo", "shape", "scene_backdrop", "background_motion", undefined,
      { x: 760, y: 200, width: 400, height: 400, zIndex: 2, rotation: 45, scale: 1, opacity: 1 },
      { backgroundColor: "#A78BFA", borderRadius: 12, filters: { blur: 4 }, blendMode: "screen" },
      [
        anim("a_ts_geo_fade", "fadeIn", 0, 1000),
        anim("a_ts_geo_drift", "depth_drift", 0, 99999, { amplitude: 14, speed: 0.35 }),
      ],
      { shape: "rectangle" }),
    el("el_ts_bar", "shape", "divider", "secondary_motion", "hook",
      { x: 440, y: 820, width: 200, height: 4, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#A78BFA" },
      [anim("a_ts_bar", "draw_in", 0, 350)],
      { shape: "rectangle" }),
    el("el_ts_label", "text", "section_title", "typography", "hook",
      { x: 92, y: 860, width: 896, height: 72, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 40, fontFamily: "Inter", fontWeight: 700, textAlign: "center", color: "#A78BFA", letterSpacing: 8, textTransform: "uppercase" },
      [anim("a_ts_label", "slideUp", 0, 380, { fromOffset: 40 })],
      { text: "AI Breakthrough" }),
    // gradient text headline — the key visual
    el("el_ts_headline", "text", "hero_phrase", "typography", "hook",
      { x: 40, y: 950, width: 1000, height: 280, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 96, fontFamily: "Space Grotesk", fontWeight: 900, textAlign: "center",
        color: "#ffffff",
        textGradient: { type: "linear", angle: 135, stops: [{ offset: 0, color: "#60A5FA" }, { offset: 1, color: "#A78BFA" }] },
        textShadow: { offsetX: 0, offsetY: 4, blur: 24, color: "#000000", alpha: 0.7 },
        textEffect: "glow", textEffectColor: "#60A5FA",
      },
      [anim("a_ts_headline", "depth_charge", 150, 600, { easing: "easeOut" })],
      { text: "Sees Text, Images & Audio Together" }),
    // word_slide_up body — sequential word arrival
    el("el_ts_body", "text", "body_copy", "typography", "reveal",
      { x: 92, y: 1270, width: 896, height: 160, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 46, fontFamily: "Inter", fontWeight: 400, textAlign: "center", color: "#9CA3AF",
        textShadow: { offsetX: 0, offsetY: 2, blur: 8, color: "#000000", alpha: 0.4 },
      },
      [anim("a_ts_body", "word_slide_up", 500, 700)],
      { text: "One model. One prompt. Photo, voice, spreadsheet — handled simultaneously." }),
    // animated_stat pops at 2200ms — data with visual chrome
    el("el_ts_stat", "animated_stat", "supporting_caption", "depth", "emphasis",
      { x: 292, y: 1490, width: 496, height: 180, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { color: "#60A5FA", fontSize: 80, fontFamily: "Space Grotesk", fontWeight: 900 },
      [anim("a_ts_stat", "pop_in", 2200, 350)],
      { text: "300ms", label: "Multimodal response time" }),
    el("el_ts_depth", "shape", "divider", "depth", "payoff",
      { x: 440, y: 1720, width: 200, height: 3, zIndex: 8, rotation: 0, scale: 1, opacity: 0.5 },
      { backgroundColor: "#60A5FA" },
      [anim("a_ts_depth", "draw_in", 2400, 400)],
      { shape: "rectangle" }),
  ],
};

// ─── LAYERED_CARD ──────────────────────────────────────────────────────────────

const layeredCardScene: Scene = {
  id: "scene_wellness_hydration",
  name: "Hydration Body Scene",
  durationMs: 6500,
  background: { color: "#F3E5F5", color2: "#E8EAF6", gradientAngle: 130 },
  transition: { type: "slide_left", durationMs: 400 },
  rhythmPattern: "reveal",
  dominantFocalId: "el_lc_hero",
  elements: [
    el("el_lc_atmo", "shape", "scene_backdrop", "atmospheric", undefined,
      { x: 500, y: 100, width: 600, height: 600, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#9C27B0", borderRadius: 999, filters: { blur: 120 }, blendMode: "screen" },
      [anim("a_lc_atmo", "cinematic_breathe", 0, 99999, { amplitude: 0.03, speed: 0.4 })],
      { shape: "circle" }),
    // card backdrop — MUST use fadeIn, never zoomIn/slideUp
    el("el_lc_card", "shape", "scene_backdrop", "focal", undefined,
      { x: 60, y: 380, width: 960, height: 1160, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#ffffff", borderRadius: 32, filters: { dropShadow: { color: "#000000", blur: 48, alpha: 0.11, offsetX: 0, offsetY: 16 } } },
      [anim("a_lc_card", "fadeIn", 0, 600)],
      { shape: "rectangle" }),
    el("el_lc_img", "image", "hero_image", "focal", "hook",
      { x: 60, y: 380, width: 960, height: 620, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
      { borderRadius: 32, filters: { brightness: 1.05, cinematic: true, vignette: 0.2 } },
      [
        anim("a_lc_img", "slideUp", 0, 600, { fromOffset: 60, easing: "overshoot" }),
        anim("a_lc_img_breathe", "cinematic_breathe", 0, 99999, { amplitude: 0.015, speed: 0.3 }),
      ],
      { src: "woman_drinking_water_morning_sunlight" }),
    el("el_lc_divider", "shape", "divider", "secondary_motion", "reveal",
      { x: 60, y: 960, width: 960, height: 5, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#9C27B0" },
      [anim("a_lc_divider", "draw_in", 100, 400)],
      { shape: "rectangle" }),
    el("el_lc_hero", "text", "hero_phrase", "typography", "reveal",
      { x: 92, y: 1000, width: 896, height: 190, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 80, fontFamily: "Poppins", fontWeight: 800, textAlign: "center",
        color: "#1a1a1a",
        textShadow: { offsetX: 0, offsetY: 2, blur: 8, color: "#000000", alpha: 0.12 },
      },
      [anim("a_lc_hero", "slideUp", 250, 500, { fromOffset: 60, easing: "overshoot" })],
      { text: "500ml Water After Waking" }),
    // richText body with highlight span on the key stat
    el("el_lc_body", "text", "body_copy", "typography", "reveal",
      { x: 92, y: 1225, width: 896, height: 150, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 44, fontFamily: "Manrope", fontWeight: 400, textAlign: "center", color: "#444444" },
      [anim("a_lc_body", "momentum_carry", 450, 500, { easing: "cinematicEaseOut" })],
      {
        richText: [
          { text: "Boosts focus by ", style: { color: "#666666", fontWeight: 400 } },
          { text: "20%", style: { color: "#7B1FA2", fontWeight: 700, highlight: "rgba(156,39,176,0.12)", highlightRadius: 8 } },
          { text: " within 30 minutes.", style: { color: "#666666", fontWeight: 400 } },
        ],
      }),
    el("el_lc_interrupt", "text", "supporting_caption", "depth", "emphasis",
      { x: 92, y: 1420, width: 896, height: 90, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 40, fontFamily: "Manrope", fontWeight: 500, textAlign: "center", color: "#9C27B0" },
      [anim("a_lc_interrupt", "pop_in", 2200, 350)],
      { text: "75% of Americans are chronically dehydrated" }),
    el("el_lc_depth", "shape", "divider", "depth", "payoff",
      { x: 340, y: 1560, width: 400, height: 3, zIndex: 8, rotation: 0, scale: 1, opacity: 0.3 },
      { backgroundColor: "#9C27B0" },
      [anim("a_lc_depth", "draw_in", 2400, 500)],
      { shape: "rectangle" }),
  ],
};

// ─── MINIMAL_BOLD ──────────────────────────────────────────────────────────────

const minimalBoldScene: Scene = {
  id: "scene_cta_follow",
  name: "Follow CTA",
  durationMs: 4000,
  background: { color: "#7C3AED", color2: "#4C1D95", gradientAngle: 140, gradientAngleSpeed: 0.6 },
  transition: { type: "zoom_in", durationMs: 350 },
  rhythmPattern: "payoff",
  dominantFocalId: "el_mb_title",
  elements: [
    el("el_mb_orb", "shape", "scene_backdrop", "atmospheric", undefined,
      { x: 190, y: 300, width: 700, height: 700, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#A78BFA", borderRadius: 999, filters: { blur: 120 }, blendMode: "screen" },
      [anim("a_mb_orb", "atmosphere_pulse", 0, 99999, { amplitude: 0.08, speed: 0.35 })],
      { shape: "circle" }),
    el("el_mb_star", "shape", "scene_backdrop", "background_motion", undefined,
      { x: 830, y: 1400, width: 120, height: 120, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#ffffff", filters: { blur: 2 }, blendMode: "screen" },
      [
        anim("a_mb_star_fade", "fadeIn", 0, 800),
        anim("a_mb_star_float", "float", 0, 99999, { amplitude: 15, speed: 0.5 }),
      ],
      { shape: "star" }),
    // slam_down with bounceOut — the signature CTA entrance
    el("el_mb_title", "text", "cta_label", "typography", "hook",
      { x: 60, y: 820, width: 960, height: 280, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 100, fontFamily: "Playfair Display", fontWeight: 900, textAlign: "center",
        color: "#ffffff",
        textShadow: { offsetX: 0, offsetY: 4, blur: 20, color: "#000000", alpha: 0.4 },
        textEffect: "shadow_stack", textEffectColor: "#ffffff",
      },
      [anim("a_mb_title", "slam_down", 0, 480, { easing: "bounceOut" })],
      { text: "Follow For Daily Wealth Laws" }),
    el("el_mb_body", "text", "body_copy", "typography", "reveal",
      { x: 92, y: 1150, width: 896, height: 90, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 44, fontFamily: "Outfit", fontWeight: 400, textAlign: "center", color: "rgba(255,255,255,0.8)" },
      [anim("a_mb_body", "fadeIn", 300, 500)],
      { text: "Laws #4 & #5 drop tomorrow at 9am" }),
    // button = shape (spring_in) + text (fadeIn delayed) — they pair together
    el("el_mb_btn_bg", "shape", "cta_backdrop", "secondary_motion", "reveal",
      { x: 180, y: 1380, width: 720, height: 148, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#ffffff", borderRadius: 50 },
      [anim("a_mb_btn_bg", "spring_in", 350, 550, { easing: "overshoot" })],
      { shape: "rectangle" }),
    el("el_mb_btn_text", "text", "cta_button", "typography", "reveal",
      { x: 180, y: 1388, width: 720, height: 132, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 56, fontFamily: "Playfair Display", fontWeight: 700, textAlign: "center", color: "#7C3AED" },
      [anim("a_mb_btn_text", "fadeIn", 500, 400)],
      { text: "Follow Now" }),
    el("el_mb_depth", "shape", "divider", "depth", "payoff",
      { x: 380, y: 1580, width: 320, height: 3, zIndex: 8, rotation: 0, scale: 1, opacity: 0.5 },
      { backgroundColor: "#C4B5FD" },
      [anim("a_mb_depth", "draw_in", 600, 400)],
      { shape: "rectangle" }),
  ],
};

export const SCENE_ARCHETYPE_EXAMPLES: SceneExample[] = [
  {
    kind: "scene",
    id: "archetype_cinematic_hero_finance",
    subcategory: "CINEMATIC_HERO",
    label: "Cinematic Hero — Finance Hook",
    description: "Full-bleed image with lower-third text hierarchy. Warm gold glow atmosphere. depth_charge headline entrance.",
    meta: {
      tags: ["cinematic_hero", "lower_third", "depth_charge", "pattern_interrupt", "image_led", "dark_bg", "gold_palette", "6_layers"],
      mood: ["dramatic", "authoritative", "urgent"],
      palette: "dark",
      scenePosition: "hook",
      motionAxis: "scale",
      contentNiches: ["finance"],
      visualLanguage: "cinematic_story",
      difficulty: "intermediate",
    },
    scene: cinematicHeroScene,
    annotations: {
      whatMakesItGood: [
        "depth_charge entrance on hook_title creates drama — never use plain slideUp for a hook",
        "Warm gold atmosphere_pulse orb at z1 adds perceived depth without any image elements",
        "Text in lower third (y:1080+) reads as cinematic — centered text looks like a slide",
        "Pattern interrupt at 2000ms (el_fh_interrupt) re-engages the viewer before scene ends",
        "Gold accent bar draw_in before the headline primes the eye for the text arrival",
        "textEffect:shadow_stack + textShadow — never flat text on dark backgrounds",
      ],
      keyDecisions: [
        "depth_charge instead of slideUp — entry type signals genre (cinematic vs. explainer)",
        "momentum_carry on subtitle — inherits direction from depth_charge creating flow",
        "gradientAngleSpeed:0.4 — background gradient rotates slowly, scene feels alive",
      ],
      remixHints: [
        "Tech: bgColor='#0B1020', bgColor2='#111827', accentColor='#60A5FA', textEffect='glow'",
        "Love/emotion: bgColor='#1A0A12', accentColor='#FF6B9D', textEffect='glow'",
        "Wellness: bgColor='#071A0E', accentColor='#00E676', change orb color to green",
        "Pure typography (no image): remove el_fh_img, add TYPOGRAPHIC_STATEMENT orbs instead",
      ],
      avoidPatterns: [
        "Never use zoomIn on the scrim/card — backdrop shapes fade in, content layers animate",
        "Never add decorative corner circles — the glow orb IS the atmospheric element",
        "Never skip the pattern interrupt for scenes ≥ 5000ms",
      ],
    },
  },
  {
    kind: "scene",
    id: "archetype_typographic_statement_ai",
    subcategory: "TYPOGRAPHIC_STATEMENT",
    label: "Typographic Statement — AI Fact Reveal",
    description: "Text IS the visual. Gradient headline, word_slide_up body, animated_stat pattern interrupt. Electric blue tech palette.",
    meta: {
      tags: ["typographic_statement", "gradient_text", "depth_charge", "word_slide_up", "animated_stat", "dark_bg", "tech_palette", "6_layers"],
      mood: ["futuristic", "intelligent", "revelatory"],
      palette: "cool",
      scenePosition: "body",
      motionAxis: "scale",
      contentNiches: ["tech", "education"],
      visualLanguage: "hyper_modern",
      difficulty: "intermediate",
    },
    scene: typographicStatementScene,
    annotations: {
      whatMakesItGood: [
        "textGradient on hero headline — gradient text reads as premium vs. plain flat color",
        "depth_charge on headline + word_slide_up on body — two different animation types per scene",
        "thin accent bar draws in before the headline — primes the eye for text arrival",
        "animated_stat element at 2200ms — data with visual chrome, not plain text",
        "floating geometry at z2 breathes with depth_drift — scene stays alive at rest",
        "textEffect:glow on dark bg headline — mandatory on dark scenes",
      ],
      keyDecisions: [
        "depth_charge instead of slam_down — electric/expanding feel for tech content",
        "word_slide_up on body — each word arrives separately, viewer absorbs each",
        "section_title ABOVE the hero phrase — labels context before impact lands",
        "Space Grotesk headline + Inter body — MODERN_CLEAN pair for tech/startup",
      ],
      remixHints: [
        "Finance: swap gradient stops to (#E8B84B → #C49A2A), change orb to #E8B84B",
        "Viral: increase headline to 120px, slam_down entrance",
        "Luxury: Playfair Display headline, champagne gradient (#E7D3B1 → #C4A882)",
      ],
    },
  },
  {
    kind: "scene",
    id: "archetype_layered_card_wellness",
    subcategory: "LAYERED_CARD",
    label: "Layered Card — Wellness Body Scene",
    description: "White card on light bg. Image in card top half. richText body with highlight spans. Soft purple palette.",
    meta: {
      tags: ["layered_card", "rich_text", "highlight_spans", "light_bg", "card_layout", "overshoot_easing", "image_in_card"],
      mood: ["fresh", "trustworthy", "informative"],
      palette: "light",
      scenePosition: "body",
      motionAxis: "vertical",
      contentNiches: ["wellness", "education", "general"],
      visualLanguage: "minimal_clean",
      difficulty: "beginner",
    },
    scene: layeredCardScene,
    annotations: {
      whatMakesItGood: [
        "Light background with white card — wellness/lifestyle demands warmth, not near-black",
        "Image in card top half, purple divider separates image from text — clear hierarchy",
        "richText with highlight on the stat number — draws eye to the key information",
        "overshoot easing on card image and hero phrase — springy, premium feel",
        "cinematic_breathe on image — image subtly breathes even at rest",
        "Pattern interrupt stat at 2200ms uses pop_in — faster energy after slow reveal",
      ],
      keyDecisions: [
        "fadeIn on card backdrop — NEVER zoomIn/slideUp on backdrop shapes",
        "momentum_carry on body copy — inherits from hero phrase, natural flow",
        "Light #F3E5F5 background — wellness content demands warmth",
        "Purple #9C27B0 accent — matches wellness/mindfulness emotional palette",
      ],
      remixHints: [
        "E-commerce: replace image with product photo, change to brand palette",
        "Education: bg='#F9FAFB', accent='#0071E3' (Apple blue), Poppins remains",
        "Travel: bg='#01579B' gradient, use destination photo in card, warm ocean palette",
        "No image: remove image element, extend card, add more richText or a graph element",
      ],
    },
  },
  {
    kind: "scene",
    id: "archetype_minimal_bold_cta",
    subcategory: "MINIMAL_BOLD",
    label: "Minimal Bold — Follow CTA",
    description: "Animated gradient bg. slam_down headline with bounceOut. Button as shape+text pair. spring_in reveal.",
    meta: {
      tags: ["minimal_bold", "cta", "slam_down", "bounce_out", "animated_gradient", "button_pattern", "spring_in"],
      mood: ["triumphant", "energetic", "motivating"],
      palette: "vivid",
      scenePosition: "cta",
      motionAxis: "scale",
      contentNiches: ["general"],
      visualLanguage: "social_viral",
      difficulty: "beginner",
    },
    scene: minimalBoldScene,
    annotations: {
      whatMakesItGood: [
        "gradientAngleSpeed:0.6 — CTA backgrounds MUST animate, static gradient = slide",
        "slam_down with bounceOut easing — creates satisfying arrival, feels final",
        "Button = shape (spring_in) + text (fadeIn 150ms later) — text fills inside shape",
        "Button text color (#7C3AED) on white — dark on light contrast for readability",
        "Max 6 elements — CTA scenes stay simple",
        "NO decorative corner circles — the ambient orb is the only decorative element",
      ],
      keyDecisions: [
        "slam_down over zoomIn — slam_down creates more triumphant energy for CTA",
        "bounceOut easing — the bounce feels like a final statement landing",
        "spring_in on button backdrop with overshoot — interactive feel",
        "text after button shape at startMs:500 — text appears inside the fully-visible shape",
      ],
      remixHints: [
        "Gold/finance: bgColor='#C4A882', bgColor2='#8B6F47', button bg='#0a0a0a', text='#C4A882'",
        "Tech: bgColor='#0071E3', bgColor2='#004BA0', remove orb, keep slam_down",
        "Wellness: bgColor='#9C27B0', gradientAngleSpeed=0.3, drift_in entrance",
      ],
    },
  },
];
