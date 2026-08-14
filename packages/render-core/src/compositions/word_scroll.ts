import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

type WordScrollState = {
  words: import("pixi.js").Text[];
  compH: number;
  lineH: number;
  n: number;
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function easeInOutCubic(t: number): number {
  const tc = clamp01(t);
  return tc < 0.5 ? 4 * tc * tc * tc : 1 - Math.pow(-2 * tc + 2, 3) / 2;
}

// Approximates oklch(65% 0.3 hue) via HSL
function hueToTint(h: number): number {
  const s = 0.82, l = 0.65;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

const DEFAULT_WORDS = [
  "products.",
  "platforms.",
  "systems.",
  "interfaces.",
  "experiences.",
];

export function createWordScrollNode(
  ctx: RenderContext,
  comp: CompositionNode,
  _textureCache: Map<string, unknown>,
  _textureLoading: Set<string>,
  _normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;

  const prefix: string = comp.params?.prefix ?? "I build ";
  const fontFamily: string = comp.params?.fontOverride ?? "Inter, sans-serif";
  const fontSize = Math.round(height * 0.09);
  const lineH = Math.round(fontSize * 1.5);

  const bgColorStr = comp.params?.colorOverrides?.bgColor ?? "";
  // prefixColor is baked into text style at create time → textColor triggers rebuild via key
  const prefixColor = comp.params?.colorOverrides?.textColor ?? "#ffffff";

  const textSlots = comp.slots.filter((s) => s.type === "text" && s.text);
  const wordTexts = textSlots.length > 0 ? textSlots.map((s) => s.text!) : DEFAULT_WORDS;
  const n = wordTexts.length;

  const container = new pixi.Container();

  // Background — only drawn when a color is explicitly set
  if (bgColorStr && bgColorStr !== "transparent") {
    container.addChild(
      new pixi.Graphics().rect(0, 0, width, height).fill({ color: hexToInt(bgColorStr) })
    );
  }

  // Prefix — right-aligned to composition center, uses textColor
  if (prefix) {
    const prefixObj = new pixi.Text({
      text: prefix,
      style: { fill: prefixColor, fontSize, fontFamily, fontWeight: "500" },
    });
    prefixObj.anchor.set(1, 0.5);
    prefixObj.x = width / 2;
    prefixObj.y = height / 2;
    container.addChild(prefixObj);
  }

  // Word container — masked to right half so scrolling words don't bleed outside
  const wordContainer = new pixi.Container();
  const maskGfx = new pixi.Graphics()
    .rect(width / 2, 0, width / 2 + 16, height)
    .fill({ color: 0xffffff });
  wordContainer.mask = maskGfx;
  container.addChild(maskGfx);
  container.addChild(wordContainer);

  const wordStartX = width / 2 + 6;
  const wordObjs: import("pixi.js").Text[] = [];

  for (let i = 0; i < n; i++) {
    // Always white fill — tint is set per-frame in update so color changes
    // take effect without a node rebuild
    const wordObj = new pixi.Text({
      text: wordTexts[i],
      style: { fill: "#ffffff", fontSize, fontFamily, fontWeight: "500" },
    });
    wordObj.anchor.set(0, 0.5);
    wordObj.x = wordStartX;
    wordObj.y = height / 2;
    wordObj.alpha = 0.15;
    wordContainer.addChild(wordObj);
    wordObjs.push(wordObj);
  }

  (container as any)._wordScrollState = {
    words: wordObjs,
    compH: height,
    lineH,
    n,
  } satisfies WordScrollState;

  return container;
}

export function updateWordScrollNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._wordScrollState as WordScrollState | undefined;
  if (!state) return;

  const { words, compH, lineH, n } = state;
  if (n === 0) return;

  const speed = comp.params?.speed ?? 1;
  const wordDurationMs: number = comp.params?.wordDurationMs ?? 1400;
  const compStart = comp.startMs ?? 0;
  const elapsed = Math.max(0, (localTimeMs - compStart) * speed);

  // Word color: accentColor = solid for all words; otherwise hue cycle
  const accentColor = comp.params?.colorOverrides?.accentColor;
  const hueStart: number = comp.params?.hueStart ?? 20;
  const hueEnd: number = comp.params?.hueEnd ?? 340;

  // Each word gets wordDurationMs. The transition from word k→k+1 happens
  // in the first SNAP fraction of word k+1's slot (entry-only, no double-move).
  const rawOffset = elapsed / wordDurationMs;
  const SNAP = 0.25;

  let scrollOffset: number;
  if (rawOffset >= n) {
    scrollOffset = n - 1;
  } else {
    const wordIdx = Math.floor(rawOffset);
    const frac = rawOffset - wordIdx;
    if (wordIdx === 0 && frac < SNAP) {
      scrollOffset = 0.4 - 0.4 * easeInOutCubic(frac / SNAP);
    } else if (wordIdx > 0 && frac < SNAP) {
      scrollOffset = (wordIdx - 1) + easeInOutCubic(frac / SNAP);
    } else {
      scrollOffset = wordIdx;
    }
  }

  for (let i = 0; i < n; i++) {
    const word = words[i];
    const dist = Math.abs(i - scrollOffset);

    // Full brightness at center, dim beyond 1.5 lines — mirrors CodePen brighten keyframe
    let alpha: number;
    if (dist < 0.5) {
      alpha = 1.0;
    } else if (dist > 1.5) {
      alpha = 0.15;
    } else {
      alpha = 1.0 - (dist - 0.5) * (1.0 - 0.15);
    }

    // Tint: single accent color or hue cycle
    const tint = accentColor
      ? hexToInt(accentColor)
      : hueToTint(n > 1 ? hueStart + (i / (n - 1)) * (hueEnd - hueStart) : (hueStart + hueEnd) / 2);

    word.y = compH / 2 + (i - scrollOffset) * lineH;
    word.alpha = alpha;
    word.tint = tint;
  }
}
