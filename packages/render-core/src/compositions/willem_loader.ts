/**
 * willem_loader — hero word-reveal composition.
 *
 * A large display word is split left/right around a horizontally-expanding
 * image box. Each letter clips and slides up from below. Images inside the
 * box cycle with a crossfade. Nav and bottom-title text fade in after the
 * reveal completes. Inspired by the "Willem Loading Animation" by Osmo.
 *
 * Slots : one image per cycling frame (4 recommended, minimum 1).
 * Params: displayText, splitPoint, bottomTitle, navLeftText, navRightText.
 * Colors: accentColor = letter/text color. Background is transparent.
 */

import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

// ── Easing helpers ────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(t: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, t));
}

/** Map [start..end] → [0..1] */
function remap(t: number, start: number, end: number): number {
  return clamp((t - start) / (end - start));
}

// ── Internal types ────────────────────────────────────────────────────────────

type LetterSlot = {
  outerClip: import("pixi.js").Container;
  letterText: import("pixi.js").Text;
  clipMask: import("pixi.js").Graphics;
  letterH: number;
};

type WillemState = {
  leftLetters: LetterSlot[];
  rightLetters: LetterSlot[];
  /** The rightGroup container that must be repositioned as box grows */
  rightGroup: import("pixi.js").Container;
  /** Grows horizontally from 0 → boxMaxW */
  imageBoxOuter: import("pixi.js").Container;
  imageBoxMask: import("pixi.js").Graphics;
  imageSprites: import("pixi.js").Container[];
  bottomText: import("pixi.js").Text;
  navLeft: import("pixi.js").Text;
  navRight: import("pixi.js").Text;
  compW: number;
  compH: number;
  letterH: number;
  boxMaxW: number;
  boxH: number;
  rowX: number;
  leftTotalW: number;
  rightTotalW: number;
};

// ── Placeholder (shown when a slot has no image) ──────────────────────────────

function buildImagePlaceholder(
  pixi: any,
  accentColorInt: number,
  w: number,
  h: number
): import("pixi.js").Container {
  const ph = new pixi.Container();

  const bg = new pixi.Graphics().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.15 });
  ph.addChild(bg);

  const dashLen = Math.round(10 * h / 200);
  const gapLen  = Math.round(6  * h / 200);
  const segs = [
    { x1: 2,   y1: 2,   x2: w-2, y2: 2   },
    { x1: w-2, y1: 2,   x2: w-2, y2: h-2 },
    { x1: w-2, y1: h-2, x2: 2,   y2: h-2 },
    { x1: 2,   y1: h-2, x2: 2,   y2: 2   },
  ];
  const dg = new pixi.Graphics();
  for (const seg of segs) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    let t = 0, drawing = true;
    while (t < len) {
      const sl = drawing ? Math.min(dashLen, len - t) : Math.min(gapLen, len - t);
      if (drawing) {
        dg.moveTo(seg.x1 + nx * t, seg.y1 + ny * t)
          .lineTo(seg.x1 + nx * (t + sl), seg.y1 + ny * (t + sl));
      }
      t += sl;
      drawing = !drawing;
    }
  }
  dg.stroke({ color: accentColorInt, width: 1.5, alpha: 0.35, cap: "round" });
  ph.addChild(dg);

  // Mountain icon
  const cx = w / 2, cy = h / 2;
  const s = h / 200;
  const ig = new pixi.Graphics();
  ig.moveTo(cx - 28*s, cy + 18*s)
    .lineTo(cx -  6*s, cy - 14*s)
    .lineTo(cx +  6*s, cy +  2*s)
    .lineTo(cx + 16*s, cy -  8*s)
    .lineTo(cx + 28*s, cy + 18*s);
  ig.fill({ color: accentColorInt, alpha: 0.22 });
  ig.circle(cx - 18*s, cy - 16*s, 7*s).fill({ color: accentColorInt, alpha: 0.28 });
  ph.addChild(ig);

  // "Add image" label
  const labelStyle = {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: Math.round(9 * s),
    fill: accentColorInt,
    alpha: 0.5,
  };
  const label = new pixi.Text({ text: "Add image", style: labelStyle });
  label.x = Math.round((w - label.width) / 2);
  label.y = cy + 28 * s;
  ph.addChild(label);

  return ph;
}

// ── create ────────────────────────────────────────────────────────────────────

export function createWillemLoaderNode(
  ctx: RenderContext,
  comp: CompositionNode,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const compW = comp.layout.width;
  const compH = comp.layout.height;

  const letterColor    = comp.params?.colorOverrides?.accentColor ?? "#f5f0eb";
  const letterColorInt = parseInt(letterColor.replace("#",""), 16) || 0xf5f0eb;

  const fontFamily = comp.params?.fontOverride ?? "Georgia, 'Times New Roman', serif";

  // ── Text content (all customisable via params) ──────────────────────────────
  const displayText = comp.params?.displayText ?? "WILLEM";
  const split       = comp.params?.splitPoint  ?? Math.floor(displayText.length / 2);
  const leftWord    = displayText.slice(0, split);
  const rightWord   = displayText.slice(split);

  const container = new pixi.Container();
  // No background — transparent so scene background shows through.

  // ── Font sizing ─────────────────────────────────────────────────────────────
  const fontSize = Math.round(compH * 0.46);
  const textStyle = new pixi.TextStyle({
    fontFamily,
    fontSize,
    fontWeight: "500",
    fill: letterColorInt,
    letterSpacing: Math.round(fontSize * -0.01),
    lineHeight: Math.round(fontSize * 0.78),
  });

  // ── Split word into individual character arrays ─────────────────────────────
  const leftChars  = Array.from(leftWord);
  const rightChars = Array.from(rightWord);

  // Measure each character
  function measureChar(ch: string): { w: number; h: number } {
    const tmp = new pixi.Text({ text: ch, style: textStyle });
    const w = Math.ceil(tmp.width);
    const h = Math.ceil(tmp.height);
    tmp.destroy();
    return { w, h };
  }

  const leftMeasures  = leftChars.map(measureChar);
  const rightMeasures = rightChars.map(measureChar);

  const leftTotalW  = leftMeasures.reduce((s, m) => s + m.w, 0);
  const rightTotalW = rightMeasures.reduce((s, m) => s + m.w, 0);
  const letterH     = leftMeasures[0].h;

  const pad       = Math.round(compH * 0.055);
  const boxMaxW   = Math.max(40, compW - leftTotalW - rightTotalW - pad * 2);
  const boxH      = Math.round(letterH * 0.88);

  const rowTotalW = leftTotalW + boxMaxW + rightTotalW;
  const rowX      = Math.round((compW - rowTotalW) / 2);
  const rowY      = Math.round((compH - letterH) / 2);

  // ── Left letter group ───────────────────────────────────────────────────────
  const leftGroup = new pixi.Container();
  leftGroup.x = rowX;
  leftGroup.y = rowY;
  container.addChild(leftGroup);

  const leftLetters: LetterSlot[] = [];
  let curX = 0;
  for (let i = 0; i < leftChars.length; i++) {
    const { w } = leftMeasures[i];

    const outerClip = new pixi.Container();
    outerClip.x = curX;
    outerClip.y = 0;

    const clipMask = new pixi.Graphics()
      .rect(0, -4, w + 2, letterH + 8)
      .fill({ color: 0xffffff });
    outerClip.addChild(clipMask);
    outerClip.mask = clipMask;

    const letterText = new pixi.Text({ text: leftChars[i], style: textStyle });
    letterText.x = 0;
    letterText.y = letterH; // starts below (hidden), slides up
    outerClip.addChild(letterText);

    leftGroup.addChild(outerClip);
    leftLetters.push({ outerClip, letterText, clipMask, letterH });
    curX += w;
  }

  // ── Image box ───────────────────────────────────────────────────────────────
  const imageBoxOuter = new pixi.Container();
  imageBoxOuter.x = rowX + leftTotalW;
  imageBoxOuter.y = rowY + Math.round((letterH - boxH) / 2);
  container.addChild(imageBoxOuter);

  const imageBoxMask = new pixi.Graphics();
  // Initial mask is empty — box starts at width 0
  imageBoxMask.rect(0, 0, 0, boxH).fill({ color: 0xffffff });
  imageBoxOuter.addChild(imageBoxMask);
  imageBoxOuter.mask = imageBoxMask;

  const imageContainer = new pixi.Container();
  imageBoxOuter.addChild(imageContainer);

  // Build image sprites (one per slot, or one placeholder if empty)
  const imageSprites: import("pixi.js").Container[] = [];
  const slotCount = comp.slots.length > 0 ? comp.slots.length : 1;

  for (let i = 0; i < slotCount; i++) {
    const slot = comp.slots[i] ?? null;
    const src  = normalizeAssetSrc(slot?.src);

    if (src && !src.startsWith("placeholder://")) {
      const tex = textureCache.get(src) ?? null;
      if (!tex) {
        if (!textureLoading.has(src)) {
          textureLoading.add(src);
          pixi.Assets.load(src)
            .then((t: unknown) => {
              textureCache.set(src, t);
              textureLoading.delete(src);
              ctx.requestRedraw();
            })
            .catch(() => textureLoading.delete(src));
        }
        const ph = buildImagePlaceholder(pixi, letterColorInt, boxMaxW, boxH);
        ph.visible = i === 0;
        imageContainer.addChild(ph);
        imageSprites.push(ph);
      } else {
        const spr = new pixi.Sprite(tex as any);
        spr.x = 0;
        spr.y = 0;
        spr.width  = boxMaxW;
        spr.height = boxH;
        spr.visible = i === 0;
        imageContainer.addChild(spr);
        imageSprites.push(spr);
      }
    } else {
      const ph = buildImagePlaceholder(pixi, letterColorInt, boxMaxW, boxH);
      ph.visible = i === 0;
      imageContainer.addChild(ph);
      imageSprites.push(ph);
    }
  }

  // ── Right letter group ──────────────────────────────────────────────────────
  // Positioned at box-right edge; x is updated each frame as box grows
  const rightGroup = new pixi.Container();
  rightGroup.x = rowX + leftTotalW; // starts at left edge of box (width=0)
  rightGroup.y = rowY;
  container.addChild(rightGroup);

  const rightLetters: LetterSlot[] = [];
  curX = 0;
  for (let i = 0; i < rightChars.length; i++) {
    const { w } = rightMeasures[i];

    const outerClip = new pixi.Container();
    outerClip.x = curX;
    outerClip.y = 0;

    const clipMask = new pixi.Graphics()
      .rect(0, -4, w + 2, letterH + 8)
      .fill({ color: 0xffffff });
    outerClip.addChild(clipMask);
    outerClip.mask = clipMask;

    const letterText = new pixi.Text({ text: rightChars[i], style: textStyle });
    letterText.x = 0;
    letterText.y = letterH; // starts hidden below
    outerClip.addChild(letterText);

    rightGroup.addChild(outerClip);
    rightLetters.push({ outerClip, letterText, clipMask, letterH });
    curX += w;
  }

  // ── Bottom title "Willem ©" ─────────────────────────────────────────────────
  const bottomFontSize = Math.round(compH * 0.07);
  const bottomStyle = new pixi.TextStyle({
    fontFamily,
    fontSize: bottomFontSize,
    fontWeight: "500",
    fill: letterColorInt,
  });
  const bottomTitleText = comp.params?.bottomTitle ?? `${displayText} ©`;
  const bottomText = new pixi.Text({ text: bottomTitleText, style: bottomStyle });
  const bottomPad = Math.round(compH * 0.06);
  bottomText.x = bottomPad;
  bottomText.y = compH - bottomText.height - bottomPad;
  bottomText.alpha = 0;
  container.addChild(bottomText);

  // ── Nav text ────────────────────────────────────────────────────────────────
  const navFontSize = Math.round(compH * 0.026);
  const navStyle = new pixi.TextStyle({
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: navFontSize,
    fontWeight: "500",
    fill: letterColorInt,
  });
  const navPad = Math.round(compH * 0.055);

  const navLeftContent  = comp.params?.navLeftText  ?? "Brand ©";
  const navRightContent = comp.params?.navRightText ?? "Projects,  Services,  About";

  const navLeft = new pixi.Text({ text: navLeftContent, style: navStyle });
  navLeft.x = navPad;
  navLeft.y = navPad;
  navLeft.alpha = 0;
  container.addChild(navLeft);

  const navRight = new pixi.Text({ text: navRightContent, style: navStyle });
  navRight.x = compW - navRight.width - navPad;
  navRight.y = navPad;
  navRight.alpha = 0;
  container.addChild(navRight);

  (container as any)._willemState = {
    leftLetters,
    rightLetters,
    rightGroup,
    imageBoxOuter,
    imageBoxMask,
    imageSprites,
    bottomText,
    navLeft,
    navRight,
    compW,
    compH,
    letterH,
    boxMaxW,
    boxH,
    rowX,
    leftTotalW,
    rightTotalW,
  } satisfies WillemState;

  return container;
}

// ── update ────────────────────────────────────────────────────────────────────

export function updateWillemLoaderNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  sceneDurationMs: number
): void {
  const state = (node as any)._willemState as WillemState | undefined;
  if (!state) return;

  const {
    leftLetters, rightLetters, rightGroup,
    imageBoxOuter, imageBoxMask, imageSprites,
    bottomText, navLeft, navRight,
    letterH, boxMaxW, boxH, rowX, leftTotalW,
  } = state;

  // ── Normalised time ─────────────────────────────────────────────────────────
  const compStart = comp.startMs ?? 0;
  const compEnd   = comp.endMs   ?? sceneDurationMs;
  const totalMs   = Math.max(1, compEnd - compStart);
  const speed     = comp.params?.speed ?? 1;
  const t         = clamp((localTimeMs - compStart) * speed / totalMs);

  // ── Phase windows ───────────────────────────────────────────────────────────
  // t ∈ [0.00–0.18] : letters slide up (staggered 0.025 each)
  // t ∈ [0.08–0.55] : image box expands left+right from center
  // t ∈ [0.40–0.90] : images cycle inside the box
  // t ∈ [0.80–1.00] : nav + bottom title fade in

  // ── Letter slide-up ─────────────────────────────────────────────────────────
  const allLetters = [...leftLetters, ...rightLetters];
  const staggerGap = 0.022;
  const letterWindowEnd = 0.20;

  for (let i = 0; i < allLetters.length; i++) {
    const { letterText, letterH: lH } = allLetters[i];
    const start = i * staggerGap;
    const end   = start + (letterWindowEnd - (allLetters.length - 1) * staggerGap);
    const p     = easeOutCubic(remap(t, start, Math.max(start + 0.01, end)));
    letterText.y = lH * (1 - p); // slides from lH → 0
  }

  void letterH; // referenced through allLetters, suppress warning

  // ── Image box expansion ─────────────────────────────────────────────────────
  const boxExpandStart = 0.08;
  const boxExpandEnd   = 0.58;
  const boxProgress = easeOutCubic(remap(t, boxExpandStart, boxExpandEnd));
  const currentBoxW  = Math.round(boxMaxW * boxProgress);

  // Redraw mask to current width
  imageBoxMask.clear();
  if (currentBoxW > 0) {
    imageBoxMask.rect(0, 0, currentBoxW, boxH).fill({ color: 0xffffff });
  }

  // Reposition right group as box grows
  rightGroup.x = rowX + leftTotalW + currentBoxW;

  // Center the image box horizontally within the growing space
  // imageBoxOuter is already at rowX + leftTotalW (fixed); image sprites scale
  for (const spr of imageSprites) {
    if ((spr as any).width !== undefined) {
      (spr as any).width  = currentBoxW > 0 ? currentBoxW : boxMaxW;
      (spr as any).height = boxH;
    }
  }
  void imageBoxOuter; // already in scene graph

  // ── Image cycling ───────────────────────────────────────────────────────────
  const cycleStart = 0.40;
  const cycleEnd   = 0.90;
  const n = imageSprites.length;

  if (n > 1) {
    const cycleT = remap(t, cycleStart, cycleEnd);
    const raw    = cycleT * n;
    const idx    = Math.min(n - 1, Math.floor(raw));
    const frac   = raw - idx;
    const crossDuration = 0.25; // fraction of each slot's window used for cross-fade

    for (let i = 0; i < n; i++) {
      const spr = imageSprites[i];
      let alpha = 0;
      if (i === idx) {
        alpha = frac < (1 - crossDuration) ? 1 : 1 - easeInOutCubic((frac - (1 - crossDuration)) / crossDuration);
      } else if (i === (idx + 1) % n && idx < n - 1) {
        alpha = frac < (1 - crossDuration) ? 0 : easeInOutCubic((frac - (1 - crossDuration)) / crossDuration);
      } else if (i < idx) {
        alpha = 0;
      } else if (i > idx + 1) {
        alpha = 0;
      }
      spr.visible = alpha > 0.01;
      spr.alpha   = alpha;
    }
  } else if (n === 1) {
    imageSprites[0].visible = true;
    imageSprites[0].alpha   = remap(t, boxExpandStart + 0.05, boxExpandStart + 0.15);
  }

  // ── Nav + bottom title fade-in ──────────────────────────────────────────────
  const uiStart = 0.80;
  const uiEnd   = 0.97;
  const uiAlpha = easeInOutCubic(remap(t, uiStart, uiEnd));

  navLeft.alpha   = uiAlpha;
  navRight.alpha  = uiAlpha;
  bottomText.alpha = uiAlpha;

  const navPad = Math.round(state.compH * 0.055);
  navRight.x = state.compW - navRight.width - navPad;
}
