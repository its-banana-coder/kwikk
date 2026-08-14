import {
  resolveAnimatedEffects,
  hasCharLevelAnimations,
  resolveCharAnimations,
  resolveElementNodeAtTime,
} from "@kwikk/animation-engine";
import type { CharState } from "@kwikk/animation-engine";
import type {
  ElementNode,
  CompositionNode,
  ProjectDocument,
  SceneBackground,
  SceneTransition,
} from "@kwikk/shared-types";
import { getTransitionWindow } from "@kwikk/timeline";
import type { TransitionWindow } from "@kwikk/timeline";
import { resolveRenderFrame } from "./frameResolver";
import type { RenderFrameInput, ResolvedRenderFrame } from "./frameResolver";
import { buildShapeSVG, svgShapeMarkup } from "./svgShapes";
import {
  buildCSSFilter,
  buildTextCSS,
  buildSceneSVGFilterDefs,
  vignetteStyle,
  hexToRgba,
  getDuotoneMatrixValues,
} from "./cssFilters";
import { getCompositionRenderer } from "./compositions/registry";
import {
  createManagedAnimation,
  scrubManagedAnimation,
  cancelManagedAnimation,
} from "./cssAnimations";
import type { ManagedAnimation } from "./cssAnimations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ElementCacheEntry {
  outer: HTMLElement;
  content: HTMLElement;
  wapiAnims: ManagedAnimation[];
  charSpans: HTMLElement[] | null;
  vignetteEl: HTMLElement | null;
  customStyleEl: HTMLStyleElement | null;
  // The element actually carrying the customCSS's scoped id/animation — a
  // wrapper around `content`, distinct from `outer`. See the note above
  // scopeCustomCSS() for why this can never be `outer` itself.
  customAnimEl: HTMLElement | null;
  contentKey: string;
  elementId: string;
  reflectionEl?: HTMLElement | null;
}

type PixiModule = typeof import("pixi.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extracts the raw CSS `background` value from SVG+foreignObject data URLs used by the CSS asset catalog. */
function extractGradientFromSvgDataUrl(dataUrl: string): string | null {
  try {
    const svg = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(",") + 1));
    const m = svg.match(/style="[^"]*background:\s*([^";]+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function normalizeAssetSrc(src: string | undefined): string | undefined {
  return src?.replace(/^https?:\/\/localhost:\d+\/uploads\//, "/uploads/");
}

/**
 * @keyframes names are global to the document — they are NOT scoped by where
 * their <style> tag sits in the DOM. Two elements independently authored with
 * an identically-named animation (e.g. two LLM calls both choosing "dropIn")
 * collide: whichever @keyframes rule was inserted last wins for every element
 * referencing that name, document-wide. Renaming every declared name to
 * something unique per element — and rewriting the matching `animation:` /
 * `animation-name:` references in the same string — makes each element's
 * customCSS fully independent regardless of what name the author picked.
 */
function namespaceKeyframes(css: string, scopeId: string): string {
  const names = new Set<string>();
  const nameRe = /@keyframes\s+([\w-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(css))) names.add(m[1]);
  if (names.size === 0) return css;

  let result = css;
  for (const name of names) {
    result = result.replace(new RegExp(`\\b${name}\\b`, "g"), `${name}__${scopeId}`);
  }
  return result;
}

/**
 * Reads the declared `animation-iteration-count` (default 1, per the CSS
 * spec, when unspecified — matching the browser's own default) out of a raw
 * customCSS string, for _syncCustomAnimation's seek clamping. Prefers the
 * unambiguous longhand; falls back to the `animation:` shorthand with
 * timing-function calls stripped first — cubic-bezier(...)/steps(...) can
 * contain bare numeric args (e.g. cubic-bezier(0.34,1.56,0.64,1)) that would
 * otherwise be misread as the iteration-count.
 */
function parseCustomAnimationIterationCount(customCSS: string): number {
  const longhand = customCSS.match(/animation-iteration-count\s*:\s*([\w.]+)/);
  if (longhand) return longhand[1] === "infinite" ? Infinity : parseFloat(longhand[1]) || 1;

  const shorthand = customCSS.match(/(?<!-)animation\s*:\s*([^;]+);?/);
  if (!shorthand) return 1;
  const withoutFnArgs = shorthand[1].replace(/[\w-]+\([^)]*\)/g, "");
  if (/\binfinite\b/.test(withoutFnArgs)) return Infinity;
  // The iteration-count is the only bare (unitless) number in the shorthand —
  // duration/delay always carry an "s"/"ms" suffix, so excluding those and
  // any decimal-adjacent digits leaves just it.
  const bareNumber = withoutFnArgs.match(/(?<![\d.])(\d+(?:\.\d+)?)(?!\s*m?s\b)(?![\w.])/);
  return bareNumber ? parseFloat(bareNumber[1]) || 1 : 1;
}

/**
 * Scopes a raw customCSS string to one element, so ":root {}"/bare selectors
 * only affect this element's own scoped wrapper. @-rules with a nested rule
 * body (@keyframes, @media, ...) are pulled out first and reinserted
 * unmodified — their inner selectors (0%, 50%, from/to, etc.) are NOT
 * top-level element selectors and must never be scope-prefixed, or the
 * browser silently drops them as invalid and the keyframes never apply.
 */
function scopeCustomCSS(rawCss: string, scopeId: string): string {
  const css = namespaceKeyframes(rawCss, scopeId);
  const atRuleBlocks: string[] = [];
  // One level of nested {...} inside an @-rule body — enough for @keyframes/@media.
  const withoutAtRules = css.replace(
    /@[\w-]+[^{}]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
    (match) => {
      atRuleBlocks.push(match);
      return `__KWIKK_AT_RULE_${atRuleBlocks.length - 1}__`;
    }
  );

  // [^{}\n] (not [^{}]) so this never spans multiple lines — otherwise a
  // brace-less placeholder line greedily merges into the next real selector
  // line and both end up incorrectly scoped together. :root is handled in
  // this same pass (not a separate replace beforehand) so it can't get
  // double-prefixed into an (unmatchable) "#id #id" descendant selector.
  const scoped = withoutAtRules.replace(/^([^{}\n]*)\{/gm, (_m, selectorList: string) =>
    `${selectorList
      .split(",")
      .map((sel) => sel.trim())
      .filter(Boolean)
      .map((sel) => (sel === ":root" ? `#${scopeId}` : `#${scopeId} ${sel}`))
      .join(", ")} {`
  );

  return scoped.replace(/__KWIKK_AT_RULE_(\d+)__/g, (_m, i) => atRuleBlocks[Number(i)]);
}

/** Applies CSS object to an element's inline style. */
function applyStyle(el: HTMLElement, css: Record<string, string>): void {
  for (const [k, v] of Object.entries(css)) {
    (el.style as any)[k] = v;
  }
}

/** Returns a stable key for a text element's content (to detect rebuilds). */
function textContentKey(el: ElementNode): string {
  const rt = el.content?.richText;
  const rtKey = rt ? rt.map((s) => s.text).join("|") : "";
  const s = el.style;
  return [
    el.content?.text ?? "",
    rtKey,
    s.fontFamily, s.fontSize, s.fontWeight, s.fontStyle, s.color,
    s.letterSpacing, s.lineHeight, s.textAlign, s.textTransform,
    s.textEffect, s.textEffectColor, s.textEffectIntensity,
    s.textGradient ? JSON.stringify(s.textGradient) : "",
    s.textStroke ? `${s.textStroke.color}:${s.textStroke.width}` : "",
    s.textShadow ? `${s.textShadow.color}:${s.textShadow.offsetX}:${s.textShadow.offsetY}` : "",
    s.backgroundColor,
    el.layout.width, el.layout.height,
    hasCharLevelAnimations(el) ? "char" : "",
  ].join("|");
}

function imageContentKey(el: ElementNode): string {
  const s = el.style;
  const f = s.filters;
  return [
    el.content?.src ?? "",
    el.layout.width, el.layout.height,
    s.borderRadius,
    s.blendMode,
    el.content?.frame ?? "",
    f ? `${f.blur}:${f.brightness}:${f.contrast}:${f.saturation}:${f.monochrome}:${f.sepia}` : "",
  ].join("|");
}

// SVG <pattern>/<image> fills (used for shape "image" fillPattern) are fire-and-forget browser
// resource references — unlike a plain <img>, a dynamically-injected pattern image does not
// reliably repaint the element referencing it once the image resource finishes loading. We
// preload the image ourselves, gate pattern injection on that having finished, and fold the
// loaded state into the shape's content key so _updateLayer rebuilds the element (with the now
// browser-cached, already-decoded image) as soon as it's ready instead of leaving the default
// fill showing until some unrelated style edit happens to force a rebuild.
type ShapeFillImageState = "loading" | "loaded" | "error";
const shapeFillImageCache = new Map<string, ShapeFillImageState>();
const shapeFillImageListeners = new Set<() => void>();

function isShapeFillImageLoaded(src: string): boolean {
  return shapeFillImageCache.get(src) === "loaded";
}

/**
 * Resolves once every shape fill image currently mid-load has settled (loaded or errored).
 * Used by the headless export renderer, which — unlike the live editor's continuous RAF/replay
 * loop — needs an explicit signal that async image loads have finished before it screenshots a
 * frame; without it, exported video can bake in the default shape fill for the whole clip.
 */
export function waitForPendingShapeFillImages(): Promise<void> {
  const pendingSrcs = [...shapeFillImageCache.entries()]
    .filter(([, state]) => state === "loading")
    .map(([src]) => src);
  if (pendingSrcs.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      const stillPending = pendingSrcs.some((src) => shapeFillImageCache.get(src) === "loading");
      if (!stillPending) {
        shapeFillImageListeners.delete(check);
        resolve();
      }
    };
    shapeFillImageListeners.add(check);
  });
}

/** Kicks off (idempotently) preloading `src`; returns whether it's already loaded. */
function ensureShapeFillImageLoaded(src: string): boolean {
  const state = shapeFillImageCache.get(src);
  if (state) return state === "loaded";
  shapeFillImageCache.set(src, "loading");
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    shapeFillImageCache.set(src, "loaded");
    for (const listener of shapeFillImageListeners) listener();
  };
  img.onerror = () => {
    shapeFillImageCache.set(src, "error");
  };
  img.src = src;
  return false;
}

function shapeContentKey(el: ElementNode): string {
  const s = el.style;
  const fillImgSrc = el.content?.fillImageSrc ?? "";
  const fillImgState = s.fillPattern === "image" && fillImgSrc
    ? (ensureShapeFillImageLoaded(fillImgSrc) ? "loaded" : "pending")
    : "";
  return [
    el.content?.shape ?? "rectangle",
    el.layout.width, el.layout.height,
    s.backgroundColor, s.fillPattern, s.fillColor2,
    s.borderColor, s.borderWidth, s.borderRadius,
    s.blendMode,
    fillImgSrc,
    fillImgState,
  ].join("|");
}

function videoContentKey(el: ElementNode): string {
  return [el.content?.src ?? "", el.layout.width, el.layout.height].join("|");
}

function animatedStatContentKey(el: ElementNode): string {
  return [
    el.content?.text ?? "",
    el.content?.label ?? "",
    el.content?.statSubvalue ?? "",
    el.style.color ?? "",
    el.style.fontSize ?? "",
    el.style.fontFamily ?? "",
    el.layout.width, el.layout.height,
  ].join("|");
}

function graphContentKey(el: ElementNode): string {
  return [
    JSON.stringify(el.content?.chartData ?? []),
    el.content?.chartType ?? "bar",
    el.style.color ?? "",
    el.layout.width, el.layout.height,
    (el.content?.lineDrawProgress ?? 1).toFixed(3),
  ].join("|");
}

function getContentKey(el: ElementNode): string {
  let baseKey = "";
  switch (el.type) {
    case "text":          baseKey = textContentKey(el); break;
    case "image":         baseKey = imageContentKey(el); break;
    case "shape":         baseKey = shapeContentKey(el); break;
    case "video":         baseKey = videoContentKey(el); break;
    case "animated_stat": baseKey = animatedStatContentKey(el); break;
    case "graph":         baseKey = graphContentKey(el); break;
    default:              baseKey = `${el.id}:${el.type}:${el.layout.width}:${el.layout.height}`; break;
  }

  const f = el.style.filters;
  const filterKey = f ? [
    f.blur ?? "", f.brightness ?? "", f.contrast ?? "", f.saturation ?? "", f.monochrome ?? "", f.sepia ?? "",
    f.duotone ? `${f.duotone.color1}:${f.duotone.color2}` : "",
    f.scanlines ?? "",
    f.tilt_shift ?? "",
    f.light_leak ? `${f.light_leak.color}:${f.light_leak.alpha}:${f.light_leak.angle}` : "",
    f.anamorphic_flare ?? "",
    f.lens_flare ? `${f.lens_flare.x}:${f.lens_flare.y}:${f.lens_flare.intensity}` : "",
    f.vhs_tracking ?? "",
    f.oil_paint ?? "",
    f.pencil_sketch ?? ""
  ].join(":") : "";

  return [
    baseKey,
    filterKey,
    el.zDepth ?? "",
    el.motionBlur ?? "",
    el.reflectionOpacity ?? "",
    el.borderAnimation ?? "",
    el.glowPulse ? `${el.glowPulse.color}:${el.glowPulse.intensity}:${el.glowPulse.speed}` : "",
    el.clipShape ?? "",
  ].join("|");
}

// ─── Element content builders ─────────────────────────────────────────────────

function buildTextContent(el: ElementNode): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;inset:0;overflow:visible;";

  const inner = document.createElement("div");
  inner.style.cssText = "width:100%;";

  const css = buildTextCSS(el.style);
  applyStyle(inner, css);

  if (hasCharLevelAnimations(el)) {
    // Build per-character spans — updated per-frame by updateCharSpans
    const text = el.content?.richText
      ? el.content.richText.map((s) => s.text).join("")
      : (el.content?.text ?? "");
    const chars = [...text];
    for (const ch of chars) {
      if (ch === "\n") {
        inner.appendChild(document.createElement("br"));
      } else {
        const span = document.createElement("span");
        span.textContent = ch === " " ? " " : ch;
        span.style.cssText = "display:inline-block;";
        inner.appendChild(span);
      }
    }
  } else if (el.content?.richText && el.content.richText.length > 0) {
    for (const span of el.content.richText) {
      const s = document.createElement("span");
      s.textContent = span.text;
      if (span.style) {
        if (span.style.fontWeight)  s.style.fontWeight = String(span.style.fontWeight);
        if (span.style.fontStyle)   s.style.fontStyle  = span.style.fontStyle;
        if (span.style.color)       s.style.color       = span.style.color;
        if (span.style.fontSize)    s.style.fontSize    = `${span.style.fontSize}px`;
        if (span.style.fontFamily)  s.style.fontFamily  = span.style.fontFamily;
        if (span.style.letterSpacing !== undefined)
          s.style.letterSpacing = `${span.style.letterSpacing}px`;
        if (span.style.highlight) {
          s.style.background    = span.style.highlight;
          s.style.borderRadius  = `${span.style.highlightRadius ?? 8}px`;
          s.style.padding       = `${span.style.highlightPadding ?? 7}px`;
        }
        if (span.style.uppercase) s.style.textTransform = "uppercase";
      }
      inner.appendChild(s);
    }
  } else {
    inner.textContent = el.content?.text ?? "";
  }

  div.appendChild(inner);
  return div;
}

function buildImageContent(el: ElementNode): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;inset:0;overflow:hidden;";

  const src = normalizeAssetSrc(el.content?.src);
  if (!src || src.startsWith("placeholder://")) {
    div.style.background = el.style.backgroundColor ?? "#1d4ed8";
    div.style.borderRadius = `${el.style.borderRadius ?? 0}px`;
    return div;
  }

  const img = document.createElement("img");
  img.src = src;
  img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;`;
  if (el.style.borderRadius) img.style.borderRadius = `${el.style.borderRadius}px`;
  if (el.style.blendMode && el.style.blendMode !== "normal")
    img.style.mixBlendMode = el.style.blendMode;

  // Crop via object-position + object-fit
  if (el.content?.crop) {
    const { x, y, width: cw, height: ch } = el.content.crop;
    const W = el.layout.width, H = el.layout.height;
    img.style.objectPosition = `${-(x / W) * 100}% ${-(y / H) * 100}%`;
    img.style.objectFit = "none";
    img.style.width = `${(cw / W) * 100}%`;
    img.style.height = `${(ch / H) * 100}%`;
  }

  div.appendChild(img);

  applyImageFrame(div, img, el);

  return div;
}

function mk(tag: string, css: string): HTMLElement {
  const el = document.createElement(tag);
  el.style.cssText = css + ";pointer-events:none;";
  return el;
}

function applyImageFrame(div: HTMLElement, img: HTMLElement, el: ElementNode): void {
  const frame = el.content?.frame;
  if (!frame) return;

  switch (frame) {

    case "cinematic": {
      div.appendChild(mk("div", "position:absolute;top:0;left:0;right:0;height:12%;background:#000;z-index:10;"));
      div.appendChild(mk("div", "position:absolute;bottom:0;left:0;right:0;height:12%;background:#000;z-index:10;"));
      break;
    }

    case "polaroid": {
      div.style.background = "#fafafa";
      div.style.boxSizing = "border-box";
      div.style.boxShadow = "0 6px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.9)";
      img.style.cssText = "position:absolute;top:5%;left:5%;right:5%;bottom:22%;width:90%;height:73%;object-fit:cover;display:block;";
      div.appendChild(mk("div", "position:absolute;bottom:0;left:0;right:0;height:22%;background:#fafafa;z-index:2;"));
      div.appendChild(mk("div", "position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);z-index:3;"));
      break;
    }

    case "circle": {
      img.style.borderRadius = "50%";
      div.style.borderRadius = "50%";
      div.style.overflow = "hidden";
      break;
    }

    case "shadow": {
      const r = el.style.borderRadius ?? 10;
      img.style.borderRadius = `${r}px`;
      img.style.filter = "drop-shadow(0 24px 48px rgba(0,0,0,0.25)) drop-shadow(0 8px 18px rgba(0,0,0,0.16)) drop-shadow(0 2px 5px rgba(0,0,0,0.10))";
      div.appendChild(mk("div", `position:absolute;inset:0;border-radius:${r}px;background:linear-gradient(145deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.04) 40%,transparent 65%);z-index:2;`));
      break;
    }

    // Inspired by jsfiddle.net/52mb6/4/ — radial gradient body, silver inner ring, glass reflection
    case "phone": {
      // Phone body — radial gradient from dark-grey (bottom-left highlight) to pure black
      div.style.background = "radial-gradient(ellipse at 10% 90%, #1c1c1c 0%, #000 100%)";
      div.style.borderRadius = "13%";
      div.style.overflow = "hidden";

      // Screen — proportional to jsfiddle (85px / ~650 total = 13% top/bottom, 20px / 360 = 5.5% sides)
      img.style.cssText = "position:absolute;top:13%;left:5.5%;right:5.5%;bottom:14%;width:89%;height:73%;object-fit:cover;display:block;";

      // Silver inner ring (equivalent to .handset div { border: 3px solid silver })
      div.appendChild(mk("div", "position:absolute;inset:1%;border:2px solid rgba(160,160,160,0.45);border-radius:12%;box-sizing:border-box;z-index:4;"));

      // Glass highlight (equivalent to .handset div linear-gradient white->transparent)
      div.appendChild(mk("div", "position:absolute;inset:0;border-radius:13%;background:linear-gradient(150deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.06) 30%,transparent 58%);z-index:6;"));

      // Speaker slot (equivalent to ::before: top ~7%, width ~21%, height ~0.8%)
      div.appendChild(mk("div", "position:absolute;top:7%;left:50%;transform:translateX(-50%);width:21%;height:0.8%;background:#4a4a4a;border-radius:2px;box-shadow:inset 0 1px 1px rgba(0,0,0,0.6);z-index:7;"));

      // Camera dot — small circle beside speaker
      div.appendChild(mk("div", "position:absolute;top:5.8%;left:64%;width:2.8%;aspect-ratio:1;background:#0a0a0a;border-radius:50%;border:1px solid #3a3a3a;box-shadow:inset 0 0 3px rgba(0,100,200,0.3);z-index:7;"));

      // Home button (equivalent to ::after: bottom ~3%, width ~14%, height ~8%, border-radius:35px)
      div.appendChild(mk("div", "position:absolute;bottom:3%;left:50%;transform:translateX(-50%);width:14%;aspect-ratio:1;background:radial-gradient(circle at 40% 35%,#3a3a3a,#060606);border-radius:50%;border:1.5px solid rgba(100,100,100,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.08),0 1px 4px rgba(0,0,0,0.6);z-index:7;"));

      // Power button — right edge
      div.appendChild(mk("div", "position:absolute;right:0;top:26%;width:1%;height:9%;background:linear-gradient(90deg,#2a2a2a,#3c3c3c);border-radius:0 2px 2px 0;z-index:5;"));

      // Volume buttons — left edge
      div.appendChild(mk("div", "position:absolute;left:0;top:20%;width:1%;height:6%;background:linear-gradient(270deg,#2a2a2a,#3c3c3c);border-radius:2px 0 0 2px;z-index:5;"));
      div.appendChild(mk("div", "position:absolute;left:0;top:28%;width:1%;height:6%;background:linear-gradient(270deg,#2a2a2a,#3c3c3c);border-radius:2px 0 0 2px;z-index:5;"));
      break;
    }

    case "laptop": {
      // Screen = top 74% of element; keyboard = bottom 26%
      img.style.cssText = "position:absolute;top:4%;left:4%;right:4%;bottom:28%;width:92%;height:68%;object-fit:cover;display:block;";

      // Lid — dark aluminium gradient
      div.appendChild(mk("div", "position:absolute;top:0;left:0;right:0;height:74%;background:linear-gradient(175deg,#2e2e2e 0%,#1a1a1a 50%,#111 100%);border-radius:6px 6px 0 0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);z-index:3;"));

      // Inner screen bezel — silver ring
      div.appendChild(mk("div", "position:absolute;top:3%;left:3%;right:3%;bottom:27%;border:1.5px solid rgba(80,80,80,0.5);box-sizing:border-box;z-index:5;"));

      // Glass reflection on screen
      div.appendChild(mk("div", "position:absolute;top:4%;left:4%;right:4%;bottom:28%;background:linear-gradient(140deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.02) 40%,transparent 65%);z-index:6;"));

      // Webcam dot
      div.appendChild(mk("div", "position:absolute;top:1.4%;left:50%;transform:translateX(-50%);width:1.4%;aspect-ratio:1;background:#0d0d0d;border-radius:50%;border:1px solid #333;box-shadow:inset 0 0 2px rgba(0,80,180,0.25);z-index:6;"));

      // Hinge line
      div.appendChild(mk("div", "position:absolute;top:74%;left:0;right:0;height:0.6%;background:linear-gradient(180deg,#0a0a0a,#333);z-index:7;"));

      // Keyboard base
      div.appendChild(mk("div", "position:absolute;bottom:0;left:0;right:0;height:26%;background:linear-gradient(180deg,#353535 0%,#282828 60%,#1e1e1e 100%);border-radius:0 0 4px 4px;box-shadow:0 4px 20px rgba(0,0,0,0.55),inset 0 -1px 0 rgba(255,255,255,0.05);z-index:3;"));

      // Key rows hint
      div.appendChild(mk("div", "position:absolute;bottom:10%;left:8%;right:8%;height:42%;background:repeating-linear-gradient(90deg,rgba(255,255,255,0.035) 0px,rgba(255,255,255,0.035) 2px,transparent 2px,transparent 9px);z-index:5;border-radius:1px;"));

      // Trackpad
      div.appendChild(mk("div", "position:absolute;bottom:8%;left:50%;transform:translateX(-50%);width:22%;height:46%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:3px;z-index:5;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);"));
      break;
    }

    case "tablet": {
      // Image fills the whole tablet body — bezel bars sit on top
      div.style.background = "radial-gradient(ellipse at 8% 92%, #1e1e1e 0%, #000 100%)";
      div.style.borderRadius = "8%";
      div.style.overflow = "hidden";

      // Image fills entire tablet — visible through the screen gap between bezel bars
      img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;";

      // Dark bezel bars on top of the image (screen area = gap between them)
      div.appendChild(mk("div", "position:absolute;top:0;left:0;right:0;height:7%;background:linear-gradient(180deg,#0d0d0d,#111);z-index:3;"));
      div.appendChild(mk("div", "position:absolute;bottom:0;left:0;right:0;height:7%;background:linear-gradient(0deg,#0d0d0d,#111);z-index:3;"));
      div.appendChild(mk("div", "position:absolute;top:7%;bottom:7%;left:0;width:9%;background:#111;z-index:3;"));
      div.appendChild(mk("div", "position:absolute;top:7%;bottom:7%;right:0;width:9%;background:#111;z-index:3;"));

      // Silver inner ring around screen
      div.appendChild(mk("div", "position:absolute;top:6.5%;left:8.5%;right:8.5%;bottom:6.5%;border:1.5px solid rgba(140,140,140,0.4);box-sizing:border-box;z-index:4;"));

      // Glass reflection on screen area
      div.appendChild(mk("div", "position:absolute;top:7%;left:9%;right:9%;bottom:7%;background:linear-gradient(145deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.03) 40%,transparent 60%);z-index:4;"));

      // Overall body glass highlight
      div.appendChild(mk("div", "position:absolute;inset:0;border-radius:8%;background:linear-gradient(150deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.02) 30%,transparent 52%);z-index:5;"));

      // Front camera
      div.appendChild(mk("div", "position:absolute;top:3.5%;left:50%;transform:translateX(-50%);width:1.8%;aspect-ratio:1;background:#080808;border-radius:50%;border:1px solid #333;z-index:6;"));

      // Home bar
      div.appendChild(mk("div", "position:absolute;bottom:3%;left:50%;transform:translateX(-50%);width:16%;height:0.6%;background:rgba(255,255,255,0.28);border-radius:999px;z-index:6;"));

      // Power button — top-right edge
      div.appendChild(mk("div", "position:absolute;right:0;top:16%;width:0.8%;height:7%;background:linear-gradient(90deg,#222,#3a3a3a);border-radius:0 2px 2px 0;z-index:5;"));

      // Volume buttons — left edge
      div.appendChild(mk("div", "position:absolute;left:0;top:18%;width:0.8%;height:6%;background:linear-gradient(270deg,#222,#3a3a3a);border-radius:2px 0 0 2px;z-index:5;"));
      div.appendChild(mk("div", "position:absolute;left:0;top:26%;width:0.8%;height:6%;background:linear-gradient(270deg,#222,#3a3a3a);border-radius:2px 0 0 2px;z-index:5;"));
      break;
    }

    case "browser": {
      const chromeH = 12;
      img.style.cssText = `position:absolute;top:${chromeH}%;left:0;right:0;bottom:0;width:100%;height:${100 - chromeH}%;object-fit:cover;display:block;`;

      div.style.borderRadius = "7px";
      div.style.overflow = "hidden";
      div.style.boxShadow = "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.12)";

      // Title bar
      const bar = document.createElement("div");
      bar.style.cssText = `position:absolute;top:0;left:0;right:0;height:${chromeH}%;background:linear-gradient(180deg,#ececec 0%,#dedede 100%);border-bottom:1px solid #c0c0c0;z-index:10;display:flex;align-items:center;box-sizing:border-box;padding:0 2.5%;gap:2%;`;
      bar.style.pointerEvents = "none";

      // Traffic lights
      const tlWrap = document.createElement("div");
      tlWrap.style.cssText = "display:flex;gap:5%;align-items:center;flex-shrink:0;width:12%;";
      tlWrap.style.pointerEvents = "none";
      const mkDot = (bg: string, sh: string) => {
        const d = document.createElement("div");
        d.style.cssText = `width:33%;aspect-ratio:1;background:${bg};border-radius:50%;box-shadow:${sh};flex-shrink:0;`;
        d.style.pointerEvents = "none";
        return d;
      };
      tlWrap.appendChild(mkDot("#ff5f57", "inset 0 1px 0 rgba(255,255,255,0.35),0 0 0 0.5px rgba(0,0,0,0.15)"));
      tlWrap.appendChild(mkDot("#ffbd2e", "inset 0 1px 0 rgba(255,255,255,0.35),0 0 0 0.5px rgba(0,0,0,0.12)"));
      tlWrap.appendChild(mkDot("#28c940", "inset 0 1px 0 rgba(255,255,255,0.35),0 0 0 0.5px rgba(0,0,0,0.12)"));
      bar.appendChild(tlWrap);

      // URL bar
      const urlBar = document.createElement("div");
      urlBar.style.cssText = "flex:1;height:55%;background:#fff;border:1px solid #c8c8c8;border-radius:5px;display:flex;align-items:center;padding:0 6px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.06);";
      urlBar.style.pointerEvents = "none";
      const urlText = document.createElement("span");
      urlText.style.cssText = "font-size:min(11px,1.9%);color:#555;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;";
      urlText.textContent = "https://example.com";
      urlBar.appendChild(urlText);
      bar.appendChild(urlBar);

      // Right spacer mirrors left dot area
      const sp = document.createElement("div");
      sp.style.cssText = "width:12%;flex-shrink:0;";
      bar.appendChild(sp);

      div.appendChild(bar);
      break;
    }

    case "tv": {
      div.style.overflow = "visible";

      // Thin metallic bezel
      div.appendChild(mk("div", "position:absolute;inset:0;border:2.5px solid #1a1a1a;border-radius:4px;box-sizing:border-box;box-shadow:0 0 0 1px #3a3a3a,0 0 0 2px rgba(255,255,255,0.04),0 8px 40px rgba(0,0,0,0.6);z-index:5;"));

      // Bottom chin
      div.appendChild(mk("div", "position:absolute;bottom:0;left:0;right:0;height:3%;background:linear-gradient(180deg,#1a1a1a,#0d0d0d);border-radius:0 0 4px 4px;z-index:6;box-shadow:0 1px 0 rgba(255,255,255,0.04);"));

      // Screen glass glare
      div.appendChild(mk("div", "position:absolute;inset:3px;background:linear-gradient(135deg,rgba(255,255,255,0.055) 0%,transparent 40%,transparent 60%,rgba(0,0,0,0.04) 100%);z-index:4;border-radius:3px;"));

      // Screen edge vignette
      div.appendChild(mk("div", "position:absolute;inset:3px;background:radial-gradient(ellipse at center,transparent 65%,rgba(0,0,0,0.22) 100%);z-index:4;border-radius:3px;"));

      // Stand neck
      div.appendChild(mk("div", "position:absolute;bottom:-13%;left:50%;transform:translateX(-50%);width:3.5%;height:12%;background:linear-gradient(180deg,#252525,#1a1a1a);border-radius:1px;z-index:4;"));

      // Stand base
      div.appendChild(mk("div", "position:absolute;bottom:-15.5%;left:50%;transform:translateX(-50%);width:22%;height:3%;background:linear-gradient(180deg,#2e2e2e,#1a1a1a);border-radius:3px;z-index:4;box-shadow:0 3px 12px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.06);"));

      // Power LED
      div.appendChild(mk("div", "position:absolute;bottom:1%;left:50%;transform:translateX(-50%);width:0.6%;aspect-ratio:1;background:#e04;border-radius:50%;box-shadow:0 0 4px rgba(220,0,60,0.7);z-index:7;"));
      break;
    }
  }
}


function buildShapeContent(el: ElementNode): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;inset:0;";

  const shape = (el.content?.shape as any) ?? "rectangle";
  // Three-way, not `??` — the Fill swatch's None option (and any EditorOperation caller) writes
  // backgroundColor as "" to mean "explicitly no fill," distinct from undefined ("never set, use
  // the default gray"). `??` only falls back on null/undefined, so "" used to pass straight
  // through as the SVG fill below. `fill=""` is an invalid SVG presentation attribute — browsers
  // resolve it to the paint initial value (black), not transparent — which is why "None"
  // visually failed. "" now maps to "transparent", same as the existing "hollow" pattern.
  const fill = el.style.backgroundColor === undefined ? "#334155" : (el.style.backgroundColor || "transparent");
  // borderColor's undefined-default is already "transparent", same as "" would resolve to, so a
  // plain truthy check (unlike fill's three-way above) covers both "never set" and "explicitly none".
  const stroke = el.style.borderColor || "transparent";
  const strokeWidth = el.style.borderWidth ?? 0;
  const radius = el.style.borderRadius ?? 8;
  const blendMode = el.style.blendMode;
  if (blendMode && blendMode !== "normal") div.style.mixBlendMode = blendMode;

  const pattern = el.style.fillPattern ?? "solid";
  const color2  = el.style.fillColor2 ?? "#64748b";
  const elId    = el.id;
  const w       = el.layout.width;
  const h       = el.layout.height;

  // "hollow" — transparent fill, only stroke visible
  const svgFill = pattern === "hollow" ? "transparent" : fill;
  div.innerHTML = buildShapeSVG(shape, w, h, svgFill, stroke, strokeWidth, radius);

  const svg = div.querySelector("svg");
  if (svg) {
    const shapeEl = svg.querySelector("polygon,rect,circle,ellipse,path,line");

    if (pattern === "gradient" && el.style.fillColor2 && shapeEl) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = `<linearGradient id="sg-${elId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${fill}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>`;
      svg.insertBefore(defs, svg.firstChild);
      shapeEl.setAttribute("fill", `url(#sg-${elId})`);

    } else if (pattern === "stripes" && shapeEl) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = `<pattern id="sp-${elId}" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
        <rect width="6" height="12" fill="${fill}" />
        <rect x="6" width="6" height="12" fill="${color2}" />
      </pattern>`;
      svg.insertBefore(defs, svg.firstChild);
      shapeEl.setAttribute("fill", `url(#sp-${elId})`);

    } else if (pattern === "dots" && shapeEl) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = `<pattern id="dp-${elId}" patternUnits="userSpaceOnUse" width="14" height="14">
        <rect width="14" height="14" fill="${fill}" />
        <circle cx="7" cy="7" r="3.5" fill="${color2}" />
      </pattern>`;
      svg.insertBefore(defs, svg.firstChild);
      shapeEl.setAttribute("fill", `url(#dp-${elId})`);

    } else if (pattern === "grid" && shapeEl) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = `<pattern id="gp-${elId}" patternUnits="userSpaceOnUse" width="20" height="20">
        <rect width="20" height="20" fill="${fill}" />
        <path d="M0,0 H20 M0,0 V20" stroke="${color2}" stroke-width="1.5" />
      </pattern>`;
      svg.insertBefore(defs, svg.firstChild);
      shapeEl.setAttribute("fill", `url(#gp-${elId})`);

    } else if (pattern === "image" && el.content?.fillImageSrc && shapeEl) {
      const imgSrc = el.content.fillImageSrc;
      // Only wire up the pattern once the image has actually finished loading (see
      // ensureShapeFillImageLoaded, called from shapeContentKey). Until then, leave shapeEl's
      // solid `svgFill` in place — a rebuild will fire automatically once loading completes.
      if (isShapeFillImageLoaded(imgSrc)) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `<pattern id="ip-${elId}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">
          <image href="${imgSrc}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" />
        </pattern>`;
        svg.insertBefore(defs, svg.firstChild);
        shapeEl.setAttribute("fill", `url(#ip-${elId})`);
      }
    }
  }

  return div;
}

// ─── animated_stat ────────────────────────────────────────────────────────────

function buildAnimatedStatContent(el: ElementNode): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;";

  const value     = el.content?.text ?? "0";
  const label     = el.content?.label ?? "";
  const subvalue  = el.content?.statSubvalue ?? "";
  const accent    = el.style.color ?? "#60A5FA";
  const font      = el.style.fontFamily ? `'${el.style.fontFamily}',` : "";
  const valueFontSize = el.style.fontSize ?? Math.min(Math.round(el.layout.width / 3.5), 96);
  const labelFontSize = Math.max(11, Math.round(valueFontSize * 0.21));
  const subFontSize   = Math.max(10, Math.round(valueFontSize * 0.17));

  // Large value
  const valueEl = document.createElement("div");
  valueEl.style.cssText = `font-size:${valueFontSize}px;font-weight:900;font-family:${font}system-ui,sans-serif;color:white;line-height:1;letter-spacing:-0.02em;`;
  valueEl.textContent = value;
  wrap.appendChild(valueEl);

  // Accent divider + label
  if (label) {
    const rule = document.createElement("div");
    rule.style.cssText = `width:36px;height:3px;background:${accent};border-radius:2px;margin:10px 0 8px;flex-shrink:0;`;
    wrap.appendChild(rule);

    const labelEl = document.createElement("div");
    labelEl.style.cssText = `font-size:${labelFontSize}px;font-family:${font}system-ui,sans-serif;color:rgba(255,255,255,0.65);letter-spacing:0.09em;text-transform:uppercase;text-align:center;`;
    labelEl.textContent = label;
    wrap.appendChild(labelEl);
  }

  // Secondary stat
  if (subvalue) {
    const subEl = document.createElement("div");
    subEl.style.cssText = `font-size:${subFontSize}px;font-family:${font}system-ui,sans-serif;color:${accent};margin-top:5px;font-weight:600;`;
    subEl.textContent = subvalue;
    wrap.appendChild(subEl);
  }

  // Percentage progress bar (only when value ends with %)
  if (value.trimEnd().endsWith("%")) {
    const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
    const track = document.createElement("div");
    track.style.cssText = `width:75%;height:4px;background:rgba(255,255,255,0.12);border-radius:2px;margin-top:14px;overflow:hidden;flex-shrink:0;`;
    const fill = document.createElement("div");
    fill.style.cssText = `width:${pct}%;height:100%;background:${accent};border-radius:2px;`;
    track.appendChild(fill);
    wrap.appendChild(track);
  }

  return wrap;
}

// ─── graph ────────────────────────────────────────────────────────────────────

function _buildBarChartSVG(
  data: Array<{ label: string; value: number; color?: string }>,
  w: number, h: number,
  accent: string,
  progress: number
): string {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const padX = w * 0.06;
  const padBottom = h * 0.18;
  const padTop = h * 0.08;
  const chartH = h - padBottom - padTop;
  const chartW = w - padX * 2;
  const slotW = chartW / n;
  const barW = slotW * 0.55;
  const gapL = slotW * 0.225;
  const fontSize = Math.max(9, Math.round(w * 0.038));
  const axisY = padTop + chartH;

  let bars = "";
  let labels = "";
  for (let i = 0; i < n; i++) {
    const d = data[i];
    const staggerProg = Math.max(0, Math.min(1, progress * n - i * 0.6));
    const fullH = (d.value / maxVal) * chartH;
    const barH  = fullH * staggerProg;
    const x     = padX + i * slotW + gapL;
    const y     = padTop + chartH - barH;
    const col   = d.color ?? accent;

    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, barH).toFixed(1)}" rx="3" fill="${col}" opacity="0.9"/>`;

    if (staggerProg > 0.75) {
      const lop = ((staggerProg - 0.75) / 0.25).toFixed(2);
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" fill="white" opacity="${lop}" font-size="${fontSize}px" font-weight="600">${d.value}</text>`;
    }

    labels += `<text x="${(x + barW / 2).toFixed(1)}" y="${(h - padBottom * 0.18).toFixed(1)}" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-size="${(fontSize - 1)}px">${d.label}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="overflow:visible">
    <line x1="${padX}" y1="${axisY.toFixed(1)}" x2="${(w - padX).toFixed(1)}" y2="${axisY.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    ${bars}${labels}
  </svg>`;
}

function _buildLineChartSVG(
  data: Array<{ label: string; value: number; color?: string }>,
  w: number, h: number,
  accent: string,
  progress: number,
  elId: string
): string {
  if (data.length < 2) return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"/>`;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const padX = w * 0.08;
  const padBottom = h * 0.18;
  const padTop = h * 0.1;
  const chartH = h - padBottom - padTop;
  const chartW = w - padX * 2;
  const fontSize = Math.max(9, Math.round(w * 0.038));

  const pts = data.map((d, i) => ({
    x: padX + (i / (n - 1)) * chartW,
    y: padTop + chartH - (d.value / maxVal) * chartH,
  }));

  // Interpolate visible end point based on progress
  const rawIdx   = progress * (n - 1);
  const fullIdx  = Math.floor(rawIdx);
  const frac     = rawIdx - fullIdx;
  const visPts   = pts.slice(0, fullIdx + 1);
  if (fullIdx < n - 1) {
    visPts.push({
      x: pts[fullIdx].x + (pts[fullIdx + 1].x - pts[fullIdx].x) * frac,
      y: pts[fullIdx].y + (pts[fullIdx + 1].y - pts[fullIdx].y) * frac,
    });
  }

  const pStr  = visPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last  = visPts[visPts.length - 1];
  const aPath = `M${pStr.replace(/ /g, " L")} L${last.x.toFixed(1)},${(padTop + chartH).toFixed(1)} L${padX},${(padTop + chartH).toFixed(1)} Z`;

  let dots = "";
  let lbls = "";
  visPts.forEach((p, i) => {
    if (i < data.length) {
      dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${accent}"/>`;
    }
  });
  if (progress > 0.9) {
    const op = ((progress - 0.9) / 0.1).toFixed(2);
    data.forEach((d, i) => {
      lbls += `<text x="${pts[i].x.toFixed(1)}" y="${(h - padBottom * 0.18).toFixed(1)}" text-anchor="middle" fill="rgba(255,255,255,0.45)" opacity="${op}" font-size="${(fontSize - 1)}px">${d.label}</text>`;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="lg-${elId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${aPath}" fill="url(#lg-${elId})"/>
    <polyline points="${pStr}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${lbls}
  </svg>`;
}

function _buildDonutChartSVG(
  data: Array<{ label: string; value: number; color?: string }>,
  w: number, h: number,
  accent: string,
  progress: number
): string {
  const total   = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = w / 2, cy = h / 2;
  const r  = Math.min(w, h) * 0.37;
  const ir = r * 0.60;
  const palette = [accent, "#A78BFA", "#34D399", "#F97316", "#EC4899", "#60A5FA", "#FACC15"];

  let segments = "";
  let startDeg = -90;
  let cumPct = 0;

  for (let i = 0; i < data.length; i++) {
    const d     = data[i];
    const pct   = d.value / total;
    const col   = d.color ?? palette[i % palette.length];
    const segProg = Math.max(0, Math.min(1, (progress - cumPct) / pct));
    if (segProg <= 0) { cumPct += pct; continue; }

    const sweepDeg = pct * 360 * segProg;
    const rad1 = (startDeg * Math.PI) / 180;
    const rad2 = ((startDeg + sweepDeg) * Math.PI) / 180;
    const lArc = sweepDeg > 180 ? 1 : 0;

    const p = (rad: number, radius: number) => `${(cx + radius * Math.cos(rad)).toFixed(1)},${(cy + radius * Math.sin(rad)).toFixed(1)}`;
    const path = `M${p(rad1, r)} A${r},${r},0,${lArc},1,${p(rad2, r)} L${p(rad2, ir)} A${ir},${ir},0,${lArc},0,${p(rad1, ir)} Z`;
    segments += `<path d="${path}" fill="${col}"/>`;

    startDeg += pct * 360;
    cumPct   += pct;
  }

  const cx_ = cx.toFixed(1), cy_ = cy.toFixed(1);
  const biggest = data.reduce((a, b) => a.value > b.value ? a : b);
  const centerLabel = progress > 0.85 ? `
    <text x="${cx_}" y="${(cy - r * 0.08).toFixed(1)}" text-anchor="middle" fill="white" font-size="${Math.round(r * 0.44)}px" font-weight="800">${biggest.value}</text>
    <text x="${cx_}" y="${(cy + r * 0.28).toFixed(1)}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="${Math.round(r * 0.18)}px">${biggest.label}</text>
  ` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <circle cx="${cx_}" cy="${cy_}" r="${r}" fill="rgba(255,255,255,0.04)"/>
    ${segments}
    ${centerLabel}
  </svg>`;
}

function buildGraphContent(el: ElementNode): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;inset:0;overflow:hidden;";

  const data      = el.content?.chartData ?? [
    { label: "A", value: 60 }, { label: "B", value: 85 },
    { label: "C", value: 45 }, { label: "D", value: 92 }, { label: "E", value: 70 },
  ];
  const chartType = el.content?.chartType ?? "bar";
  const progress  = el.content?.lineDrawProgress ?? 1;
  const accent    = el.style.color ?? "#60A5FA";
  const w = el.layout.width, h = el.layout.height;

  switch (chartType) {
    case "line":
      div.innerHTML = _buildLineChartSVG(data, w, h, accent, progress, el.id);
      break;
    case "donut":
      div.innerHTML = _buildDonutChartSVG(data, w, h, accent, progress);
      break;
    default:
      div.innerHTML = _buildBarChartSVG(data, w, h, accent, progress);
  }

  return div;
}

function buildVideoContent(el: ElementNode): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;inset:0;overflow:hidden;";

  const src = normalizeAssetSrc(el.content?.src);
  if (!src || src.startsWith("placeholder://")) {
    div.style.background = el.style.backgroundColor ?? "#7c3aed";
    return div;
  }

  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;`;
  if (el.style.borderRadius) video.style.borderRadius = `${el.style.borderRadius}px`;
  if (el.style.blendMode && el.style.blendMode !== "normal")
    video.style.mixBlendMode = el.style.blendMode;

  div.appendChild(video);
  return div;
}

// ─── CSSSceneRenderer ─────────────────────────────────────────────────────────

export class CSSSceneRenderer {
  private container: HTMLElement | null = null;
  private sceneRoot: HTMLElement | null = null;
  // Two scene layers for cross-scene transitions
  private currentLayer: HTMLElement | null = null;
  private incomingLayer: HTMLElement | null = null;
  private currentSceneId: string | null = null;
  private svgDefsContainer: SVGDefsElement | null = null;

  // Per-layer element caches (current vs incoming during transitions)
  private currentCache: Map<string, ElementCacheEntry> = new Map();
  private incomingCache: Map<string, ElementCacheEntry> = new Map();

  // Video elements keyed by element id (for seeking)
  private videoEls: Map<string, HTMLVideoElement> = new Map();

  // Composition PixiJS overlay
  private compCanvas: HTMLCanvasElement | null = null;
  private compPixi: PixiModule | null = null;
  private compApp: any | null = null;
  private compNodes: Map<string, { node: any; key: string }> = new Map();
  private compRoot: any | null = null;
  private _compTextureCache: Map<string, unknown> = new Map();
  private _lastRenderInput: RenderFrameInput | null = null;

  // Static element lookup — used to get pre-animation layout for WAAPI-animated elements
  private _staticElementLookup: Map<string, ElementNode> = new Map();

  // Playback
  private project: ProjectDocument;
  private _playbackTimeFn: (() => number | null) | null = null;
  private _showAllFn: (() => boolean) | null = null;
  private _rafId: number | null = null;
  private _destroyed = false;
  private _onShapeFillImageLoaded: (() => void) | null = null;

  constructor(project: ProjectDocument, _options?: { backgroundColor?: string }) {
    this.project = project;
  }

  setProject(project: ProjectDocument): void {
    this.project = project;
    // Rebuild static lookup so WAAPI animations can read pre-animation layout
    this._staticElementLookup = new Map();
    if (project?.scenes) {
      for (const scene of project.scenes) {
        if (scene?.elements) {
          for (const el of scene.elements) {
            this._staticElementLookup.set(el.id, el);
          }
        }
      }
    }
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;

    // A shape's image fill may still be loading when first painted — this fires a re-render
    // pass once it resolves (see shapeContentKey/isShapeFillImageLoaded in the module scope
    // above) so the shape doesn't get stuck showing its default fill until an unrelated edit
    // happens to force a rebuild. Deliberately unconditional on `_rafId`: the editor's preview
    // (PreviewCanvas.tsx) calls setPlaybackProvider() once on mount and never tears the RAF loop
    // back down for pause, so `_rafId` stays truthy essentially forever there — gating on it
    // being falsy (as if that meant "playback stopped, force a redraw") meant this never fired
    // in the live editor, only in the headless exporter where no playback loop exists at all.
    this._onShapeFillImageLoaded = () => {
      if (this._lastRenderInput) {
        this.renderFrame(this._lastRenderInput);
      }
    };
    shapeFillImageListeners.add(this._onShapeFillImageLoaded);

    // Root: fills the container, clips to viewport
    const root = document.createElement("div");
    root.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;background:#000;";
    this.sceneRoot = root;

    // SVG filter defs (chromatic aberration, noise, etc.)
    const defsEl = document.createElement("div");
    defsEl.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    defsEl.innerHTML = buildSceneSVGFilterDefs(0, 0);
    root.appendChild(defsEl);
    this.svgDefsContainer = defsEl.querySelector("#kwikk-svg-defs") as SVGDefsElement | null;

    // Static keyframes style block
    const styleEl = document.createElement("style");
    styleEl.textContent = `
@keyframes vhs-tracking-displace {
  0%, 100% {
    clip-path: inset(0 0 0 0);
    transform: translate(0, 0);
  }
  10% {
    clip-path: inset(10% 0 85% 0);
    transform: translate(5px, 2px);
  }
  11% {
    clip-path: inset(0 0 0 0);
    transform: translate(0, 0);
  }
  30% {
    clip-path: inset(70% 0 25% 0);
    transform: translate(-7px, -1px);
  }
  32% {
    clip-path: inset(0 0 0 0);
    transform: translate(0, 0);
  }
  70% {
    clip-path: inset(40% 0 55% 0);
    transform: translate(8px, 1px);
  }
  71% {
    clip-path: inset(0 0 0 0);
    transform: translate(0, 0);
  }
}
@keyframes glow-pulse {
  0% {
    box-shadow: var(--z-depth-shadow, 0 0 0 transparent), 0 0 var(--glow-blur-min, 10px) var(--glow-color, rgba(255,255,255,0.5));
  }
  100% {
    box-shadow: var(--z-depth-shadow, 0 0 0 transparent), 0 0 var(--glow-blur-max, 30px) var(--glow-color, rgba(255,255,255,0.9));
  }
}
@keyframes march-ants {
  to {
    stroke-dashoffset: -20;
  }
}
@keyframes dash-flow {
  to {
    stroke-dashoffset: -40;
  }
}
@keyframes border-spin {
  to {
    transform: rotate(360deg);
  }
}
    `;
    root.appendChild(styleEl);

    // Two scene layers
    const current = document.createElement("div");
    current.style.cssText = "position:absolute;inset:0;";
    const incoming = document.createElement("div");
    incoming.style.cssText = "position:absolute;inset:0;opacity:0;pointer-events:none;";
    root.appendChild(current);
    root.appendChild(incoming);
    this.currentLayer = current;
    this.incomingLayer = incoming;

    container.innerHTML = "";
    container.appendChild(root);

    // Composition canvas overlay (PixiJS, lazy-loaded)
    this._initCompositionLayer().catch(() => {/* non-critical */});

    // Fonts: browser loads them automatically — wait for document.fonts.ready with a 1s timeout fallback
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
      } catch (err) {
        console.warn("Font loading wait timed out or failed:", err);
      }
    }
  }

  // ── Playback provider ──────────────────────────────────────────────────────

  setPlaybackProvider(
    timeFn: (() => number | null) | null,
    showAllFn?: () => boolean
  ): void {
    this._playbackTimeFn = timeFn;
    this._showAllFn = showAllFn ?? null;
    if (timeFn && !this._rafId) {
      const loop = () => {
        if (this._destroyed) return;
        this._tick();
        this._rafId = requestAnimationFrame(loop);
      };
      this._rafId = requestAnimationFrame(loop);
    } else if (!timeFn && this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private _tick(): void {
    if (!this._playbackTimeFn) return;
    const t = this._playbackTimeFn();
    if (t === null) return;
    const showAll = this._showAllFn?.() ?? false;
    this._lastRenderInput = { timeMs: t, showAllElements: showAll };
    const frame = resolveRenderFrame(this.project, this._lastRenderInput);
    this._drawFrame(frame);
  }

  // ── Public renderFrame ─────────────────────────────────────────────────────

  renderFrame(input: RenderFrameInput): void {
    this._lastRenderInput = input;
    const frame = resolveRenderFrame(this.project, input);
    this._drawFrame(frame);
  }

  // ── Core draw ──────────────────────────────────────────────────────────────

  private _drawFrame(frame: ResolvedRenderFrame): void {
    if (!this.sceneRoot || !this.currentLayer || !this.incomingLayer) return;

    const { viewport } = frame;
    // getBoundingClientRect forces a layout flush and always returns accurate dimensions,
    // even when called mid-task (before the next browser paint).
    const rect = this.container?.getBoundingClientRect();
    const containerW = rect?.width ?? 0;
    const containerH = rect?.height ?? 0;
    if (!containerW || !containerH) return; // container not laid out yet — fallback timer will retry
    const scale = Math.min(containerW / viewport.width, containerH / viewport.height);
    const frameW = viewport.width * scale;
    const frameH = viewport.height * scale;
    const offsetX = (containerW - frameW) / 2;
    const offsetY = (containerH - frameH) / 2;

    // Update scene root clip/size
    this.sceneRoot.style.width  = `${containerW}px`;
    this.sceneRoot.style.height = `${containerH}px`;

    const sceneStyle = `position:absolute;left:${offsetX}px;top:${offsetY}px;width:${viewport.width}px;height:${viewport.height}px;transform:scale(${scale});transform-origin:0 0;overflow:hidden;`;
    this.currentLayer.style.cssText = sceneStyle;
    this.incomingLayer.style.cssText = sceneStyle;

    // Detect scene change and set up transition
    const tw = getTransitionWindow(this.project, frame.timeMs);
    const inTransition = !!tw;

    if (frame.sceneId !== this.currentSceneId && !inTransition) {
      // Scene changed (hard cut or transition just ended).
      // Swap incoming cache into current so we don't re-build elements that
      // were already rendered into incomingLayer during the just-finished transition.
      this._evictLayer(this.currentCache, this.currentLayer);
      for (const entry of this.incomingCache.values()) {
        this.currentLayer!.appendChild(entry.outer);
      }
      const tmpCache = this.currentCache;
      this.currentCache = this.incomingCache;
      this.incomingCache = tmpCache;
      this.incomingCache.clear();
      this.currentSceneId = frame.sceneId;
    }

    // Background for current scene
    this._applyBackground(this.currentLayer, frame.backgroundColor, frame.background, viewport.width, viewport.height);

    // Render current scene elements
    this._updateLayer(this.currentLayer, this.currentCache, frame);

    // Transition overlay — render incoming scene into incomingLayer
    if (inTransition && tw) {
      const incomingFrame = this._buildIncomingFrame(tw, frame);
      this._applyBackground(this.incomingLayer, incomingFrame.backgroundColor, incomingFrame.background, viewport.width, viewport.height);
      this._updateLayer(this.incomingLayer, this.incomingCache, incomingFrame);
      this.incomingLayer.style.display = "";
      const progress = tw.progress ?? 0;
      this._applyTransitionCSS(
        this.currentLayer,
        this.incomingLayer,
        tw.type as SceneTransition["type"],
        progress,
        sceneStyle
      );
    } else {
      this.incomingLayer.style.opacity = "0";
      this.incomingLayer.style.pointerEvents = "none";
    }

    // Compositions (PixiJS canvas layer)
    this._updateCompositions(frame);
  }

  // ── Layer update ───────────────────────────────────────────────────────────

  private _updateLayer(
    layer: HTMLElement,
    cache: Map<string, ElementCacheEntry>,
    frame: ResolvedRenderFrame
  ): void {
    const activeIds = new Set(frame.elements.map((e) => e.id));

    // Remove elements no longer in frame
    for (const [id, entry] of cache) {
      if (!activeIds.has(id)) {
        for (const ma of entry.wapiAnims) cancelManagedAnimation(ma);
        entry.outer.remove();
        cache.delete(id);
        this.videoEls.delete(id);
        // Also remove dynamic SVG nodes for this element ID from defs
        if (this.svgDefsContainer) {
          const dtNode = this.svgDefsContainer.querySelector(`#kwikk-duotone-${id}`);
          if (dtNode) dtNode.remove();
          const clNode = this.svgDefsContainer.querySelector(`#kwikk-clip-${id}`);
          if (clNode) clNode.remove();
        }
      }
    }

    for (const el of frame.elements) {
      const newKey = getContentKey(el);
      let entry = cache.get(el.id);

      if (!entry || entry.contentKey !== newKey) {
        // Cancel old WAAPI animations before rebuilding
        if (entry) {
          for (const ma of entry.wapiAnims) cancelManagedAnimation(ma);
          // remove old dynamic SVG nodes from defs
          if (this.svgDefsContainer) {
            const dtNode = this.svgDefsContainer.querySelector(`#kwikk-duotone-${el.id}`);
            if (dtNode) dtNode.remove();
            const clNode = this.svgDefsContainer.querySelector(`#kwikk-clip-${el.id}`);
            if (clNode) clNode.remove();
          }
        }

        // Rebuild DOM for this element
        const outer = entry?.outer ?? document.createElement("div");
        outer.style.cssText = `position:absolute;left:0;top:0;width:${el.layout.width}px;height:${el.layout.height}px;transform-origin:0 0;`;
        outer.dataset.kwikkId = el.id;

        const content = this._buildContent(el);
        outer.innerHTML = "";

        // Custom CSS scoped style tag + its own wrapper. This wrapper — never
        // `outer` — is what the scoped `:root` selector targets. `outer` owns
        // the base positioning transform (_applyTransform sets it as an inline
        // style every frame); a native CSS `animation` targeting the same
        // `transform` property on the same element always overrides an inline
        // value for as long as it's running, regardless of specificity —
        // clobbering x/y layout entirely and collapsing every animated element
        // onto the same on-screen spot. Scoping to this child instead lets the
        // animated transform compose naturally on top of outer's positioning
        // via ordinary nested-transform rendering, matching the "relative
        // offset" contract documented in describe_custom_css_animation.
        let customStyleEl: HTMLStyleElement | null = null;
        let customAnimEl: HTMLElement | null = null;
        if (el.style.customCSS) {
          customAnimEl = document.createElement("div");
          customAnimEl.style.cssText = "position:absolute;inset:0;";
          const scopeId = `kwikk-el-${el.id}`;
          customAnimEl.id = scopeId;
          customAnimEl.appendChild(content);

          customStyleEl = document.createElement("style");
          customStyleEl.textContent = scopeCustomCSS(el.style.customCSS, scopeId);
          customAnimEl.appendChild(customStyleEl);

          outer.appendChild(customAnimEl);
        } else {
          outer.appendChild(content);
        }

        // Vignette overlay
        let vignetteEl: HTMLElement | null = null;
        const vigIntensity = (el.style.filters?.vignette ?? 0);
        if (vigIntensity > 0) {
          vignetteEl = document.createElement("div");
          vignetteEl.style.cssText = vignetteStyle(vigIntensity);
          outer.appendChild(vignetteEl);
        }

        // Dynamic Overlays & Filters Injection
        const f = el.style.filters;

        // 1. Scanlines
        if (f?.scanlines !== undefined && f.scanlines > 0) {
          const scanIntensity = f.scanlines;
          const scanlinesEl = document.createElement("div");
          scanlinesEl.style.cssText = [
            "position:absolute",
            "inset:0",
            "pointer-events:none",
            "border-radius:inherit",
            `background:repeating-linear-gradient(transparent 0px, transparent 2px, rgba(0,0,0,${(scanIntensity * 0.5).toFixed(2)}) 2px, rgba(0,0,0,${(scanIntensity * 0.5).toFixed(2)}) 4px)`,
            "mix-blend-mode:multiply",
          ].join(";");
          outer.appendChild(scanlinesEl);
        }

        // 2. Tilt-shift
        if (f?.tilt_shift) {
          const tsEl = document.createElement("div");
          tsEl.style.cssText = [
            "position:absolute",
            "inset:0",
            "pointer-events:none",
            "border-radius:inherit",
            "-webkit-mask-image:linear-gradient(to bottom, black 0%, transparent 25%, transparent 75%, black 100%)",
            "mask-image:linear-gradient(to bottom, black 0%, transparent 25%, transparent 75%, black 100%)",
            "backdrop-filter:blur(8px)",
          ].join(";");
          outer.appendChild(tsEl);
        }

        // 3. Light leak
        if (f?.light_leak) {
          const ll = f.light_leak;
          const llEl = document.createElement("div");
          const colorRgb = hexToRgba(ll.color, ll.alpha);
          llEl.style.cssText = [
            "position:absolute",
            "inset:0",
            "pointer-events:none",
            "border-radius:inherit",
            `background:linear-gradient(${ll.angle}deg, ${colorRgb}, transparent)`,
            "mix-blend-mode:screen",
          ].join(";");
          outer.appendChild(llEl);
        }

        // 4. Anamorphic flare
        if (f?.anamorphic_flare !== undefined && f.anamorphic_flare > 0) {
          const af = f.anamorphic_flare;
          const afEl = document.createElement("div");
          afEl.style.cssText = [
            "position:absolute",
            "top:calc(50% - 4px)",
            "left:0",
            "width:100%",
            "height:8px",
            "pointer-events:none",
            `background:linear-gradient(to right, transparent 0%, rgba(136,204,255,${af * 0.5}) 20%, rgba(136,204,255,${af}) 50%, rgba(136,204,255,${af * 0.5}) 80%, transparent 100%)`,
            "mix-blend-mode:screen",
            "filter:blur(3px)",
          ].join(";");
          outer.appendChild(afEl);
        }

        // 5. Lens flare
        if (f?.lens_flare) {
          const lf = f.lens_flare;
          const lfEl = document.createElement("div");
          const lr = Math.min(el.layout.width, el.layout.height) * 0.08 * lf.intensity;
          lfEl.style.cssText = [
            "position:absolute",
            `left:${lf.x * 100}%`,
            `top:${lf.y * 100}%`,
            "transform:translate(-50%, -50%)",
            "pointer-events:none",
            `width:${lr * 4}px`,
            `height:${lr * 4}px`,
            `background:radial-gradient(circle, rgba(255,255,255,${0.7 * lf.intensity}) 0%, rgba(255,238,170,${0.25 * lf.intensity}) 25%, transparent 70%)`,
            "mix-blend-mode:screen",
          ].join(";");
          outer.appendChild(lfEl);
        }

        // 6. VHS tracking scanlines & content displacement animation
        if (f?.vhs_tracking) {
          content.style.animation = "vhs-tracking-displace 6s linear infinite";
          if (!f.scanlines) {
            const scanlinesEl = document.createElement("div");
            scanlinesEl.style.cssText = [
              "position:absolute",
              "inset:0",
              "pointer-events:none",
              "border-radius:inherit",
              `background:repeating-linear-gradient(transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)`,
              "mix-blend-mode:multiply",
            ].join(";");
            outer.appendChild(scanlinesEl);
          }
        }

        // SVG Dynamic Filters (duotone)
        if (f?.duotone && this.svgDefsContainer) {
          const duo = f.duotone;
          const matrixValues = getDuotoneMatrixValues(duo.color1, duo.color2);
          const filterNode = document.createElementNS("http://www.w3.org/2000/svg", "filter");
          filterNode.setAttribute("id", `kwikk-duotone-${el.id}`);
          filterNode.innerHTML = `<feColorMatrix type="matrix" values="${matrixValues}" />`;
          this.svgDefsContainer.appendChild(filterNode);
        }

        // SVG Clip Path
        if (el.clipShape && this.svgDefsContainer) {
          const clipNode = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
          clipNode.setAttribute("id", `kwikk-clip-${el.id}`);
          clipNode.innerHTML = svgShapeMarkup(el.clipShape, el.layout.width, el.layout.height, "black", "none", 0, el.style.borderRadius ?? 0);
          this.svgDefsContainer.appendChild(clipNode);
          outer.style.clipPath = `url(#kwikk-clip-${el.id})`;
        } else {
          outer.style.clipPath = "";
        }

        // Border animations
        if (el.borderAnimation) {
          const borderAnim = el.borderAnimation;
          const borderRadius = el.style.borderRadius ?? 0;
          const borderColor = el.style.borderColor ?? "#ffffff";
          
          if (borderAnim === "marching_ants") {
            const antsOverlay = document.createElement("div");
            antsOverlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:visible;";
            antsOverlay.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:-1px;width:calc(100% + 2px);height:calc(100% + 2px);pointer-events:none;overflow:visible">
                <rect x="0" y="0" width="100%" height="100%" rx="${borderRadius}" ry="${borderRadius}" fill="none" stroke="${borderColor}" stroke-width="2" stroke-dasharray="6, 4" style="animation: march-ants 1s linear infinite" />
              </svg>
            `;
            outer.appendChild(antsOverlay);
          } else if (borderAnim === "dash_flow") {
            const flowOverlay = document.createElement("div");
            flowOverlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:visible;";
            flowOverlay.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:-1.5px;width:calc(100% + 3px);height:calc(100% + 3px);pointer-events:none;overflow:visible">
                <rect x="0" y="0" width="100%" height="100%" rx="${borderRadius}" ry="${borderRadius}" fill="none" stroke="${borderColor}" stroke-width="3" stroke-dasharray="15, 10" style="animation: dash-flow 1.5s linear infinite" />
              </svg>
            `;
            outer.appendChild(flowOverlay);
          } else if (borderAnim === "gradient_spin") {
            const borderOverlay = document.createElement("div");
            borderOverlay.style.cssText = [
              "position:absolute",
              "inset:-3px",
              `border-radius:${borderRadius + 3}px`,
              "pointer-events:none",
              "overflow:hidden",
              "padding:3px",
              "box-sizing:border-box",
              "-webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              "-webkit-mask-composite:xor",
              "mask-composite:exclude"
            ].join(";");
            
            const spinner = document.createElement("div");
            spinner.style.cssText = [
              "position:absolute",
              "inset:-50%",
              "background:conic-gradient(from 0deg, #ff007f, #7f00ff, #00ffff, #ff007f)",
              "animation:border-spin 3s linear infinite"
            ].join(";");
            
            borderOverlay.appendChild(spinner);
            outer.appendChild(borderOverlay);
          }
        }

        // Reflection
        let reflectionEl: HTMLElement | null = null;
        if (el.reflectionOpacity && el.reflectionOpacity > 0) {
          reflectionEl = document.createElement("div");
          reflectionEl.style.cssText = [
            "position:absolute",
            `top:${el.layout.height}px`,
            "left:0",
            `width:100%`,
            `height:100%`,
            "transform:scaleY(-1)",
            "transform-origin:top",
            `opacity:${el.reflectionOpacity}`,
            "pointer-events:none",
            "-webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 80%)",
            "mask-image:linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 80%)",
          ].join(";");
          
          const reflectionContent = content.cloneNode(true) as HTMLElement;
          const refVideos = reflectionContent.querySelectorAll("video");
          for (const v of Array.from(refVideos)) {
            v.muted = true;
            v.removeAttribute("autoplay");
            v.setAttribute("playsinline", "");
          }
          reflectionEl.appendChild(reflectionContent);
          outer.appendChild(reflectionEl);
        }

        // Char spans for text elements
        const charSpans = this._extractCharSpans(content, el);

        // Cache video ref for seeking
        const video = content.querySelector("video") as HTMLVideoElement | null;
        if (video) this.videoEls.set(el.id, video);

        // WAAPI animations — one ManagedAnimation per AnimationTrack that has a CSS spec
        const staticEl = this._staticElementLookup.get(el.id);
        const wapiAnims: ManagedAnimation[] = [];
        for (const anim of staticEl?.animations ?? el.animations ?? []) {
          const ma = createManagedAnimation(outer, anim);
          if (ma) wapiAnims.push(ma);
        }

        if (!entry) {
          layer.appendChild(outer);
        }

        entry = { outer, content, wapiAnims, charSpans, vignetteEl, customStyleEl, customAnimEl, contentKey: newKey, elementId: el.id, reflectionEl };
        cache.set(el.id, entry);
      }

      // ── Per-frame updates ──────────────────────────────────────────────────
      // Opacity is ALWAYS sourced from the animation-engine (el.layout.opacity).
      // WAAPI only handles transforms — no opacity keyframes — so there is no
      // WAAPI vs inline-style conflict.
      const hasWaapi = entry.wapiAnims.length > 0;

      if (hasWaapi) {
        if (frame.showAllElements) {
          // Show-all mode: base position + park WAAPI transforms at their end state
          // so elements appear at their final position rather than their entry offset.
          entry.outer.style.opacity = String(Math.max(0, Math.min(1, el.layout.opacity)));
          this._applyTransform(entry.outer, el);  // el.layout = base (no anim offsets in showAll)
          for (const ma of entry.wapiAnims) scrubManagedAnimation(ma, ma.startMs + ma.durationMs);
        } else {
          // Normal playback: static layout as base, WAAPI adds transform offset on top
          const staticEl = this._staticElementLookup.get(el.id) ?? el;
          this._applyTransform(entry.outer, staticEl);
          // animation.startMs is element-relative, so scrub with element-local time
          const elLocalMs = frame.localTimeMs - (el.startMs ?? 0);

          // Hide element while ALL its WAAPI animations are still in their delay phase.
          // Without this, elements with startMs > 0 flash at natural state (scale=1,
          // opacity=1) before their entrance animation begins, then jump to the
          // start keyframe — causing a visible "pop back and animate" artifact.
          const allDelayed = entry.wapiAnims.every(
            (ma) => ma.iterations !== Infinity && elLocalMs < ma.startMs
          );
          entry.outer.style.opacity = allDelayed
            ? "0"
            : String(Math.max(0, Math.min(1, el.layout.opacity)));

          for (const ma of entry.wapiAnims) scrubManagedAnimation(ma, elLocalMs);
        }
      } else {
        // No WAAPI: animation-engine computed layout for both position and opacity
        entry.outer.style.opacity = String(Math.max(0, Math.min(1, el.layout.opacity)));
        this._applyTransform(entry.outer, el);
      }

      const defaultZ = el.type === "text" ? 5 : (el.type === "image" || el.type === "video") ? 2 : 1;
      entry.outer.style.zIndex  = String(el.layout.zIndex ?? defaultZ);
      entry.outer.style.display = el.layout.visible === false ? "none" : "";
      entry.outer.style.mixBlendMode = (el.style.blendMode && el.style.blendMode !== "normal")
        ? el.style.blendMode : "";

      // CSS filter (animated effects + static)
      const effects = resolveAnimatedEffects(el, frame.localTimeMs);
      
      // Calculate motion blur decay
      let motionBlurAmount = 0;
      if (el.motionBlur && el.motionBlur > 0) {
        const anims = el.animations ?? [];
        for (const anim of anims) {
          const isEntrance = anim.type.toLowerCase().endsWith("in") || 
                             anim.type.toLowerCase().includes("_in") || 
                             ["stomp", "stamp", "slam_down", "pop_in", "spring_in", "drift_in", "spiral_in", "flip_in_x", "swoop_in", "bouncein", "rotatein", "fadein", "zoomin", "tumble_in", "glitch_in"].includes(anim.type.toLowerCase());
          if (isEntrance) {
            const elapsed = frame.localTimeMs - anim.startMs;
            if (elapsed < 0) {
              motionBlurAmount = Math.max(motionBlurAmount, el.motionBlur);
            } else if (elapsed <= anim.durationMs) {
              const ratio = 1 - (elapsed / anim.durationMs);
              motionBlurAmount = Math.max(motionBlurAmount, el.motionBlur * ratio);
            }
          }
        }
      }
      
      if (motionBlurAmount > 0) {
        effects.blur = (effects.blur ?? 0) + motionBlurAmount * 20;
      }

      // zDepth box shadow and perspective transform base rotation
      const z = el.zDepth ?? 0;
      const shadowStr = z > 0 
        ? `0 ${Math.round(z * 10)}px ${Math.round(z * 20)}px rgba(0,0,0,0.4)`
        : "0 0 0px transparent";
      entry.outer.style.setProperty("--z-depth-shadow", shadowStr);
      if (!el.glowPulse) {
        entry.outer.style.boxShadow = shadowStr;
      }

      // glowPulse variables and animation
      if (el.glowPulse) {
        const { color, intensity, speed } = el.glowPulse;
        entry.outer.style.setProperty("--glow-color", color);
        entry.outer.style.setProperty("--glow-blur-min", `${Math.round(intensity * 5)}px`);
        entry.outer.style.setProperty("--glow-blur-max", `${Math.round(intensity * 25)}px`);
        
        const durationSec = 2 / (speed || 1);
        entry.outer.style.animation = `glow-pulse ${durationSec.toFixed(2)}s ease-in-out infinite alternate`;
      } else {
        // Safe to always clear — customCSS's own scoped animation now runs on
        // customAnimEl (a child of outer), never on outer itself.
        entry.outer.style.animation = "";
      }

      const filterStr = buildCSSFilter(el.style.filters, effects, el.id);
      if (filterStr) entry.content.style.filter = filterStr;

      // Char animations
      if (entry.charSpans && hasCharLevelAnimations(el)) {
        this._updateCharSpans(entry.charSpans, el, frame.localTimeMs);
      }

      // Video seeking
      this._seekVideo(el, frame.localTimeMs);

      // Custom CSS animation sync (negative animation-delay = seek). Must target
      // customAnimEl, not outer — that's the element the scoped `animation:`
      // rule actually runs on (see the note where customAnimEl is created).
      // Elapsed time is element-local (frame.localTimeMs - el.startMs), same
      // convention as elLocalMs above for WAAPI — frame.timeMs is the absolute
      // project timeline position, wrong for any scene after the first.
      if (el.style.customCSS && entry.customAnimEl) {
        const elLocalMsForCustomCSS = frame.localTimeMs - (el.startMs ?? 0);
        this._syncCustomAnimation(entry.customAnimEl, el.style.customCSS, elLocalMsForCustomCSS);
      }
    }
  }

  // ── Content builders dispatch ─────────────────────────────────────────────

  private _buildContent(el: ElementNode): HTMLElement {
    switch (el.type) {
      case "text":          return buildTextContent(el);
      case "image":         return buildImageContent(el);
      case "shape":         return buildShapeContent(el);
      case "video":         return buildVideoContent(el);
      case "animated_stat": return buildAnimatedStatContent(el);
      case "graph":         return buildGraphContent(el);
      default: {
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;inset:0;background:${el.style.backgroundColor ?? "#334155"};`;
        return d;
      }
    }
  }

  // ── Transform ─────────────────────────────────────────────────────────────

  private _applyTransform(outer: HTMLElement, el: ElementNode): void {
    const { x, y, scale, rotation, flipX, flipY, width, height } = el.layout;
    const scaleX = scale * (flipX ? -1 : 1);
    const scaleY = scale * (flipY ? -1 : 1);
    const tx = flipX ? x + width : x;
    const ty = flipY ? y + height : y;
    // transform-origin: 0 0 — matches PixiJS default pivot (top-left)
    let transformStr = `translate(${tx}px,${ty}px) scale(${scaleX},${scaleY}) rotate(${rotation}deg)`;
    if (el.zDepth !== undefined && el.zDepth !== 0) {
      const deg = el.zDepth * 10;
      transformStr += ` perspective(800px) rotateX(${deg}deg)`;
    }
    outer.style.transform = transformStr;
  }

  // ── Char spans ────────────────────────────────────────────────────────────

  private _extractCharSpans(content: HTMLElement, el: ElementNode): HTMLElement[] | null {
    if (!hasCharLevelAnimations(el)) return null;
    return Array.from(content.querySelectorAll("span")) as HTMLElement[];
  }

  private _updateCharSpans(spans: HTMLElement[], el: ElementNode, localTimeMs: number): void {
    const states: CharState[] | null = resolveCharAnimations(el, localTimeMs);
    if (!states) return;
    for (let i = 0; i < spans.length && i < states.length; i++) {
      const s = states[i];
      const span = spans[i];
      span.style.transform = `translate(${s.offsetX}px,${s.offsetY}px) scale(${s.scaleX},${s.scaleY}) rotate(${s.rotation}deg)`;
      span.style.opacity   = String(Math.max(0, Math.min(1, s.opacity)));
      if (s.blur !== undefined && s.blur > 0) {
        span.style.filter = `blur(${s.blur}px)`;
      } else {
        span.style.filter = "";
      }
      if ((s as any).colorOverride) span.style.color = (s as any).colorOverride;
      if ((s as any).charOverride !== undefined) {
        const ch = (s as any).charOverride;
        span.textContent = ch === " " ? " " : ch;
      }
    }
  }

  // ── Video seeking ──────────────────────────────────────────────────────────

  private _seekVideo(el: ElementNode, localTimeMs: number): void {
    if (el.type !== "video") return;
    const video = this.videoEls.get(el.id);
    if (!video) return;
    const trimStart = el.content?.trimStartMs ?? 0;
    const trimEnd   = el.content?.trimEndMs ?? (el.content?.videoDurationMs ?? 0);
    const rate      = el.content?.playbackRate ?? 1;
    const srcMs     = trimStart + localTimeMs * rate;
    const clampedMs = Math.max(0, trimEnd > 0 ? Math.min(srcMs, trimEnd) : srcMs);
    const targetS   = clampedMs / 1000;
    if (Math.abs(video.currentTime - targetS) > 0.033) {
      video.currentTime = targetS;
    }

    // Sync reflection video if present
    const entry = this.currentCache.get(el.id) ?? this.incomingCache.get(el.id);
    if (entry?.reflectionEl) {
      const refVideo = entry.reflectionEl.querySelector("video");
      if (refVideo && Math.abs(refVideo.currentTime - targetS) > 0.033) {
        refVideo.currentTime = targetS;
      }
    }
  }

  // ── Custom CSS animation sync ──────────────────────────────────────────────

  private _syncCustomAnimation(el: HTMLElement, customCSS: string, elapsedMs: number): void {
    // Only engage if the custom CSS declares an animation
    if (!customCSS.includes("animation")) return;
    const durationMatch = customCSS.match(/animation(?:-duration)?\s*:\s*[\w,\s]*?([\d.]+)\s*ms/);
    const duration = durationMatch ? parseFloat(durationMatch[1]) : 1000;
    const iterationCount = parseCustomAnimationIterationCount(customCSS);

    // `elapsed % duration` here used to be unconditional — correct for an
    // infinite loop (mirrors scrubManagedAnimation's WAAPI equivalent), but it
    // also wrapped one-shot (iteration-count:1, the default) animations
    // forever, so anything authored to play once and hold via fill:forwards/
    // both instead bounced/looped for the entire scene. Finite animations must
    // clamp to their total active window once elapsed passes it — a paused
    // CSS animation seeked to exactly that boundary correctly renders (and
    // holds) the terminal keyframe via fill-mode, same guarantee the WAAPI
    // path gets for free from Animation.currentTime's own clamping.
    const clampedElapsed = iterationCount === Infinity
      ? Math.max(0, elapsedMs)
      : Math.min(Math.max(0, elapsedMs), duration * iterationCount);

    el.style.animationPlayState = "paused";
    el.style.animationDelay     = `-${clampedElapsed.toFixed(1)}ms`;
  }

  // ── Incoming frame builder ────────────────────────────────────────────────

  private _buildIncomingFrame(tw: TransitionWindow, outerFrame: ResolvedRenderFrame): ResolvedRenderFrame {
    const { incoming } = tw;
    const { scene } = incoming;
    const localTimeMs = incoming.localTimeMs;

    const elements: ElementNode[] = [];
    for (const element of scene.elements) {
      const s = element.startMs ?? 0;
      const e = element.endMs ?? scene.durationMs;
      if (localTimeMs >= s && localTimeMs <= e) {
        elements.push(resolveElementNodeAtTime(element, localTimeMs));
      }
    }
    elements.sort((left, right) => {
      const zOf = (el: ElementNode) =>
        el.layout.zIndex ?? (el.type === "text" ? 5 : el.type === "image" || el.type === "video" ? 2 : 1);
      return zOf(left) - zOf(right);
    });

    const compositions: CompositionNode[] = [];
    if (scene.compositions) {
      for (const comp of scene.compositions) {
        const s = comp.startMs ?? 0;
        const e = comp.endMs ?? scene.durationMs;
        if (localTimeMs >= s && localTimeMs <= e) compositions.push(comp);
      }
    }

    return {
      timeMs: outerFrame.timeMs,
      localTimeMs,
      sceneDurationMs: scene.durationMs,
      sceneId: incoming.sceneId,
      viewport: outerFrame.viewport,
      backgroundColor: scene.backgroundColor ?? scene.background?.color ?? "#ffffff",
      background: scene.background,
      elements,
      compositions,
      overlay: scene.overlay,
    };
  }

  // ── Background ────────────────────────────────────────────────────────────

  private _applyBackground(
    layer: HTMLElement,
    bgColor: string,
    bg: SceneBackground | undefined,
    _w: number,
    _h: number
  ): void {
    if (!bg) {
      layer.style.background = bgColor;
      return;
    }

    // imageSrc wins — explicit image always takes priority over cssBackground gradient.
    if (bg.imageSrc) {
      // Legacy: CSS asset catalog stored gradients as SVG+foreignObject data URLs.
      // Browsers block <foreignObject> in background-image — extract the CSS instead.
      if (bg.imageSrc.startsWith("data:image/svg+xml")) {
        const extracted = extractGradientFromSvgDataUrl(bg.imageSrc);
        if (extracted) {
          (layer.querySelector('[data-bg="img"]') as HTMLElement | null)?.remove();
          layer.style.background = extracted;
          return;
        }
      }

      // Use a positioned <img> child so opacity applies only to the image, not the elements above.
      let bgImg = layer.querySelector('[data-bg="img"]') as HTMLImageElement | null;
      if (!bgImg) {
        bgImg = document.createElement("img");
        bgImg.dataset.bg = "img";
        bgImg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
        layer.insertBefore(bgImg, layer.firstChild);
      }
      const fit = bg.imageFit ?? "cover";
      bgImg.src = bg.imageSrc;
      bgImg.style.objectFit = fit === "stretch" ? "fill" : fit === "contain" ? "contain" : "cover";
      bgImg.style.objectPosition = bg.imageOffsetX != null || bg.imageOffsetY != null
        ? `${bg.imageOffsetX ?? 50}% ${bg.imageOffsetY ?? 50}%`
        : "center";
      bgImg.style.opacity = String(bg.opacity ?? 1);
      layer.style.background = bg.color ?? bgColor; // fallback color visible while image loads
      return;
    }

    // No imageSrc — remove any stale bg img element.
    (layer.querySelector('[data-bg="img"]') as HTMLElement | null)?.remove();

    if (bg.cssBackground) {
      layer.style.background = bg.cssBackground;
      return;
    }

    if (bg.color2) {
      layer.style.background = `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.color ?? bgColor}, ${bg.color2})`;
      return;
    }

    layer.style.background = bg.color ?? bgColor;
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  private _applyTransitionCSS(
    outgoing: HTMLElement,
    incoming: HTMLElement,
    type: SceneTransition["type"],
    progress: number,
    baseStyle: string
  ): void {
    const p = Math.max(0, Math.min(1, progress));

    // Reset to base
    outgoing.style.cssText = baseStyle;
    incoming.style.cssText = baseStyle;
    incoming.style.display = "";

    switch (type) {
      // ── Fade / dissolve ──────────────────────────────────────────────────────
      case "fade":
        // Pure opacity crossfade
        outgoing.style.opacity = String(1 - p);
        incoming.style.opacity = String(p);
        break;

      case "dissolve":
        // Soft-focus dissolve: outgoing blurs and fades, incoming sharpens in from slight blur
        outgoing.style.filter  = `blur(${p * 10}px)`;
        outgoing.style.opacity = String(1 - p);
        incoming.style.filter  = `blur(${(1 - p) * 10}px)`;
        incoming.style.transform += ` scale(${0.97 + 0.03 * p})`;
        incoming.style.opacity = String(p);
        break;

      // ── Slide: only incoming moves, outgoing fades in place ─────────────────
      case "slide_left":
        outgoing.style.opacity = String(1 - p);
        incoming.style.transform += ` translateX(${(1 - p) * 100}%)`;
        incoming.style.opacity = "1";
        break;

      case "slide_right":
        outgoing.style.opacity = String(1 - p);
        incoming.style.transform += ` translateX(${-(1 - p) * 100}%)`;
        incoming.style.opacity = "1";
        break;

      case "slide_up":
        outgoing.style.opacity = String(1 - p);
        incoming.style.transform += ` translateY(${(1 - p) * 100}%)`;
        incoming.style.opacity = "1";
        break;

      case "slide_down":
        outgoing.style.opacity = String(1 - p);
        incoming.style.transform += ` translateY(${-(1 - p) * 100}%)`;
        incoming.style.opacity = "1";
        break;

      // ── Push: both layers travel together, no opacity change ─────────────────
      case "push_left":
        outgoing.style.transform += ` translateX(${-p * 100}%)`;
        incoming.style.transform += ` translateX(${(1 - p) * 100}%)`;
        outgoing.style.opacity = "1";
        incoming.style.opacity = "1";
        break;

      case "push_right":
        outgoing.style.transform += ` translateX(${p * 100}%)`;
        incoming.style.transform += ` translateX(${-(1 - p) * 100}%)`;
        outgoing.style.opacity = "1";
        incoming.style.opacity = "1";
        break;

      // ── Zoom ─────────────────────────────────────────────────────────────────
      case "zoom_in":
        // Incoming scales from 80% to 100%, outgoing fades
        outgoing.style.opacity = String(1 - p);
        incoming.style.transform += ` scale(${0.8 + 0.2 * p})`;
        incoming.style.opacity = String(p);
        break;

      case "zoom_out":
        // Outgoing zooms out to 120% and fades, incoming fades in
        outgoing.style.transform += ` scale(${1 + p * 0.2})`;
        outgoing.style.opacity = String(1 - p);
        incoming.style.opacity = String(p);
        break;

      case "cross_zoom":
        // Both scale: outgoing zooms in slightly while fading, incoming zooms from far to normal
        outgoing.style.transform += ` scale(${1 + p * 0.15})`;
        outgoing.style.opacity    = String(1 - p);
        incoming.style.transform += ` scale(${1.3 - p * 0.3})`;
        incoming.style.opacity    = String(p);
        break;

      case "lens_zoom": {
        // Punch-zoom: outgoing rockets toward the camera (zooms in + overexposes to white),
        // incoming emerges from oversized and settles down — very different from cross_zoom's
        // gentle bidirectional zoom
        outgoing.style.transform += ` scale(${1 + p * 1.5})`;
        outgoing.style.filter     = `brightness(${1 + p * 4}) saturate(${1 - p * 0.8})`;
        outgoing.style.opacity    = String(Math.max(0, 1 - p * 1.5));
        // Incoming: oversized, overexposed, snaps into position with slight elastic settle
        const inScale = p < 0.8 ? 2 - p * 1.25 : 1 + Math.sin((p - 0.8) / 0.2 * Math.PI) * 0.04;
        incoming.style.transform += ` scale(${inScale})`;
        incoming.style.filter     = `brightness(${1 + (1 - p) * 3}) saturate(${p})`;
        incoming.style.opacity    = String(Math.min(1, p * 1.5));
        break;
      }

      // ── Blur ─────────────────────────────────────────────────────────────────
      case "blur_out":
        // Outgoing blurs heavily and fades, incoming sharpens in
        outgoing.style.filter  = `blur(${p * 24}px)`;
        outgoing.style.opacity = String(1 - p);
        incoming.style.filter  = `blur(${(1 - p) * 12}px)`;
        incoming.style.opacity = String(p);
        break;

      // ── Whip pan ─────────────────────────────────────────────────────────────
      case "whip_pan_left":
      case "whip_pan_right": {
        const dir = type === "whip_pan_left" ? -1 : 1;
        // Fast translateX with motion blur via filter
        const blurAmt = Math.sin(p * Math.PI) * 16;
        outgoing.style.transform += ` translateX(${dir * p * 200}%)`;
        outgoing.style.filter     = `blur(${blurAmt}px)`;
        outgoing.style.opacity    = String(p < 0.5 ? 1 : 1 - (p - 0.5) * 2);
        incoming.style.transform += ` translateX(${dir * (p - 1) * 200}%)`;
        incoming.style.filter     = `blur(${blurAmt}px)`;
        incoming.style.opacity    = String(p < 0.5 ? 0 : (p - 0.5) * 2);
        break;
      }

      // ── Spin ─────────────────────────────────────────────────────────────────
      case "spin_in":
        // Incoming spins and scales in from center, outgoing fades
        incoming.style.transform += ` rotate(${(1 - p) * 270}deg) scale(${0.5 + p * 0.5})`;
        incoming.style.opacity    = String(p);
        outgoing.style.opacity    = String(1 - p);
        break;

      // ── Glitch ───────────────────────────────────────────────────────────────
      case "glitch_cut": {
        // Horizontal jitter on outgoing
        const jitter = Math.sin(p * 47) * 10 * (1 - p);
        outgoing.style.transform += ` translateX(${jitter}px)`;
        outgoing.style.opacity    = String(1 - p);
        incoming.style.opacity    = String(p);
        break;
      }

      case "glitch_blocks": {
        // Jitter + skew + hue-rotate for a more chaotic RGB-glitch look
        const jx = Math.sin(p * 47) * 14 * (1 - p);
        const jy = Math.sin(p * 31) * 6 * (1 - p);
        const skw = Math.sin(p * 23) * 3 * (1 - p);
        outgoing.style.transform += ` translate(${jx}px,${jy}px) skewX(${skw}deg)`;
        outgoing.style.filter     = `hue-rotate(${jx * 8}deg) saturate(${1 + Math.abs(jx) * 0.15})`;
        outgoing.style.opacity    = String(1 - p);
        incoming.style.filter     = `hue-rotate(${-jx * 8}deg)`;
        incoming.style.opacity    = String(p);
        break;
      }

      // ── Flash / burn ─────────────────────────────────────────────────────────
      case "flash_cut":
        // White flash through the middle of the cut
        if (p < 0.5) {
          outgoing.style.filter  = `brightness(${1 + p * 4})`;
          outgoing.style.opacity = String(1 - p * 2);
          incoming.style.opacity = "0";
        } else {
          outgoing.style.opacity = "0";
          incoming.style.filter  = `brightness(${5 - p * 6})`;
          incoming.style.opacity = String((p - 0.5) * 2);
        }
        break;

      case "burn_in":
        // Film burn: scene darkens to solid black (brightness → 0, saturation drops),
        // then next scene burns in from black. No transparency — the black is real.
        if (p < 0.5) {
          const t = p / 0.5;
          outgoing.style.filter  = `brightness(${1 - t}) saturate(${1 - t * 0.6})`;
          outgoing.style.opacity = "1";
          incoming.style.opacity = "0";
        } else {
          const t = (p - 0.5) / 0.5;
          outgoing.style.opacity = "0";
          incoming.style.filter  = `brightness(${t}) saturate(${0.4 + t * 0.6})`;
          incoming.style.opacity = "1";
        }
        break;

      // ── Wipe / reveal ────────────────────────────────────────────────────────
      case "ripple":
        // Circular iris wipe expanding from center
        outgoing.style.opacity = String(1 - p);
        incoming.style.clipPath = `circle(${Math.max(0, p * 75 - 1).toFixed(1)}% at 50% 50%)`;
        incoming.style.opacity = "1";
        break;

      case "swirl_wipe":
        // Counter-rotating layers with scale — feels like a vortex
        outgoing.style.transform += ` rotate(${p * 25}deg) scale(${1 + p * 0.15})`;
        outgoing.style.opacity    = String(1 - p);
        incoming.style.transform += ` rotate(${(1 - p) * -25}deg) scale(${0.85 + p * 0.15})`;
        incoming.style.opacity    = String(p);
        break;

      // ── Channel / color effects ───────────────────────────────────────────────
      case "channel_split": {
        // R/B channels drift apart on outgoing (max split at start, converges to 0 at cut),
        // then incoming fades in clean — mimics analog chromatic aberration glitch
        const split = (1 - p) * 35;
        outgoing.style.filter  = `drop-shadow(${split}px 0 0 rgba(255,0,0,0.75)) drop-shadow(${-split}px 0 0 rgba(0,100,255,0.75))`;
        outgoing.style.opacity = String(1 - p);
        incoming.style.opacity = String(p);
        break;
      }

      case "color_flash":
        // Outgoing bleaches to white, incoming recovers from white
        if (p < 0.5) {
          outgoing.style.filter  = `brightness(${1 + p * 4}) saturate(${Math.max(0, 1 - p * 4)})`;
          outgoing.style.opacity = String(1 - p * 2);
          incoming.style.opacity = "0";
        } else {
          outgoing.style.opacity = "0";
          incoming.style.filter  = `brightness(${3 - p * 2}) saturate(${(p - 0.5) * 2})`;
          incoming.style.opacity = String((p - 0.5) * 2);
        }
        break;

      default:
        outgoing.style.opacity = String(1 - p);
        incoming.style.opacity = String(p);
    }
  }

  // ── Composition PixiJS layer ──────────────────────────────────────────────

  private async _initCompositionLayer(): Promise<void> {
    if (this._destroyed || !this.sceneRoot) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    this.sceneRoot.appendChild(canvas);
    this.compCanvas = canvas;

    try {
      const pixi = await import("pixi.js");
      if (this._destroyed) return;
      this.compPixi = pixi;

      const app = new pixi.Application();
      await app.init({
        canvas: canvas as HTMLCanvasElement,
        backgroundAlpha: 0,
        antialias: false,
        resolution: 1,
        autoDensity: false,
        width: this.project.viewport.width,
        height: this.project.viewport.height,
      });

      if (this._destroyed) { app.destroy(true); return; }
      this.compApp = app;
      this.compRoot = new pixi.Container();
      app.stage.addChild(this.compRoot);
    } catch { /* PixiJS unavailable or compositions unused */ }
  }

  private _updateCompositions(frame: ResolvedRenderFrame): void {
    if (!this.compApp || !this.compPixi || !this.compRoot || !this.compCanvas) return;

    const { viewport } = frame;
    const rect = this.container?.getBoundingClientRect();
    const containerW = rect?.width ?? 0;
    const containerH = rect?.height ?? 0;
    if (!containerW || !containerH) return;
    const scale = Math.min(containerW / viewport.width, containerH / viewport.height);
    const frameW = viewport.width * scale;
    const frameH = viewport.height * scale;
    const offsetX = (containerW - frameW) / 2;
    const offsetY = (containerH - frameH) / 2;

    this.compCanvas.style.left   = `${offsetX}px`;
    this.compCanvas.style.top    = `${offsetY}px`;
    this.compCanvas.style.width  = `${frameW}px`;
    this.compCanvas.style.height = `${frameH}px`;

    const activeIds = new Set(frame.compositions.map((c) => c.id));
    for (const [id, entry] of this.compNodes) {
      if (!activeIds.has(id)) {
        this.compRoot.removeChild(entry.node);
        this.compNodes.delete(id);
      }
    }

    const ctx = {
      pixi: this.compPixi,
      requestRedraw: () => {
        // Texture finished loading — evict cached nodes so they're rebuilt with the real image.
        for (const [, entry] of this.compNodes) {
          try { this.compRoot?.removeChild(entry.node); } catch { /* no-op */ }
        }
        this.compNodes.clear();
        // In static/paused mode the RAF loop isn't running, so force one render pass.
        if (!this._rafId && this._lastRenderInput) {
          this.renderFrame(this._lastRenderInput);
        }
      },
      localTimeMs: frame.localTimeMs,
    };
    const textureLoading = new Set<string>();
    const normSrc = (s: string | undefined) =>
      s?.replace(/^https?:\/\/localhost:\d+\/uploads\//, "/uploads/");

    for (const comp of frame.compositions) {
      const key = `${comp.compositionType}:${comp.layout.width}:${comp.layout.height}:${(comp.slots ?? []).map((s) => s.src ?? s.text ?? "").join(",")}`;
      let entry = this.compNodes.get(comp.id);

      const compRenderer = getCompositionRenderer(comp.compositionType);
      if (!compRenderer) continue;

      if (!entry || entry.key !== key) {
        if (entry) this.compRoot.removeChild(entry.node);
        const node = compRenderer.create(ctx, comp, this._compTextureCache, textureLoading, normSrc);
        node.x = comp.layout.x;
        node.y = comp.layout.y;
        this.compRoot.addChild(node);
        entry = { node, key };
        this.compNodes.set(comp.id, entry);
      } else {
        entry.node.x = comp.layout.x;
        entry.node.y = comp.layout.y;
        entry.node.alpha = comp.layout.opacity;
      }

      compRenderer.update(entry.node, comp, frame.localTimeMs, frame.sceneDurationMs);
    }
  }

  // ── Evict ─────────────────────────────────────────────────────────────────

  private _evictLayer(cache: Map<string, ElementCacheEntry>, layer: HTMLElement): void {
    for (const [id, entry] of cache) {
      entry.outer.remove();
      if (this.svgDefsContainer) {
        const dtNode = this.svgDefsContainer.querySelector(`#kwikk-duotone-${id}`);
        if (dtNode) dtNode.remove();
        const clNode = this.svgDefsContainer.querySelector(`#kwikk-clip-${id}`);
        if (clNode) clNode.remove();
      }
    }
    cache.clear();
    layer.innerHTML = "";
  }

  // ── Destroy ───────────────────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    if (this._onShapeFillImageLoaded) {
      shapeFillImageListeners.delete(this._onShapeFillImageLoaded);
      this._onShapeFillImageLoaded = null;
    }
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this.compApp) { try { this.compApp.destroy(true); } catch { /* no-op */ } }
    if (this.container && this.sceneRoot && this.sceneRoot.parentNode === this.container) {
      this.container.removeChild(this.sceneRoot);
    }
    this.currentCache.clear();
    this.incomingCache.clear();
    this.videoEls.clear();
    this.compNodes.clear();
    this._compTextureCache.clear();
  }
}
