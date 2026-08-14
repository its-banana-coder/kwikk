import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

// Base dimensions at the default composition size (580×380).
// All geometry scales proportionally from these.
const BASE_COMP_H = 380;
const BASE_CARD_H = 185; // 7:10 portrait card
const BASE_CARD_W = 130;
const BASE_CARD_RADIUS = 14;
const BASE_IMG_INSET = 7;
const BASE_SHADOW_OFFSET_X = 10;
const BASE_SHADOW_OFFSET_Y = 14;

type CardState = {
  container: import("pixi.js").Container;
};

type CarouselState = {
  cards: CardState[];
  compW: number;
  compH: number;
  cardW: number;
  cardH: number;
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function buildPlaceholder(
  pixi: any,
  accentColorInt: number,
  cardW: number,
  cardH: number,
  imgInset: number
): import("pixi.js").Container {
  const ph = new pixi.Container();

  // Dashed border around image area
  const dg = new pixi.Graphics();
  const x0 = imgInset, y0 = imgInset;
  const iw = cardW - imgInset * 2, ih = cardH - imgInset * 2;
  const dash = Math.round(10 * cardH / BASE_CARD_H);
  const gap  = Math.round(6  * cardH / BASE_CARD_H);
  const segs = [
    { x1: x0,      y1: y0,      x2: x0 + iw, y2: y0      },
    { x1: x0 + iw, y1: y0,      x2: x0 + iw, y2: y0 + ih },
    { x1: x0 + iw, y1: y0 + ih, x2: x0,      y2: y0 + ih },
    { x1: x0,      y1: y0 + ih, x2: x0,       y2: y0     },
  ];
  for (const seg of segs) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    let t = 0, drawing = true;
    while (t < len) {
      const segLen = drawing ? Math.min(dash, len - t) : Math.min(gap, len - t);
      if (drawing) {
        dg.moveTo(seg.x1 + nx * t, seg.y1 + ny * t)
          .lineTo(seg.x1 + nx * (t + segLen), seg.y1 + ny * (t + segLen));
      }
      t += segLen;
      drawing = !drawing;
    }
  }
  dg.stroke({ color: accentColorInt, width: 1.5, alpha: 0.3, cap: "round" });
  ph.addChild(dg);

  // Mountain / picture icon
  const cx = cardW / 2, cy = cardH / 2;
  const s = cardH / BASE_CARD_H;
  const ig = new pixi.Graphics();
  ig.moveTo(cx - 28 * s, cy + 18 * s)
    .lineTo(cx -  6 * s, cy - 14 * s)
    .lineTo(cx +  6 * s, cy +  2 * s)
    .lineTo(cx + 16 * s, cy -  8 * s)
    .lineTo(cx + 28 * s, cy + 18 * s);
  ig.fill({ color: accentColorInt, alpha: 0.18 });
  ig.circle(cx - 18 * s, cy - 16 * s, 7 * s).fill({ color: accentColorInt, alpha: 0.22 });
  ph.addChild(ig);

  return ph;
}

function buildCard(
  ctx: RenderContext,
  pixi: any,
  slot: CompositionNode["slots"][number] | null,
  pageColorInt: number,
  accentColorInt: number,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined,
  cardW: number,
  cardH: number,
  cardRadius: number,
  imgInset: number,
  shadowX: number,
  shadowY: number
): CardState {
  const card = new pixi.Container();
  // Pivot at card center so depth-based scale stays in place
  card.pivot.set(cardW / 2, cardH / 2);

  // Drop shadow — two passes for soft falloff
  card.addChild(
    new pixi.Graphics()
      .roundRect(shadowX, shadowY, cardW, cardH, cardRadius)
      .fill({ color: 0x000000, alpha: 0.22 })
  );
  card.addChild(
    new pixi.Graphics()
      .roundRect(shadowX * 0.5, shadowY * 0.6, cardW, cardH, cardRadius)
      .fill({ color: 0x000000, alpha: 0.08 })
  );

  // Card background
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, cardW, cardH, cardRadius)
      .fill({ color: pageColorInt })
  );

  // Accent border
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, cardW, cardH, cardRadius)
      .stroke({ color: accentColorInt, width: 2.2, alpha: 0.4 })
  );

  // Top highlight
  card.addChild(
    new pixi.Graphics()
      .roundRect(2, 2, cardW - 4, cardH * 0.32, Math.max(2, cardRadius - 2))
      .fill({ color: 0xffffff, alpha: 0.075 })
  );

  // Image or placeholder
  const imgW = cardW - imgInset * 2;
  const imgH = cardH - imgInset * 2;
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
      card.addChild(buildPlaceholder(pixi, accentColorInt, cardW, cardH, imgInset));
    } else {
      const mask = new pixi.Graphics()
        .roundRect(imgInset, imgInset, imgW, imgH, Math.max(2, cardRadius - 5))
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
    card.addChild(buildPlaceholder(pixi, accentColorInt, cardW, cardH, imgInset));
  }

  return { container: card };
}

export function createSpinningCarouselNode(
  ctx: RenderContext,
  comp: CompositionNode,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;

  // Scale all card geometry proportionally with composition height
  const scale = height / BASE_COMP_H;
  const cardH      = Math.round(BASE_CARD_H * scale);
  const cardW      = Math.round(BASE_CARD_W * scale);
  const cardRadius = Math.round(BASE_CARD_RADIUS * scale);
  const imgInset   = Math.max(4, Math.round(BASE_IMG_INSET * scale));
  const shadowX    = Math.round(BASE_SHADOW_OFFSET_X * scale);
  const shadowY    = Math.round(BASE_SHADOW_OFFSET_Y * scale);

  const pageColor = comp.params?.colorOverrides?.pageColor ?? "#fff3ed";
  const pageColorInt = parseInt(pageColor.replace("#", ""), 16) || 0xfff3ed;
  const accentColor = comp.params?.colorOverrides?.accentColor ?? "#1a1a2e";
  const accentColorInt = parseInt(accentColor.replace("#", ""), 16) || 0x1a1a2e;

  const container = new pixi.Container();

  // Show 6 placeholder cards when no slots defined
  const renderCount = comp.slots.length > 0 ? comp.slots.length : 6;

  const cards: CardState[] = [];
  for (let i = 0; i < renderCount; i++) {
    const slot = comp.slots[i] ?? null;
    const state = buildCard(
      ctx, pixi, slot,
      pageColorInt, accentColorInt,
      textureCache, textureLoading, normalizeAssetSrc,
      cardW, cardH, cardRadius, imgInset, shadowX, shadowY
    );
    state.container.visible = false;
    container.addChild(state.container);
    cards.push(state);
  }

  (container as any)._carouselState = {
    cards,
    compW: width,
    compH: height,
    cardW,
    cardH,
  } satisfies CarouselState;

  return container;
}

export function updateSpinningCarouselNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._carouselState as CarouselState | undefined;
  if (!state) return;

  const { cards, compW, compH, cardW, cardH } = state;
  const n = cards.length;
  if (n === 0) return;

  const speed = comp.params?.speed ?? 1;
  const compStart = comp.startMs ?? 0;
  const elapsed = Math.max(0, (localTimeMs - compStart) * speed);

  // Full turn every 8 seconds at speed=1
  const periodMs = 8000;
  const globalAngle = (elapsed / periodMs) * Math.PI * 2;

  // Radius: CodePen formula — (half card width + gap) / tan(half sector angle)
  const gap = Math.round(8 * compH / BASE_COMP_H);
  const sectorAngle = Math.PI / n;
  const radius = (cardW * 0.5 + gap) / Math.tan(sectorAngle);

  const centerX = compW / 2;
  const centerY = compH / 2 + Math.round(8 * compH / BASE_COMP_H);

  const SCALE_FRONT = 1.0;
  const SCALE_BACK  = 0.62;
  const ALPHA_FRONT = 1.0;
  const ALPHA_BACK  = 0.25;
  // Cards facing away (cos < threshold) are hidden — simulates backface-visibility: hidden
  const BACKFACE_THRESHOLD = -0.12;

  type CardSort = {
    card: CardState;
    depth: number;
    x: number;
    y: number;
    scaleVal: number;
    alpha: number;
    visible: boolean;
  };

  const sorted: CardSort[] = [];

  for (let i = 0; i < n; i++) {
    const angle = globalAngle + i * ((2 * Math.PI) / n);
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle); // 1=front, -1=back

    const x = centerX + radius * sinA;
    // Slight y arc: front cards drop a little, back cards rise
    const y = centerY + radius * 0.07 * cosA;

    const depth = cosA;
    const visible = depth > BACKFACE_THRESHOLD;
    const t = (depth + 1) / 2; // 0..1
    const scaleVal = SCALE_BACK + t * (SCALE_FRONT - SCALE_BACK);

    // Edge fade: mirrors the CodePen's gradient mask (fade 20% in from each edge)
    const xFraction = clamp01(x / compW);
    const edgeFade = xFraction < 0.2
      ? xFraction / 0.2
      : xFraction > 0.8
        ? (1 - xFraction) / 0.2
        : 1;

    const alpha = (ALPHA_BACK + t * (ALPHA_FRONT - ALPHA_BACK)) * edgeFade;

    sorted.push({ card: cards[i], depth, x, y, scaleVal, alpha, visible });
  }

  // Sort back-to-front — painter's algorithm
  sorted.sort((a, b) => a.depth - b.depth);

  // Re-insert in depth order (addChild moves an existing child to the top)
  for (const s of sorted) {
    s.card.container.visible = s.visible;
    s.card.container.x = s.x;
    s.card.container.y = s.y;
    s.card.container.scale.set(s.scaleVal);
    s.card.container.alpha = s.alpha;
    node.addChild(s.card.container);
  }

  void cardH; // referenced via state, suppress unused warning
}
