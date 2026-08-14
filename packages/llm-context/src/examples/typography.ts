import type { Animation, AnimationType, ElementNode, ElementType, LayoutProps, SemanticLayerType, StyleProps, TemporalZone } from "@kwikk/shared-types";
import type { TypographyExample } from "./types.js";

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

// ─── BOLD_IMPACT pair: Anton + DM Sans ────────────────────────────────────────
// Tone: fitness, sports, Gen Z, street culture, hype, advertising

export const typoBoldImpact: TypographyExample = {
  kind: "typography",
  id: "typo_bold_impact",
  label: "BOLD_IMPACT — Anton + DM Sans",
  description: "High-energy viral. Giant hook_title with shadow_stack + slam_down. Word-by-word body arrival. All-caps label.",
  fontPair: { headline: "Anton", body: "DM Sans", tone: "fitness, sports, viral, hype, street" },
  meta: {
    tags: ["bold_impact", "shadow_stack", "slam_down", "word_slide_up", "uppercase", "all_caps_label", "dark_bg"],
    mood: ["energetic", "aggressive", "hype"],
    palette: "dark",
    scenePosition: "hook",
    motionAxis: "scale",
    contentNiches: ["sports", "general"],
    difficulty: "beginner",
  },
  elements: [
    // section label: all-caps, wide letterSpacing
    el("tp1_label", "text", "section_title", "typography", "hook",
      { x: 92, y: 780, width: 896, height: 72, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 40, fontFamily: "DM Sans", fontWeight: 700, textAlign: "center", color: "#EF4444", letterSpacing: 10, textTransform: "uppercase" },
      [anim("tp1_label_a", "slideUp", 0, 350, { fromOffset: 40 })],
      { text: "The Rule Everyone Ignores" }),
    // hook_title: Anton 120px, slam_down, shadow_stack — the dominant element
    el("tp1_hook", "text", "hook_title", "typography", "hook",
      { x: 40, y: 860, width: 1000, height: 340, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 120, fontFamily: "Anton", fontWeight: 400, textAlign: "center",
        color: "#ffffff", textTransform: "uppercase",
        textShadow: { offsetX: 0, offsetY: 6, blur: 0, color: "#000000", alpha: 1 },
        textEffect: "shadow_stack", textEffectColor: "#EF4444",
      },
      [anim("tp1_hook_a", "slam_down", 100, 450, { easing: "bounceOut" })],
      { text: "Never Skip Rest Days" }),
    // hook_subtitle: DM Sans, word_slide_up — words arrive one by one
    el("tp1_sub", "text", "hook_subtitle", "typography", "reveal",
      { x: 92, y: 1240, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 52, fontFamily: "DM Sans", fontWeight: 600, textAlign: "center",
        color: "#d1d5db",
        textShadow: { offsetX: 0, offsetY: 2, blur: 8, color: "#000000", alpha: 0.5 },
      },
      [anim("tp1_sub_a", "word_slide_up", 400, 600)],
      { text: "Recovery is where strength is built." }),
    // supporting_caption: DM Sans, smaller, accent color, pop_in
    el("tp1_cap", "text", "supporting_caption", "typography", "emphasis",
      { x: 92, y: 1380, width: 896, height: 72, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 40, fontFamily: "DM Sans", fontWeight: 500, textAlign: "center", color: "#EF4444" },
      [anim("tp1_cap_a", "pop_in", 2000, 300)],
      { text: "Elite athletes: 8+ hours sleep. Every night." }),
  ],
  annotations: {
    whatMakesItGood: [
      "Anton at 120px UPPERCASE + slam_down — the signature of viral sports/fitness content",
      "shadow_stack textEffect + hard textShadow (alpha:1, blur:0) — not soft, punchy",
      "word_slide_up on subtitle — each word arrives separately at medium tempo",
      "Accent color (#EF4444 red) used on label + caption — two touch points, not five",
      "textTransform:uppercase on both label and headline — consistent register",
    ],
    keyDecisions: [
      "Anton (400 weight) headline — Anton is a display font, 400 is its only weight",
      "slam_down with bounceOut easing — the bounce matches the physical/sports energy",
      "letterSpacing:10 on label — uppercase labels need breathing room",
      "Supporting caption at 40px — DM Sans body, smallest and quietest in the hierarchy",
    ],
    remixHints: [
      "Swap Anton → Oswald for more structured sports feel; Barlow Condensed for condensed energy",
      "Change red accent to #F59E0B (gold) for fitness-meets-luxury",
      "Light background: color='#F9FAFB', hook_title color='#111111', shadow_stack='#EF4444'",
      "Add richText on subtitle to highlight one key word with a colored highlight span",
    ],
  },
};

// ─── PREMIUM_EDITORIAL pair: Playfair Display + Outfit ─────────────────────────
// Tone: luxury, beauty, fashion, high-end lifestyle

export const typoPremiumEditorial: TypographyExample = {
  kind: "typography",
  id: "typo_premium_editorial",
  label: "PREMIUM_EDITORIAL — Playfair Display + Outfit",
  description: "Luxury editorial. drift_in on headline with gold textEffect. richText with gold highlight spans. Champagne palette.",
  fontPair: { headline: "Playfair Display", body: "Outfit", tone: "luxury, beauty, fashion, editorial" },
  meta: {
    tags: ["premium_editorial", "gold_effect", "rich_text", "highlight_spans", "drift_in", "champagne_palette", "dark_bg"],
    mood: ["luxurious", "refined", "editorial", "aspirational"],
    palette: "luxury",
    scenePosition: "body",
    motionAxis: "static",
    contentNiches: ["luxury", "travel", "general"],
    difficulty: "intermediate",
  },
  elements: [
    // gold letter-spaced label — editorial masthead feel
    el("tp2_label", "text", "section_title", "typography", "hook",
      { x: 92, y: 740, width: 896, height: 64, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 36, fontFamily: "Outfit", fontWeight: 400, textAlign: "center", color: "#C4A882", letterSpacing: 12, textTransform: "uppercase" },
      [anim("tp2_label_a", "fadeIn", 0, 900)],
      { text: "The Investment" }),
    // hero_phrase: Playfair Display 96px, drift_in, gold textEffect
    el("tp2_hero", "text", "hero_phrase", "typography", "hook",
      { x: 60, y: 830, width: 960, height: 260, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 92, fontFamily: "Playfair Display", fontWeight: 700, textAlign: "center",
        color: "#E7D3B1",
        textShadow: { offsetX: 0, offsetY: 4, blur: 20, color: "#000000", alpha: 0.6 },
        textEffect: "gold", textEffectColor: "#C4A882",
      },
      [anim("tp2_hero_a", "drift_in", 0, 1100, { fromOffset: 20, easing: "easeOut" })],
      { text: "Quality Over Quantity" }),
    // thin gold divider between hero and body
    el("tp2_div", "shape", "divider", "secondary_motion", "reveal",
      { x: 420, y: 1115, width: 240, height: 3, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#C4A882" },
      [anim("tp2_div_a", "draw_in", 200, 500)],
      { shape: "rectangle" }),
    // body_copy: Outfit 44px, richText with highlight on key word
    el("tp2_body", "text", "body_copy", "typography", "reveal",
      { x: 92, y: 1150, width: 896, height: 160, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 44, fontFamily: "Outfit", fontWeight: 300, textAlign: "center", color: "#9CA3AF" },
      [anim("tp2_body_a", "fadeIn", 500, 800)],
      {
        richText: [
          { text: "One ", style: { color: "#9CA3AF", fontWeight: 300 } },
          { text: "perfectly made piece", style: { color: "#E7D3B1", fontWeight: 600, highlight: "rgba(196,168,130,0.15)", highlightRadius: 6 } },
          { text: " lasts a lifetime.", style: { color: "#9CA3AF", fontWeight: 300 } },
        ],
      }),
    // supporting_caption: Outfit 38px, dimmer, delayed fade
    el("tp2_cap", "text", "supporting_caption", "typography", "emphasis",
      { x: 92, y: 1350, width: 896, height: 76, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 38, fontFamily: "Outfit", fontWeight: 300, textAlign: "center", color: "#6B7280" },
      [anim("tp2_cap_a", "fadeIn", 2000, 900)],
      { text: "Average fast-fashion item worn 7 times. Premium: 200+." }),
  ],
  annotations: {
    whatMakesItGood: [
      "drift_in on hero_phrase — slow luxury float, not a snap entrance (editorial pacing)",
      "gold textEffect on dark background — mandatory for luxury/editorial content",
      "richText highlight on the key phrase — draws eye without bold weight disruption",
      "letterSpacing:12 on uppercase label — editorial masthead breathing room",
      "fontWeight:300 body copy — lighter weight reads as refined, not weak",
      "thin gold divider between hero and body — elegant visual separator",
    ],
    keyDecisions: [
      "drift_in (1100ms) over fadeIn — luxury means slow, deliberate, unhurried",
      "textEffect:gold specifically — not glow or shadow_stack, which would feel too energetic",
      "richText with fontWeight:300 body + fontWeight:600 highlight — one weight contrast only",
      "supporting_caption at 2000ms with 900ms fadeIn — the slowest element, last to arrive",
    ],
    remixHints: [
      "Cool luxury (tech/jewelry): replace gold (#C4A882) with silver (#D1D5DB), use chrome textEffect",
      "Rose luxury (beauty): replace gold with #FF6B9D, textEffect='glow'",
      "Light editorial: bg='#F9FAFB', hero_phrase color='#1a1a1a', body='#4B5563', remove textEffect",
      "Add textCurve:{type:'arc',radius:600} on hero_phrase for editorial arch effect",
    ],
  },
};

// ─── MODERN_CLEAN pair: Space Grotesk + Geist ─────────────────────────────────
// Tone: tech, startup, SaaS, crypto, productivity

export const typoModernClean: TypographyExample = {
  kind: "typography",
  id: "typo_modern_clean",
  label: "MODERN_CLEAN — Space Grotesk + Geist",
  description: "Tech/startup energy. Gradient text headline with glow. count_up animated stat. Typewriter on code snippet.",
  fontPair: { headline: "Space Grotesk", body: "Geist", tone: "tech, startup, SaaS, developer tools, crypto" },
  meta: {
    tags: ["modern_clean", "gradient_text", "glow_effect", "count_up", "typewriter", "tech_palette", "dark_bg"],
    mood: ["intelligent", "precise", "futuristic"],
    palette: "cool",
    scenePosition: "body",
    motionAxis: "vertical",
    contentNiches: ["tech", "education"],
    difficulty: "intermediate",
  },
  elements: [
    // gradient headline — tech signature
    el("tp3_hero", "text", "hero_phrase", "typography", "hook",
      { x: 92, y: 760, width: 896, height: 260, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 88, fontFamily: "Space Grotesk", fontWeight: 800, textAlign: "left",
        color: "#ffffff",
        textGradient: { type: "linear", angle: 90, stops: [{ offset: 0, color: "#60A5FA" }, { offset: 0.5, color: "#A78BFA" }, { offset: 1, color: "#F0ABFC" }] },
        textShadow: { offsetX: 0, offsetY: 3, blur: 16, color: "#000000", alpha: 0.6 },
        textEffect: "glow", textEffectColor: "#60A5FA",
      },
      [anim("tp3_hero_a", "slideUp", 0, 450, { fromOffset: 60, easing: "easeOut" })],
      { text: "99.99% Uptime, Zero Compromise" }),
    // body_copy: Geist 44px, left-aligned for code-adjacent feel
    el("tp3_body", "text", "body_copy", "typography", "reveal",
      { x: 92, y: 1060, width: 896, height: 145, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 44, fontFamily: "Geist", fontWeight: 400, textAlign: "left", color: "#9CA3AF" },
      [anim("tp3_body_a", "slideUp", 280, 500, { fromOffset: 50 })],
      { text: "Distributed across 47 regions. Automatic failover in under 200ms." }),
    // count_up stat — number builds up
    el("tp3_stat", "text", "supporting_caption", "secondary_motion", "emphasis",
      { x: 92, y: 1260, width: 400, height: 180, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 96, fontFamily: "Space Grotesk", fontWeight: 900, textAlign: "left", color: "#60A5FA" },
      [anim("tp3_stat_a", "count_up", 600, 1400, { fromValue: 0, toValue: 99 })],
      { text: "99" }),
    // stat label beside the number
    el("tp3_stat_label", "text", "supporting_caption", "typography", "emphasis",
      { x: 520, y: 1290, width: 468, height: 140, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 36, fontFamily: "Geist", fontWeight: 400, textAlign: "left", color: "#6B7280" },
      [anim("tp3_stat_label_a", "fadeIn", 700, 500)],
      { text: "requests handled\nper second" }),
    // typewriter code snippet — character-by-character build
    el("tp3_code", "text", "supporting_caption", "depth", "payoff",
      { x: 92, y: 1490, width: 896, height: 72, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 36, fontFamily: "JetBrains Mono", fontWeight: 400, textAlign: "left",
        color: "#4ADE80", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8,
      },
      [anim("tp3_code_a", "typewriter", 2000, 1200)],
      { text: "$ uptime --global --realtime" }),
  ],
  annotations: {
    whatMakesItGood: [
      "3-stop gradient (#60A5FA → #A78BFA → #F0ABFC) on headline — more dynamic than 2-stop",
      "textEffect:glow matches glow with the first gradient stop color — coherent",
      "count_up animation on a number — turns a static stat into a moment",
      "typewriter on code snippet at 2000ms — builds anticipation, pattern interrupt",
      "JetBrains Mono for code specifically — accent font at correct role (code only)",
      "Left-aligned text — tech content reads left-to-right, not centered like consumer",
    ],
    keyDecisions: [
      "Space Grotesk 800 (not 900) — 900 is for dramatic hooks; 800 is strong but technical",
      "Geist 400 body — lowercase, clean, developer-native feel",
      "count_up fromValue:0 toValue:99 over 1400ms — long enough to see the counting",
      "code snippet has dark semi-transparent bg — code blocks need container for readability",
    ],
    remixHints: [
      "SaaS/product: replace code with a feature badge using shape:badge + pop_in",
      "Startup/viral: increase to 120px, change to slam_down, more aggressive palette",
      "Finance/data: swap gradient to gold (#E8B84B → #C49A2A), count_up becomes a dollar amount",
      "Remove code, add a type:graph element with draw_in for comparison/trend data",
    ],
  },
};

// ─── FRIENDLY_CONSUMER pair: Poppins + Manrope ────────────────────────────────
// Tone: food, retail, education, consumer apps, wellness, family

export const typoFriendlyConsumer: TypographyExample = {
  kind: "typography",
  id: "typo_friendly_consumer",
  label: "FRIENDLY_CONSUMER — Poppins + Manrope",
  description: "Warm and approachable. Bright palette with centered layout. richText emoji + highlight. Bounce entrance on hero phrase.",
  fontPair: { headline: "Poppins", body: "Manrope", tone: "food, wellness, retail, consumer apps, family" },
  meta: {
    tags: ["friendly_consumer", "bright_palette", "rich_text", "emoji", "centered", "bounceIn", "warm_palette"],
    mood: ["warm", "approachable", "joyful"],
    palette: "warm",
    scenePosition: "body",
    motionAxis: "vertical",
    contentNiches: ["wellness", "food", "general"],
    difficulty: "beginner",
  },
  elements: [
    // emoji accent above headline
    el("tp4_emoji", "text", "supporting_caption", "secondary_motion", "hook",
      { x: 440, y: 720, width: 200, height: 180, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 120, fontFamily: "Poppins", fontWeight: 400, textAlign: "center" },
      [anim("tp4_emoji_a", "bounceIn", 0, 500, { amplitude: 0.3 })],
      { text: "🥑" }),
    // hero_phrase: Poppins 88px, spring_in, dark on light
    el("tp4_hero", "text", "hero_phrase", "typography", "hook",
      { x: 60, y: 920, width: 960, height: 220, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 88, fontFamily: "Poppins", fontWeight: 800, textAlign: "center",
        color: "#1a1a1a",
        textShadow: { offsetX: 0, offsetY: 2, blur: 6, color: "#000000", alpha: 0.1 },
      },
      [anim("tp4_hero_a", "spring_in", 200, 600, { easing: "overshoot" })],
      { text: "Eat Better, Live Better" }),
    // richText body with green highlight on the key action word
    el("tp4_body", "text", "body_copy", "typography", "reveal",
      { x: 92, y: 1180, width: 896, height: 150, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 48, fontFamily: "Manrope", fontWeight: 400, textAlign: "center", color: "#374151" },
      [anim("tp4_body_a", "momentum_carry", 500, 500)],
      {
        richText: [
          { text: "Just ", style: { color: "#6B7280", fontWeight: 400 } },
          { text: "one meal change", style: { color: "#166534", fontWeight: 700, highlight: "rgba(22,101,52,0.12)", highlightRadius: 10 } },
          { text: " per week builds lasting habits.", style: { color: "#6B7280", fontWeight: 400 } },
        ],
      }),
    // pill badge supporting caption — rounded bg
    el("tp4_badge", "text", "supporting_caption", "depth", "emphasis",
      { x: 240, y: 1380, width: 600, height: 90, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 40, fontFamily: "Manrope", fontWeight: 600, textAlign: "center",
        color: "#166534", backgroundColor: "rgba(22,101,52,0.1)", borderRadius: 40,
      },
      [anim("tp4_badge_a", "pop_in", 2000, 350)],
      { text: "94% of users report more energy" }),
  ],
  annotations: {
    whatMakesItGood: [
      "emoji above headline — friendly, universal, pattern-breaking",
      "spring_in with overshoot on hero_phrase — bouncy, approachable arrival",
      "richText with highlight span on the action phrase — key message stands out without bold weight shift",
      "Pill badge with semi-transparent bg — social proof presented as a chip",
      "Dark text on implied light background — FRIENDLY_CONSUMER often uses light scenes",
      "Manrope 400 body — clean, readable, friendly without being corporate",
    ],
    keyDecisions: [
      "bounceIn on emoji (amplitude:0.3) — playful bounce for non-text decorative element",
      "spring_in with overshoot on headline — slightly different from bounceIn, more spring-like",
      "momentum_carry on body copy — body copy inherits from hero phrase direction",
      "badge has text color matching highlight bg — the pill contains the color",
    ],
    remixHints: [
      "Food/recipe: replace emoji with food photo in a circle frame, add 'RECIPE' label",
      "Education: swap emoji for a graduation cap, change green to #0071E3",
      "Fitness: change to dark bg (#111111), swap Poppins to Barlow Condensed, use red accent",
      "Remove richText: use plain body copy with fontWeight:700 on key word for simpler implementation",
    ],
  },
};

// ─── AESTHETIC_TRAVEL pair: Anak Paud + Raleway ──────────────────────────────
// Tone: travel, lifestyle, scrapbook, aesthetic vlogs, organic storytelling

export const typoAestheticTravel: TypographyExample = {
  kind: "typography",
  id: "typo_aesthetic_travel",
  label: "AESTHETIC_TRAVEL — Anak Paud + Raleway",
  description: "Aesthetic travel vlogs / scrapbook style. Stylized header in Anak Paud. Subtitle in rounded slate card with Georgia serif accent span and black textStroke.",
  fontPair: { headline: "Anak Paud", body: "Raleway", tone: "travel, lifestyle, aesthetic vlogs, scrapbook, creative" },
  meta: {
    tags: ["aesthetic_travel", "rounded_pill", "mixed_fonts", "text_stroke", "rich_text", "draw_in_divider", "dark_bg"],
    mood: ["creative", "aesthetic", "warm", "organic"],
    palette: "warm",
    scenePosition: "body",
    motionAxis: "vertical",
    contentNiches: ["travel", "general"],
    difficulty: "intermediate",
  },
  elements: [
    // display title: Anak Paud 140px, centered
    el("tp5_title", "text", "section_title", "typography", "hook",
      { x: 92, y: 140, width: 896, height: 560, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 140, fontFamily: "Anak Paud", fontWeight: "700", textAlign: "center", color: "#eab308" },
      [anim("tp5_title_a", "fadeIn", 0, 800)],
      { text: "Switzerland\n&\nFrance" }),
    // pill backdrop container: borderRadius 80, border 1px, background slate
    el("tp5_pill_bg", "shape", "scene_backdrop", "depth", "reveal",
      { x: 180, y: 1050, width: 720, height: 120, zIndex: 8, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#94a3b8", borderColor: "#f1f5f9", borderWidth: 1, borderRadius: 80 },
      [anim("tp5_pill_bg_a", "fadeIn", 300, 500)],
      { shape: "rectangle" }),
    // mixed font subtitle inside pill container: Inter + Georgia accent, black textStroke
    el("tp5_sub", "text", "subtitle", "typography", "reveal",
      { x: 335, y: 1070, width: 560, height: 80, zIndex: 10, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 65, fontFamily: "Inter", fontWeight: "600", textAlign: "left", color: "#f1f5f9" },
      [anim("tp5_sub_a", "fadeIn", 450, 600)],
      {
        richText: [
          { text: "This ", style: { color: "#FFFFFF", fontFamily: "Inter", fontWeight: 700, textStroke: { color: "#000000", width: 5 } } },
          { text: "Summer", style: { color: "#FFE600", fontFamily: "Georgia", fontWeight: 400, textStroke: { color: "#000000", width: 5 } } }
        ]
      }),
    // thin gold divider below subtitle container: draw_in animation
    el("tp5_div", "shape", "divider", "secondary_motion", "emphasis",
      { x: 350, y: 1220, width: 380, height: 3, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: "#FFD43B" },
      [anim("tp5_div_a", "draw_in", 600, 400)],
      { shape: "rectangle" })
  ],
  annotations: {
    whatMakesItGood: [
      "Anak Paud display font for big aesthetic titles — adds a handwritten, organic scrapbook feel",
      "Caption text placed inside a rounded pill shape container (#94a3b8 slate, borderRadius 80) — creates visual structure and pops from background",
      "richText with mixed font spans (Inter + Georgia) and textStroke (width:5, black) — ensures text is highly legible over busy background frames",
      "Thin divider line (#FFD43B) animated with draw_in — serves as a clean graphic separator",
    ],
    keyDecisions: [
      "Use display/serif styling in richText for contrast on key words (like 'Summer')",
      "Keep pill wrapper x:180, width:720, height:120 — centered horizontally with ample margins",
      "textStroke on richText style — essential when backgrounds have high detail (mountains, streets)",
      "draw_in divider animation starting at 600ms — triggers right after text is revealed",
    ],
    remixHints: [
      "Swap Anak Paud for Agamtoh or August Shining for alternative aesthetic display feels",
      "Swap yellow Georgia to pink Aeogo Pxltd Serif for a warm sunset travel vibe",
      "Change container bg to #1e293b (slate-800) with white border for higher contrast on light photos",
    ],
  },
};

export const TYPOGRAPHY_EXAMPLES: TypographyExample[] = [
  typoBoldImpact,
  typoPremiumEditorial,
  typoModernClean,
  typoFriendlyConsumer,
  typoAestheticTravel,
];

