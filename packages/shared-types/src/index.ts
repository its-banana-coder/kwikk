export type ElementType = "text" | "image" | "video" | "shape" | "animated_stat" | "graph";

export type AnimationType =
  
  | "fadeIn"
  | "fadeOut"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "zoomIn"
  | "zoomOut"
  | "subtitle_pop"
  | "kinetic_slide"
  | "blur_transition"
  // premium motion intelligence — cinematic quality bar"
  | "cinematic_breathe"
  | "momentum_carry"
  | "depth_drift"
  | "atmosphere_pulse"
  | "bounceIn"
  | "bounceOut"
  | "rotateIn"
  | "rotateOut"
  | "shake"
  | "pulse"
  // element-level: any element type"
  | "flicker"
  | "blur_in"
  | "blur_out"
  | "stomp"
  | "tumble_in"
  | "glitch_in"
  // cinematic element animations"
  | "spring_in"
  | "slam_down"
  | "depth_charge"
  | "drift_in"
  | "whip_exit"
  // looping / sustained"
  | "float"
  | "breathe"
  | "spin"
  | "sway"
  | "heartbeat"
  // entry"
  | "spiral_in"
  | "flip_in_x"
  | "swoop_in"
  | "stamp"
  | "pop_in"
  | "rubber_band"
  // exit"
  | "swoop_out"
  | "implode"
  | "whip_up"
  // attention / loop"
  | "tada"
  | "jello"
  | "vibrate"
  // animated filter effects — drive AnimatedEffects fields"
  | "brightness_flash"
  | "chromatic_pulse"
  | "grain_surge"
  | "vignette_close"
  | "vignette_open"
  // text char/word level: handled in render-core"
  | "typewriter"
  | "typewriter_word"
  | "word_slide_up"
  | "word_fade_in"
  | "char_scale_in"
  | "wave_text"
  | "ascend"
  | "burst"
  | "bounce_letters"
  | "letter_drop"
  | "letter_spin"
  | "explode_in"
  | "scramble"
  | "stamp_in"
  | "highlight_sweep"
  | "count_up"
  | "text_cycle"
  // line draw animations"
  | "draw_in"
  | "draw_out"
  // new motion animations"
  | "orbit"
  | "pendulum"
  | "bounce_floor"
  | "flip_out_x"
  | "roll_in"
  | "zip_in"
  | "neon_flicker"
  | "glitch_split"
  | "typewriter_delete"
  | "count_down"
  // new char-level animations"
  | "char_rainbow"
  | "char_wave_scale"
  | "char_blur_in"
  | "karaoke"
  | "slot_machine"
  // subtitle word-level reveal animations"
  | "word_pop_reveal"
  | "caption_drop"
  | "word_zoom_blur"
  // escape hatch: LLM-authored raw CSS keyframes"
  | "custom"
  | "backInDown"
  | "backInLeft"
  | "backInRight"
  | "backInUp"
  | "backOutDown"
  | "backOutLeft"
  | "backOutRight"
  | "backOutUp"
  | "bounce"
  | "bounceInDown"
  | "bounceInLeft"
  | "bounceInRight"
  | "bounceInUp"
  | "bounceOutDown"
  | "bounceOutLeft"
  | "bounceOutRight"
  | "bounceOutUp"
  | "fadeInBottomLeft"
  | "fadeInBottomRight"
  | "fadeInDown"
  | "fadeInDownBig"
  | "fadeInLeft"
  | "fadeInLeftBig"
  | "fadeInRight"
  | "fadeInRightBig"
  | "fadeInTopLeft"
  | "fadeInTopRight"
  | "fadeInUp"
  | "fadeInUpBig"
  | "fadeOutBottomLeft"
  | "fadeOutBottomRight"
  | "fadeOutDown"
  | "fadeOutDownBig"
  | "fadeOutLeft"
  | "fadeOutLeftBig"
  | "fadeOutRight"
  | "fadeOutRightBig"
  | "fadeOutTopLeft"
  | "fadeOutTopRight"
  | "fadeOutUp"
  | "fadeOutUpBig"
  | "flash"
  | "flip"
  | "flipInX"
  | "flipInY"
  | "flipOutX"
  | "flipOutY"
  | "headShake"
  | "heartBeat"
  | "hinge"
  | "jackInTheBox"
  | "lightSpeedInLeft"
  | "lightSpeedInRight"
  | "lightSpeedOutLeft"
  | "lightSpeedOutRight"
  | "pulse"
  | "rollIn"
  | "rollOut"
  | "rotateInDownLeft"
  | "rotateInDownRight"
  | "rotateInUpLeft"
  | "rotateInUpRight"
  | "rotateOutDownLeft"
  | "rotateOutDownRight"
  | "rotateOutUpLeft"
  | "rotateOutUpRight"
  | "rubberBand"
  | "shakeX"
  | "shakeY"
  | "slideInDown"
  | "slideInLeft"
  | "slideInRight"
  | "slideInUp"
  | "slideOutDown"
  | "slideOutLeft"
  | "slideOutRight"
  | "slideOutUp"
  | "swing"
  | "wobble"
  | "zoomInDown"
  | "zoomInLeft"
  | "zoomInRight"
  | "zoomInUp"
  | "zoomOutDown"
  | "zoomOutLeft"
  | "zoomOutRight"
  | "zoomOutUp"
;

export type LineStyle = "solid" | "dashed" | "dotted" | "double" | "zigzag" | "wavy";
export type LineCap = "butt" | "round" | "square";
export type ArrowHeadType = "none" | "arrow" | "open_arrow" | "circle" | "square" | "diamond";

export type ShapeKind =
  | "rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "star"
  | "hexagon"
  | "arrow"
  | "line"
  | "speech_bubble"
  | "heart"
  | "cross"
  | "pentagon"
  | "octagon"
  | "starburst"
  | "cloud"
  | "parallelogram"
  | "badge";

export interface LayoutProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
  flipX?: boolean;
  flipY?: boolean;
  visible?: boolean;
  locked?: boolean;
}

export interface ImageFilters {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  sharpen?: number;
  vignette?: number;
  monochrome?: boolean;
  duotone?: {
    color1: string;
    color2: string;
  };
  glow?: {
    color: string;
    blur: number;
    strength: number;
  };
  dropShadow?: {
    color: string;
    blur: number;
    alpha: number;
    offsetX: number;
    offsetY: number;
  };
  hdr?: boolean;
  vintage?: boolean;
  cinematic?: boolean;
  y2k?: boolean;
  // new cinematic filters
  chromatic_aberration?: number;
  noise?: number;
  scanlines?: number;
  pixelate?: number;
  tilt_shift?: boolean;
  light_leak?: { color: string; alpha: number; angle: number };
  // new artistic / look filters
  sepia?: boolean;
  lomo?: boolean;
  vhs_tracking?: boolean | number;
  cross_process?: boolean;
  thermal?: boolean;
  night_vision?: boolean;
  comic?: boolean;
  oil_paint?: boolean | number;
  pencil_sketch?: boolean;
  infrared?: boolean;
  kodachrome?: boolean;
  anamorphic_flare?: number;
  lens_flare?: { x: number; y: number; intensity: number };
  posterize?: number;
}

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  alpha: number;
}

export interface TextStroke {
  width: number;
  color: string;
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface TextGradient {
  type: "linear" | "radial";
  angle: number;
  stops: GradientStop[];
}

export type TextEffectType =
  | "glow"
  | "neon"
  | "hollow"
  | "echo"
  | "outline"
  | "retro"
  | "scifi"
  | "western"
  | "arcade"
  | "pixel"
  | "cosmic"
  | "fire"
  | "gold"
  | "glitch"
  | "matrix"
  | "frost"
  | "shadow_stack"
  | "hologram"
  | "chrome"
  | "emboss"
  | "chalk"
  | "spray_paint"
  | "blood"
  | "ice"
  | "lava"
  | "typewriter_ink";

export interface StyleProps {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fillPattern?: "solid" | "hollow" | "gradient" | "stripes" | "dots" | "grid" | "image";
  fillColor2?: string;
  blendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";
  filters?: ImageFilters;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textShadow?: TextShadow;
  textStroke?: TextStroke;
  textGradient?: TextGradient;
  textEffect?: TextEffectType;
  textEffectColor?: string;
  textEffectIntensity?: number;
  /** Raw CSS injected scoped to this element — any property, @keyframes, animation, filter, etc. */
  customCSS?: string;
}

export interface TextSpan {
  text: string;
  style?: Pick<StyleProps, "fontWeight" | "fontStyle" | "color" | "fontSize" | "fontFamily" | "letterSpacing" | "textStroke" | "textGradient"> & {
    /** Transform this span's text to uppercase before rendering. */
    uppercase?: boolean;
    /** Draw a colored pill/background box behind this span's text. */
    highlight?: string;
    /** Corner radius of the highlight pill (default 6). */
    highlightRadius?: number;
    /** Padding inside the highlight pill (default 6px). */
    highlightPadding?: number;
    /** Overall opacity for this span (0–1, default 1). */
    opacity?: number;
  };
  /** Word-level reveal index — which position in the sequential reveal order this span occupies. */
  revealIndex?: number;
}

export interface TextCurveConfig {
  type: "arc" | "wave";
  radius?: number;
  amplitude?: number;
  frequency?: number;
  startAngle?: number;
  reversed?: boolean;
}

export interface CropProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementContent {
  text?: string;
  richText?: TextSpan[];
  src?: string;
  /** Shape: image URL used when fillPattern = "image" */
  fillImageSrc?: string;
  shape?: ShapeKind;
  label?: string;
  crop?: CropProps;
  frame?: "phone" | "laptop" | "polaroid" | "cinematic" | "tablet" | "browser" | "tv" | "circle" | "shadow";
  textCurve?: TextCurveConfig;
  /** Video: total source duration in ms (set on upload, read-only after) */
  videoDurationMs?: number;
  /** Video: trim in-point in source ms (default 0) */
  trimStartMs?: number;
  /** Video: trim out-point in source ms (default = videoDurationMs) */
  trimEndMs?: number;
  /** Video: playback speed multiplier (default 1) */
  playbackRate?: number;
  /** Line: stroke style */
  lineStyle?: LineStyle;
  /** Line: stroke cap */
  lineCap?: LineCap;
  /** Line: stroke thickness in px */
  lineWidth?: number;
  /** Line: stroke color (overrides backgroundColor for line elements) */
  lineColor?: string;
  /** Icon: Phosphor icon name (e.g. "rocket", "airplane", "heart") */
  iconName?: string;
  /** Icon: style variant — "duotone" | "bold" | "fill" | "light" | "regular" | "thin" */
  iconStyle?: string;
  /** Icon: hex color string (e.g. "#4f46e5"). Applied to stroke and fill tones. */
  iconColor?: string;
  /** Line: arrow head at the start of the line */
  arrowStart?: ArrowHeadType;
  /** Line: arrow head at the end of the line */
  arrowEnd?: ArrowHeadType;
  /** Line: size of arrow heads in px */
  arrowSize?: number;
  /** Line: resolved draw progress 0–1, injected by animation engine for draw_in/draw_out */
  lineDrawProgress?: number;
  /** animated_stat: secondary stat line e.g. "+12% YoY" shown below the main value */
  statSubvalue?: string;
  /** graph: data series for bar / line / donut chart rendering */
  chartData?: Array<{ label: string; value: number; color?: string }>;
  /** graph: chart style — "bar" (default) | "line" | "donut" */
  chartType?: "bar" | "line" | "donut";
}

export interface ManualOverrides {
  layout?: Partial<LayoutProps>;
  style?: Partial<StyleProps>;
  content?: Partial<ElementContent>;
}

export type Animation = {
  id: string;
  type: AnimationType;
  startMs: number;
  durationMs: number;
  easing?: string;
  /** bounceIn/bounceOut: scale at the extreme (0–1). Default 0.3. */
  amplitude?: number;
  /** slide animations: starting offset in px (default ±60). Positive = element starts below/right. */
  fromOffset?: number;
  /** slide animations: ending offset in px (default 0 = rest position). */
  toOffset?: number;
  /** count_up/count_down: explicit numeric start value. Defaults to 0 for up, target for down. */
  fromValue?: number;
  /** count_up/count_down: explicit numeric end value. Defaults to parsed element text. */
  toValue?: number;
  /** highlight_sweep: hex color of the highlight bar. Default "#FFD700". */
  color?: string;
  /** spin: revolutions per second. Default 1. */
  speed?: number;
  /** text_cycle: ordered list of labels/statuses to display over time. */
  textItems?: string[];
  /**
   * type:"custom" only — LLM-authored WAAPI keyframes injected directly into the
   * CSS renderer. Each array entry is a Web Animations API Keyframe object.
   * transformKF uses composite:"add" so it stacks on top of layout transforms.
   */
  inlineSpec?: {
    transformKF?: Array<Record<string, string | number>>;
    opacityKF?: Array<Record<string, string | number>>;
    filterKF?: Array<Record<string, string | number>>;
    easing?: string;
    iterations?: number;
  };
};

export type ElementNode = {
  id: string;
  type: ElementType;
  semanticRole?: string;
  motionPreset?: string;
  layout: LayoutProps;
  style: StyleProps;
  animations: Animation[];
  overrides?: ManualOverrides;
  content?: ElementContent;
  children?: ElementNode[];
  /** Scene-relative clip window. Absent = full scene duration. */
  startMs?: number;
  endMs?: number;
  /** Stagger group ID — elements sharing a group animate in staggered sequence. */
  staggerGroup?: string;
  /** Extra delay (ms) added to all animation start times for stagger sequencing. */
  staggerDelayMs?: number;
  /** Parallax depth -1 (far) to 1 (near). Camera motion shifts elements at different rates. */
  zDepth?: number;
  /** Directional motion blur intensity (0–1). Applied on elements that move fast. */
  motionBlur?: number;
  /** Mirror-reflection below the element. 0 = none, 1 = full opacity. */
  reflectionOpacity?: number;
  /** Animated border style painted each frame. */
  borderAnimation?: "marching_ants" | "gradient_spin" | "dash_flow";
  /** Pulsing ambient glow around the element. */
  glowPulse?: { color: string; intensity: number; speed: number };
  /** Clip the element to this shape mask (uses ShapeKind path). */
  clipShape?: ShapeKind;
  /** Which of the 6 mandatory cinematic layers this element belongs to. */
  semanticLayer?: SemanticLayerType;
  /** Which temporal zone this element occupies within the scene's visual story. */
  temporalZone?: TemporalZone;
};

export type ImageFitMode = "stretch" | "cover" | "contain" | "custom";

export interface SceneBackground {
  color?: string;
  color2?: string;
  gradientAngle?: number;
  /** Degrees per second the gradient angle rotates. Positive = clockwise. */
  gradientAngleSpeed?: number;
  imageSrc?: string;
  imageFit?: ImageFitMode;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageScale?: number;
  opacity?: number;
  /** Raw CSS value applied directly as `background` (e.g. gradients from the asset catalog). imageSrc takes priority over this. */
  cssBackground?: string;
}

export type TransitionType =
  | "fade"
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "zoom_out"
  | "zoom_in"
  | "blur_out"
  // cinematic transitions
  | "whip_pan_left"
  | "whip_pan_right"
  | "flash_cut"
  | "spin_in"
  | "glitch_cut"
  // new cinematic transitions
  | "cross_zoom"
  | "iris_in"
  | "iris_out"
  | "split_h"
  | "split_v"
  | "diagonal_wipe"
  | "push_left"
  | "push_right"
  | "dissolve"
  | "color_flash"
  // new transitions
  | "page_flip"
  | "cube_left"
  | "cube_right"
  | "ripple"
  | "pixelate_wipe"
  | "swirl_wipe"
  | "clock_wipe"
  | "channel_split"
  | "burn_in"
  | "glitch_blocks"
  | "lens_zoom";

export interface SceneTransition {
  type: TransitionType;
  durationMs: number;
}

export interface SceneSfx {
  src: string;
  volume?: number;
  offsetMs?: number;
}

export interface SceneOverlay {
  type: "rain" | "snow" | "confetti" | "sparkles" | "smoke" | "fireflies" | "bokeh" | "static" | "bubbles";
  /** Particle density 0–1. Default 0.5. */
  intensity?: number;
  /** Tint color for confetti, sparkles, bokeh. */
  color?: string;
  /** Speed multiplier. Default 1. */
  speed?: number;
}

// ─── Composition system ───────────────────────────────────────────────────────

export interface CompositionSlot {
  id: string;
  type: "image" | "video" | "text";
  src?: string;
  text?: string;
}

export interface CompositionParams {
  /** Playback speed multiplier — scales how fast the animation runs. Default 1. */
  speed?: number;
  /** Named color slots exposed by the composition template. */
  colorOverrides?: Record<string, string>;
  /** Override the font family used inside the composition. */
  fontOverride?: string;
  /** Scale factor for individual bulb/particle size. Default 1. */
  bulbSize?: number;
  // ── icon_parade params ──────────────────────────────────────────────────────
  /** Which edge icons enter from. Default "left". */
  direction?: "left" | "right";
  /** Fraction 0–1 of composition width the icons travel from the entry edge. Default 0.45. */
  stopPoint?: number;
  /** How long icons hold position in ms. Default 1500. */
  holdDuration?: number;
  /** Extra delay in ms before icons begin exiting (after hold). Default 0. */
  exitDelay?: number;
  /** Character of the entry animation. Default "quick". */
  entryEasing?: "quick" | "slow" | "wavy";
  /** Stagger between each icon's entry start in ms. Default 140. */
  stagger?: number;
  /** Icon card size in px (width = height). Default 66. */
  iconSize?: number;
  /** How the stop positions are laid out. "line" = all stop at the same X; "staggered" = each icon stops a step deeper. Default "line". */
  stopStyle?: "line" | "staggered";
  // ── word_scroll params ──────────────────────────────────────────────────────
  /** Static prefix text rendered before the cycling word list. Default "I build ". */
  prefix?: string;
  /** Duration each word holds at center in ms. Default 1400. */
  wordDurationMs?: number;
  /** Starting hue (0–360) for the word color cycle. Default 20. */
  hueStart?: number;
  /** Ending hue (0–360) for the word color cycle. Default 340. */
  hueEnd?: number;
  // ── gift_reveal params ─────────────────────────────────────────────────────
  /** Duration in ms the gift is shown before auto-opening. Default 3000. */
  timerMs?: number;
  // ── willem_loader params ────────────────────────────────────────────────────
  /** The display word split by the image box. Default "WILLEM". */
  displayText?: string;
  /** Character index to split displayText into left/right halves. Default: Math.floor(word.length / 2). */
  splitPoint?: number;
  /** Bottom-left title text shown after the reveal. Default: displayText + " ©". */
  bottomTitle?: string;
  /** Top-left nav brand text. Default "Brand ©". */
  navLeftText?: string;
  /** Top-right nav links text. Default "Projects,  Services,  About". */
  navRightText?: string;
}

export interface CompositionNode {
  id: string;
  /** Identifies the animation template, e.g. "book_flip". */
  compositionType: string;
  semanticRole?: string;
  layout: LayoutProps;
  slots: CompositionSlot[];
  params?: CompositionParams;
  /** Scene-relative clip window. Absent = full scene duration. */
  startMs?: number;
  endMs?: number;
}

/**
 * Static descriptor for one composition type.
 * Stored alongside the type key so every consumer (editor, LLM, docs) gets
 * the same ground truth about slot counts, ideal image dimensions, and usage.
 */
export interface CompositionMeta {
  label: string;
  description: string;
  compositionType: string;
  /** "single" = 1 slot per unit. "pair" = 2 slots per unit (left+right). */
  slotGrouping: "single" | "pair";
  slotLabel: string;
  defaultSize: { width: number; height: number };
  /** Recommended source image aspect ratio, width:height e.g. "1:1", "2:5". */
  idealImageAspectRatio: string;
  /** Minimum source image resolution for crisp export output. */
  idealImagePixels: { width: number; height: number };
  /** Per-slot-position guidance on what image to use (index = offset within unit). */
  slotImageGuide: string[];
  typicalUseCases: string[];
  colorParams: { key: string; label: string; default: string }[];
}

/**
 * Single source of truth for all registered composition types.
 * Editor UI, LLM system prompt, and documentation all read from here.
 * Add one entry per new composition type — keep in sync with the render-core registry.
 */
export const COMPOSITION_CATALOG: Record<string, CompositionMeta> = {
  book_flip: {
    label: "Book Flip",
    description: "An open book spread. Pages flip sequentially with a 3-D fold animation. Each spread shows two images side-by-side (left page / right page). Slots come in pairs.",
    compositionType: "book_flip",
    slotGrouping: "pair",
    slotLabel: "page",
    defaultSize: { width: 480, height: 600 },
    idealImageAspectRatio: "2:5",
    idealImagePixels: { width: 600, height: 1500 },
    slotImageGuide: [
      "Left page — tall portrait photo, subject centered with minimal side margins",
      "Right page — tall portrait photo, subject centered with minimal side margins",
    ],
    typicalUseCases: [
      "Lookbooks and editorial photo stories",
      "Recipe collections (one dish per page spread)",
      "Portfolio showcases across industries",
      "Before/after comparisons (left = before, right = after)",
    ],
    colorParams: [
      { key: "pageColor", label: "Page background", default: "#f9f7f2" },
      { key: "accentColor", label: "Spine & border", default: "#1a1a2e" },
    ],
  },

  product_cart: {
    label: "Product Showcase",
    description: "Product images displayed on cards that fly into a shopping bag with a bounce and particle burst before the next product slides in. Ideal for e-commerce reels.",
    compositionType: "product_cart",
    slotGrouping: "single",
    slotLabel: "product",
    defaultSize: { width: 420, height: 540 },
    idealImageAspectRatio: "4:3",
    idealImagePixels: { width: 800, height: 600 },
    slotImageGuide: [
      "Product photo — clean/white background, subject fills ~80% of frame, landscape or square crop",
    ],
    typicalUseCases: [
      "E-commerce product reels (3–6 products per video)",
      "Flash sale or new-arrival announcements",
      "Gift guide and catalog showcases",
      "Menu item reveals for food/beverage brands",
    ],
    colorParams: [
      { key: "pageColor", label: "Card background", default: "#f9f7f2" },
      { key: "accentColor", label: "Bag & accents", default: "#1a1a2e" },
    ],
  },

  christmas_tree: {
    label: "Christmas Tree",
    description: "A 3-D rotating Christmas tree made of 72 colorful blinking light bulbs arranged in a spiral cone. Fully decorative — no slots or color customisation needed.",
    compositionType: "christmas_tree",
    slotGrouping: "single",
    slotLabel: "n/a",
    defaultSize: { width: 360, height: 500 },
    idealImageAspectRatio: "1:1",
    idealImagePixels: { width: 360, height: 500 },
    slotImageGuide: [],
    typicalUseCases: [
      "Holiday and Christmas social content",
      "Festive background or accent for any seasonal video",
      "Standalone decorative scene for greeting cards",
    ],
    colorParams: [],
  },

  fireworks: {
    label: "Fireworks",
    description: "Procedural fireworks shells launch upward, arc under gravity, and burst into colored particle variants including willow, crossette, crackle, and classic starbursts. Transparent background, no slots required.",
    compositionType: "fireworks",
    slotGrouping: "single",
    slotLabel: "n/a",
    defaultSize: { width: 760, height: 520 },
    idealImageAspectRatio: "1:1",
    idealImagePixels: { width: 760, height: 520 },
    slotImageGuide: [],
    typicalUseCases: [
      "Celebration scenes, launches, and announcements",
      "Holiday and festival videos",
      "Product reveal crescendos and end cards",
    ],
    colorParams: [],
  },

  christmas_panel: {
    label: "Christmas Panel",
    description: "200 colorful blinking bulbs arranged on a rotating 3-D cylinder. Unlike the cone-shaped Christmas Tree, the cylinder produces a rectangular silhouette that fills the full canvas. Same Y-axis rotation, perfect for full-screen festive overlays.",
    compositionType: "christmas_panel",
    slotGrouping: "single",
    slotLabel: "n/a",
    defaultSize: { width: 1080, height: 1080 },
    idealImageAspectRatio: "1:1",
    idealImagePixels: { width: 1080, height: 1080 },
    slotImageGuide: [],
    typicalUseCases: [
      "Full-screen Christmas and holiday social content",
      "Festive background that covers the entire canvas",
      "Square-format holiday reels and stories",
      "Layered over video as a rotating light overlay",
    ],
    colorParams: [],
  },

  icon_parade: {
    label: "Icon Parade",
    description: "4–5 icon cards slide in from the left or right edge, hold at a configurable stop point, then slide back out. Controls: entry direction, stop depth, hold duration, exit delay, and entry easing (quick snap, slow drift, or wavy spring).",
    compositionType: "icon_parade",
    slotGrouping: "single",
    slotLabel: "icon",
    defaultSize: { width: 480, height: 320 },
    idealImageAspectRatio: "1:1",
    idealImagePixels: { width: 256, height: 256 },
    slotImageGuide: [
      "Icon or logo — square crop, subject fills 80–90% of the frame, transparent or solid background",
    ],
    typicalUseCases: [
      "Feature or benefit callouts that sweep in from the side",
      "Social proof icons (payment methods, partner logos, app badges)",
      "Step-by-step flow where each icon represents a stage",
      "Brand icon reveal for product launch reels",
    ],
    colorParams: [
      { key: "pageColor",   label: "Card background", default: "#ffffff" },
      { key: "accentColor", label: "Border & accent",  default: "#6366f1" },
    ],
  },

  spinning_carousel: {
    label: "Spinning Carousel",
    description: "Portrait image cards arranged in a 3-D ring that continuously rotates on the Y axis. Cards scale and fade by depth — front cards are full-size and bright, back cards shrink and dim. Edge cards fade out for a natural depth-of-field look.",
    compositionType: "spinning_carousel",
    slotGrouping: "single",
    slotLabel: "card",
    defaultSize: { width: 580, height: 380 },
    idealImageAspectRatio: "7:10",
    idealImagePixels: { width: 420, height: 600 },
    slotImageGuide: [
      "Portrait photo — subject centered, fills most of the frame, clean or complementary background",
    ],
    typicalUseCases: [
      "Product gallery reels showing multiple items in a rotating showcase",
      "Team or profile highlight carousel",
      "Portfolio of work displayed as a cinematic spinning wheel",
      "Before/after or collection reveals with a premium editorial feel",
    ],
    colorParams: [
      { key: "pageColor",   label: "Card background", default: "#fff3ed" },
      { key: "accentColor", label: "Border & accent",  default: "#1a1a2e" },
    ],
  },

  willem_loader: {
    label: "Willem Loader",
    description: "A hero word-reveal: a large display word splits left/right around a horizontally-expanding image panel. Letters clip-slide up one by one; images cycle inside the box with crossfades; nav and title fade in at the end.",
    compositionType: "willem_loader",
    slotGrouping: "single",
    slotLabel: "image",
    defaultSize: { width: 900, height: 500 },
    idealImageAspectRatio: "16:9",
    idealImagePixels: { width: 1600, height: 900 },
    slotImageGuide: [
      "Full-bleed scene photo — architectural, landscape, or editorial; fills the center box between the letters",
    ],
    typicalUseCases: [
      "Brand hero / loading screen with a strong single word (company name, product name)",
      "Editorial opener for a video series or lookbook",
      "Cinematic name reveal for events, launches, or portfolio reels",
      "Architecture, fashion, or travel brand intros",
    ],
    colorParams: [
      { key: "accentColor", label: "Letter / text color", default: "#f5f0eb" },
    ],
  },

  gift_reveal: {
    label: "Gift Reveal",
    description: "A wrapped gift box (styled after the Obrigt CodePen) auto-opens after a configurable timer, revealing a winter scene with falling snow and a customisable message. No slots needed — purely decorative.",
    compositionType: "gift_reveal",
    slotGrouping: "single",
    slotLabel: "item",
    defaultSize: { width: 450, height: 540 },
    idealImageAspectRatio: "n/a",
    idealImagePixels: { width: 0, height: 0 },
    slotImageGuide: [],
    typicalUseCases: [
      "Holiday or seasonal reveal cards where the viewer watches a gift open",
      "Brand announcement with a timed reveal moment",
      "Festive social content — New Year, Christmas, birthday campaigns",
    ],
    colorParams: [
      { key: "accentColor", label: "Ribbon",      default: "#E9454F" },
      { key: "pageColor",   label: "Box",          default: "#B8CDB7" },
      { key: "bgColor",     label: "Scene BG",     default: "#BFE2DC" },
      { key: "textColor",   label: "Message text", default: "#1D1F3F" },
    ],
  },

  word_scroll: {
    label: "Word Scroll",
    description: "A sticky prefix (e.g. 'I build ') with a vertically cycling list of words. Each word brightens as it passes center and glows in its own hue. Inspired by the 'I build X' scroll animation from CodePen. Each slot defines one cycling word.",
    compositionType: "word_scroll",
    slotGrouping: "single",
    slotLabel: "word",
    defaultSize: { width: 680, height: 360 },
    idealImageAspectRatio: "n/a",
    idealImagePixels: { width: 0, height: 0 },
    slotImageGuide: ["Text for this cycling word, e.g. 'products.' or 'experiences.'"],
    typicalUseCases: [
      "Hero taglines that rotate through what you build, offer, or stand for",
      "Brand identity reels showcasing product lines or service categories",
      "Social proof cycling: 'Trusted by founders, engineers, designers…'",
      "Feature reveals where each word names a key capability",
    ],
    colorParams: [
      { key: "bgColor", label: "Background", default: "#050505" },
    ],
  },
};

// ─── Premium Motion Intelligence — v2 ────────────────────────────────────────

/**
 * The 6 mandatory visual layers every cinematic scene must contain.
 * Assigning semanticLayer makes the AI and tool-executor layer-aware.
 */
export type SemanticLayerType =
  | "atmospheric"      // gradients, textures, ambient overlays, depth fog
  | "background_motion"// drifting gradients, particles, parallax shapes
  | "focal"            // primary subject / hero visual — the eye magnet
  | "secondary_motion" // accent graphics, connector lines, kinetic overlays
  | "typography"       // all text elements — animated hierarchy
  | "depth";           // shadows, blur planes, scale-separation elements

/**
 * The 4 temporal zones that structure every scene into multiple visual moments.
 * Elements tagged with a zone enter / exit within that window.
 *   hook     0–500 ms    — impact burst, immediate focus
 *   reveal   500–1400 ms — supporting information, composition shift
 *   emphasis 1400–2500 ms— transformation, escalation, key stat / keyword
 *   payoff   2500ms+     — resolution, carry energy into next scene
 */
export type TemporalZone = "hook" | "reveal" | "emphasis" | "payoff";

/**
 * Visual rhythm pattern for a scene — controls pacing of attention shifts.
 * Mirrors the doc's rhythm vocabulary: burst → pause → sweep → reveal → payoff.
 */
export type SceneRhythmPattern =
  | "burst"       // fast simultaneous impact
  | "sweep"       // left-to-right or bottom-to-top cascade
  | "reveal"      // staged unveil with deliberate pauses
  | "compression" // elements close in toward focal point
  | "release"     // elements expand outward from focal point
  | "payoff";     // dramatic single-moment culmination

// ─── Cinematic Motion Intelligence v2 — Motion System Layer ──────────────────

/**
 * The 13 cinematic motion communication systems the AI planner selects from.
 * Each system is a high-level intent — the generation engine translates it into
 * concrete elements, animations, and compositions. Never manually implement these;
 * always select one as `primaryMotionSystem` on a `CinematicIntent`.
 */
export type CinematicMotionSystem =
  | "kinetic_hook"      // bold impact, large typography, aggressive pacing, dramatic reveals
  | "social_swarm"      // platform icons swarm/orbit inward, convergence/explosion, notification bursts
  | "viral_spread"      // expanding nodes, ripple systems, chain reactions, branching motion
  | "graph_growth"      // animated graphs, progressive line growth, counter increases, chart evolution
  | "stat_burst"        // large number reveal, counter animation, burst emphasis, energy pulses
  | "comparison_split"  // split-screen motion, mirrored choreography, opposing momentum
  | "timeline_build"    // progressive construction, sequential reveals, connected motion, flow choreography
  | "algorithm_flow"    // node systems, flowing connectors, routing motion, sorting animations
  | "card_cascade"      // cascading cards, layered movement, overlap choreography, stacked transitions
  | "orbit_cluster"     // orbital movement, center focus, drifting clusters, rotating formations
  | "data_ripple"       // ripple motion, expanding waves, signal propagation, pulse systems
  | "morph_reveal"      // shape morphing, object transformation, conceptual evolution, fluid transitions
  | "proof_stack";      // layered proof, evidence stacking, annotation systems, progressive reinforcement

/**
 * Output of the Cinematic Motion Intent Planner.
 * One `CinematicIntent` is produced per scene — it is a STRATEGY declaration,
 * not a layout spec. The generation engine uses it to pick animations, element
 * patterns, camera, and pacing. Never put x/y coords or CSS here.
 */
export interface CinematicIntent {
  /** What this scene must accomplish narratively. */
  sceneGoal: string;
  /** Target emotional state in the viewer at the end of this scene. */
  audienceEmotion: string;
  /** The dominant visual metaphor that makes the concept tangible. */
  visualMetaphor: string;
  /** Primary motion communication system — drives the dominant visual language. */
  primaryMotionSystem: CinematicMotionSystem;
  /** Secondary system that supports or counterpoints the primary. */
  secondaryMotionSystem: CinematicMotionSystem;
  /** How many concurrent motion elements are active at peak density. */
  motionDensity: "low" | "medium" | "high";
  /** Pacing arc — how viewer attention moves across the scene's duration. */
  rhythmPattern: SceneRhythmPattern;
  /** Spatial arrangement strategy — describes the compositional logic, not positions. */
  compositionPattern: string;
  /** Ordered attention waypoints: what the viewer notices [first, second, third]. */
  focalFlow: [string, string, string];
  /** Which asset types the scene should include. */
  assetStrategy: {
    useImages: boolean;
    useIcons: boolean;
    useGraphs: boolean;
    useTextOnly: boolean;
  };
  /** Semantic content assignment for the four visual roles. */
  semanticRoles: {
    hero: string;    // dominant focal element
    support: string; // secondary information layer
    proof: string;   // credibility / evidence element
    decor: string;   // atmospheric / ambient decoration
  };
  /** Millisecond budget for each temporal zone. Must sum to ≤ scene durationMs. */
  tempo: {
    introMs: number;   // hook zone — impact burst
    buildMs: number;   // reveal + emphasis zones
    payoffMs: number;  // payoff zone — resolution
    holdMs: number;    // static hold before next scene
  };
  /** Elements, patterns, and aesthetics to actively avoid in this scene. */
  avoid: string[];
}

// ─── Premium color palettes ───────────────────────────────────────────────────

export interface CinematicPalette {
  name: string;
  bg: string;
  surface: string;
  primary: string;
  accent: string;
}

export const CINEMATIC_PALETTES: Record<string, CinematicPalette> = {
  cinematic_tech: {
    name: "Cinematic Tech",
    bg: "#0B1020",
    surface: "#111827",
    primary: "#60A5FA",
    accent: "#A78BFA",
  },
  apple_minimal: {
    name: "Apple Minimal",
    bg: "#F5F5F7",
    surface: "#FFFFFF",
    primary: "#111111",
    accent: "#0071E3",
  },
  luxury_editorial: {
    name: "Luxury Editorial",
    bg: "#111111",
    surface: "#1C1C1C",
    primary: "#E7D3B1",
    accent: "#C4A882",
  },
};

// ─── Premium font systems ─────────────────────────────────────────────────────

export interface FontSystem {
  name: string;
  /** Primary / display font — headlines, hero phrases */
  headline: string;
  /** Secondary / body font — body copy, captions */
  body: string;
}

export const FONT_SYSTEMS: Record<string, FontSystem> = {
  tech: {
    name: "Tech",
    headline: "Satoshi",
    body: "Inter",
  },
  documentary: {
    name: "Documentary",
    headline: "Neue Montreal",
    body: "IBM Plex Sans",
  },
  viral: {
    name: "Viral",
    headline: "Anton",
    body: "General Sans",
  },
  luxury: {
    name: "Luxury",
    headline: "Canela",
    body: "Suisse Intl",
  },
  apple_style: {
    name: "Apple Style",
    headline: "SF Pro Display",
    body: "SF Pro Text",
  },
};

export type Scene = {
  id: string;
  name: string;
  durationMs: number;
  elements: ElementNode[];
  /** Sealed composition animations — not editable at element level. */
  compositions?: CompositionNode[];
  backgroundColor?: string;
  background?: SceneBackground;
  /** Transition played when entering this scene from the previous one. */
  transition?: SceneTransition;
  /** Sound effect that fires when this scene starts (or at offsetMs within the scene) */
  sfx?: SceneSfx;
  /** Atmospheric particle overlay rendered above all elements. */
  overlay?: SceneOverlay;
  /**
   * Scene-level motion preset key. When set, the generation pipeline applies the
   * preset's transition and per-semantic-role element animations automatically,
   * then removes this field before saving. LLM sets this instead of manually writing
   * every animation on every element.
   */
  motionPreset?: string;
  /** Pacing rhythm pattern — controls how attention shifts across the scene's duration. */
  rhythmPattern?: SceneRhythmPattern;
  /** Element ID of the dominant focal point — other elements must yield to it visually. */
  dominantFocalId?: string;
};

export type TimelineTrack = {
  id: string;
  sceneId: string;
  startMs: number;
  durationMs: number;
  layer: number;
  /**
   * How far into the scene the animation clock should be at the moment this
   * track's startMs is reached — equal to the preceding scene's transition
   * duration. This lets animations that began playing during the crossfade
   * continue without restarting when the scene becomes the active track.
   */
  startOffsetMs?: number;
};

export interface Viewport {
  width: number;
  height: number;
}

export type AssetVibe =
  | "cinematic"
  | "energetic"
  | "premium"
  | "documentary"
  | "playful"
  | "luxury"
  | "minimal";

export type EnergyLevel = "low" | "medium" | "high";

export interface Asset {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  src: string;
  thumbnailSrc?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  tags?: string[];
  vibe?: AssetVibe[];
  energyLevel?: EnergyLevel;
  sceneCompatibility?: Array<"hook" | "reveal" | "cta" | "montage" | "comparison">;
  motionCompatibility?: Array<"slow_zoom" | "parallax" | "aggressive_social" | "cinematic_pan">;
  favorite?: boolean;
}

/** Project-level timeline audio (background music, VO, SFX). Synced to `timelineTracks` time. */
export interface AudioTrack {
  id: string;
  name: string;
  /** URL to the audio file (blob URL in editor, hosted URL when backed by Go API) */
  src: string;
  /** Volume multiplier 0–1 */
  volume: number;
  /** Where in the project timeline this track starts playing, in ms */
  startMs: number;
  /** Trim in-point within the source file, in ms (default 0) */
  trimStartMs: number;
  /** Trim out-point within the source file, in ms (default = full file duration) */
  trimEndMs?: number;
  /** Source file duration in ms — set on upload, read-only after */
  durationMs: number;
  /** Fade in duration in ms (default 0) */
  fadeInMs: number;
  /** Fade out duration in ms (default 0) */
  fadeOutMs: number;
  /** Loop segment while the playhead is in range */
  loop: boolean;
  /** Mute without removing */
  muted: boolean;
}

export interface BrandTheme {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  primaryFont?: string;
  secondaryFont?: string;
  logoSrc?: string;
  motionStyle?: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  scenes: Scene[];
  timelineTracks: TimelineTrack[];
  viewport: Viewport;
  brandTheme?: BrandTheme;
  assets?: Asset[];
  audioTracks?: AudioTrack[];
  /** Audio beat marker positions in project timeline ms — for beat-sync animation alignment. */
  beatMarkers?: number[];
}

export interface RenderRequest {
  projectId: string;
  viewport: Viewport;
  frameRate: number;
}
