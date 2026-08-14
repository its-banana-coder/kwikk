/**
 * tilted_carousel — coverflow-style horizontal strip.
 *
 * Center card faces the viewer straight-on; cards to the sides are
 * compressed on the X axis (2-D simulation of rotateY in perspective),
 * scaled down, and faded. Cards continuously slide leftward on a timer,
 * each card holding for `params.holdDuration` ms before the next smooth
 * 550 ms glide.
 */
import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

// ── Geometry baseline (at default comp width 680px) ──────────────────────────

const BASE_COMP_W = 680;

// Fixed animation duration; user controls only the hold time.
const TRANSITION_MS = 550;

/**
 * Slot visual table indexed by distance from center (0 = center, 1 = ±1, etc.).
 * xF   = x offset as a fraction of cardW
 * sX   = scaleX (simulates Y-axis perspective rotation)
 * sY   = uniform scale (cards shrink as they recede)
 * a    = alpha
 */
const SLOT_TABLE = [
  { xF: 0,    sX: 1.00, sY: 1.00, a: 1.00 }, // center
  { xF: 0.73, sX: 0.76, sY: 0.90, a: 0.80 }, // ±1
  { xF: 1.30, sX: 0.55, sY: 0.82, a: 0.55 }, // ±2
  { xF: 1.82, sX: 0.40, sY: 0.76, a: 0.00 }, // ±3  entry / exit (invisible)
] as const;

const MAX_SLOT = SLOT_TABLE.length - 1; // 3 — beyond this cards are hidden

// ── Easing ────────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function clamp01(t: number): number { return Math.min(1, Math.max(0, t)); }

// ── Slot → world position ─────────────────────────────────────────────────────

type Visual = { x: number; y: number; scaleX: number; scaleY: number; alpha: number };

/**
 * Returns the world visual properties for a card at fractional slot position `pos`
 * (positive = right of center, negative = left).
 */
function slotVisual(pos: number, cardW: number, cx: number, cy: number): Visual {
  const sign = pos >= 0 ? 1 : -1;
  const abs  = Math.abs(pos);

  if (abs >= MAX_SLOT) {
    // Clamp at the invisible ±3 slot
    const row = SLOT_TABLE[MAX_SLOT];
    return { x: cx + sign * row.xF * cardW, y: cy, scaleX: row.sX, scaleY: row.sY, alpha: 0 };
  }

  const lo = Math.floor(abs);
  const hi = lo + 1;
  const t  = abs - lo;

  const a = SLOT_TABLE[lo as 0 | 1 | 2 | 3];
  const b = SLOT_TABLE[hi as 0 | 1 | 2 | 3];

  return {
    x:      cx + sign * (a.xF + (b.xF - a.xF) * t) * cardW,
    y:      cy,
    scaleX: a.sX + (b.sX - a.sX) * t,
    scaleY: a.sY + (b.sY - a.sY) * t,
    alpha:  a.a  + (b.a  - a.a)  * t,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CardState = { container: import("pixi.js").Container };

type CoverflowState = {
  cards: CardState[];
  compW: number; compH: number;
  cardW: number; cardH: number;
  cx: number;    cy: number;
};

// ── Placeholder ───────────────────────────────────────────────────────────────

function buildPlaceholder(
  pixi: any, accentColorInt: number, cardW: number, cardH: number
): import("pixi.js").Container {
  const ph = new pixi.Container();
  const s   = cardW / (BASE_COMP_W * 0.295);
  const pad = Math.round(10 * s);
  const iw  = cardW - pad * 2, ih = cardH - pad * 2;
  const dash = Math.round(12 * s), gap = Math.round(7 * s);

  const dg = new pixi.Graphics();
  const segs = [
    { x1: pad, y1: pad, x2: pad + iw, y2: pad      },
    { x1: pad + iw, y1: pad, x2: pad + iw, y2: pad + ih },
    { x1: pad + iw, y1: pad + ih, x2: pad, y2: pad + ih },
    { x1: pad, y1: pad + ih, x2: pad, y2: pad      },
  ];
  for (const seg of segs) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    let t = 0, drawing = true;
    while (t < len) {
      const l = drawing ? Math.min(dash, len - t) : Math.min(gap, len - t);
      if (drawing) dg.moveTo(seg.x1 + nx * t, seg.y1 + ny * t).lineTo(seg.x1 + nx * (t + l), seg.y1 + ny * (t + l));
      t += l; drawing = !drawing;
    }
  }
  dg.stroke({ color: accentColorInt, width: 1.5, alpha: 0.3, cap: "round" });
  ph.addChild(dg);

  const cx = cardW / 2, cy = cardH / 2;
  const ig = new pixi.Graphics();
  ig.moveTo(cx - 28 * s, cy + 17 * s).lineTo(cx - 6 * s, cy - 14 * s)
    .lineTo(cx + 6 * s, cy + 2 * s).lineTo(cx + 16 * s, cy - 8 * s).lineTo(cx + 28 * s, cy + 17 * s);
  ig.fill({ color: accentColorInt, alpha: 0.18 });
  ig.circle(cx - 18 * s, cy - 15 * s, 7 * s).fill({ color: accentColorInt, alpha: 0.24 });
  ph.addChild(ig);
  return ph;
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildCard(
  ctx: RenderContext, pixi: any,
  slot: CompositionNode["slots"][number] | null,
  pageColorInt: number, accentColorInt: number,
  textureCache: Map<string, unknown>, textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined,
  cardW: number, cardH: number,
): CardState {
  const sf    = cardW / (BASE_COMP_W * 0.295);
  const r     = Math.round(14 * sf);
  const inset = Math.round(7  * sf);
  const shX   = Math.round(10 * sf);
  const shY   = Math.round(15 * sf);

  const card = new pixi.Container();
  // Pivot at card center — all scaling / positioning is relative to the card's visual center
  card.pivot.set(cardW / 2, cardH / 2);

  // Shadows (two-pass soft)
  card.addChild(new pixi.Graphics().roundRect(shX, shY, cardW, cardH, r).fill({ color: 0x000000, alpha: 0.26 }));
  card.addChild(new pixi.Graphics().roundRect(shX * 0.5, shY * 0.55, cardW, cardH, r).fill({ color: 0x000000, alpha: 0.10 }));

  // Background
  card.addChild(new pixi.Graphics().roundRect(0, 0, cardW, cardH, r).fill({ color: pageColorInt }));

  // Accent border
  card.addChild(new pixi.Graphics().roundRect(0, 0, cardW, cardH, r).stroke({ color: accentColorInt, width: 2, alpha: 0.35 }));

  // Top highlight
  card.addChild(new pixi.Graphics().roundRect(2, 2, cardW - 4, cardH * 0.3, Math.max(2, r - 2)).fill({ color: 0xffffff, alpha: 0.08 }));

  // Image or placeholder
  const imgW = cardW - inset * 2, imgH = cardH - inset * 2;
  const src  = normalizeAssetSrc(slot?.src);

  if (src && !src.startsWith("placeholder://")) {
    const tex = textureCache.get(src) ?? null;
    if (!tex) {
      if (!textureLoading.has(src)) {
        textureLoading.add(src);
        pixi.Assets.load(src)
          .then((t: unknown) => { textureCache.set(src, t); textureLoading.delete(src); ctx.requestRedraw(); })
          .catch(() => textureLoading.delete(src));
      }
      card.addChild(buildPlaceholder(pixi, accentColorInt, cardW, cardH));
    } else {
      const mask = new pixi.Graphics().roundRect(inset, inset, imgW, imgH, Math.max(2, r - 5)).fill({ color: 0xffffff });
      card.addChild(mask);
      const spr = new pixi.Sprite(tex as any);
      spr.x = inset; spr.y = inset; spr.width = imgW; spr.height = imgH; spr.mask = mask;
      card.addChild(spr);
    }
  } else {
    card.addChild(buildPlaceholder(pixi, accentColorInt, cardW, cardH));
  }

  return { container: card };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createTiltedCarouselNode(
  ctx: RenderContext,
  comp: CompositionNode,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;

  // Card width ~29.5% of comp width; height is a fixed 4:3 aspect of the card width
  const cardW = Math.round(width  * 0.295);
  const cardH = Math.round(height * 0.82);

  const pageColor    = comp.params?.colorOverrides?.pageColor    ?? "#f9f7f2";
  const accentColor  = comp.params?.colorOverrides?.accentColor  ?? "#1a1a2e";
  const pageColorInt  = parseInt(pageColor.replace("#", ""), 16)  || 0xf9f7f2;
  const accentColorInt = parseInt(accentColor.replace("#", ""), 16) || 0x1a1a2e;

  const container = new pixi.Container();
  const renderCount = comp.slots.length > 0 ? comp.slots.length : 5;
  const cards: CardState[] = [];

  for (let i = 0; i < renderCount; i++) {
    const state = buildCard(ctx, pixi, comp.slots[i] ?? null, pageColorInt, accentColorInt,
      textureCache, textureLoading, normalizeAssetSrc, cardW, cardH);
    state.container.visible = false;
    container.addChild(state.container);
    cards.push(state);
  }

  const cx = width  / 2;
  const cy = height / 2;

  (container as any)._coverflowState = { cards, compW: width, compH: height, cardW, cardH, cx, cy } satisfies CoverflowState;
  return container;
}

export function updateTiltedCarouselNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._coverflowState as CoverflowState | undefined;
  if (!state) return;

  const { cards, cardW, cx, cy } = state;
  const n = cards.length;
  if (n === 0) return;

  const holdMs    = Math.max(100, comp.params?.holdDuration ?? 2000);
  const speed     = comp.params?.speed ?? 1;
  const compStart = comp.startMs ?? 0;
  const elapsed   = Math.max(0, (localTimeMs - compStart) * speed);

  const cycleMs  = holdMs + TRANSITION_MS;
  const looped   = elapsed % (cycleMs * n);
  const rawIndex = looped / cycleMs;              // fractional, monotonically increasing
  const baseIdx  = Math.floor(rawIndex);
  const within   = rawIndex - baseIdx;            // 0..1 within this card's cycle
  const holdFrac = holdMs / cycleMs;

  // animProgress: 0 while holding, smoothly 0→1 during transition
  const animProgress = within <= holdFrac
    ? 0
    : easeInOutCubic(clamp01((within - holdFrac) / (1 - holdFrac)));

  // ── Compute each card's fractional slot position ──────────────────────────
  type Entry = { card: CardState; slotPos: number; vis: Visual };
  const entries: Entry[] = [];

  for (let i = 0; i < n; i++) {
    // Relative index from current base center
    let rel = ((i - baseIdx) % n + n) % n;
    // Wrap to the nearest side: [-n/2, n/2]
    if (rel > n / 2) rel -= n;

    // Shift left by animProgress so cards glide continuously left during transition
    const slotPos = rel - animProgress;

    // Only render cards within visible range
    if (Math.abs(slotPos) > MAX_SLOT) continue;

    entries.push({ card: cards[i], slotPos, vis: slotVisual(slotPos, cardW, cx, cy) });
  }

  // ── Draw outermost cards first (addChild puts each at top, so last = front) ──
  entries.sort((a, b) => Math.abs(b.slotPos) - Math.abs(a.slotPos));

  for (const c of cards) c.container.visible = false;

  for (const { card, vis } of entries) {
    const c = card.container;
    c.visible  = vis.alpha > 0.01;
    c.x        = vis.x;
    c.y        = vis.y;
    c.scale.x  = vis.scaleX * vis.scaleY;
    c.scale.y  = vis.scaleY;
    c.alpha    = Math.max(0, Math.min(1, vis.alpha));
    c.rotation = 0;
    node.addChild(c); // re-inserts at top → correctly orders front card last
  }
}
