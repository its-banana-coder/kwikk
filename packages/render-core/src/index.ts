import { resolveCharAnimations, hasCharLevelAnimations, resolveAnimatedEffects } from "@kwikk/animation-engine";
import type { CharState } from "@kwikk/animation-engine";
import type { CompositionNode, ElementNode, ProjectDocument, ShapeKind, TextSpan, TransitionType } from "@kwikk/shared-types";
import { resolveRenderFrame } from "./frameResolver";
import type { RenderFrameInput, ResolvedRenderFrame } from "./frameResolver";
export { ensureFontLoaded, preloadProjectFonts, GOOGLE_FONT_CATALOG, getFontCatalog, initFontRegistry } from "./fontRegistry";
export type { FontCatalogEntry } from "./fontRegistry";
export { exportToMp4, exportFramesAsZip } from "./webcodecExporter";
export type { ExportOptions, ExportResult, ExportFormat, ExportPreset, ExportRenderer } from "./webcodecExporter";
export { resolveRenderFrame } from "./frameResolver";
export type { RenderFrameInput, ResolvedRenderFrame } from "./frameResolver";
export { CSSSceneRenderer, waitForPendingShapeFillImages } from "./cssRenderer";
import type {
  Application as PixiApplication,
  Container as PixiContainer,
  Filter as PixiFilter,
  Graphics as PixiGraphics,
  TextStyleFontWeight
} from "pixi.js";
import { getTransitionWindow, getTimelineDurationMs } from "@kwikk/timeline";
import * as PixiFilters from "pixi-filters";

export interface PixiSceneRendererOptions {
  backgroundColor?: string;
}

export interface FrameSequenceOptions {
  frameRate: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
  onProgress?: (completed: number, total: number) => void;
  onFrame?: (index: number, timeMs: number, blob: Blob) => Promise<void> | void;
}

export interface FrameSequenceResult {
  frameRate: number;
  totalFrames: number;
  durationMs: number;
  frames: Blob[];
}

type PixiModule = typeof import("pixi.js");

// Holds a reference to the Pixi module once first loaded (via dynamic import in
// PixiSceneRenderer.mount). Used by clearPixiTextMetricsCache below.
let _loadedPixi: PixiModule | null = null;

/**
 * Clears Pixi's internal LRU text-measurement cache.
 * Call this after custom fonts finish loading so the next render uses real
 * glyph metrics instead of stale fallback-font measurements.
 */
export function clearPixiTextMetricsCache(): void {
  ((_loadedPixi?.CanvasTextMetrics ?? (_loadedPixi as any)?.TextMetrics) as any)
    ?._measurementCache?.clear();
}

// Texture cache keyed by the exact normalized src string.
// PixiJS resolves relative URLs to absolute before caching internally, so
// Assets.cache.has(relativeSrc) always returns false even after a successful
// load. We maintain our own map to avoid that key mismatch.
const _textureCache = new Map<string, unknown>();
const _textureLoading = new Set<string>();

// Release cacheAsTexture before destroying so Pixi's TexturePool can reclaim
// the render texture. Without this, returnTexture() crashes on non-POT sizes.
function safeDestroy(node: PixiContainer): void {
  try { (node as any).cacheAsTexture?.(false); } catch { /* no-op */ }
  try { node.destroy({ children: true }); } catch { /* no-op */ }
}

// Per-scene cache kept alive across frames so PixiJS objects are never
// destroyed/recreated unless the element's visual content actually changes.
interface SceneSlot {
  outer: PixiContainer;      // manipulated by transitions (x, y, alpha, scale)
  bgLayer: PixiContainer;    // background graphics — sits below elements layer
  elemLayer: PixiContainer;  // sortable layer that holds element nodes
  bgKey: string | null;
  bgNode: PixiContainer | null;
  nodes: Map<string, { node: PixiContainer; key: string }>;
  /** Cached composition containers, keyed by composition id. */
  compositionNodes: Map<string, { node: PixiContainer; key: string }>;
  // Reused scratch Set cleared each frame — avoids `new Set(elements.map(...))` allocation.
  _inFrameSet: Set<string>;
  // Whether outer is currently a child of pViewport — avoids O(n) children.includes() scan.
  inViewport: boolean;
}

export interface RenderContext {
  pixi: PixiModule;
  requestRedraw: () => void;
  /** Scene-relative current time in ms — needed by video nodes to sync playback. */
  localTimeMs: number;
  /** When true, skip entrance animations and show all elements at their rest state. */
  showAllElements?: boolean;
}

function normalizeAssetSrc(src: string | undefined): string | undefined {
  // Rewrite absolute localhost URLs (e.g. http://localhost:8080/uploads/foo.png)
  // to relative paths so they route through the Vite dev proxy and avoid CORS.
  return src?.replace(/^https?:\/\/localhost:\d+\/uploads\//, "/uploads/");
}

function normalizeFontWeight(value: string | number | undefined): TextStyleFontWeight | undefined {
  if (typeof value === "number") {
    return String(value) as TextStyleFontWeight;
  }

  if (typeof value === "string") {
    return value as TextStyleFontWeight;
  }

  return undefined;
}

function createRoundedRect(
  pixi: PixiModule,
  width: number,
  height: number,
  color: string,
  alpha = 1
): PixiGraphics {
  return new pixi.Graphics().roundRect(0, 0, width, height, 24).fill({ color, alpha });
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}


interface LineWord {
  node: PixiContainer;
  spanIndex: number;
  width: number;
  height: number;
  isSpace: boolean;
}

interface LayoutBaseStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: TextStyleFontWeight;
  fontStyle: string;
  fill: any;
  letterSpacing?: number;
  lineHeight?: number;
  dropShadow?: any;
  stroke?: any;
}

export function layoutTextSegments(
  pixi: PixiModule,
  spans: TextSpan[],
  baseStyle: LayoutBaseStyle,
  maxWidth: number,
  align: "left" | "center" | "right" | "justify"
): PixiContainer {
  const container = new pixi.Container();
  let currentX = 0;
  let maxLineHeight = 0;
  const lineHeightMultiplier = baseStyle.lineHeight ?? 1;
  const lines: LineWord[][] = [[]];
  // Flat list of all placed words (across all lines) for highlight pass
  const allWords: LineWord[] = [];

  for (let si = 0; si < spans.length; si++) {
    const span = spans[si];
    // Span-level stroke/gradient override base fill colour.
    let spanFill: any = span.style?.color ?? baseStyle.fill;
    if (span.style?.textGradient) {
      try {
        const g = span.style.textGradient;
        const angle = ((g.angle ?? 0) * Math.PI) / 180;
        const w = maxWidth, h = baseStyle.fontSize * 1.5;
        const gradient = new (pixi as any).FillGradient({
          start: { x: w / 2 - Math.cos(angle) * w / 2, y: h / 2 - Math.sin(angle) * h / 2 },
          end:   { x: w / 2 + Math.cos(angle) * w / 2, y: h / 2 + Math.sin(angle) * h / 2 },
          textureSpace: "global",
        });
        for (const stop of g.stops) gradient.addColorStop(stop.offset, stop.color);
        spanFill = gradient;
      } catch {
        spanFill = span.style.color ?? baseStyle.fill;
      }
    }

    const spanStroke: any = span.style?.textStroke
      ? { fill: span.style.textStroke.color, width: span.style.textStroke.width }
      : baseStyle.stroke;

    const pixiStyle: any = {
      fontFamily: span.style?.fontFamily ?? baseStyle.fontFamily,
      fontSize: span.style?.fontSize ?? baseStyle.fontSize,
      fontWeight: normalizeFontWeight(span.style?.fontWeight ?? baseStyle.fontWeight) ?? "600",
      fontStyle: (span.style?.fontStyle ?? baseStyle.fontStyle) as any,
      fill: spanFill,
      letterSpacing: (span.style?.letterSpacing ?? baseStyle.letterSpacing) ?? 0,
    };
    if (spanStroke) pixiStyle.stroke = spanStroke;
    if (baseStyle.dropShadow) pixiStyle.dropShadow = baseStyle.dropShadow;

    // Apply uppercase flag on this span's text
    const spanText = span.style?.uppercase ? span.text.toUpperCase() : span.text;
    const tokens = spanText.match(/(\n|[^\S\n]+|\S+)/g) || [];
    const spanOpacity = span.style?.opacity ?? 1;

    for (const token of tokens) {
      if (token === "\n") {
        currentX = 0;
        maxLineHeight = 0;
        lines.push([]);
        continue;
      }

      const isSpace = /^[^\S\n]+$/.test(token);
      const textNode = new pixi.Text({ text: token, style: pixiStyle });
      if (spanOpacity < 1) textNode.alpha = spanOpacity;
      const width = textNode.width;
      const height = textNode.height;

      if (!isSpace && currentX + width > maxWidth && currentX > 0) {
        currentX = 0;
        maxLineHeight = 0;
        lines.push([]);
      }

      textNode.x = currentX;
      currentX += width;
      maxLineHeight = Math.max(maxLineHeight, height);

      const lw: LineWord = { node: textNode, spanIndex: si, width, height, isSpace };
      lines[lines.length - 1].push(lw);
      allWords.push(lw);
      container.addChild(textNode);
    }
  }

  let currentLineY = 0;
  for (const line of lines) {
    if (line.length === 0) continue;

    let lineWidth = 0;
    let lastNonSpaceIdx = -1;
    for (let i = line.length - 1; i >= 0; i--) {
      if (!line[i].isSpace) { lastNonSpaceIdx = i; break; }
    }
    if (lastNonSpaceIdx >= 0) {
      const last = line[lastNonSpaceIdx];
      lineWidth = last.node.x + last.width;
    }

    let offsetX = 0;
    if (align === "center") offsetX = (maxWidth - lineWidth) / 2;
    else if (align === "right") offsetX = maxWidth - lineWidth;

    const lineMaxH = Math.max(...line.map((w) => w.height));

    for (const word of line) {
      word.node.x += offsetX;
      word.node.y = currentLineY + (lineMaxH - word.height);
    }

    currentLineY += lineMaxH * lineHeightMultiplier;
  }

  // Draw highlight pill backgrounds for highlighted spans (inserted before text nodes)
  for (let si = 0; si < spans.length; si++) {
    const span = spans[si];
    if (!span.style?.highlight) continue;

    const highlightColor = span.style.highlight;
    const radius = span.style.highlightRadius ?? 8;
    const padding = span.style.highlightPadding ?? 7;
    const colorInt = parseInt(highlightColor.replace("#", ""), 16);

    // Find all non-space nodes for this span, group by y position (one pill per line segment)
    const spanWords = allWords.filter((w) => w.spanIndex === si && !w.isSpace);
    const byY = new Map<number, LineWord[]>();
    for (const w of spanWords) {
      const yKey = Math.round((w.node as any).y);
      if (!byY.has(yKey)) byY.set(yKey, []);
      byY.get(yKey)!.push(w);
    }

    for (const [, words] of byY) {
      if (words.length === 0) continue;
      const x1 = Math.min(...words.map((w) => (w.node as any).x)) - padding;
      const x2 = Math.max(...words.map((w) => (w.node as any).x + w.width)) + padding;
      const h = Math.max(...words.map((w) => w.height)) + padding * 0.8;
      const y0 = (words[0].node as any).y - padding * 0.4;
      try {
        const bg = new pixi.Graphics();
        bg.roundRect(x1, y0, x2 - x1, h, radius).fill({ color: colorInt });
        container.addChildAt(bg, 0); // behind text nodes
      } catch { /* no-op */ }
    }
  }

  return container;
}

// Render text with per-character animation states applied.
// Each character becomes its own Text node, positioned along the natural text flow.
function createCharAnimatedTextNode(
  pixi: PixiModule,
  element: ElementNode,
  charStates: CharState[]
): PixiContainer {
  const container = new pixi.Container();
  const style = element.style;
  const richText = element.content?.richText;

  // Build full text + per-char span index from richText spans (or fall back to plain text)
  let rawText: string;
  const charSpanIdx: number[] = []; // maps charIndex → span index (-1 if plain text)

  if (richText && richText.length > 0) {
    rawText = applyTextTransform(richText.map((s) => s.text).join(""), style.textTransform);
    let ci = 0;
    for (let si = 0; si < richText.length; si++) {
      const spanText = applyTextTransform(richText[si].text, style.textTransform);
      for (let c = 0; c < [...spanText].length; c++) {
        charSpanIdx[ci++] = si;
      }
    }
  } else {
    rawText = applyTextTransform(element.content?.text ?? element.semanticRole ?? element.id, style.textTransform);
  }

  const chars = [...rawText];

  // Base style (element-level)
  const basePixiStyle: any = {
    fontFamily: style.fontFamily ?? "Inter",
    fontSize: style.fontSize ?? 48,
    fontWeight: normalizeFontWeight(style.fontWeight) ?? "600",
    fontStyle: (style.fontStyle ?? "normal") as any,
    fill: style.color ?? "#0f172a",
    letterSpacing: style.letterSpacing ?? 0,
  };
  if (style.textStroke) basePixiStyle.stroke = { fill: style.textStroke.color, width: style.textStroke.width };
  if (style.textShadow) basePixiStyle.dropShadow = shadowToPixi(style.textShadow);

  // Build per-span Pixi styles
  const spanStyles: any[] = richText
    ? richText.map((span) => {
        const spanText = applyTextTransform(span.text, style.textTransform);
        const spanStyle: any = {
          ...basePixiStyle,
          fontFamily: span.style?.fontFamily ?? basePixiStyle.fontFamily,
          fontSize: span.style?.fontSize ?? basePixiStyle.fontSize,
          fontWeight: normalizeFontWeight(span.style?.fontWeight ?? style.fontWeight) ?? "600",
          fontStyle: (span.style?.fontStyle ?? style.fontStyle ?? "normal") as any,
          fill: span.style?.color ?? basePixiStyle.fill,
          letterSpacing: (span.style?.letterSpacing ?? style.letterSpacing) ?? 0,
        };
        if (span.style?.textStroke) spanStyle.stroke = { fill: span.style.textStroke.color, width: span.style.textStroke.width };
        if (span.style?.uppercase) { /* text already uppercased in rawText */ void spanText; }
        return spanStyle;
      })
    : [];

  // Measure character positions (word-aware wrapping)
  const baseStyle = new pixi.TextStyle(basePixiStyle);
  const Metrics = pixi.CanvasTextMetrics ?? (pixi as any).TextMetrics;
  const maxLineW = element.layout.width;

  // Pass 1: determine which character indices start a new line due to word wrap.
  // We measure whole words and only wrap at word boundaries, never mid-word.
  const lineBreakBefore = new Set<number>();
  {
    let x = 0;
    let i = 0;
    while (i < chars.length) {
      const char = chars[i];
      if (char === "\n") { x = 0; i++; continue; }
      const isSpace = /^[^\S\n]$/.test(char);
      if (isSpace) {
        const si = charSpanIdx[i] ?? -1;
        const ms = si >= 0 && spanStyles[si] ? new pixi.TextStyle(spanStyles[si]) : baseStyle;
        x += Metrics.measureText(char, ms).width;
        i++;
        continue;
      }
      // Measure the entire word (consecutive non-whitespace chars)
      let wordEnd = i;
      let wordW = 0;
      while (wordEnd < chars.length && chars[wordEnd] !== "\n" && !/^[^\S\n]$/.test(chars[wordEnd])) {
        const si = charSpanIdx[wordEnd] ?? -1;
        const ms = si >= 0 && spanStyles[si] ? new pixi.TextStyle(spanStyles[si]) : baseStyle;
        wordW += Metrics.measureText(chars[wordEnd], ms).width;
        wordEnd++;
      }
      // Wrap before this word only if it doesn't fit and we're not at the line start
      if (x > 0 && x + wordW > maxLineW) {
        lineBreakBefore.add(i);
        x = 0;
      }
      x += wordW;
      i = wordEnd;
    }
  }

  // Pass 2: assign x,y positions using the word-aware break set
  let curX = 0;
  let curY = 0;
  let lineMaxH = 0;
  const positions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === "\n") {
      curY += lineMaxH * (style.lineHeight ?? 1);
      curX = 0;
      lineMaxH = 0;
      positions.push({ x: 0, y: curY });
      continue;
    }
    if (lineBreakBefore.has(i)) {
      curY += lineMaxH * (style.lineHeight ?? 1);
      curX = 0;
      lineMaxH = 0;
    }
    const si = charSpanIdx[i] ?? -1;
    const measureStyle = si >= 0 && spanStyles[si] ? new pixi.TextStyle(spanStyles[si]) : baseStyle;
    const metrics = Metrics.measureText(char, measureStyle);
    const w = metrics.width;
    const h = metrics.height;
    positions.push({ x: curX, y: curY });
    curX += w;
    lineMaxH = Math.max(lineMaxH, h);
  }

  // Draw highlight pill backgrounds for highlighted spans (before text nodes)
  if (richText) {
    const highlightSpans = richText.map((sp, si) => ({ sp, si })).filter(({ sp }) => !!sp.style?.highlight);
    if (highlightSpans.length > 0) {
      // Map char positions back to spans, group by span + line (y)
      for (const { sp, si } of highlightSpans) {
        const highlightColor = sp.style!.highlight!;
        const radius = sp.style?.highlightRadius ?? 8;
        const pad = sp.style?.highlightPadding ?? 7;
        const colorInt = parseInt(highlightColor.replace("#", ""), 16) || 0xffe600;

        // Collect all char positions belonging to this span, grouped by line
        const byY = new Map<number, { x: number; w: number; h: number }[]>();
        for (let ci = 0; ci < chars.length; ci++) {
          if (charSpanIdx[ci] !== si || chars[ci] === "\n" || /^[^\S\n]+$/.test(chars[ci])) continue;
          const pos = positions[ci];
          if (!pos) continue;
          const measureStyle = spanStyles[si] ? new pixi.TextStyle(spanStyles[si]) : baseStyle;
          const metrics = (pixi.CanvasTextMetrics ?? (pixi as any).TextMetrics).measureText(chars[ci], measureStyle);
          const yKey = Math.round(pos.y);
          if (!byY.has(yKey)) byY.set(yKey, []);
          byY.get(yKey)!.push({ x: pos.x, w: metrics.width, h: metrics.height });
        }

        for (const [yKey, charEntries] of byY) {
          if (charEntries.length === 0) continue;
          const x1 = Math.min(...charEntries.map((c) => c.x)) - pad;
          const x2 = Math.max(...charEntries.map((c) => c.x + c.w)) + pad;
          const h = Math.max(...charEntries.map((c) => c.h)) + pad * 0.8;
          try {
            const bg = new pixi.Graphics();
            bg.roundRect(x1, yKey - pad * 0.4, x2 - x1, h, radius).fill({ color: colorInt });
            container.addChildAt(bg, 0);
          } catch { /* no-op */ }
        }
      }
    }
  }

  // Create visible char nodes with animation state applied.
  (container as any)._isCharContainer = true;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "\n") continue;
    const state = charStates[i] ?? { opacity: 1, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    const pos = positions[i] ?? { x: 0, y: 0 };

    const si = charSpanIdx[i] ?? -1;
    const charStyle = si >= 0 && spanStyles[si] ? spanStyles[si] : basePixiStyle;

    const displayChar = (state as any).charOverride !== undefined ? (state as any).charOverride : chars[i];
    const node = new pixi.Text({ text: displayChar, style: charStyle });
    (node as any)._baseX = pos.x;
    (node as any)._baseY = pos.y;
    node.x = pos.x + state.offsetX;
    node.y = pos.y + state.offsetY;
    node.alpha = Math.max(0, Math.min(1, state.opacity));
    node.scale.set(state.scaleX, state.scaleY);
    node.rotation = state.rotation;
    // Apply colorOverride if set
    if ((state as any).colorOverride) {
      try { (node as any).style.fill = (state as any).colorOverride; } catch { /* no-op */ }
    }
    container.addChild(node);
  }

  return container;
}

function applyTextTransform(text: string, transform: string | undefined): string {
  switch (transform) {
    case "uppercase": return text.toUpperCase();
    case "lowercase": return text.toLowerCase();
    case "capitalize":
      return text.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
    default: return text;
  }
}

function shadowToPixi(shadow: NonNullable<import("@kwikk/shared-types").StyleProps["textShadow"]>): any {
  const dist = Math.sqrt(shadow.offsetX ** 2 + shadow.offsetY ** 2);
  const angle = Math.atan2(shadow.offsetY, shadow.offsetX);
  return {
    alpha: shadow.alpha ?? 0.5,
    angle,
    blur: shadow.blur ?? 4,
    color: shadow.color ?? "#000000",
    distance: dist,
  };
}

function buildGradientFill(pixi: PixiModule, gradient: NonNullable<import("@kwikk/shared-types").StyleProps["textGradient"]>, w: number, h: number): any {
  try {
    const angle = ((gradient.angle ?? 0) * Math.PI) / 180;
    const grd = new (pixi as any).FillGradient({
      start: { x: w / 2 - Math.cos(angle) * w / 2, y: h / 2 - Math.sin(angle) * h / 2 },
      end:   { x: w / 2 + Math.cos(angle) * w / 2, y: h / 2 + Math.sin(angle) * h / 2 },
      textureSpace: "global",
    });
    for (const stop of gradient.stops) grd.addColorStop(stop.offset, stop.color);
    return grd;
  } catch {
    return gradient.stops[0]?.color ?? "#ffffff";
  }
}


export function createTextNode(
  pixi: PixiModule,
  element: ElementNode,
  timeMs?: number,
  showAllElements?: boolean,
): PixiContainer {
  const container = new pixi.Container();
  const { style, layout } = element;

  if (style.backgroundColor && style.backgroundColor !== "transparent") {
    container.addChild(
      createRoundedRect(pixi, layout.width, layout.height, style.backgroundColor, 0.95)
    );
  }

  // Text curve rendering (arc / wave) — bypasses span layout.
  if (element.content?.textCurve) {
    const curvedNode = createCurvedTextNode(pixi, element);
    container.addChild(curvedNode);
    applyTextEffectFilters(pixi, curvedNode, style, layout.width, layout.height);
    return container;
  }

  // Char-level animations take a separate rendering path.
  if (timeMs !== undefined && hasCharLevelAnimations(element)) {
    const charStates = resolveCharAnimations(element, timeMs, showAllElements);
    if (charStates) {
      container.addChild(createCharAnimatedTextNode(pixi, element, charStates));
      return container;
    }
  }

  const rawText = element.content?.text ?? element.semanticRole ?? element.id;
  const richText = element.content?.richText;
  const align = (style.textAlign ?? "left") as "left" | "center" | "right" | "justify";

  // Build element-level Pixi shadow and stroke descriptors.
  const dropShadow = style.textShadow ? shadowToPixi(style.textShadow) : undefined;
  const stroke = style.textStroke
    ? { fill: style.textStroke.color, width: style.textStroke.width }
    : undefined;

  // Gradient text: bypass multi-span layout and render as a single Text node
  // with FillGradient so the gradient sweeps the full element width.
  if (style.textGradient) {
    const displayText = applyTextTransform(
      richText?.map((s) => s.text).join("") ?? rawText,
      style.textTransform
    );
    const gradFill = buildGradientFill(pixi, style.textGradient, layout.width, layout.height);
    const gradStyle: any = {
      fontFamily: style.fontFamily ?? "Inter",
      fontSize: style.fontSize ?? 48,
      fontWeight: normalizeFontWeight(style.fontWeight) ?? "600",
      fontStyle: style.fontStyle ?? "normal",
      fill: gradFill,
      wordWrap: true,
      wordWrapWidth: layout.width,
      letterSpacing: style.letterSpacing ?? 0,
    };
    if (stroke) gradStyle.stroke = stroke;
    if (dropShadow) gradStyle.dropShadow = dropShadow;
    const gradText = new pixi.Text({ text: displayText, style: gradStyle });
    container.addChild(gradText);
    applyTextEffectFilters(pixi, gradText as any, style, layout.width, layout.height);
    return container;
  }

  const baseStyle: LayoutBaseStyle = {
    fontFamily: style.fontFamily ?? "Inter",
    fontSize: style.fontSize ?? 48,
    fontWeight: normalizeFontWeight(style.fontWeight) ?? "600",
    fontStyle: style.fontStyle ?? "normal",
    fill: style.color ?? "#0f172a",
    letterSpacing: style.letterSpacing ?? 0,
    lineHeight: style.lineHeight ?? 1,
    dropShadow,
    stroke,
  };

  const spans: TextSpan[] = richText && richText.length > 0
    ? richText
    : [{ text: applyTextTransform(rawText, style.textTransform) }];

  // Apply textTransform to plain-text spans (rich spans keep their own text).
  const processedSpans: TextSpan[] = richText && richText.length > 0
    ? spans.map((s) => ({ ...s, text: applyTextTransform(s.text, style.textTransform) }))
    : spans;

  // hollow/outline effect: override fill and stroke before building spans
  if (style.textEffect === "hollow") {
    baseStyle.fill = "rgba(0,0,0,0)";
    const strokeColor = style.textEffectColor ?? style.color ?? "#ffffff";
    const strokeW = Math.max(2, (style.fontSize ?? 48) * 0.06 * (style.textEffectIntensity ?? 1));
    baseStyle.stroke = { fill: strokeColor, width: strokeW };
  } else if (style.textEffect === "outline") {
    const strokeColor = style.textEffectColor ?? "#000000";
    const strokeW = Math.max(2, (style.fontSize ?? 48) * 0.05 * (style.textEffectIntensity ?? 1));
    baseStyle.stroke = { fill: strokeColor, width: strokeW };
  } else if (style.textEffect === "retro") {
    if (!baseStyle.stroke) {
      baseStyle.stroke = { fill: style.textEffectColor ?? "#c0392b", width: Math.max(3, (style.fontSize ?? 48) * 0.07) };
    }
  } else if (style.textEffect === "western") {
    if (!baseStyle.stroke) {
      baseStyle.stroke = { fill: style.textEffectColor ?? "#8B6914", width: Math.max(2, (style.fontSize ?? 48) * 0.05) };
    }
  } else if (style.textEffect === "arcade") {
    if (!baseStyle.stroke) {
      baseStyle.stroke = { fill: "#000000", width: Math.max(3, (style.fontSize ?? 48) * 0.06) };
    }
  }

  container.addChild(layoutTextSegments(pixi, processedSpans, baseStyle, layout.width, align));

  applyTextEffectFilters(pixi, container, style, layout.width, layout.height);
  return container;
}

function applyTextEffectFilters(
  pixi: PixiModule,
  container: PixiContainer,
  style: import("@kwikk/shared-types").StyleProps,
  width: number,
  height: number
): void {
  const effect = style.textEffect;
  if (!effect || effect === "hollow" || effect === "outline" || effect === "retro" || effect === "western" || effect === "arcade") return;

  const intensity = style.textEffectIntensity ?? 0.8;
  const effectColor = style.textEffectColor ?? style.color ?? "#ffffff";
  const colorInt = parseInt(effectColor.replace("#", ""), 16) || 0xffffff;

  try {
    switch (effect) {
      case "glow": {
        const glow = new (PixiFilters as any).GlowFilter({
          color: colorInt,
          distance: 15 * intensity,
          innerStrength: 0,
          outerStrength: 3 * intensity,
          quality: 0.5,
        });
        container.filters = [glow];
        break;
      }
      case "neon": {
        const inner = new (PixiFilters as any).GlowFilter({ color: 0xffffff, distance: 4, innerStrength: 2, outerStrength: 0, quality: 0.5 });
        const outer = new (PixiFilters as any).GlowFilter({ color: colorInt, distance: 20 * intensity, innerStrength: 0, outerStrength: 4 * intensity, quality: 0.5 });
        container.filters = [inner, outer];
        break;
      }
      case "echo": {
        // Build 2 copies at progressively larger offsets, faded
        const echoOffset = Math.max(4, (style.fontSize ?? 48) * 0.08);
        for (let i = 2; i >= 1; i--) {
          const copy = new pixi.Container();
          copy.x = echoOffset * i;
          copy.y = echoOffset * i * 0.5;
          copy.alpha = 0.25 / i;
          // Add a colored rectangle as a cheap echo — a real implementation would
          // clone the text children, but Pixi containers aren't easily deep-cloned.
          const echoRect = new pixi.Graphics().rect(0, 0, width, height).fill({ color: colorInt, alpha: 0.35 / i });
          echoRect.mask = container as any;
          copy.addChild(echoRect);
          (container.parent ?? container).addChildAt(copy, 0);
        }
        break;
      }
      case "scifi": {
        const sci = new (PixiFilters as any).GlowFilter({
          color: 0x00ffff,
          distance: 12 * intensity,
          innerStrength: 1,
          outerStrength: 2.5 * intensity,
          quality: 0.5,
        });
        container.filters = [sci];
        break;
      }
      case "cosmic": {
        const cos = new (PixiFilters as any).GlowFilter({
          color: 0x9b59b6,
          distance: 18 * intensity,
          innerStrength: 0.5,
          outerStrength: 3.5 * intensity,
          quality: 0.5,
        });
        container.filters = [cos];
        break;
      }
      case "pixel": {
        const pix = new (PixiFilters as any).PixelateFilter(Math.max(2, 6 * (1 - intensity) + 2));
        container.filters = [pix];
        break;
      }
      case "fire": {
        // Warm orange-red outer glow simulating flames
        const fireOuter = new (PixiFilters as any).GlowFilter({ color: 0xff4500, distance: 22 * intensity, innerStrength: 0, outerStrength: 4 * intensity, quality: 0.5 });
        const fireInner = new (PixiFilters as any).GlowFilter({ color: 0xffa500, distance: 8 * intensity, innerStrength: 1.5 * intensity, outerStrength: 0, quality: 0.5 });
        container.filters = [fireInner, fireOuter];
        break;
      }
      case "gold": {
        // Warm gold glow + slight brightness
        const goldGlow = new (PixiFilters as any).GlowFilter({ color: 0xffd700, distance: 14 * intensity, innerStrength: 0.5 * intensity, outerStrength: 2.5 * intensity, quality: 0.5 });
        const goldCm = new pixi.ColorMatrixFilter();
        goldCm.brightness(1.15, false);
        goldCm.saturate(0.3, true);
        container.filters = [goldCm, goldGlow];
        break;
      }
      case "glitch": {
        // Chromatic split + slight displacement
        const glitchCm = new pixi.ColorMatrixFilter();
        glitchCm.contrast(0.3, false);
        glitchCm.saturate(0.5, true);
        container.filters = [glitchCm];
        // Offset the container slightly for chromatic effect
        container.x += 2 * intensity;
        break;
      }
      case "matrix": {
        // Green monospace digital-rain tint
        const matrixCm = new pixi.ColorMatrixFilter();
        matrixCm.greyscale(0.3, false);
        matrixCm.tint(0x00ff41, false);
        const matrixGlow = new (PixiFilters as any).GlowFilter({ color: 0x00ff41, distance: 10 * intensity, innerStrength: 0.3, outerStrength: 1.5 * intensity, quality: 0.5 });
        container.filters = [matrixCm, matrixGlow];
        break;
      }
      case "frost": {
        // Icy blue-white glow
        const frostGlow = new (PixiFilters as any).GlowFilter({ color: 0xa8d8ea, distance: 16 * intensity, innerStrength: 0.8 * intensity, outerStrength: 2 * intensity, quality: 0.5 });
        const frostCm = new pixi.ColorMatrixFilter();
        frostCm.brightness(1.1, false);
        frostCm.saturate(-0.3, true);
        container.filters = [frostCm, frostGlow];
        break;
      }
      case "shadow_stack": {
        // Multiple layered drop shadows for thick 3D depth
        const stackGlow = new (PixiFilters as any).GlowFilter({ color: colorInt, distance: 5, innerStrength: 0, outerStrength: 1, quality: 0.5 });
        try {
          const shadow1 = new (PixiFilters as any).DropShadowFilter({ color: colorInt, alpha: 0.5, blur: 0, offset: { x: 3 * intensity, y: 3 * intensity }, quality: 3 });
          const shadow2 = new (PixiFilters as any).DropShadowFilter({ color: 0x000000, alpha: 0.4, blur: 2, offset: { x: 6 * intensity, y: 6 * intensity }, quality: 3 });
          const shadow3 = new (PixiFilters as any).DropShadowFilter({ color: 0x000000, alpha: 0.2, blur: 6, offset: { x: 10 * intensity, y: 10 * intensity }, quality: 3 });
          container.filters = [shadow3, shadow2, shadow1, stackGlow];
        } catch {
          container.filters = [stackGlow];
        }
        break;
      }
      case "hologram": {
        const holoCm = new pixi.ColorMatrixFilter();
        holoCm.tint(0x00ffcc, false);
        holoCm.brightness(1.2, true);
        const holoGlow = new (PixiFilters as any).GlowFilter({ color: 0x00ffcc, distance: 14 * intensity, innerStrength: 1, outerStrength: 2.5 * intensity, quality: 0.5 });
        container.filters = [holoCm, holoGlow];
        container.alpha *= 0.85;
        break;
      }
      case "chrome": {
        const chromeCm = new pixi.ColorMatrixFilter();
        chromeCm.greyscale(0.05, false);
        chromeCm.contrast(0.4, true);
        chromeCm.brightness(1.3, true);
        const chromeGlow = new (PixiFilters as any).GlowFilter({ color: 0xffffff, distance: 8 * intensity, innerStrength: 2 * intensity, outerStrength: 1, quality: 0.5 });
        container.filters = [chromeCm, chromeGlow];
        break;
      }
      case "emboss": {
        // Emboss via slight offset shadow + desaturate
        const embossCm = new pixi.ColorMatrixFilter();
        embossCm.greyscale(0.3, false);
        embossCm.contrast(0.2, true);
        try {
          const shadow = new (PixiFilters as any).DropShadowFilter({ color: 0xffffff, alpha: 0.6, blur: 0, offset: { x: -2, y: -2 }, quality: 1 });
          const dark = new (PixiFilters as any).DropShadowFilter({ color: 0x000000, alpha: 0.5, blur: 0, offset: { x: 2, y: 2 }, quality: 1 });
          container.filters = [embossCm, dark, shadow];
        } catch {
          container.filters = [embossCm];
        }
        break;
      }
      case "chalk": {
        const chalkCm = new pixi.ColorMatrixFilter();
        chalkCm.greyscale(0.15, false);
        chalkCm.brightness(1.1, true);
        try {
          const noise = new (PixiFilters as any).NoiseFilter(0.15 * intensity, 1);
          container.filters = [chalkCm, noise];
        } catch {
          container.filters = [chalkCm];
        }
        break;
      }
      case "spray_paint": {
        const sprayCm = new pixi.ColorMatrixFilter();
        sprayCm.saturate(0.5, false);
        try {
          const noise = new (PixiFilters as any).NoiseFilter(0.25 * intensity, 1);
          const glow = new (PixiFilters as any).GlowFilter({ color: colorInt, distance: 6 * intensity, innerStrength: 0, outerStrength: 1.5 * intensity, quality: 0.3 });
          container.filters = [noise, glow, sprayCm];
        } catch {
          container.filters = [sprayCm];
        }
        break;
      }
      case "blood": {
        const bloodCm = new pixi.ColorMatrixFilter();
        bloodCm.tint(0xcc0000, false);
        const bloodGlow = new (PixiFilters as any).GlowFilter({ color: 0x880000, distance: 10 * intensity, innerStrength: 0.5, outerStrength: 2 * intensity, quality: 0.4 });
        try {
          const drip = new (PixiFilters as any).DropShadowFilter({ color: 0x880000, alpha: 0.7, blur: 2, offset: { x: 0, y: 8 * intensity }, quality: 2 });
          container.filters = [bloodCm, drip, bloodGlow];
        } catch {
          container.filters = [bloodCm, bloodGlow];
        }
        break;
      }
      case "ice": {
        const iceCm = new pixi.ColorMatrixFilter();
        iceCm.tint(0xa8d8f0, false);
        iceCm.brightness(1.15, true);
        const iceGlow = new (PixiFilters as any).GlowFilter({ color: 0xffffff, distance: 12 * intensity, innerStrength: 1.5 * intensity, outerStrength: 1.5, quality: 0.5 });
        container.filters = [iceCm, iceGlow];
        break;
      }
      case "lava": {
        const lavaCm = new pixi.ColorMatrixFilter();
        lavaCm.tint(0xff4500, false);
        lavaCm.brightness(1.1, true);
        const lavaOuter = new (PixiFilters as any).GlowFilter({ color: 0xff6600, distance: 20 * intensity, innerStrength: 0, outerStrength: 4 * intensity, quality: 0.5 });
        const lavaInner = new (PixiFilters as any).GlowFilter({ color: 0xffee00, distance: 6 * intensity, innerStrength: 2 * intensity, outerStrength: 0, quality: 0.5 });
        container.filters = [lavaCm, lavaInner, lavaOuter];
        break;
      }
      case "typewriter_ink": {
        // Soft dark ink glow, slight desaturate + contrast
        const inkCm = new pixi.ColorMatrixFilter();
        inkCm.greyscale(0.1, false);
        inkCm.contrast(0.2, true);
        try {
          const inkShadow = new (PixiFilters as any).DropShadowFilter({ color: 0x1a1a2e, alpha: 0.4, blur: 1, offset: { x: 1, y: 1 }, quality: 1 });
          container.filters = [inkCm, inkShadow];
        } catch {
          container.filters = [inkCm];
        }
        break;
      }
    }

    // Prevent clipping: set padding on every filter equal to how far the effect bleeds
    // outside the container bounds. Without this, glows/shadows are cut off at the box edge.
    if (container.filters?.length) {
      const bleed = effectBleedPx(effect, intensity);
      for (const f of container.filters as any[]) {
        if (f && typeof f === "object" && "padding" in f) f.padding = bleed;
      }
    }
  } catch { /* pixi-filters not available */ }
}

function effectBleedPx(effect: string, intensity: number): number {
  switch (effect) {
    case "neon":          return Math.ceil(22 * intensity) + 8;
    case "fire":
    case "lava":          return Math.ceil(24 * intensity) + 8;
    case "glow":          return Math.ceil(17 * intensity) + 6;
    case "gold":
    case "frost":
    case "hologram":
    case "ice":           return Math.ceil(16 * intensity) + 6;
    case "cosmic":        return Math.ceil(20 * intensity) + 6;
    case "scifi":
    case "matrix":        return Math.ceil(14 * intensity) + 6;
    case "chrome":        return Math.ceil(10 * intensity) + 6;
    case "shadow_stack":  return Math.ceil(12 * intensity) + 8;
    case "blood":         return Math.ceil(12 * intensity) + 8;
    case "spray_paint":   return Math.ceil(8  * intensity) + 4;
    case "emboss":
    case "typewriter_ink":return 6;
    default:              return Math.ceil(10 * intensity) + 4;
  }
}

function createCurvedTextNode(pixi: PixiModule, element: ElementNode): PixiContainer {
  const container = new pixi.Container();
  const { style, layout, content } = element;
  const curve = content!.textCurve!;
  const rawText = applyTextTransform(
    content?.richText?.map((s) => s.text).join("") ?? content?.text ?? "",
    style.textTransform
  );
  const chars = [...rawText].filter((c) => c !== "\n");
  if (chars.length === 0) return container;

  const pixiStyle: any = {
    fontFamily: style.fontFamily ?? "Inter",
    fontSize: style.fontSize ?? 48,
    fontWeight: normalizeFontWeight(style.fontWeight) ?? "600",
    fontStyle: style.fontStyle ?? "normal",
    fill: style.color ?? "#0f172a",
    letterSpacing: style.letterSpacing ?? 0,
  };
  if (style.textStroke) pixiStyle.stroke = { fill: style.textStroke.color, width: style.textStroke.width };
  if (style.textShadow) pixiStyle.dropShadow = shadowToPixi(style.textShadow);

  const textStyle = new pixi.TextStyle(pixiStyle);
  const Metrics = (pixi.CanvasTextMetrics ?? (pixi as any).TextMetrics);

  // Pre-measure all character widths.
  const charWidths: number[] = chars.map((c) => {
    if (c === " ") return (pixiStyle.fontSize as number) * 0.28;
    const m = Metrics.measureText(c, textStyle);
    return m.width;
  });
  const totalWidth = charWidths.reduce((s, w) => s + w, 0);

  if (curve.type === "arc") {
    const radius = curve.radius ?? Math.max(layout.width * 1.5, 300);
    const reversed = curve.reversed ?? false;
    // Total arc swept by text characters.
    const totalArc = totalWidth / radius;
    // Starting angle: centered so the text arc is symmetric.
    // Angle 0 = top of circle; positive angles go clockwise.
    const startAngle = (curve.startAngle ?? 0) - totalArc / 2;
    const cx = layout.width / 2;
    // Position the arc center so the text sits inside the element.
    // For normal (concave up): arc center is below the text → cy = -radius + fontSize + padding
    // For reversed (concave down): arc center is above → cy = radius + padding
    const fontSize = style.fontSize ?? 48;
    const cy = reversed ? radius + fontSize * 0.2 : -radius + fontSize * 1.2;

    let angle = startAngle;
    for (let i = 0; i < chars.length; i++) {
      const w = charWidths[i];
      const charMidAngle = angle + (w / 2) / radius;

      const node = new pixi.Text({ text: chars[i], style: pixiStyle });
      node.anchor.set(0.5, reversed ? 0 : 1);
      node.x = cx + radius * Math.sin(charMidAngle);
      node.y = cy + radius * (reversed ? -Math.cos(charMidAngle) : Math.cos(charMidAngle));
      node.rotation = charMidAngle * (reversed ? -1 : 1);
      container.addChild(node);
      angle += w / radius;
    }
  } else {
    // Wave mode.
    const amplitude = curve.amplitude ?? 20;
    const frequency = curve.frequency ?? 1;
    const startX = (layout.width - totalWidth) / 2;
    let curX = 0;
    const fontSize = style.fontSize ?? 48;
    const baseY = layout.height / 2 - fontSize / 2;

    for (let i = 0; i < chars.length; i++) {
      const w = charWidths[i];
      const t = layout.width > 0 ? (startX + curX + w / 2) / layout.width : 0;
      const yOff = amplitude * Math.sin(t * frequency * Math.PI * 2);
      const node = new pixi.Text({ text: chars[i], style: pixiStyle });
      node.x = startX + curX;
      node.y = baseY + yOff;
      container.addChild(node);
      curX += w;
    }
  }

  return container;
}

function createPlaceholderNode(
  pixi: PixiModule,
  element: ElementNode,
  fillColor: string,
  label: string
): PixiContainer {
  const container = new pixi.Container();
  const box = createRoundedRect(pixi, element.layout.width, element.layout.height, fillColor, 0.95);
  const text = new pixi.Text({
    text: label,
    style: {
      fill: "#0f172a",
      fontFamily: "Inter",
        fontSize: 32,
        fontWeight: "600",
        fontStyle: "normal",
      wordWrap: true,
      wordWrapWidth: Math.max(120, element.layout.width - 32)
    }
  });

  text.x = 16;
  text.y = 16;
  container.addChild(box, text);
  return container;
}

function applyShapePath(g: PixiGraphics, shape: ShapeKind, w: number, h: number, radius: number): PixiGraphics {
  switch (shape) {
    case "circle":
      return g.circle(w / 2, h / 2, Math.min(w, h) / 2);
    case "ellipse":
      return g.ellipse(w / 2, h / 2, w / 2, h / 2);
    case "triangle":
      return g.poly([w / 2, 0, w, h, 0, h]);
    case "diamond":
      return g.poly([w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]);
    case "star": {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      const pts: number[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return g.poly(pts);
    }
    case "hexagon": {
      const cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) / 2;
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return g.poly(pts);
    }
    case "arrow": {
      const aw = w * 0.35, ah = h * 0.3;
      return g.poly([
        0, h / 2 - ah / 2,
        w - aw, h / 2 - ah / 2,
        w - aw, h / 2 - ah,
        w, h / 2,
        w - aw, h / 2 + ah,
        w - aw, h / 2 + ah / 2,
        0, h / 2 + ah / 2
      ]);
    }
    case "line":
      return g; // lines are stroked only, handled separately
    case "speech_bubble": {
      const tailH = h * 0.2, bodyH = h - tailH;
      const r = radius || 12;
      g.roundRect(0, 0, w, bodyH, r);
      // Tail: small triangle pointing down-left
      g.poly([w * 0.18, bodyH, w * 0.35, bodyH, w * 0.18, h]);
      return g;
    }
    case "heart": {
      const cx = w / 2, cy = h / 2;
      const s = Math.min(w, h) * 0.5;
      // Heart via bezier approximation using poly segments
      const pts: number[] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        // Parametric heart curve
        const hx = s * 16 * Math.pow(Math.sin(t), 3) / 16;
        const hy = -s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
        pts.push(cx + hx, cy + hy);
      }
      return g.poly(pts);
    }
    case "cross": {
      const t = w * 0.3, b = w - t;
      const mt = h * 0.3, mb = h - mt;
      return g.poly([t, 0, b, 0, b, mt, w, mt, w, mb, b, mb, b, h, t, h, t, mb, 0, mb, 0, mt, t, mt]);
    }
    case "pentagon": {
      const cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) / 2;
      const pts: number[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return g.poly(pts);
    }
    case "octagon": {
      const cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) / 2;
      const pts: number[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8 - Math.PI / 8;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return g.poly(pts);
    }
    case "starburst": {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.5;
      const spikes = 12;
      const pts: number[] = [];
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return g.poly(pts);
    }
    case "cloud": {
      // Approximate cloud with overlapping circles represented as polygon
      const cx = w / 2, cy = h * 0.55;
      const pts: number[] = [];
      const bumps = [
        { ox: -w * 0.28, oy: h * 0.08, r: w * 0.22 },
        { ox: 0, oy: -h * 0.12, r: w * 0.26 },
        { ox: w * 0.28, oy: h * 0.08, r: w * 0.22 },
        { ox: -w * 0.16, oy: h * 0.18, r: w * 0.18 },
        { ox: w * 0.16, oy: h * 0.18, r: w * 0.18 },
      ];
      const steps = 12;
      for (const bump of bumps) {
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          pts.push(cx + bump.ox + bump.r * Math.cos(angle), cy + bump.oy + bump.r * Math.sin(angle));
        }
      }
      return g.poly(pts);
    }
    case "parallelogram": {
      const skew = w * 0.2;
      return g.poly([skew, 0, w, 0, w - skew, h, 0, h]);
    }
    case "badge": {
      // Rounded rectangle with notched sides (badge/ribbon shape)
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2;
      const spikes = 16;
      const innerR = outerR * 0.88;
      const pts: number[] = [];
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return g.poly(pts);
    }
    case "rectangle":
    default:
      return g.roundRect(0, 0, w, h, radius);
  }
}

// ─── Line rendering helpers ───────────────────────────────────────────────────

function drawDashedLine(
  g: PixiGraphics,
  x1: number, y1: number, x2: number, y2: number,
  dashLen: number, gapLen: number,
  strokeWidth: number, color: string, cap: string
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len, ny = dy / len;
  let pos = 0, drawing = true;
  while (pos < len) {
    const segLen = drawing ? Math.min(dashLen, len - pos) : Math.min(gapLen, len - pos);
    if (drawing && segLen > 0) {
      g.moveTo(x1 + nx * pos, y1 + ny * pos);
      g.lineTo(x1 + nx * (pos + segLen), y1 + ny * (pos + segLen));
    }
    pos += segLen;
    drawing = !drawing;
  }
  g.stroke({ color, width: strokeWidth, cap: cap as any });
}

function drawZigzagLine(
  pixi: PixiModule, container: PixiContainer,
  x1: number, cy: number, x2: number,
  strokeWidth: number, color: string, amplitude: number
): void {
  const g = new pixi.Graphics();
  const period = Math.max(amplitude * 2.5, 20);
  g.moveTo(x1, cy);
  let x = x1, dir = 1;
  while (x < x2) {
    const nx = Math.min(x + period / 2, x2);
    g.lineTo(nx, cy + amplitude * dir);
    x = nx; dir = -dir;
  }
  g.stroke({ color, width: strokeWidth, join: "miter" as any });
  container.addChild(g);
}

function drawWavyLine(
  pixi: PixiModule, container: PixiContainer,
  x1: number, cy: number, x2: number,
  strokeWidth: number, color: string, amplitude: number
): void {
  const g = new pixi.Graphics();
  const len = x2 - x1;
  if (len <= 0) return;
  const cycles = Math.max(2, Math.round(len / 40));
  const steps = Math.max(80, Math.floor(len / 1.5));
  g.moveTo(x1, cy);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    g.lineTo(x1 + len * t, cy + Math.sin(t * cycles * Math.PI * 2) * amplitude);
  }
  g.stroke({ color, width: strokeWidth, cap: "round" as any, join: "round" as any });
  container.addChild(g);
}

function drawLineArrowHead(
  pixi: PixiModule, container: PixiContainer,
  tipX: number, tipY: number,
  type: import("@kwikk/shared-types").ArrowHeadType,
  size: number, strokeWidth: number, color: string,
  pointingRight: boolean
): void {
  if (type === "none") return;
  const g = new pixi.Graphics();
  const dir = pointingRight ? 1 : -1;
  const half = Math.PI / 6;
  if (type === "arrow") {
    const b1x = tipX - dir * Math.cos(half) * size;
    const b2x = b1x;
    g.poly([tipX, tipY, b1x, tipY - Math.sin(half) * size, b2x, tipY + Math.sin(half) * size]).fill({ color });
  } else if (type === "open_arrow") {
    const b1x = tipX - dir * Math.cos(half) * size;
    g.moveTo(b1x, tipY - Math.sin(half) * size).lineTo(tipX, tipY).lineTo(b1x, tipY + Math.sin(half) * size);
    g.stroke({ color, width: strokeWidth, cap: "round" as any, join: "miter" as any });
  } else if (type === "circle") {
    g.circle(tipX, tipY, size / 2).fill({ color });
  } else if (type === "square") {
    g.rect(tipX - size / 2, tipY - size / 2, size, size).fill({ color });
  } else if (type === "diamond") {
    g.poly([tipX, tipY - size / 2, tipX + size / 2, tipY, tipX, tipY + size / 2, tipX - size / 2, tipY]).fill({ color });
  }
  container.addChild(g);
}

function createLineShapeNode(pixi: PixiModule, element: ElementNode): PixiContainer {
  const container = new pixi.Container();
  const { width, height } = element.layout;
  const c = element.content ?? {};
  const strokeWidth = c.lineWidth ?? Math.max(element.style.borderWidth ?? 0, 4);
  const color = c.lineColor ?? element.style.backgroundColor ?? "#4f46e5";
  const lineStyle = c.lineStyle ?? "solid";
  const cap = c.lineCap ?? "round";
  const arrowStart: import("@kwikk/shared-types").ArrowHeadType = (c.arrowStart as any) ?? "none";
  const arrowEnd: import("@kwikk/shared-types").ArrowHeadType = (c.arrowEnd as any) ?? "none";
  const arrowSize = c.arrowSize ?? Math.max(strokeWidth * 4, 14);
  const drawProgress = c.lineDrawProgress ?? 1;
  const cy = height / 2;
  const rawX2 = width * drawProgress;
  const startInset = arrowStart !== "none" ? arrowSize * 0.75 : 0;
  const endInset = arrowEnd !== "none" ? arrowSize * 0.75 : 0;
  const lx1 = startInset;
  const lx2 = Math.max(lx1, rawX2 - endInset);
  const amplitude = Math.min(height * 0.38, strokeWidth * 5, 24);

  if (lineStyle === "solid") {
    const g = new pixi.Graphics();
    if (lx2 > lx1) g.moveTo(lx1, cy).lineTo(lx2, cy).stroke({ color, width: strokeWidth, cap: cap as any });
    container.addChild(g);
  } else if (lineStyle === "double") {
    const gap = Math.max(strokeWidth * 1.5, 3);
    const hw = Math.max(strokeWidth * 0.45, 1);
    const g = new pixi.Graphics();
    if (lx2 > lx1) {
      g.moveTo(lx1, cy - gap / 2).lineTo(lx2, cy - gap / 2);
      g.moveTo(lx1, cy + gap / 2).lineTo(lx2, cy + gap / 2);
      g.stroke({ color, width: hw, cap: cap as any });
    }
    container.addChild(g);
  } else if (lineStyle === "dashed") {
    const g = new pixi.Graphics();
    if (lx2 > lx1) drawDashedLine(g, lx1, cy, lx2, cy, strokeWidth * 5, strokeWidth * 3, strokeWidth, color, cap);
    container.addChild(g);
  } else if (lineStyle === "dotted") {
    const g = new pixi.Graphics();
    if (lx2 > lx1) drawDashedLine(g, lx1, cy, lx2, cy, strokeWidth * 0.05, strokeWidth * 2.5, strokeWidth, color, "round");
    container.addChild(g);
  } else if (lineStyle === "zigzag") {
    if (lx2 > lx1) drawZigzagLine(pixi, container, lx1, cy, lx2, strokeWidth, color, amplitude);
  } else if (lineStyle === "wavy") {
    if (lx2 > lx1) drawWavyLine(pixi, container, lx1, cy, lx2, strokeWidth, color, amplitude);
  }

  if (drawProgress > 0) {
    if (arrowStart !== "none") drawLineArrowHead(pixi, container, 0, cy, arrowStart, arrowSize, strokeWidth, color, false);
    if (arrowEnd !== "none") drawLineArrowHead(pixi, container, rawX2, cy, arrowEnd, arrowSize, strokeWidth, color, true);
  }
  return container;
}

export function createShapeNode(pixi: PixiModule, element: ElementNode, ctx?: RenderContext): PixiContainer {
  const container = new pixi.Container();
  const { width, height } = element.layout;
  const shape: ShapeKind = (element.content?.shape as ShapeKind) ?? "rectangle";
  const fillColor = element.style.backgroundColor ?? "#334155";
  const radius = element.style.borderRadius ?? 8;
  const fillPattern = element.style.fillPattern ?? "solid";
  const fillColor2 = element.style.fillColor2;
  const borderColor = element.style.borderColor;
  const borderWidth = element.style.borderWidth ?? 0;

  // Line gets its own dedicated renderer with full feature support
  if (shape === "line") {
    return createLineShapeNode(pixi, element);
  }

  // Image fill: clip image to shape outline
  if (fillPattern === "image" && ctx) {
    const imgSrc = normalizeAssetSrc(element.content?.fillImageSrc ?? element.content?.src);
    if (imgSrc && !imgSrc.startsWith("placeholder://")) {
      const texture = _textureCache.get(imgSrc) ?? null;
      if (!texture) {
        if (!_textureLoading.has(imgSrc)) {
          _textureLoading.add(imgSrc);
          pixi.Assets.load(imgSrc).then((t) => {
            _textureCache.set(imgSrc, t);
            _textureLoading.delete(imgSrc);
            ctx.requestRedraw();
          }).catch(() => { _textureLoading.delete(imgSrc); });
        }
        // Placeholder fill while loading
        applyShapePath(new pixi.Graphics(), shape, width, height, radius).fill({ color: fillColor });
      } else {
        try {
          const sp = new pixi.Sprite(texture);
          const scaleV = Math.max(width / (texture as any).width, height / (texture as any).height);
          sp.width = (texture as any).width * scaleV;
          sp.height = (texture as any).height * scaleV;
          sp.x = (width - sp.width) / 2;
          sp.y = (height - sp.height) / 2;
          const clipMask = new pixi.Graphics();
          applyShapePath(clipMask, shape, width, height, radius).fill({ color: 0xffffff });
          sp.mask = clipMask as any;
          container.addChild(clipMask, sp);
        } catch {
          applyShapePath(new pixi.Graphics(), shape, width, height, radius).fill({ color: fillColor });
        }
      }
    }
  } else if (fillPattern !== "hollow") {
    // Base fill — skipped for "hollow" (border-only) shapes
    const base = new pixi.Graphics();
    if (fillPattern === "gradient" && fillColor2) {
      try {
        const gradient = new (pixi as any).FillGradient({ start: { x: 0, y: 0 }, end: { x: width, y: height }, textureSpace: "global" });
        gradient.addColorStop(0, fillColor);
        gradient.addColorStop(1, fillColor2);
        applyShapePath(base, shape, width, height, radius).fill({ fill: gradient } as any);
      } catch {
        applyShapePath(base, shape, width, height, radius).fill({ color: fillColor });
      }
    } else {
      applyShapePath(base, shape, width, height, radius).fill({ color: fillColor });
    }
    container.addChild(base);
  }

  // Pattern overlay — clipped to shape bounds via a mask
  if ((fillPattern === "stripes" || fillPattern === "dots" || fillPattern === "grid") && fillColor2) {
    const patternColor = fillColor2;
    const overlay = new pixi.Graphics();
    if (fillPattern === "stripes") {
      const gap = 20;
      for (let i = -(height); i < width + height; i += gap * 2) {
        overlay.moveTo(i, 0).lineTo(i + height, height);
      }
      overlay.stroke({ color: patternColor, width: 6, alpha: 0.45 });
    } else if (fillPattern === "dots") {
      const dotR = 3, step = 18;
      for (let row = step / 2; row < height; row += step) {
        for (let col = step / 2; col < width; col += step) {
          overlay.circle(col, row, dotR);
        }
      }
      overlay.fill({ color: patternColor, alpha: 0.55 });
    } else if (fillPattern === "grid") {
      const step = 24;
      for (let x = 0; x <= width; x += step) overlay.moveTo(x, 0).lineTo(x, height);
      for (let y = 0; y <= height; y += step) overlay.moveTo(0, y).lineTo(width, y);
      overlay.stroke({ color: patternColor, width: 1, alpha: 0.4 });
    }
    const clipMask = new pixi.Graphics();
    applyShapePath(clipMask, shape, width, height, radius).fill({ color: 0xffffff });
    overlay.mask = clipMask as any;
    container.addChild(clipMask, overlay);
  }

  // Border stroke
  if (borderWidth > 0 && borderColor) {
    const border = new pixi.Graphics();
    applyShapePath(border, shape, width, height, radius).stroke({ color: borderColor, width: borderWidth });
    container.addChild(border);
  }

  // Shape static effects: glow and drop shadow from style.filters
  if (element.style.filters) {
    const sf = element.style.filters;
    const shapeFilters: PixiFilter[] = [];
    if (sf.glow) {
      try {
        const colorInt = parseInt(sf.glow.color.replace("#", ""), 16);
        shapeFilters.push(new (PixiFilters as any).GlowFilter({
          color: colorInt,
          distance: sf.glow.blur,
          innerStrength: 0,
          outerStrength: sf.glow.strength,
          quality: 0.5,
        }));
      } catch { /* pixi-filters unavailable */ }
    }
    if (sf.dropShadow) {
      try {
        const colorInt = parseInt(sf.dropShadow.color.replace("#", ""), 16);
        shapeFilters.push(new (PixiFilters as any).DropShadowFilter({
          color: colorInt,
          alpha: sf.dropShadow.alpha,
          blur: sf.dropShadow.blur,
          offset: { x: sf.dropShadow.offsetX, y: sf.dropShadow.offsetY },
          quality: 3,
        }));
      } catch { /* pixi-filters unavailable */ }
    }
    if (shapeFilters.length > 0) container.filters = shapeFilters as any;
  }

  return container;
}

function applyPixiFiltersAndOverlays(
  ctx: RenderContext,
  element: ElementNode,
  mainNode: PixiContainer,
  container: PixiContainer,
  width: number,
  height: number
): void {
  // Apply filters
  if (element.style.filters) {
    const filters: PixiFilter[] = [];
    const f = element.style.filters;

    if (f.blur) {
      filters.push(new ctx.pixi.BlurFilter({ strength: f.blur }));
    }

    if (f.brightness !== undefined || f.contrast !== undefined || f.saturation !== undefined || f.monochrome) {
      const cm = new ctx.pixi.ColorMatrixFilter();
      let acc = false;
      if (f.brightness !== undefined) { cm.brightness(f.brightness, false); acc = true; }
      if (f.contrast !== undefined) { cm.contrast(f.contrast / 2, acc); acc = true; }
      if (f.saturation !== undefined) { cm.saturate(f.saturation - 1, acc); acc = true; }
      if (f.monochrome) { cm.blackAndWhite(acc); }
      filters.push(cm);
    }

    if (f.hdr) {
      const hdr = new ctx.pixi.ColorMatrixFilter();
      hdr.contrast(0.75, false);
      hdr.saturate(0.5, true);
      hdr.brightness(1.1, true);
      filters.push(hdr);
    }

    if (f.sharpen) {
      try {
        const s = Math.min(f.sharpen, 2) * 0.3;
        const sharpenMatrix: [number, number, number, number, number, number, number, number, number] = [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0];
        filters.push(new (PixiFilters as any).ConvolutionFilter({ matrix: sharpenMatrix, width, height }));
      } catch {
        const sh = new ctx.pixi.ColorMatrixFilter();
        sh.contrast(0.5 + Math.min(f.sharpen, 1) * 0.4, false);
        filters.push(sh);
      }
    }

    if (f.vintage) {
      const vin = new ctx.pixi.ColorMatrixFilter();
      vin.vintage(false);
      filters.push(vin);
    }

    if (f.cinematic) {
      const cin = new ctx.pixi.ColorMatrixFilter();
      cin.kodachrome(false);
      filters.push(cin);
    }

    if (f.y2k) {
      const y2k = new ctx.pixi.ColorMatrixFilter();
      y2k.technicolor(false);
      y2k.saturate(0.4, true);
      filters.push(y2k);
    }

    if (f.duotone) {
      const duo = new ctx.pixi.ColorMatrixFilter();
      duo.colorTone(1, 1, f.duotone.color1, f.duotone.color2, false);
      filters.push(duo);
    }

    if (f.glow) {
      try {
        const colorInt = parseInt(f.glow.color.replace("#", ""), 16);
        filters.push(new (PixiFilters as any).GlowFilter({
          color: colorInt,
          distance: f.glow.blur,
          innerStrength: 0,
          outerStrength: f.glow.strength,
          quality: 0.5
        }));
      } catch { /* pixi-filters not available in this environment */ }
    }

    if (f.dropShadow) {
      try {
        const colorInt = parseInt(f.dropShadow.color.replace("#", ""), 16);
        filters.push(new (PixiFilters as any).DropShadowFilter({
          color: colorInt,
          alpha: f.dropShadow.alpha,
          blur: f.dropShadow.blur,
          offset: { x: f.dropShadow.offsetX, y: f.dropShadow.offsetY },
          quality: 3
        }));
      } catch { /* pixi-filters not available in this environment */ }
    }

    if (f.pixelate && f.pixelate > 0) {
      try {
        filters.push(new (PixiFilters as any).PixelateFilter(Math.max(2, f.pixelate * 20)));
      } catch { /* no-op */ }
    }

    if (f.tilt_shift) {
      try {
        filters.push(new ctx.pixi.BlurFilter({ strength: 8 }));
        const tsCm = new ctx.pixi.ColorMatrixFilter();
        tsCm.contrast(0.2, false);
        tsCm.brightness(1.05, true);
        filters.push(tsCm);
      } catch { /* no-op */ }
    }

    if (f.chromatic_aberration && f.chromatic_aberration > 0) {
      try {
        const caCm = new ctx.pixi.ColorMatrixFilter();
        caCm.saturate(0.3, false);
        caCm.contrast(0.15, true);
        filters.push(caCm);
      } catch { /* no-op */ }
    }

    if (f.noise && f.noise > 0) {
      try {
        filters.push(new (PixiFilters as any).NoiseFilter({ noise: f.noise, seed: 0.5 }));
      } catch { /* no-op */ }
    }

    if (f.sepia) {
      const sep = new ctx.pixi.ColorMatrixFilter();
      sep.sepia(false);
      filters.push(sep);
    }

    if (f.lomo) {
      const lomo = new ctx.pixi.ColorMatrixFilter();
      lomo.saturate(0.6, false);
      lomo.contrast(0.4, true);
      lomo.brightness(0.9, true);
      filters.push(lomo);
    }

    if (f.cross_process) {
      const cp = new ctx.pixi.ColorMatrixFilter();
      cp.saturate(0.8, false);
      cp.contrast(0.5, true);
      cp.hue(15, true);
      filters.push(cp);
    }

    if (f.thermal) {
      const th = new ctx.pixi.ColorMatrixFilter();
      th.greyscale(0.05, false);
      th.tint(0xff4500, false);
      filters.push(th);
    }

    if (f.night_vision) {
      const nv = new ctx.pixi.ColorMatrixFilter();
      nv.greyscale(0.1, false);
      nv.tint(0x00ff44, false);
      nv.brightness(1.3, true);
      try {
        filters.push(new (PixiFilters as any).NoiseFilter({ noise: 0.15, seed: 0.7 }));
      } catch { /* no-op */ }
      filters.push(nv);
    }

    if (f.comic) {
      const com = new ctx.pixi.ColorMatrixFilter();
      com.saturate(0.8, false);
      com.contrast(0.6, true);
      try {
        const s = 0.4;
        const sharpMatrix: [number, number, number, number, number, number, number, number, number] = [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0];
        filters.push(new (PixiFilters as any).ConvolutionFilter({ matrix: sharpMatrix, width, height }));
      } catch { /* no-op */ }
      filters.push(com);
    }

    if (f.kodachrome) {
      const koda = new ctx.pixi.ColorMatrixFilter();
      koda.kodachrome(false);
      filters.push(koda);
    }

    if (f.posterize && f.posterize > 0) {
      const post = new ctx.pixi.ColorMatrixFilter();
      post.contrast(Math.min(f.posterize, 5) * 0.15, false);
      filters.push(post);
    }

    if (filters.length > 0) {
      const sf = element.style.filters;
      const glowBleed = sf?.glow ? Math.ceil(sf.glow.blur) + 8 : 0;
      const shadowBleed = sf?.dropShadow
        ? Math.ceil(sf.dropShadow.blur + Math.max(Math.abs(sf.dropShadow.offsetX), Math.abs(sf.dropShadow.offsetY))) + 4
        : 0;
      const filterPad = Math.max(glowBleed, shadowBleed, 4);
      for (const f of filters as any[]) {
        if (f && typeof f === "object" && "padding" in f) f.padding = filterPad;
      }
      mainNode.filters = filters;
      (mainNode as any).filterArea = new ctx.pixi.Rectangle(-filterPad, -filterPad, width + filterPad * 2, height + filterPad * 2);
    }
  }

  container.addChild(mainNode);

  // Anamorphic flare overlay (horizontal streak)
  if (element.style.filters?.anamorphic_flare && (element.style.filters.anamorphic_flare ?? 0) > 0) {
    try {
      const af = element.style.filters.anamorphic_flare!;
      const streakH = Math.max(4, height * 0.03);
      const streak = new ctx.pixi.Graphics();
      streak.rect(0, height / 2 - streakH / 2, width, streakH).fill({ color: 0x88ccff, alpha: af * 0.5 });
      streak.blendMode = "screen" as any;
      const streakBlur = new ctx.pixi.BlurFilter({ strength: 12, quality: 2 });
      (streakBlur as any).blurX = 20;
      (streakBlur as any).blurY = 1;
      streak.filters = [streakBlur];
      container.addChild(streak);
    } catch { /* no-op */ }
  }

  // Lens flare overlay
  if (element.style.filters?.lens_flare) {
    try {
      const lf = element.style.filters.lens_flare!;
      const lensG = new ctx.pixi.Graphics();
      const lr = Math.min(width, height) * 0.08 * lf.intensity;
      lensG.circle(lf.x * width, lf.y * height, lr).fill({ color: 0xffffff, alpha: 0.7 * lf.intensity });
      lensG.circle(lf.x * width, lf.y * height, lr * 2).fill({ color: 0xffeeaa, alpha: 0.25 * lf.intensity });
      lensG.blendMode = "screen" as any;
      container.addChild(lensG);
    } catch { /* no-op */ }
  }

  if (element.style.filters?.scanlines && (element.style.filters.scanlines ?? 0) > 0) {
    try {
      const f = element.style.filters;
      const lineAlpha = (f.scanlines ?? 0.3) * 0.5;
      const lines = new ctx.pixi.Graphics();
      for (let y = 0; y < height; y += 3) {
        lines.rect(0, y, width, 1).fill({ color: 0x000000, alpha: lineAlpha });
      }
      container.addChild(lines);
    } catch { /* no-op */ }
  }

  if (element.style.filters?.light_leak) {
    try {
      const ll = element.style.filters.light_leak!;
      const colorInt = parseInt(ll.color.replace("#", ""), 16) || 0xffcc44;
      const leakG = new ctx.pixi.Graphics();
      const angle = (ll.angle ?? 45) * Math.PI / 180;
      const cx = Math.cos(angle) * width * 0.5 + width * 0.25;
      const cy = Math.sin(angle) * height * 0.5 + height * 0.25;
      try {
        const grad = new (ctx.pixi as any).FillGradient({ type: "radial", center: { x: cx, y: cy }, outerCenter: { x: cx, y: cy }, innerRadius: 0, outerRadius: Math.max(width, height) * 0.6 });
        grad.addColorStop(0, `rgba(${(colorInt >> 16) & 0xff},${(colorInt >> 8) & 0xff},${colorInt & 0xff},${ll.alpha})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        leakG.rect(0, 0, width, height).fill({ fill: grad } as any);
      } catch {
        leakG.rect(0, 0, width, height).fill({ color: colorInt, alpha: ll.alpha * 0.4 });
      }
      leakG.blendMode = "screen" as any;
      container.addChild(leakG);
    } catch { /* no-op */ }
  }

  if (element.style.filters?.vignette) {
    try {
      const f = element.style.filters;
      const gradient = new (ctx.pixi as any).FillGradient({ type: "radial", center: { x: width / 2, y: height / 2 }, outerCenter: { x: width / 2, y: height / 2 }, innerRadius: 0, outerRadius: Math.max(width, height) / 2 });
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${f.vignette})`);
      const vig = new ctx.pixi.Graphics();
      vig.rect(0, 0, width, height).fill({ fill: gradient } as any);
      container.addChild(vig);
    } catch { /* radial gradient not supported */ }
  }

  // Blend mode on the outer container so the whole element (sprite + overlays)
  // composites onto the scene with the chosen mode, not just sprite vs its siblings.
  if (element.style.blendMode && element.style.blendMode !== "normal") {
    container.blendMode = element.style.blendMode as any;
  }
}

export function createImageNode(ctx: RenderContext, element: ElementNode): PixiContainer {
  const container = new ctx.pixi.Container();
  const { width, height } = element.layout;
  const src = normalizeAssetSrc(element.content?.src);

  let mainNode: PixiContainer;

  if (src && !src.startsWith("placeholder://")) {
    const texture = _textureCache.get(src) ?? null;
    if (!texture) {
      if (!_textureLoading.has(src)) {
        _textureLoading.add(src);
        ctx.pixi.Assets.load(src).then((tex) => {
          _textureCache.set(src, tex);
          _textureLoading.delete(src);
          ctx.requestRedraw();
        }).catch((e) => {
          _textureLoading.delete(src);
          console.error("Asset load error", e);
        });
      }
      mainNode = createPlaceholderNode(
        ctx.pixi,
        element,
        element.style.backgroundColor ?? "#1d4ed8",
        "Loading..."
      );
    } else {
      try {
        const sprite = new ctx.pixi.Sprite(texture);

        // Crop coords are in element space (same units as layout.width/height).
        // Map to texture pixel space so default {0,0,w,h} always shows the full image.
        if (element.content?.crop) {
          const { x, y, width: cw, height: ch } = element.content.crop;
          const scaleX = (texture as any).width / width;
          const scaleY = (texture as any).height / height;
          const cropTexture = new ctx.pixi.Texture({
            source: (texture as any).source,
            frame: new ctx.pixi.Rectangle(x * scaleX, y * scaleY, cw * scaleX, ch * scaleY),
          });
          sprite.texture = cropTexture;
        }

        sprite.width = width;
        sprite.height = height;

        const radius = element.style.borderRadius ?? 0;
        if (radius > 0) {
          const mask = new ctx.pixi.Graphics().roundRect(0, 0, width, height, radius).fill({ color: 0xffffff });
          sprite.mask = mask as any;
          container.addChild(mask);
        }
        mainNode = sprite;
      } catch (e) {
        mainNode = createPlaceholderNode(
          ctx.pixi,
          element,
          element.style.backgroundColor ?? "#1d4ed8",
          "Error loading image"
        );
      }
    }
  } else {
    mainNode = createPlaceholderNode(
      ctx.pixi,
      element,
      element.style.backgroundColor ?? "#1d4ed8",
      element.content?.label ?? "Image placeholder"
    );
  }

  applyPixiFiltersAndOverlays(ctx, element, mainNode, container, width, height);

  return container;
}

// Module-level cache: src → HTMLVideoElement (persists across frames)
const _videoElementCache = new Map<string, HTMLVideoElement>();

function getOrCreateVideoElement(src: string, onReady: () => void): HTMLVideoElement {
  if (!_videoElementCache.has(src)) {
    const el = document.createElement("video");
    el.muted = true;
    el.playsInline = true;
    el.preload = "auto";
    el.src = src;
    el.addEventListener("loadedmetadata", onReady, { once: true });
    _videoElementCache.set(src, el);
  }
  return _videoElementCache.get(src)!;
}

export function createVideoNode(ctx: RenderContext, element: ElementNode): PixiContainer {
  const container = new ctx.pixi.Container();
  const { width, height } = element.layout;
  const src = normalizeAssetSrc(element.content?.src);

  if (!src || src.startsWith("placeholder://")) {
    return createPlaceholderNode(ctx.pixi, element, element.style.backgroundColor ?? "#7c3aed", element.content?.label ?? "Video");
  }

  const trimStartMs = element.content?.trimStartMs ?? 0;
  const trimEndMs = element.content?.trimEndMs ?? (element.content?.videoDurationMs ?? 0);
  const playbackRate = element.content?.playbackRate ?? 1;

  // Source-video time we need to display
  const sourceTimeMs = trimStartMs + ctx.localTimeMs * playbackRate;
  const clampedMs = Math.max(0, trimEndMs > 0 ? Math.min(sourceTimeMs, trimEndMs) : sourceTimeMs);
  const targetTimeS = clampedMs / 1000;

  // Use our own texture map to avoid PixiJS's internal URL-resolution key mismatch.
  let texture = (_textureCache.get(src) ?? null) as any;

  if (!texture) {
    if (!_textureLoading.has(src)) {
      _textureLoading.add(src);
      // PixiJS v8: data.autoPlay=false keeps video paused on load
      ctx.pixi.Assets.load({ src, data: { autoPlay: false } } as any)
        .then((tex) => {
          _textureCache.set(src, tex);
          _textureLoading.delete(src);
          // Pixi now owns the HTMLVideoElement inside the texture source.
          _videoElementCache.delete(src);
          ctx.requestRedraw();
        })
        .catch((e) => { _textureLoading.delete(src); console.error("Video load error", e); });
    }

    // While loading, keep an HTMLVideoElement alive so metadata is available
    getOrCreateVideoElement(src, ctx.requestRedraw);
    return createPlaceholderNode(ctx.pixi, element, element.style.backgroundColor ?? "#7c3aed", "Loading...");
  }

  try {
    // In PixiJS v8, texture.source is a VideoSource whose .resource is the HTMLVideoElement
    const videoEl: HTMLVideoElement | undefined = (texture.source as any)?.resource;
    if (videoEl && typeof videoEl.currentTime === "number") {
      if (Math.abs(videoEl.currentTime - targetTimeS) > 0.033) {
        videoEl.currentTime = targetTimeS;
      }
      // Force PixiJS to re-upload the decoded frame
      if (typeof (texture.source as any)?.update === "function") {
        (texture.source as any).update();
      }
    }

    // If texture has no dimensions yet (first frame not decoded), show placeholder
    if (!texture.width || !texture.height) {
      setTimeout(() => ctx.requestRedraw(), 50);
      return createPlaceholderNode(ctx.pixi, element, element.style.backgroundColor ?? "#7c3aed", "Loading...");
    }

    const sprite = new ctx.pixi.Sprite(texture);

    if (element.content?.crop) {
      const { x, y, width: cw, height: ch } = element.content.crop;
      const scaleX = texture.width / width;
      const scaleY = texture.height / height;
      const cropTexture = new ctx.pixi.Texture({
        source: texture.source,
        frame: new ctx.pixi.Rectangle(x * scaleX, y * scaleY, cw * scaleX, ch * scaleY),
      });
      sprite.texture = cropTexture;
    }

    sprite.width = width;
    sprite.height = height;

    const radius = element.style.borderRadius ?? 0;
    if (radius > 0) {
      const mask = new ctx.pixi.Graphics().roundRect(0, 0, width, height, radius).fill({ color: 0xffffff });
      sprite.mask = mask as any;
      container.addChild(mask);
    }

    applyPixiFiltersAndOverlays(ctx, element, sprite, container, width, height);
  } catch (e) {
    console.error("Video render error", e);
    return createPlaceholderNode(ctx.pixi, element, element.style.backgroundColor ?? "#7c3aed", "Error");
  }

  return container;
}

// ─── Composition renderers — dispatched via registry ─────────────────────────
import { getCompositionRenderer, compositionNodeKey } from "./compositions/registry";

function createCompositionDisplay(ctx: RenderContext, comp: CompositionNode): PixiContainer {
  const renderer = getCompositionRenderer(comp.compositionType);
  if (renderer) {
    return renderer.create(ctx, comp, _textureCache, _textureLoading, normalizeAssetSrc) as PixiContainer;
  }
  // Placeholder for unregistered composition types
  return new ctx.pixi.Graphics()
    .rect(0, 0, comp.layout.width, comp.layout.height)
    .fill({ color: 0x334155, alpha: 0.7 }) as unknown as PixiContainer;
}

function createElementDisplay(ctx: RenderContext, element: ElementNode): PixiContainer {
  const pixi = ctx.pixi;
  switch (element.type) {
    case "text":
      return createTextNode(pixi, element, ctx.localTimeMs, ctx.showAllElements);
    case "shape":
      return createShapeNode(pixi, element, ctx);
    case "image":
      return createImageNode(ctx, element);
    case "video":
      return createVideoNode(ctx, element);
    default:
      return new ctx.pixi.Graphics() as unknown as PixiContainer;
  }
}

function applyElementTransform(node: PixiContainer, element: ElementNode): void {
  node.x = element.layout.x;
  node.y = element.layout.y;
  node.alpha = element.layout.opacity;
  node.rotation = (element.layout.rotation * Math.PI) / 180;

  const scaleX = element.layout.scale * (element.layout.flipX ? -1 : 1);
  const scaleY = element.layout.scale * (element.layout.flipY ? -1 : 1);
  node.scale.set(scaleX, scaleY);

  if (element.layout.flipX) {
    node.pivot.x = element.layout.width;
  } else {
    node.pivot.x = 0;
  }
  if (element.layout.flipY) {
    node.pivot.y = element.layout.height;
  } else {
    node.pivot.y = 0;
  }

  node.zIndex = element.layout.zIndex;
  node.visible = element.layout.visible !== false;
}

function applyCompositionTransform(node: PixiContainer, comp: CompositionNode): void {
  node.x = comp.layout.x;
  node.y = comp.layout.y;
  node.alpha = comp.layout.opacity;
  node.rotation = (comp.layout.rotation * Math.PI) / 180;

  const scaleX = comp.layout.scale * (comp.layout.flipX ? -1 : 1);
  const scaleY = comp.layout.scale * (comp.layout.flipY ? -1 : 1);
  node.scale.set(scaleX, scaleY);

  if (comp.layout.flipX) {
    node.pivot.x = comp.layout.width;
  } else {
    node.pivot.x = 0;
  }
  if (comp.layout.flipY) {
    node.pivot.y = comp.layout.height;
  } else {
    node.pivot.y = 0;
  }

  node.zIndex = comp.layout.zIndex;
  node.visible = comp.layout.visible !== false;
}

export class PixiSceneRenderer {
  private app: PixiApplication | null = null;
  private root: PixiContainer | null = null;
  private pixi: PixiModule | null = null;
  private project: ProjectDocument;
  private mounted = false;
  private lastFrame: ResolvedRenderFrame | null = null;
  // Persistent viewport container — created once, lives for the renderer lifetime.
  private pViewport: PixiContainer | null = null;
  // At most two scene slots alive at once (current + incoming during a transition).
  private slots = new Map<string, SceneSlot>();
  // Ticker-based playback: callbacks return current time (ms) when playing, null otherwise.
  private _playbackTimeFn: (() => number | null) | null = null;
  private _playbackShowAllFn: (() => boolean) | null = null;
  private _tickerHandler: (() => void) | null = null;
  // Per-frame scratch — avoids allocating new Set([...]) in drawFrame every tick.
  private _neededSlots = new Set<string>();
  // Reused BlurFilter for blur_out transitions — avoids new BlurFilter() every frame.
  private _cachedBlurFilter: PixiFilter | null = null;
  private _cachedIrisMask: PixiGraphics | null = null;
  private _cachedFlashRect: PixiGraphics | null = null;
  // Tracks a PixiJS Application that has been constructed but whose init() is still
  // in progress. Allows destroy() to signal mount() to clean up after init resolves
  // rather than calling app.destroy() before _cancelResize is wired up.
  private _destroyed = false;

  constructor(project: ProjectDocument, private readonly options?: PixiSceneRendererOptions) {
    this.project = project;
  }

  async mount(container: HTMLElement): Promise<void> {
    if (this.mounted) {
      return;
    }

    const pixi = await import("pixi.js");
    _loadedPixi = pixi;

    // Use local variables during init — this.app/root/pixi stay null until init()
    // resolves so that renderFrame / destroy don't race against a partially-initialized
    // Application (app.renderer is undefined before init; app._cancelResize is undefined too).
    const app = new pixi.Application();
    const root = new pixi.Container();
    root.sortableChildren = true;
    void app; // pending init — destroy() checks this._destroyed instead

    const bg = this.options?.backgroundColor;
    await app.init({
      resizeTo: container,
      ...(bg === "transparent" ? { backgroundAlpha: 0 } : { background: bg ?? "#ffffff" }),
      antialias: false
    });

    // (pending app cleanup handled via _destroyed flag)

    // If destroy() was called while init() was in flight, clean up now that
    // init() has finished (so _cancelResize etc. are safely set up).
    if (this._destroyed) {
      try { (app as any).destroy(true, { children: true }); } catch { /* no-op */ }
      return;
    }

    // Safe to expose now — renderer is fully initialised.
    this.pixi = pixi;
    this.app = app as unknown as PixiApplication;
    this.root = root;

    container.replaceChildren(this.app.canvas);
    this.app.stage.addChild(this.root);

    // Wait for all web fonts (Google Fonts etc.) to finish loading before
    // the first frame so pixi.Text canvas rendering uses the correct typefaces.
    // pixi.Text uses the browser canvas font registry — no Assets.load needed for fonts.
    await document.fonts.ready;

    // Guard: destroy() may have been called during the font-loading awaits above.
    if (this._destroyed || !this.app) return;

    this.mounted = true;

    // Hook into PixiJS's own ticker so the scene-graph update runs at NORMAL priority
    // (before the LOW-priority GPU render). This eliminates the 1-frame lag caused by
    // a separate requestAnimationFrame loop competing with PixiJS's internal RAF.
    this._tickerHandler = () => this._onTick();
    this.app.ticker.add(this._tickerHandler);
  }

  setProject(project: ProjectDocument): void {
    this.project = project;
  }

  /**
   * Register callbacks that the PixiJS Ticker calls every frame *before* the GPU render.
   * timeFn returns the current playback time in ms, or null when not playing.
   * This guarantees scene-graph updates and GPU renders happen in the same frame — no lag.
   */
  setPlaybackProvider(
    timeFn: (() => number | null) | null,
    showAllFn?: () => boolean
  ): void {
    this._playbackTimeFn = timeFn;
    this._playbackShowAllFn = showAllFn ?? null;
  }

  private _onTick(): void {
    if (!this._playbackTimeFn || !this.app || !this.root || !this.pixi) return;
    const t = this._playbackTimeFn();
    if (t === null) return;
    const showAll = this._playbackShowAllFn?.() ?? false;
    const frame = resolveRenderFrame(this.project, { timeMs: t, showAllElements: showAll });
    this.lastFrame = frame;
    this.drawFrame(frame);
  }

  renderFrame(input: RenderFrameInput): ResolvedRenderFrame {
    const frame = resolveRenderFrame(this.project, input);
    this.lastFrame = frame;
    if (this.app && this.root && this.pixi) {
      this.drawFrame(frame);
    }
    return frame;
  }

  destroy(): void {
    this._destroyed = true;
    // If mount() is mid-init(), _pendingApp holds the Application. We can't safely
    // call destroy() on it yet (app._cancelResize isn't wired until init resolves).
    // Clear the reference — mount() will destroy the app after init() finishes.
    // (pending app cleanup handled via _destroyed flag)

    if (this._tickerHandler && this.app) {
      this.app.ticker.remove(this._tickerHandler);
      this._tickerHandler = null;
    }
    this._playbackTimeFn = null;
    try { (this._cachedBlurFilter as any)?.destroy?.(); } catch { /* no-op */ }
    this._cachedBlurFilter = null;
    try { (this._cachedIrisMask as any)?.destroy?.(); } catch { /* no-op */ }
    this._cachedIrisMask = null;
    try { (this._cachedFlashRect as any)?.destroy?.(); } catch { /* no-op */ }
    this._cachedFlashRect = null;
    this.slots.clear();
    this.pViewport = null;
    try { (this.app as any)?.destroy(true, { children: true }); } catch { /* no-op */ }
    this.app = null;
    this.root = null;
    this.pixi = null;
    this.mounted = false;
  }

  async captureFrame(timeMs: number, mimeType: "image/png" | "image/jpeg" | "image/webp" = "image/png", quality?: number): Promise<Blob> {
    if (!this.app || !this.root || !this.pixi || !this.mounted) {
      throw new Error("Renderer not mounted — call mount() before capturing frames.");
    }
    this.renderFrame({ timeMs });
    // extract.canvas renders the stage to an isolated surface, bypassing
    // WebGL preserveDrawingBuffer limitations that affect canvas.toBlob directly.
    const extracted = (this.app.renderer as any).extract.canvas({ target: this.app.stage }) as HTMLCanvasElement;
    return new Promise<Blob>((resolve, reject) => {
      extracted.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error(`captureFrame failed at timeMs=${timeMs}`)),
        mimeType,
        quality
      );
    });
  }

  private applyTransitionToContainers(
    outgoing: PixiContainer,
    incoming: PixiContainer,
    type: TransitionType,
    progress: number,
    vw: number,
    vh: number
  ): void {
    switch (type) {
      case "fade": {
        const outA = 1 - progress;
        const inA = progress;
        outgoing.alpha = outA;
        outgoing.visible = outA > 0.01;
        incoming.alpha = inA;
        incoming.visible = inA > 0.01;
        break;
      }
      case "slide_left":
        outgoing.x = -vw * progress;
        outgoing.visible = true;
        incoming.x = vw * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      case "slide_right":
        outgoing.x = vw * progress;
        outgoing.visible = true;
        incoming.x = -vw * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      case "slide_up":
        outgoing.y = -vh * progress;
        outgoing.visible = true;
        incoming.y = vh * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      case "slide_down":
        outgoing.y = vh * progress;
        outgoing.visible = true;
        incoming.y = -vh * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      case "zoom_in": {
        outgoing.scale.set(1 + 0.15 * progress);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.set(vw / 2, vh / 2);
        const outA = 1 - progress;
        outgoing.alpha = outA;
        outgoing.visible = outA > 0.01;
        const inA = progress;
        incoming.alpha = inA;
        incoming.visible = inA > 0.01;
        break;
      }
      case "zoom_out": {
        outgoing.scale.set(1 - 0.15 * progress);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.set(vw / 2, vh / 2);
        const outA = 1 - progress;
        outgoing.alpha = outA;
        outgoing.visible = outA > 0.01;
        const inA = progress;
        incoming.alpha = inA;
        incoming.visible = inA > 0.01;
        break;
      }
      case "blur_out": {
        // Reuse a single cached BlurFilter — never allocate a new one per frame.
        try {
          if (!this._cachedBlurFilter) {
            this._cachedBlurFilter = new this.pixi!.BlurFilter({ strength: 1 }) as unknown as PixiFilter;
          }
          (this._cachedBlurFilter as any).strength = progress * 24;
          outgoing.filters = [this._cachedBlurFilter] as any;
        } catch { /* no-op */ }
        const outA = 1 - progress;
        outgoing.alpha = outA;
        outgoing.visible = outA > 0.01;
        const inA = progress;
        incoming.alpha = inA;
        incoming.visible = inA > 0.01;
        break;
      }
      case "whip_pan_left":
      case "whip_pan_right": {
        // Motion-blur slide: outgoing races off-screen, incoming arrives from off-screen.
        // Blur peaks at the midpoint.
        const dir = type === "whip_pan_left" ? -1 : 1;
        const blurAmt = Math.sin(progress * Math.PI) * 36;
        try {
          if (!this._cachedBlurFilter) {
            this._cachedBlurFilter = new this.pixi!.BlurFilter({ strength: 1 }) as unknown as PixiFilter;
          }
          // Apply blur to both containers; use a shared instance by alternating.
          (this._cachedBlurFilter as any).strength = blurAmt;
          outgoing.filters = [this._cachedBlurFilter] as any;
        } catch { /* no-op */ }
        outgoing.x = dir * vw * progress;
        outgoing.visible = true;
        incoming.x = dir * -vw * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      }
      case "flash_cut": {
        // White flash: outgoing fades out fast, incoming arrives through a bright flash at midpoint.
        // The flash overlay is simulated by blowing out incoming alpha past 1 when progress < 0.5,
        // then settling. Since Pixi alpha clamps to [0,1] we drive it as: in first half push alpha
        // high (clamped), in second half normal. Outgoing cuts immediately.
        outgoing.alpha = progress < 0.3 ? 1 - (progress / 0.3) : 0;
        outgoing.visible = progress < 0.3;
        if (progress < 0.5) {
          incoming.alpha = progress / 0.5; // quick ramp up on flash
        } else {
          incoming.alpha = 1;
        }
        incoming.visible = true;
        break;
      }
      case "spin_in": {
        // Outgoing rotates away (up to 90°), incoming rotates in from -90°.
        outgoing.rotation = progress * (Math.PI / 2);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.set(vw / 2, vh / 2);
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.rotation = (1 - progress) * -(Math.PI / 2);
        incoming.pivot.set(vw / 2, vh / 2);
        incoming.position.set(vw / 2, vh / 2);
        incoming.alpha = progress;
        incoming.visible = true;
        break;
      }
      case "glitch_cut": {
        const jitter = Math.sin(progress * 47) * (1 - progress) * 18;
        const jitterY = Math.sin(progress * 31 + 0.9) * (1 - progress) * 8;
        outgoing.x = jitter;
        outgoing.y = jitterY;
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.95;
        incoming.x = -jitter * 0.4;
        incoming.y = -jitterY * 0.4;
        incoming.alpha = progress;
        incoming.visible = true;
        break;
      }
      case "cross_zoom": {
        // Outgoing zooms out while incoming zooms in from small
        outgoing.scale.set(1 - 0.3 * progress);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.set(vw / 2, vh / 2);
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.scale.set(0.7 + 0.3 * progress);
        incoming.pivot.set(vw / 2, vh / 2);
        incoming.position.set(vw / 2, vh / 2);
        incoming.alpha = progress;
        incoming.visible = true;
        break;
      }
      case "iris_in":
      case "iris_out": {
        // Circular mask reveal: incoming grows from center, outgoing shrinks
        const isIn = type === "iris_in";
        try {
          if (!this._cachedIrisMask) {
            this._cachedIrisMask = new this.pixi!.Graphics() as unknown as PixiGraphics;
          }
          const mask = this._cachedIrisMask as any;
          mask.clear();
          const maxR = Math.sqrt(vw * vw + vh * vh) / 2;
          const r = isIn ? progress * maxR : (1 - progress) * maxR;
          mask.circle(vw / 2, vh / 2, r).fill({ color: 0xffffff });
          incoming.mask = mask;
          (incoming as any).parent?.addChild(mask);
        } catch { /* no-op */ }
        outgoing.alpha = isIn ? 1 - progress : progress;
        outgoing.visible = true;
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      }
      case "split_h": {
        // Outgoing collapses vertically (scaleY → 0), incoming expands from center
        outgoing.scale.set(1, 1 - progress);
        outgoing.pivot.set(0, vh / 2);
        outgoing.position.set(0, vh / 2);
        outgoing.alpha = 1;
        outgoing.visible = progress < 0.99;
        incoming.scale.set(1, progress);
        incoming.pivot.set(0, vh / 2);
        incoming.position.set(0, vh / 2);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      }
      case "split_v": {
        // Outgoing collapses horizontally (scaleX → 0), incoming expands
        outgoing.scale.set(1 - progress, 1);
        outgoing.pivot.set(vw / 2, 0);
        outgoing.position.set(vw / 2, 0);
        outgoing.alpha = 1;
        outgoing.visible = progress < 0.99;
        incoming.scale.set(progress, 1);
        incoming.pivot.set(vw / 2, 0);
        incoming.position.set(vw / 2, 0);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      }
      case "diagonal_wipe": {
        // Both slide diagonally; hard edge feel via position offset
        outgoing.x = -vw * progress * 0.7;
        outgoing.y = -vh * progress * 0.7;
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.x = vw * (1 - progress) * 0.7;
        incoming.y = vh * (1 - progress) * 0.7;
        incoming.alpha = progress;
        incoming.visible = true;
        break;
      }
      case "push_left": {
        // Both scenes move together left: outgoing exits left, incoming enters from right
        outgoing.x = -vw * progress;
        outgoing.visible = true;
        incoming.x = vw * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      }
      case "push_right": {
        outgoing.x = vw * progress;
        outgoing.visible = true;
        incoming.x = -vw * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        break;
      }
      case "dissolve": {
        // Dither-style fade: alternate pixel visibility based on progress threshold
        // Approximated with stepped alpha cross-fade + subtle scale noise
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.alpha = progress;
        incoming.visible = true;
        // Add slight scale pulse at midpoint for depth
        const midBulge = Math.sin(progress * Math.PI) * 0.02;
        incoming.scale.set(1 + midBulge);
        incoming.pivot.set(vw / 2, vh / 2);
        incoming.position.set(vw / 2, vh / 2);
        break;
      }
      case "color_flash": {
        // Brand-color flash between scenes (white by default)
        if (progress < 0.4) {
          // Outgoing fades to white
          outgoing.alpha = 1 - progress / 0.4;
          outgoing.visible = true;
          incoming.alpha = 0;
          incoming.visible = false;
        } else {
          // Incoming fades in from white
          outgoing.alpha = 0;
          outgoing.visible = false;
          incoming.alpha = (progress - 0.4) / 0.6;
          incoming.visible = true;
        }
        // Overlay a white flash rect
        try {
          if (!this._cachedFlashRect) {
            this._cachedFlashRect = new this.pixi!.Graphics() as unknown as PixiGraphics;
          }
          const flash = this._cachedFlashRect as any;
          flash.clear();
          const flashAlpha = progress < 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;
          flash.rect(0, 0, vw, vh).fill({ color: 0xffffff, alpha: flashAlpha });
          (outgoing as any).parent?.addChildAt(flash, (outgoing as any).parent.children.length);
        } catch { /* no-op */ }
        break;
      }
      case "page_flip": {
        // Page-flip: outgoing scales X from 1→0, incoming scales X from 0→1
        const half = progress < 0.5;
        if (half) {
          const p = progress / 0.5;
          outgoing.scale.x = 1 - p;
          outgoing.x = vw * 0.5 * p;
          outgoing.visible = true;
          incoming.alpha = 0;
          incoming.visible = false;
        } else {
          const p = (progress - 0.5) / 0.5;
          outgoing.visible = false;
          incoming.scale.x = p;
          incoming.x = vw * 0.5 * (1 - p);
          incoming.alpha = 1;
          incoming.visible = true;
        }
        break;
      }
      case "cube_left":
      case "cube_right": {
        const dir = type === "cube_right" ? 1 : -1;
        // Outgoing slides out; incoming slides in from opposite side
        outgoing.x = -dir * vw * progress;
        outgoing.visible = true;
        incoming.x = dir * vw * (1 - progress);
        incoming.alpha = 1;
        incoming.visible = true;
        // Slight scale to simulate perspective
        const pScale = 1 - Math.sin(progress * Math.PI) * 0.08;
        outgoing.scale.set(pScale);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.x += dir < 0 ? vw / 2 * (1 - pScale) : vw / 2 * (1 + pScale - 1);
        incoming.scale.set(pScale);
        incoming.pivot.set(vw / 2, vh / 2);
        break;
      }
      case "ripple": {
        // Ripple: outgoing alpha out; incoming scales from 0.85→1 with fade
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.alpha = progress;
        incoming.visible = true;
        const rippleScale = 0.85 + 0.15 * progress;
        incoming.scale.set(rippleScale);
        incoming.pivot.set(vw / 2, vh / 2);
        incoming.position.set(vw / 2, vh / 2);
        break;
      }
      case "pixelate_wipe": {
        // Pixelate outgoing (simulated via scale), crossfade midpoint
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.alpha = progress;
        incoming.visible = true;
        try {
          if (outgoing.filters && outgoing.filters.length === 0) {
            outgoing.filters = [new (PixiFilters as any).PixelateFilter(Math.max(1, progress * 30))];
          }
        } catch { /* no-op */ }
        break;
      }
      case "swirl_wipe": {
        // Swirl: simple scale+rotate crossfade
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        outgoing.rotation = progress * 0.3;
        outgoing.scale.set(1 + progress * 0.1);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.set(vw / 2, vh / 2);
        incoming.alpha = progress;
        incoming.visible = true;
        incoming.rotation = (1 - progress) * -0.3;
        incoming.scale.set(0.9 + progress * 0.1);
        incoming.pivot.set(vw / 2, vh / 2);
        incoming.position.set(vw / 2, vh / 2);
        break;
      }
      case "clock_wipe": {
        // Clock wipe approximated as a radial fade crossfade
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        incoming.alpha = progress;
        incoming.visible = true;
        break;
      }
      case "channel_split": {
        // RGB channel split: shift outgoing channels, fade in incoming
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        const splitAmt = progress * vw * 0.04;
        outgoing.x = Math.sin(progress * Math.PI) * splitAmt;
        incoming.alpha = progress;
        incoming.visible = true;
        break;
      }
      case "burn_in": {
        // Burn-in: outgoing brightness fades to black then incoming emerges
        if (progress < 0.5) {
          const p = progress / 0.5;
          outgoing.alpha = 1 - p;
          outgoing.visible = true;
          incoming.alpha = 0;
          incoming.visible = false;
          try {
            const burnCm = new this.pixi!.ColorMatrixFilter();
            burnCm.brightness(1 - p * 0.8, false);
            outgoing.filters = [burnCm];
          } catch { /* no-op */ }
        } else {
          const p = (progress - 0.5) / 0.5;
          outgoing.visible = false;
          incoming.alpha = p;
          incoming.visible = true;
          try {
            const burnCmIn = new this.pixi!.ColorMatrixFilter();
            burnCmIn.brightness(p, false);
            incoming.filters = [burnCmIn];
          } catch { /* no-op */ }
        }
        break;
      }
      case "glitch_blocks": {
        // Glitch blocks: fast crossfade with horizontal jitter
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        outgoing.x = Math.sin(progress * 47) * 8 * (1 - progress);
        incoming.alpha = progress;
        incoming.visible = true;
        incoming.x = Math.sin(progress * 31 + 1.2) * 6 * progress * (1 - progress);
        break;
      }
      case "lens_zoom": {
        // Lens zoom: outgoing zooms toward camera (scale up + fade), incoming emerges from center
        outgoing.alpha = 1 - progress;
        outgoing.visible = progress < 0.99;
        const lzOutScale = 1 + progress * 0.15;
        outgoing.scale.set(lzOutScale);
        outgoing.pivot.set(vw / 2, vh / 2);
        outgoing.position.set(vw / 2, vh / 2);
        incoming.alpha = progress;
        incoming.visible = true;
        const lzInScale = 1.15 - progress * 0.15;
        incoming.scale.set(lzInScale);
        incoming.pivot.set(vw / 2, vh / 2);
        incoming.position.set(vw / 2, vh / 2);
        break;
      }
    }
  }

  // ── Persistent-slot helpers ───────────────────────────────────────────────

  /** Returns a content key that changes only when the element's visual should be rebuilt. */
  private nodeKey(element: ElementNode): string {
    const { id, type, content: c, style: s, layout: l } = element;
    const dim = `${l.width}:${l.height}`;
    switch (type) {
      case "text": {
        // Char-animated text: stable key (per style/content), in-place update handles per-frame changes.
        if (hasCharLevelAnimations(element)) {
          const rt2 = c?.richText;
          const rtKey2 = rt2 ? `${rt2.length}:${rt2[0]?.text ?? ""}` : "";
          return `${id}:ta:${dim}:${c?.text ?? ""}:${rtKey2}:${s.fontFamily}:${s.fontSize}:${s.fontWeight}:${s.color}`;
        }
        // Avoid JSON.stringify — build lightweight keys from scalar fields only.
        const rt = c?.richText;
        const rtKey = rt ? `${rt.length}:${rt[0]?.text ?? ""}:${rt[rt.length - 1]?.text ?? ""}` : "";
        const grad = s.textGradient;
        const gradKey = grad
          ? `${grad.type}:${grad.angle}:${grad.stops.length}:${grad.stops[0]?.color ?? ""}:${grad.stops[grad.stops.length - 1]?.color ?? ""}`
          : "";
        const stroke = s.textStroke;
        const strokeKey = stroke ? `${stroke.color}:${stroke.width}` : "";
        const shadow = s.textShadow;
        const shadowKey = shadow ? `${shadow.color}:${shadow.offsetX}:${shadow.offsetY}:${shadow.blur}` : "";
        const tc = c?.textCurve;
        const tcKey = tc ? `${tc.type}:${tc.radius ?? ""}:${tc.amplitude ?? ""}:${tc.frequency ?? ""}:${tc.reversed ?? ""}:${tc.startAngle ?? ""}` : "";
        return `${id}:t:${dim}:${c?.text ?? ""}:${rtKey}:${s.fontFamily}:${s.fontSize}:${s.fontWeight}:${s.fontStyle}:${s.color}:${s.letterSpacing}:${s.lineHeight}:${s.textAlign}:${s.textTransform}:${gradKey}:${strokeKey}:${shadowKey}:${s.backgroundColor}:${tcKey}`;
      }
      case "shape": {
        const sf = s.filters;
        const shapeGlowKey = sf?.glow ? `${sf.glow.color}:${sf.glow.blur}:${sf.glow.strength}` : "";
        const shapeShadowKey = sf?.dropShadow ? `${sf.dropShadow.color}:${sf.dropShadow.blur}:${sf.dropShadow.alpha}:${sf.dropShadow.offsetX}:${sf.dropShadow.offsetY}` : "";
        const fillImgLoaded = c?.fillImageSrc && _textureCache.has(normalizeAssetSrc(c.fillImageSrc) ?? "") ? "1" : "0";
        return `${id}:sh:${dim}:${c?.shape}:${s.backgroundColor}:${s.fillPattern}:${s.fillColor2}:${s.borderColor}:${s.borderWidth}:${s.borderRadius}:${c?.fillImageSrc ?? ""}:${fillImgLoaded}:${shapeGlowKey}:${shapeShadowKey}`;
      }
      case "image": {
        // Avoid JSON.stringify on crop and filters.
        const crop = c?.crop;
        const cropKey = crop ? `${crop.x}:${crop.y}:${crop.width}:${crop.height}` : "";
        const f = s.filters;
        const filterKey = f
          ? `${f.brightness ?? ""}:${f.contrast ?? ""}:${f.saturation ?? ""}:${f.blur ?? ""}:${f.sharpen ?? ""}:${f.monochrome ?? ""}:${f.vignette ?? ""}:${f.hdr ?? ""}:${f.vintage ?? ""}:${f.cinematic ?? ""}:${f.y2k ?? ""}:${f.duotone ? `${f.duotone.color1}:${f.duotone.color2}` : ""}:${f.glow ? `${f.glow.color}:${f.glow.blur}:${f.glow.strength}` : ""}:${f.dropShadow ? `${f.dropShadow.color}:${f.dropShadow.blur}:${f.dropShadow.alpha}:${f.dropShadow.offsetX}:${f.dropShadow.offsetY}` : ""}`
          : "";
        // Include whether the texture is cached so the key changes when the texture loads,
        // forcing a node rebuild from "Loading…" placeholder to real sprite.
        const texLoaded = _textureCache.has(normalizeAssetSrc(c?.src) ?? "") ? "1" : "0";
        return `${id}:img:${dim}:${c?.src}:${cropKey}:${s.borderRadius}:${filterKey}:${s.blendMode}:${c?.frame}:${texLoaded}`;
      }
      case "video":
        // Video seeks in-place; rebuild only if src or dimensions change.
        return `${id}:vid:${dim}:${c?.src}`;
      default:
        return `${id}:${type}:${dim}`;
    }
  }

  private getOrCreateSlot(key: string): SceneSlot {
    if (!this.slots.has(key)) {
      const pixi = this.pixi!;
      const outer = new pixi.Container();
      const bgLayer = new pixi.Container();
      const elemLayer = new pixi.Container();
      elemLayer.sortableChildren = true;
      outer.addChild(bgLayer, elemLayer);
      this.slots.set(key, { outer, bgLayer, elemLayer, bgKey: null, bgNode: null, nodes: new Map(), compositionNodes: new Map(), _inFrameSet: new Set(), inViewport: false });
    }
    return this.slots.get(key)!;
  }

  private buildBgNode(frame: ResolvedRenderFrame, vw: number, vh: number): PixiContainer {
    const pixi = this.pixi!;
    const wrap = new pixi.Container();
    const opacity = frame.background?.opacity ?? 1;
    const color2 = frame.background?.color2;

    if (color2) {
      try {
        const baseAngle = frame.background?.gradientAngle ?? 180;
        const speed = frame.background?.gradientAngleSpeed ?? 0;
        const angle = baseAngle + (frame.localTimeMs / 1000) * speed;
        const rad = (angle * Math.PI) / 180;
        const cx = vw / 2, cy = vh / 2;
        const len = Math.sqrt(vw * vw + vh * vh) / 2;
        const grad = new (pixi as any).FillGradient({
          start: { x: cx - Math.sin(rad) * len, y: cy - Math.cos(rad) * len },
          end:   { x: cx + Math.sin(rad) * len, y: cy + Math.cos(rad) * len },
          textureSpace: "global",
        });
        grad.addColorStop(0, frame.backgroundColor);
        grad.addColorStop(1, color2);
        const g = new pixi.Graphics().rect(0, 0, vw, vh).fill({ fill: grad } as any);
        g.alpha = opacity;
        wrap.addChild(g);
      } catch {
        const g = new pixi.Graphics().rect(0, 0, vw, vh).fill({ color: frame.backgroundColor });
        g.alpha = opacity;
        wrap.addChild(g);
      }
    } else {
      const g = new pixi.Graphics().rect(0, 0, vw, vh).fill({ color: frame.backgroundColor });
      g.alpha = opacity;
      wrap.addChild(g);
    }

    const imgSrc = normalizeAssetSrc(frame.background?.imageSrc);
    if (imgSrc) {
      const tex = _textureCache.get(imgSrc) ?? null;
      if (!tex) {
        if (!_textureLoading.has(imgSrc)) {
          _textureLoading.add(imgSrc);
          pixi.Assets.load(imgSrc).then((t) => {
            _textureCache.set(imgSrc, t);
            _textureLoading.delete(imgSrc);
            if (this.lastFrame) this.drawFrame(this.lastFrame);
          }).catch(() => { _textureLoading.delete(imgSrc); });
        }
      } else {
        try {
          const sp = new pixi.Sprite(tex);
          const tw2 = (tex as any).width as number, th2 = (tex as any).height as number;
          const fit = frame.background?.imageFit ?? "stretch";
          if (fit === "stretch") { sp.width = vw; sp.height = vh; }
          else if (fit === "cover") { const sc = Math.max(vw / tw2, vh / th2); sp.width = tw2 * sc; sp.height = th2 * sc; sp.x = (vw - sp.width) / 2; sp.y = (vh - sp.height) / 2; }
          else if (fit === "contain") { const sc = Math.min(vw / tw2, vh / th2); sp.width = tw2 * sc; sp.height = th2 * sc; sp.x = (vw - sp.width) / 2; sp.y = (vh - sp.height) / 2; }
          else if (fit === "custom") { const sc = frame.background?.imageScale ?? Math.max(vw / tw2, vh / th2); sp.width = tw2 * sc; sp.height = th2 * sc; sp.x = frame.background?.imageOffsetX ?? 0; sp.y = frame.background?.imageOffsetY ?? 0; }
          sp.alpha = opacity;
          const cm = new pixi.Graphics().rect(0, 0, vw, vh).fill({ color: 0xffffff });
          sp.mask = cm as any;
          wrap.addChild(cm, sp);
        } catch { /* skip */ }
      }
    }
    return wrap;
  }

  private updateSlot(slot: SceneSlot, frame: ResolvedRenderFrame): void {
    const pixi = this.pixi!;
    const vw = frame.viewport.width;
    const vh = frame.viewport.height;

    // Background: rebuild only when the bg descriptor changes.
    // For animated gradients (gradientAngleSpeed set), include localTimeMs so we rebuild every frame.
    const bgImgLoaded = _textureCache.has(normalizeAssetSrc(frame.background?.imageSrc) ?? "") ? "1" : "0";
    // Only animate the gradient key when no image is present (image covers the gradient anyway).
    const bgAnimated = (frame.background?.gradientAngleSpeed && !frame.background?.imageSrc) ? `|t:${frame.localTimeMs}` : "";
    const newBgKey = `${frame.backgroundColor}|${frame.background?.color2 ?? ""}|${frame.background?.gradientAngle ?? 0}|${frame.background?.imageSrc ?? ""}|${frame.background?.imageFit ?? ""}|${frame.background?.imageScale ?? 0}|${frame.background?.opacity ?? 1}|${bgImgLoaded}${bgAnimated}`;
    if (newBgKey !== slot.bgKey) {
      if (slot.bgNode) { slot.bgLayer.removeChild(slot.bgNode); safeDestroy(slot.bgNode); }
      slot.bgNode = this.buildBgNode(frame, vw, vh);
      slot.bgLayer.addChild(slot.bgNode);
      slot.bgKey = newBgKey;
    }

    const ctx: RenderContext = {
      pixi,
      localTimeMs: frame.localTimeMs,
      showAllElements: frame.showAllElements,
      requestRedraw: () => { if (this.lastFrame) this.drawFrame(this.lastFrame); },
    };

    // Reuse the slot's scratch Set — no allocation.
    const inFrame = slot._inFrameSet;
    inFrame.clear();
    for (const e of frame.elements) inFrame.add(e.id);

    // Evict elements that left the visible set.
    for (const [eid, cached] of slot.nodes) {
      if (!inFrame.has(eid)) {
        slot.elemLayer.removeChild(cached.node);
        safeDestroy(cached.node);
        slot.nodes.delete(eid);
      }
    }

    // Disable auto-sort during node updates; re-enable once after all addChild calls
    // to avoid O(n log n) sort on every addChild.
    slot.elemLayer.sortableChildren = false;
    let needsSort = false;

    // Update or create each element node.
    for (const element of frame.elements) {
      const newKey = this.nodeKey(element);
      const cached = slot.nodes.get(element.id);
      // An element is "static" this frame if it has no animations whose window covers localTimeMs.
      const localMs = frame.localTimeMs;
      const elemBase = element.startMs ?? 0;
      const isStatic = element.type !== "video" && (element.animations ?? []).every((a) => {
        const aStart = elemBase + a.startMs;
        const aEnd = aStart + a.durationMs;
        return localMs < aStart || localMs > aEnd;
      });
      // Never cache filtered image/shape elements — PixiJS v8 can mis-size the cache texture
      // when the element is inside a masked+scaled container, cutting off parts of the element.
      const hasFilters = (element.type === "image" || element.type === "shape") &&
        element.style.filters && Object.values(element.style.filters).some(Boolean);
      const canCache = isStatic && !hasFilters;

      if (cached) {
        if (cached.key !== newKey) {
          // Visual content changed — rebuild this single node.
          slot.elemLayer.removeChild(cached.node);
          safeDestroy(cached.node);
          const node = createElementDisplay(ctx, element);
          applyElementTransform(node, element);
          if (canCache) (node as any).cacheAsTexture?.(true);
          slot.elemLayer.addChild(node);
          slot.nodes.set(element.id, { node, key: newKey });
          needsSort = true;
        } else {
          // Visual unchanged — just update animated transform properties.
          applyElementTransform(cached.node, element);
          // Ensure cache state matches current static status.
          if (canCache) {
            (cached.node as any).cacheAsTexture?.(true);
          } else {
            (cached.node as any).cacheAsTexture?.(false);
          }
        }
      } else {
        const node = createElementDisplay(ctx, element);
        applyElementTransform(node, element);
        if (canCache) (node as any).cacheAsTexture?.(true);
        slot.elemLayer.addChild(node);
        slot.nodes.set(element.id, { node, key: newKey });
        needsSort = true;
      }
    }

    if (needsSort) {
      slot.elemLayer.sortableChildren = true;
    }

    // Char-animation in-place update: instead of rebuilding the full char graph each frame,
    // update only x/y/alpha/scale on each existing pixi.Text child.
    for (const element of frame.elements) {
      if (element.type !== "text" || !hasCharLevelAnimations(element)) continue;
      const cached = slot.nodes.get(element.id);
      if (!cached) continue;
      const charStates = resolveCharAnimations(element, frame.localTimeMs, frame.showAllElements);
      if (!charStates) continue;
      // Find the _isCharContainer among the element node's direct children.
      const charContainer = (cached.node as any).children?.find?.((c: any) => (c as any)._isCharContainer);
      if (!charContainer) continue;
      const charNodes: any[] = charContainer.children;
      for (let i = 0; i < charNodes.length && i < charStates.length; i++) {
        const s = charStates[i];
        const n = charNodes[i];
        if (!n || !s) continue;
        n.alpha = Math.max(0, Math.min(1, s.opacity));
        n.scale.set(s.scaleX, s.scaleY);
        n.rotation = s.rotation;
        // Apply charOverride if present (scramble / slot_machine animations).
        if ((s as any).charOverride !== undefined && n.text !== (s as any).charOverride) {
          n.text = (s as any).charOverride;
        }
        // Apply colorOverride if present (char_rainbow / karaoke animations).
        if ((s as any).colorOverride !== undefined) {
          try { n.style.fill = (s as any).colorOverride; } catch { /* no-op */ }
        }
        // Apply per-character blur if present (char_blur_in animation).
        const charBlur = (s as any).blur;
        if (charBlur !== undefined && charBlur > 0) {
          try {
            if (!n._blurFilter) {
              n._blurFilter = new pixi.BlurFilter({ strength: charBlur });
              n.filters = [n._blurFilter];
            } else {
              n._blurFilter.strength = charBlur;
            }
          } catch { /* no-op */ }
        } else if (n._blurFilter) {
          n.filters = [];
          n._blurFilter = undefined;
        }
        // Offsets are relative to base position stored on the node.
        if (n._baseX !== undefined) n.x = n._baseX + s.offsetX;
        if (n._baseY !== undefined) n.y = n._baseY + s.offsetY;
      }
    }

    // highlight_sweep: draw/update an animated highlight bar over text elements.
    for (const element of frame.elements) {
      if (element.type !== "text") continue;
      const sweepAnim = (element.animations ?? []).find((a) => a.type === "highlight_sweep");
      if (!sweepAnim) continue;
      const cached = slot.nodes.get(element.id);
      if (!cached) continue;
      const sweepKey = `_highlightSweep_${element.id}`;
      const elStart = (element.startMs ?? 0) + sweepAnim.startMs;
      const elEnd = elStart + sweepAnim.durationMs;
      const sweepP = Math.max(0, Math.min(1, (frame.localTimeMs - elStart) / Math.max(1, elEnd - elStart)));
      const w = element.layout.width;
      const h = element.layout.height;
      let sweepNode: any = (slot.elemLayer as any)[sweepKey];
      if (sweepP > 0 && sweepP < 1) {
        if (!sweepNode) {
          try {
            sweepNode = new pixi.Graphics();
            sweepNode._isHighlightSweep = true;
            slot.elemLayer.addChild(sweepNode);
            (slot.elemLayer as any)[sweepKey] = sweepNode;
          } catch { /* no-op */ }
        }
        if (sweepNode) {
          try {
            sweepNode.clear();
            const colorHex = sweepAnim.color ?? "#FFD700";
            const colorInt = parseInt(colorHex.replace("#", ""), 16) || 0xffd700;
            // Position the sweep bar at the element's location
            sweepNode.x = element.layout.x;
            sweepNode.y = element.layout.y;
            sweepNode.zIndex = element.layout.zIndex + 0.5;
            // Bar sweeps from left to right across element width
            const barW = w * 0.12;
            const barX = sweepP * (w + barW) - barW;
            sweepNode.rect(Math.max(0, barX), 0, Math.min(barW, w - Math.max(0, barX)), h)
              .fill({ color: colorInt, alpha: 0.45 });
          } catch { /* no-op */ }
        }
      } else if (sweepNode) {
        try { slot.elemLayer.removeChild(sweepNode); sweepNode.destroy(); } catch { /* no-op */ }
        (slot.elemLayer as any)[sweepKey] = undefined;
      }
    }

    // Animated effects pass: apply AnimatedEffects (blur, chromatic, brightness, grain, vignette).
    const ANIM_EFFECT_TYPES = new Set([
      "blur_in", "blur_out", "glitch_in",
      "chromatic_pulse", "brightness_flash", "grain_surge",
      "vignette_close", "vignette_open",
    ]);
    for (const element of frame.elements) {
      const hasEffectAnim = (element.animations ?? []).some((a) => ANIM_EFFECT_TYPES.has(a.type));
      if (!hasEffectAnim) continue;
      const cached = slot.nodes.get(element.id);
      if (!cached) continue;
      const fx = resolveAnimatedEffects(element, frame.localTimeMs);
      const node = cached.node;
      const newFilters: any[] = (node.filters as any[] ?? []).filter(
        (f: any) => !f._isAnimEffect
      );

      if (fx.blur > 0.5) {
        let bf = (node as any)._animBlurFilter;
        if (!bf) { bf = new pixi.BlurFilter({ strength: fx.blur }); bf._isAnimEffect = true; (node as any)._animBlurFilter = bf; }
        else bf.blur = fx.blur;
        newFilters.push(bf);
      } else {
        (node as any)._animBlurFilter = undefined;
      }

      if (fx.brightness !== 1) {
        let bcm: any = (node as any)._animBrightFilter;
        if (!bcm) { try { bcm = new pixi.ColorMatrixFilter(); bcm._isAnimEffect = true; (node as any)._animBrightFilter = bcm; } catch { bcm = null; } }
        if (bcm) { bcm.brightness(Math.max(0, fx.brightness), false); newFilters.push(bcm); }
      } else {
        (node as any)._animBrightFilter = undefined;
      }

      if (fx.chromaticAberration > 0.05) {
        let cacm: any = (node as any)._animCAFilter;
        if (!cacm) { try { cacm = new pixi.ColorMatrixFilter(); cacm._isAnimEffect = true; (node as any)._animCAFilter = cacm; } catch { cacm = null; } }
        if (cacm) {
          cacm.saturate(0.4 * fx.chromaticAberration, false);
          cacm.contrast(0.2 * fx.chromaticAberration, true);
          newFilters.push(cacm);
          node.x = (node.x || 0) + fx.chromaticAberration * 3;
        }
      } else {
        (node as any)._animCAFilter = undefined;
      }

      if (fx.filmGrain > 0.05) {
        try {
          let gf: any = (node as any)._animGrainFilter;
          if (!gf) { gf = new (PixiFilters as any).NoiseFilter({ noise: fx.filmGrain, seed: frame.localTimeMs % 1000 / 1000 }); gf._isAnimEffect = true; (node as any)._animGrainFilter = gf; }
          else { gf.noise = fx.filmGrain; gf.seed = frame.localTimeMs % 1000 / 1000; }
          newFilters.push(gf);
        } catch { /* no-op */ }
      } else {
        (node as any)._animGrainFilter = undefined;
      }

      node.filters = newFilters.length > 0 ? newFilters : null as any;

      // Vignette: draw/update an overlay sibling on the element container
      const vigKey = `_animVignette_${element.id}`;
      const container = cached.node.parent;
      if (container) {
        let vigNode: any = (container as any)[vigKey];
        if (fx.vignette > 0.02) {
          if (!vigNode) {
            try {
              vigNode = new pixi.Graphics();
              vigNode._isAnimVignette = true;
              container.addChild(vigNode);
              (container as any)[vigKey] = vigNode;
            } catch { /* no-op */ }
          }
          if (vigNode) {
            try {
              vigNode.clear();
              const w = element.layout.width, h = element.layout.height;
              const grad = new (pixi as any).FillGradient({ type: "radial", center: { x: w / 2, y: h / 2 }, outerCenter: { x: w / 2, y: h / 2 }, innerRadius: 0, outerRadius: Math.max(w, h) / 2, textureSpace: "global" });
              grad.addColorStop(0, "rgba(0,0,0,0)");
              grad.addColorStop(1, `rgba(0,0,0,${fx.vignette})`);
              vigNode.rect(0, 0, w, h).fill({ fill: grad } as any);
            } catch {
              vigNode.clear();
              vigNode.rect(0, 0, element.layout.width, element.layout.height).fill({ color: 0x000000, alpha: fx.vignette * 0.6 });
            }
          }
        } else if (vigNode) {
          try { container.removeChild(vigNode); vigNode.destroy(); } catch { /* no-op */ }
          (container as any)[vigKey] = undefined;
        }
      }
    }

    // Video seeking: persistent slots only call applyElementTransform each frame, which
    // doesn't update videoEl.currentTime. Seek every frame so scrubbing and playback stay in sync.
    for (const element of frame.elements) {
      if (element.type !== "video") continue;
      const src = normalizeAssetSrc(element.content?.src);
      if (!src || src.startsWith("placeholder://")) continue;
      const texture = (_textureCache.get(src) ?? null) as any;
      if (!texture) continue;
      const videoEl: HTMLVideoElement | undefined = (texture.source as any)?.resource;
      if (!videoEl || typeof videoEl.currentTime !== "number") continue;
      const trimStartMs = element.content?.trimStartMs ?? 0;
      const trimEndMs = element.content?.trimEndMs ?? (element.content?.videoDurationMs ?? 0);
      const rate = element.content?.playbackRate ?? 1;
      const sourceTimeMs = trimStartMs + frame.localTimeMs * rate;
      const clampedMs = Math.max(0, trimEndMs > 0 ? Math.min(sourceTimeMs, trimEndMs) : sourceTimeMs);
      const targetTimeS = clampedMs / 1000;
      if (Math.abs(videoEl.currentTime - targetTimeS) > 0.033) {
        videoEl.currentTime = targetTimeS;
      }
      if (typeof (texture.source as any)?.update === "function") {
        (texture.source as any).update();
      }
    }

    // New element fields: glowPulse, motionBlur, reflectionOpacity
    for (const element of frame.elements) {
      const cached = slot.nodes.get(element.id);
      if (!cached) continue;
      const node = cached.node;

      // glowPulse: animated glow intensity tied to timeMs
      if (element.glowPulse) {
        const gp = element.glowPulse;
        try {
          const pulseT = Math.sin((frame.localTimeMs / 1000) * gp.speed * Math.PI * 2) * 0.5 + 0.5;
          const glowStrength = gp.intensity * pulseT;
          const colorInt = parseInt(gp.color.replace("#", ""), 16) || 0xffffff;
          let gpFilter: any = (node as any)._glowPulseFilter;
          if (!gpFilter) {
            try {
              gpFilter = new (PixiFilters as any).GlowFilter({ color: colorInt, distance: 20, innerStrength: 0, outerStrength: glowStrength, quality: 0.4 });
              gpFilter._isGlowPulse = true;
              (node as any)._glowPulseFilter = gpFilter;
              node.filters = [...(node.filters as any[] ?? []).filter((f: any) => !f._isGlowPulse), gpFilter];
            } catch { /* no-op */ }
          } else {
            gpFilter.outerStrength = glowStrength;
          }
        } catch { /* no-op */ }
      }

      // motionBlur: directional blur based on the element's current velocity (approximated from layout)
      if (element.motionBlur && element.motionBlur > 0) {
        try {
          let mbFilter: any = (node as any)._motionBlurFilter;
          if (!mbFilter) {
            mbFilter = new pixi.BlurFilter({ strength: element.motionBlur * 4, quality: 2 });
            (mbFilter as any)._isMotionBlur = true;
            (node as any)._motionBlurFilter = mbFilter;
            node.filters = [...(node.filters as any[] ?? []).filter((f: any) => !f._isMotionBlur), mbFilter];
          } else {
            mbFilter.strength = element.motionBlur * 4;
          }
        } catch { /* no-op */ }
      }

      // reflectionOpacity: render a vertically-flipped semi-transparent copy below the element
      const refKey = `_reflection_${element.id}`;
      const existingRef: any = (slot.elemLayer as any)[refKey];
      if (element.reflectionOpacity && element.reflectionOpacity > 0) {
        try {
          if (!existingRef) {
            // We cannot deep-clone a Pixi container, so we use a simple tinted rectangle as reflection
            const refNode = new pixi.Graphics();
            refNode.rect(0, 0, element.layout.width, element.layout.height * 0.4)
              .fill({ color: 0x000000, alpha: element.reflectionOpacity * 0.4 });
            refNode.x = element.layout.x;
            refNode.y = element.layout.y + element.layout.height;
            refNode.scale.y = -1;
            refNode.y += element.layout.height * 0.4;
            refNode.zIndex = (element.layout.zIndex ?? 0) - 0.1;
            (slot.elemLayer as any)[refKey] = refNode;
            slot.elemLayer.addChild(refNode);
          } else {
            existingRef.alpha = element.reflectionOpacity;
            existingRef.x = element.layout.x;
            existingRef.y = element.layout.y + element.layout.height;
          }
        } catch { /* no-op */ }
      } else if (existingRef) {
        try { slot.elemLayer.removeChild(existingRef); existingRef.destroy(); } catch { /* no-op */ }
        (slot.elemLayer as any)[refKey] = undefined;
      }
    }

    // Particle / environmental overlay
    // Composition render loop — create/update composition containers each frame
    {
      const activeCompIds = new Set(frame.compositions.map((c) => c.id));
      // Remove stale composition nodes
      for (const [id, cached] of slot.compositionNodes) {
        if (!activeCompIds.has(id)) {
          slot.elemLayer.removeChild(cached.node);
          safeDestroy(cached.node);
          slot.compositionNodes.delete(id);
        }
      }
      for (const comp of frame.compositions) {
        const newKey = compositionNodeKey(comp, _textureCache, normalizeAssetSrc);
        const cached = slot.compositionNodes.get(comp.id);
        if (cached && cached.key !== newKey) {
          slot.elemLayer.removeChild(cached.node);
          safeDestroy(cached.node);
          slot.compositionNodes.delete(comp.id);
        }
        if (!slot.compositionNodes.has(comp.id)) {
          const node = createCompositionDisplay(ctx, comp);
          applyCompositionTransform(node, comp);
          slot.elemLayer.addChild(node);
          slot.compositionNodes.set(comp.id, { node, key: newKey });
          needsSort = true;
        }
        // Per-frame in-place update — delegated to the registered renderer
        const liveNode = slot.compositionNodes.get(comp.id)?.node;
        const renderer = liveNode ? getCompositionRenderer(comp.compositionType) : undefined;
        if (liveNode && renderer) {
          applyCompositionTransform(liveNode, comp);
          renderer.update(liveNode as any, comp, frame.localTimeMs, frame.sceneDurationMs);
        }
      }
    }

    const overlayKey = "_particleOverlay";
    const existingOverlay: any = (slot.outer as any)[overlayKey];
    if (frame.overlay) {
      const ov = frame.overlay;
      const intensity = ov.intensity ?? 0.5;
      const speed = ov.speed ?? 1;
      const t = frame.localTimeMs / 1000;
      // Particle count proportional to intensity
      const count = Math.floor(80 * intensity);

      let overlayG: any = existingOverlay;
      if (!overlayG) {
        overlayG = new pixi.Graphics();
        overlayG.zIndex = 9999;
        (slot.outer as any)[overlayKey] = overlayG;
        slot.outer.addChild(overlayG);
      }

      try {
        overlayG.clear();
        const colorStr = ov.color ?? "#ffffff";
        const colorInt = parseInt(colorStr.replace("#", ""), 16) || 0xffffff;

        for (let i = 0; i < count; i++) {
          // Deterministic per-particle base positions seeded from index
          const seed1 = ((i * 2654435761) >>> 0) / 0xffffffff;
          const seed2 = ((i * 2246822519) >>> 0) / 0xffffffff;
          const seed3 = ((i * 3266489917) >>> 0) / 0xffffffff;

          let px: number, py: number, alpha: number, r: number;

          switch (ov.type) {
            case "rain": {
              px = (seed1 * vw + (t * speed * 60) * 0.3) % vw;
              py = (seed2 * vh + t * speed * 300 * (0.8 + seed3 * 0.4)) % vh;
              alpha = 0.3 + seed3 * 0.4;
              r = 1;
              overlayG.rect(px, py, 1, 8 + seed3 * 6).fill({ color: colorInt, alpha: alpha * intensity });
              continue;
            }
            case "snow": {
              px = (seed1 * vw + Math.sin(t * speed * 0.5 + seed3 * 6.28) * 20) % vw;
              py = (seed2 * vh + t * speed * 60 * (0.5 + seed3 * 0.5)) % vh;
              alpha = 0.4 + seed3 * 0.4;
              r = 2 + seed3 * 4;
              overlayG.circle(px, py, r).fill({ color: colorInt, alpha: alpha * intensity });
              continue;
            }
            case "confetti": {
              const hue = (i * 137.5) % 360;
              const cInt = Math.floor(Math.random() * 0xffffff); // deterministic via seed
              const ci = (Math.floor(seed3 * 6) * 60) << 16 | 0x88cc00;
              px = (seed1 * vw + Math.sin(t * speed * 0.3 + seed2 * 6.28) * 40) % vw;
              py = (seed2 * vh + t * speed * 80 * (0.6 + seed3 * 0.4)) % vh;
              overlayG.rect(px, py, 6, 4).fill({ color: ci, alpha: 0.7 * intensity });
              void hue; void cInt;
              continue;
            }
            case "sparkles": {
              const sparkPhase = (t * speed * 2 + seed3 * 6.28) % (Math.PI * 2);
              const sparkAlpha = Math.max(0, Math.sin(sparkPhase)) * 0.8;
              px = seed1 * vw;
              py = seed2 * vh;
              r = 2 + seed3 * 3;
              overlayG.circle(px, py, r).fill({ color: colorInt, alpha: sparkAlpha * intensity });
              continue;
            }
            case "fireflies": {
              const ffPhase = (t * speed * 1.5 + seed3 * 6.28) % (Math.PI * 2);
              px = (seed1 * vw + Math.sin(t * speed * 0.8 + seed2 * 3.14) * 60) % vw;
              py = (seed2 * vh + Math.cos(t * speed * 0.6 + seed3 * 3.14) * 40) % vh;
              const ffAlpha = Math.max(0, Math.sin(ffPhase)) * 0.9;
              overlayG.circle(px, py, 3 + seed3 * 2).fill({ color: colorInt, alpha: ffAlpha * intensity });
              continue;
            }
            case "bokeh": {
              px = seed1 * vw;
              py = seed2 * vh;
              const bokehPhase = (t * speed * 0.5 + seed3 * 6.28) % (Math.PI * 2);
              r = 10 + seed3 * 30;
              const bokehAlpha = (Math.sin(bokehPhase) * 0.5 + 0.5) * 0.15 * intensity;
              overlayG.circle(px, py, r).fill({ color: colorInt, alpha: bokehAlpha });
              continue;
            }
            case "static": {
              px = seed1 * vw;
              py = seed2 * vh;
              const staticAlpha = seed3 * 0.3 * intensity * (Math.sin(t * speed * 60 + seed2 * 100) > 0 ? 1 : 0.3);
              overlayG.rect(px, py, 2, 2).fill({ color: colorInt, alpha: staticAlpha });
              continue;
            }
            case "bubbles": {
              const bubblePhase = (seed2 * vh - t * speed * 50 * (0.5 + seed3 * 0.5) + vh) % vh;
              px = (seed1 * vw + Math.sin(t * speed * 0.4 + seed3 * 6.28) * 15) % vw;
              py = bubblePhase;
              r = 4 + seed3 * 12;
              overlayG.circle(px, py, r).stroke({ color: colorInt, width: 1, alpha: 0.4 * intensity });
              continue;
            }
            case "smoke": {
              px = (seed1 * vw + Math.sin(t * speed * 0.3 + seed2 * 6.28) * 30) % vw;
              py = (seed2 * vh - t * speed * 30 * (0.4 + seed3 * 0.3) + vh) % vh;
              r = 20 + seed3 * 40;
              overlayG.circle(px, py, r).fill({ color: colorInt, alpha: 0.04 * intensity * (1 - py / vh) });
              continue;
            }
            default:
              continue;
          }
          // Fallback generic dot (unreachable with continue above, but keeps TS happy)
          overlayG.circle(px, py, r ?? 3).fill({ color: colorInt, alpha: alpha ?? 0.5 });
        }
      } catch { /* no-op: particle rendering is non-critical */ }
    } else if (existingOverlay) {
      try { slot.outer.removeChild(existingOverlay); existingOverlay.destroy(); } catch { /* no-op */ }
      (slot.outer as any)[overlayKey] = undefined;
    }

    slot.elemLayer.scale.set(1);
    slot.elemLayer.pivot.set(0, 0);
    slot.elemLayer.position.set(0, 0);
    slot.elemLayer.rotation = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────

  private drawFrame(frame: ResolvedRenderFrame): void {
    if (!this.app || !this.root || !this.pixi) return;

    const pixi = this.pixi;
    const rw = this.app.renderer.width;
    const rh = this.app.renderer.height;
    const vw = frame.viewport.width;
    const vh = frame.viewport.height;
    const scale = Math.min(rw / vw, rh / vh);
    const offsetX = (rw - vw * scale) / 2;
    const offsetY = (rh - vh * scale) / 2;

    // Create the persistent viewport once and reuse it forever.
    if (!this.pViewport) {
      const vp = new pixi.Container();
      const mask = new pixi.Graphics().rect(0, 0, vw, vh).fill({ color: 0xffffff });
      vp.addChild(mask);
      vp.mask = mask as any;
      this.pViewport = vp;
      this.root.addChild(vp);
    }
    this.pViewport.x = offsetX;
    this.pViewport.y = offsetY;
    this.pViewport.scale.set(scale);

    const tw = getTransitionWindow(this.project, frame.timeMs);

    // Determine which slots are needed this frame.
    const currentKey = frame.sceneId ?? "__empty__";
    let incomingKey: string | null = null;
    let incomingFrame: ResolvedRenderFrame | null = null;
    if (tw) {
      incomingFrame = resolveRenderFrame(this.project, { timeMs: tw.incoming.track.startMs });
      incomingKey = incomingFrame.sceneId ?? "__empty_b__";
    }

    // Evict slots no longer needed (keeps at most 2 alive).
    // Reuse _neededSlots scratch Set — no allocation.
    this._neededSlots.clear();
    this._neededSlots.add(currentKey);
    if (incomingKey) this._neededSlots.add(incomingKey);
    for (const [k, s] of this.slots) {
      if (!this._neededSlots.has(k)) {
        if (s.inViewport) this.pViewport.removeChild(s.outer);
        safeDestroy(s.outer);
        this.slots.delete(k);
      }
    }

    // Update current scene slot.
    const cur = this.getOrCreateSlot(currentKey);
    this.updateSlot(cur, frame);
    if (!cur.inViewport) { this.pViewport.addChild(cur.outer); cur.inViewport = true; }

    if (tw && incomingFrame && incomingKey) {
      const inc = this.getOrCreateSlot(incomingKey);
      this.updateSlot(inc, incomingFrame);
      if (!inc.inViewport) { this.pViewport.addChild(inc.outer); inc.inViewport = true; }
      const progress = easeInOut(tw.progress);
      this.applyTransitionToContainers(cur.outer, inc.outer, tw.type, progress, vw, vh);
    } else {
      // Not in a transition: reset any leftover transition state on the outer container.
      cur.outer.alpha = 1;
      cur.outer.visible = true;
      cur.outer.x = 0;
      cur.outer.y = 0;
      cur.outer.rotation = 0;
      cur.outer.scale.set(1);
      cur.outer.pivot.set(0, 0);
      cur.outer.filters = null as any;
      cur.outer.mask = null as any;
      // Clean up iris mask when not transitioning
      if (this._cachedIrisMask) {
        try { (this._cachedIrisMask as any).clear?.(); } catch { /* no-op */ }
      }
    }
  }
}

/**
 * Captures a deterministic frame sequence by stepping through project time
 * at a fixed frame rate. No requestAnimationFrame — every frame is an
 * explicit seek + render + blob capture.
 *
 * Intended for FFmpeg encoding pipelines: collect blobs, send to server,
 * pipe through `ffmpeg -framerate N -i frame%04d.png -c:v libx264 out.mp4`.
 */
export async function captureFrameSequence(
  renderer: PixiSceneRenderer,
  project: ProjectDocument,
  options: FrameSequenceOptions
): Promise<FrameSequenceResult> {
  const { frameRate, mimeType = "image/png", quality, onProgress, onFrame } = options;
  const durationMs = getTimelineDurationMs(project.timelineTracks);
  const frameDurationMs = 1000 / frameRate;
  const totalFrames = Math.ceil(durationMs / frameDurationMs);
  const frames: Blob[] = [];

  renderer.setProject(project);

  for (let i = 0; i < totalFrames; i++) {
    const timeMs = Math.min(i * frameDurationMs, durationMs);
    const blob = await renderer.captureFrame(timeMs, mimeType, quality);
    frames.push(blob);
    if (onFrame) await onFrame(i, timeMs, blob);
    if (onProgress) onProgress(i + 1, totalFrames);
  }

  return { frameRate, totalFrames, durationMs, frames };
}
