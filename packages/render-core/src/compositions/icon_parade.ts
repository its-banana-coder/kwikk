import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

type EntryEasing = "quick" | "slow" | "wavy";

type IconSlotState = {
  container: import("pixi.js").Container;
  staticY: number;
};

type IconParadeState = {
  slots: IconSlotState[];
  compWidth: number;
  iconSize: number;
};

// ── Easing ────────────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

function easeInOutCubic(t: number): number {
  const tc = clamp01(t);
  return tc < 0.5 ? 4 * tc * tc * tc : 1 - Math.pow(-2 * tc + 2, 3) / 2;
}

// CSS easeOutElastic — overshoots once then settles to 1.
function easeOutElastic(t: number): number {
  const tc = clamp01(t);
  if (tc === 0) return 0;
  if (tc === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * tc) * Math.sin((tc * 10 - 0.75) * c4) + 1;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function applyEntryEasing(t: number, easing: EntryEasing): number {
  switch (easing) {
    case "quick": return easeOutCubic(t);
    case "slow":  return easeInOutCubic(t);
    case "wavy":  return easeOutElastic(t);
  }
}

function entryMs(easing: EntryEasing): number {
  return easing === "slow" ? 680 : easing === "wavy" ? 540 : 360;
}

function exitMs(easing: EntryEasing): number {
  return easing === "slow" ? 580 : easing === "wavy" ? 440 : 300;
}

// ── Placeholder (dashed border + picture icon), scaled by sz) ─────────────────

function buildPlaceholder(pixi: any, accentColorInt: number, sz: number): import("pixi.js").Container {
  const ph = new pixi.Container();
  const r = sz * 0.197; // proportional corner radius

  // Dashed border segments along each straight edge
  const dg = new pixi.Graphics();
  const dash = sz * 0.12, gap = sz * 0.09;
  let drawing = true;
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
    { x1: r, y1: 0,  x2: sz - r, y2: 0 },
    { x1: sz, y1: r, x2: sz, y2: sz - r },
    { x1: sz - r, y1: sz, x2: r, y2: sz },
    { x1: 0, y1: sz - r, x2: 0, y2: r },
  ];
  for (const seg of segments) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    let t = 0;
    while (t < len) {
      const segLen = drawing ? Math.min(dash, len - t) : Math.min(gap, len - t);
      if (drawing) {
        const sx = seg.x1 + nx * t, sy = seg.y1 + ny * t;
        dg.moveTo(sx, sy).lineTo(sx + nx * segLen, sy + ny * segLen);
      }
      t += segLen;
      drawing = !drawing;
    }
  }
  dg.stroke({ color: accentColorInt, width: 1.5, alpha: 0.35, cap: "round" });
  ph.addChild(dg);

  // Mountain / picture icon scaled around center
  const cx = sz / 2, cy = sz / 2;
  const s = sz / 66; // scale factor relative to original 66px design
  const ig = new pixi.Graphics();
  ig.moveTo(cx - 18 * s, cy + 12 * s);
  ig.lineTo(cx - 4  * s, cy - 8  * s);
  ig.lineTo(cx + 4  * s, cy + 2  * s);
  ig.lineTo(cx + 10 * s, cy - 4  * s);
  ig.lineTo(cx + 18 * s, cy + 12 * s);
  ig.fill({ color: accentColorInt, alpha: 0.22 });
  ig.circle(cx - 12 * s, cy - 10 * s, 5 * s).fill({ color: accentColorInt, alpha: 0.28 });
  ph.addChild(ig);

  // Plus indicator near top-center
  const pg = new pixi.Graphics();
  pg.moveTo(cx, cy - 26 * s).lineTo(cx, cy - 18 * s);
  pg.moveTo(cx - 4 * s, cy - 22 * s).lineTo(cx + 4 * s, cy - 22 * s);
  pg.stroke({ color: accentColorInt, width: 1.8, alpha: 0.45, cap: "round" });
  ph.addChild(pg);

  return ph;
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildIconCard(
  ctx: RenderContext,
  pixi: any,
  slot: CompositionNode["slots"][number] | null,
  pageColorInt: number,
  accentColorInt: number,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined,
  sz: number
): import("pixi.js").Container {
  const card = new pixi.Container();
  const radius = sz * 0.197;
  const sdx = sz * 0.076, sdy = sz * 0.106; // shadow offsets
  const imgInset = sz * 0.15;
  const imgW = sz - imgInset * 2;
  const imgH = sz - imgInset * 2;

  // Outer drop shadow (two passes for soft falloff)
  card.addChild(
    new pixi.Graphics()
      .roundRect(sdx, sdy, sz, sz, radius)
      .fill({ color: 0x000000, alpha: 0.2 })
  );
  card.addChild(
    new pixi.Graphics()
      .roundRect(sdx * 0.5, sdy * 0.5, sz, sz, radius)
      .fill({ color: 0x000000, alpha: 0.07 })
  );

  // Card background
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, sz, sz, radius)
      .fill({ color: pageColorInt })
  );

  // Accent border
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, sz, sz, radius)
      .stroke({ color: accentColorInt, width: 1.8, alpha: 0.3 })
  );

  // Top highlight shimmer
  card.addChild(
    new pixi.Graphics()
      .roundRect(2, 2, sz - 4, sz * 0.38, radius - 2)
      .fill({ color: 0xffffff, alpha: 0.1 })
  );

  // Image / placeholder
  const src = normalizeAssetSrc(slot?.src);

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
      card.addChild(buildPlaceholder(pixi, accentColorInt, sz));
    } else {
      const mask = new pixi.Graphics()
        .roundRect(imgInset, imgInset, imgW, imgH, radius - 4)
        .fill({ color: 0xffffff });
      card.addChild(mask);
      const spr = new pixi.Sprite(tex as any);
      spr.x = imgInset;
      spr.y = imgInset;
      spr.width = imgW;
      spr.height = imgH;
      spr.mask = mask;
      card.addChild(spr);
    }
  } else {
    card.addChild(buildPlaceholder(pixi, accentColorInt, sz));
  }

  return card;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createIconParadeNode(
  ctx: RenderContext,
  comp: CompositionNode,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;

  const sz: number = (comp.params?.iconSize as any) ?? 66;
  const gap = sz * 0.27;

  const accentColor = comp.params?.colorOverrides?.accentColor ?? "#6366f1";
  const accentColorInt = parseInt(accentColor.replace("#", ""), 16) || 0x6366f1;
  const pageColor = comp.params?.colorOverrides?.pageColor ?? "#ffffff";
  const pageColorInt = parseInt(pageColor.replace("#", ""), 16) || 0xffffff;

  const container = new pixi.Container();

  // Show at least 4 placeholders when no slots are defined
  const renderCount = comp.slots.length > 0 ? comp.slots.length : 4;

  const totalStackH = renderCount * sz + Math.max(0, renderCount - 1) * gap;
  const topY = Math.max(0, (height - totalStackH) / 2);

  const slots: IconSlotState[] = [];

  for (let i = 0; i < renderCount; i++) {
    const slot = comp.slots[i] ?? null;
    const card = buildIconCard(
      ctx, pixi, slot,
      pageColorInt, accentColorInt,
      textureCache, textureLoading, normalizeAssetSrc,
      sz
    );
    const staticY = topY + i * (sz + gap);
    card.y = staticY;
    card.alpha = 0;
    container.addChild(card);
    slots.push({ container: card, staticY });
  }

  (container as any)._iconParadeState = {
    slots,
    compWidth: width,
    iconSize: sz,
  } satisfies IconParadeState;

  return container;
}

export function updateIconParadeNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._iconParadeState as IconParadeState | undefined;
  if (!state) return;

  const direction: "left" | "right" = (comp.params?.direction as any) ?? "left";
  const stopFraction: number = (comp.params?.stopPoint as any) ?? 0.45;
  const holdDurationMs: number = (comp.params?.holdDuration as any) ?? 1500;
  const exitDelayMs: number = (comp.params?.exitDelay as any) ?? 0;
  const easing: EntryEasing = (comp.params?.entryEasing as any) ?? "quick";
  const staggerMs: number = (comp.params?.stagger as any) ?? 140;
  const stopStyle: "line" | "staggered" = (comp.params?.stopStyle as any) ?? "line";
  const speed: number = comp.params?.speed ?? 1;
  const compStart = comp.startMs ?? 0;

  const compW = state.compWidth;
  const sz = state.iconSize;

  const offscreenX = direction === "left" ? -(sz + 28) : (compW + 28);
  const baseRestX = direction === "left"
    ? stopFraction * compW
    : compW - stopFraction * compW - sz;
  // In staggered mode each icon sits ~22% of sz deeper than the previous one
  const staggerStep = sz * 0.22;

  const restXFor = (i: number): number => {
    if (stopStyle === "line") return baseRestX;
    return direction === "left"
      ? baseRestX + i * staggerStep
      : baseRestX - i * staggerStep;
  };

  const entryDuration = entryMs(easing);
  const exitDuration  = exitMs(easing);
  const elapsed = Math.max(0, (localTimeMs - compStart) * speed);

  for (let i = 0; i < state.slots.length; i++) {
    const s = state.slots[i];
    const t = elapsed - i * staggerMs;
    const restX = restXFor(i);

    // Reset y each frame
    s.container.y = s.staticY;

    if (t <= 0) {
      s.container.x = offscreenX;
      s.container.alpha = 0;
      continue;
    }

    const holdTotal = holdDurationMs + exitDelayMs;

    if (t < entryDuration) {
      // Entering
      const p = t / entryDuration;
      s.container.x = offscreenX + (restX - offscreenX) * applyEntryEasing(p, easing);
      s.container.alpha = 1;
    } else if (t < entryDuration + holdTotal) {
      // Holding (+exit delay)
      s.container.x = restX;
      s.container.alpha = 1;
      if (easing === "wavy") {
        const holdT = t - entryDuration;
        s.container.y = s.staticY + 2.5 * Math.sin(holdT * 0.0038 + i * 0.8);
      }
    } else {
      // Exiting — always easeInOutCubic back to offscreen
      const exitT = t - entryDuration - holdTotal;
      const p = clamp01(exitT / exitDuration);
      s.container.x = restX + (offscreenX - restX) * easeInOutCubic(p);
      // Fade out in the last 25% of exit
      s.container.alpha = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    }
  }
}
