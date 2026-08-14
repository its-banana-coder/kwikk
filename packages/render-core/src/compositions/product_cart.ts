import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

type TextureCache = Map<string, unknown>;
type TextureLoadingSet = Set<string>;

type SlotState = {
  card: import("pixi.js").Container;
  baseX: number;
  baseY: number;
};

type ProductCartState = {
  slots: SlotState[];
  bag: import("pixi.js").Container;
  checkmark: import("pixi.js").Container;
  particles: { g: import("pixi.js").Container; angle: number }[];
  bagCX: number;
  bagCY: number;
  bagSize: number;
  cardX: number;
  cardY: number;
  cardW: number;
  cardH: number;
};

// Per-slot phases:
//   0.00 – 0.55  static display (gentle float)
//   0.55 – 0.78  fly into bag   (flyProgress 0→1)
//   0.78 – 1.00  bag bounce + burst + next card enters (bounceProgress 0→1)
const FLY_START = 0.55;
const BOUNCE_START = 0.78;

export function resolveProductCartPhase(
  comp: CompositionNode,
  localTimeMs: number,
  sceneDurationMs: number
): { currentIndex: number; withinSlot: number; flyProgress: number; bounceProgress: number } {
  const n = Math.max(1, comp.slots.length);

  const compStart = comp.startMs ?? 0;
  const compEnd = comp.endMs ?? sceneDurationMs;
  const totalMs = Math.max(1, compEnd - compStart);
  const speed = comp.params?.speed ?? 1;
  const t = Math.max(0, Math.min(totalMs, (localTimeMs - compStart) * speed));

  const timePerSlot = totalMs / n;
  const rawIndex = t / timePerSlot;
  const currentIndex = Math.min(n - 1, Math.floor(rawIndex));
  const withinSlot = rawIndex - currentIndex;

  let flyProgress = 0;
  let bounceProgress = 0;

  if (withinSlot >= BOUNCE_START) {
    flyProgress = 1;
    bounceProgress = (withinSlot - BOUNCE_START) / (1 - BOUNCE_START);
  } else if (withinSlot >= FLY_START) {
    flyProgress = (withinSlot - FLY_START) / (BOUNCE_START - FLY_START);
  }

  return { currentIndex, withinSlot, flyProgress, bounceProgress };
}

function buildBag(
  pixi: any,
  size: number,
  accentColorInt: number
): import("pixi.js").Container {
  const bag = new pixi.Container();

  const bodyY = size * 0.3;
  const bodyH = size * 0.7;

  // Body
  bag.addChild(
    new pixi.Graphics()
      .roundRect(0, bodyY, size, bodyH, size * 0.12)
      .fill({ color: accentColorInt })
  );

  // Handle arc
  const hx1 = size * 0.25;
  const hx2 = size * 0.75;
  const hy = bodyY;
  const ctrl = bodyY - size * 0.35;
  const handleG = new pixi.Graphics();
  handleG.moveTo(hx1, hy);
  handleG.bezierCurveTo(hx1, ctrl, hx2, ctrl, hx2, hy);
  handleG.stroke({ color: accentColorInt, width: Math.max(3, size * 0.072), cap: "round" });
  bag.addChild(handleG);

  // Shine
  bag.addChild(
    new pixi.Graphics()
      .roundRect(size * 0.14, bodyY + size * 0.1, size * 0.24, size * 0.09, 4)
      .fill({ color: 0xffffff, alpha: 0.2 })
  );

  // Inner divider line
  bag.addChild(
    new pixi.Graphics()
      .rect(size * 0.18, bodyY + bodyH * 0.38, size * 0.64, 1.5)
      .fill({ color: 0xffffff, alpha: 0.14 })
  );

  return bag;
}

function buildCheckmark(pixi: any, size: number): import("pixi.js").Container {
  const ck = new pixi.Container();
  const g = new pixi.Graphics();
  g.moveTo(size * 0.22, size * 0.52);
  g.lineTo(size * 0.44, size * 0.74);
  g.lineTo(size * 0.82, size * 0.3);
  g.stroke({ color: 0xffffff, width: Math.max(2.5, size * 0.082), cap: "round", join: "round" });
  ck.addChild(g);
  ck.alpha = 0;
  return ck;
}

function buildCard(
  ctx: RenderContext,
  pixi: any,
  slot: CompositionNode["slots"][number] | null,
  cardW: number,
  cardH: number,
  pageColorInt: number,
  accentColorInt: number,
  textureCache: TextureCache,
  textureLoading: TextureLoadingSet,
  normalizeAssetSrc: (src: string | undefined) => string | undefined,
  slotIndex: number
): import("pixi.js").Container {
  const card = new pixi.Container();

  // Drop shadow
  card.addChild(
    new pixi.Graphics()
      .roundRect(6, 8, cardW, cardH, 14)
      .fill({ color: 0x000000, alpha: 0.16 })
  );

  // Card bg
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, cardW, cardH, 14)
      .fill({ color: pageColorInt })
  );

  // Card border
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, cardW, cardH, 14)
      .stroke({ color: accentColorInt, width: 1.8, alpha: 0.3 })
  );

  // Accent top bar
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, cardW, 5, { tl: 14, tr: 14, bl: 0, br: 0 } as any)
      .fill({ color: accentColorInt, alpha: 0.5 })
  );

  const inset = Math.max(10, cardW * 0.055);
  const imgH = cardH * 0.64;

  // Image area
  const src = normalizeAssetSrc(slot?.src);
  let texture: unknown | null = null;
  let isLoading = false;

  if (src && !src.startsWith("placeholder://")) {
    texture = textureCache.get(src) ?? null;
    if (!texture) {
      isLoading = true;
      if (!textureLoading.has(src)) {
        textureLoading.add(src);
        pixi.Assets.load(src)
          .then((tex: unknown) => {
            textureCache.set(src, tex);
            textureLoading.delete(src);
            ctx.requestRedraw();
          })
          .catch(() => textureLoading.delete(src));
      }
    }
  }

  if (isLoading) {
    const lbl = new pixi.Text({
      text: "Loading…",
      style: { fill: "#888", fontSize: Math.max(13, cardW * 0.05), fontFamily: "Inter, sans-serif" },
    });
    lbl.anchor.set(0.5, 0.5);
    lbl.x = cardW / 2;
    lbl.y = inset + imgH / 2;
    card.addChild(lbl);
  } else if (texture) {
    const mask = new pixi.Graphics()
      .roundRect(inset, inset, cardW - inset * 2, imgH, 8)
      .fill({ color: 0xffffff });
    card.addChild(mask);
    const sprite = new pixi.Sprite(texture as any);
    sprite.x = inset;
    sprite.y = inset;
    sprite.width = cardW - inset * 2;
    sprite.height = imgH;
    sprite.mask = mask;
    card.addChild(sprite);
  } else {
    // Placeholder
    const px = inset, py = inset, pw = cardW - inset * 2, ph = imgH;
    const dg = new pixi.Graphics();
    const dl = 10, gl = 6;
    const d = (x: number, y: number, w: number, h: number) =>
      dg.rect(x, y, w, h).fill({ color: accentColorInt, alpha: 0.24 });
    for (let x = px; x < px + pw; x += dl + gl) { const sw = Math.min(dl, px + pw - x); d(x, py, sw, 2); d(x, py + ph - 2, sw, 2); }
    for (let y = py; y < py + ph; y += dl + gl) { const sh = Math.min(dl, py + ph - y); d(px, y, 2, sh); d(px + pw - 2, y, 2, sh); }
    card.addChild(dg);

    const ic = Math.min(44, pw * 0.22);
    const ix = cardW / 2 - ic / 2, iy = py + ph / 2 - ic / 2 - 14;
    card.addChild(new pixi.Graphics().roundRect(ix, iy, ic, ic, 6).fill({ color: accentColorInt, alpha: 0.08 }));
    card.addChild(new pixi.Graphics().roundRect(ix, iy, ic, ic, 6).stroke({ color: accentColorInt, width: 1.2, alpha: 0.3 }));
    const mg = new pixi.Graphics();
    mg.moveTo(ix + ic * 0.18, iy + ic * 0.68).lineTo(ix + ic * 0.48, iy + ic * 0.34).lineTo(ix + ic * 0.82, iy + ic * 0.68).closePath().fill({ color: accentColorInt, alpha: 0.2 });
    card.addChild(mg);
    const al = new pixi.Text({
      text: "Add Image",
      style: { fill: `#${accentColorInt.toString(16).padStart(6, "0")}`, fontSize: Math.max(11, Math.min(14, pw * 0.07)), fontFamily: "Inter, sans-serif", fontWeight: "600" },
    });
    al.alpha = 0.65; al.anchor.set(0.5, 0); al.x = cardW / 2; al.y = iy + ic + 8;
    card.addChild(al);
  }

  // Bottom info strip — product number badge
  const stripY = inset + imgH + inset * 0.6;
  const badge = new pixi.Graphics()
    .roundRect(inset, stripY, 30, 19, 10)
    .fill({ color: accentColorInt, alpha: 0.12 });
  card.addChild(badge);
  const numLbl = new pixi.Text({
    text: `${(slotIndex + 1).toString().padStart(2, "0")}`,
    style: { fill: `#${accentColorInt.toString(16).padStart(6, "0")}`, fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: "700" },
  });
  numLbl.alpha = 0.5;
  numLbl.x = inset + 5; numLbl.y = stripY + 4;
  card.addChild(numLbl);

  // Bottom accent bar
  card.addChild(
    new pixi.Graphics()
      .roundRect(0, cardH - 5, cardW, 5, 4)
      .fill({ color: accentColorInt, alpha: 0.4 })
  );

  return card;
}

export function createProductCartNode(
  ctx: RenderContext,
  comp: CompositionNode,
  textureCache: TextureCache,
  textureLoading: TextureLoadingSet,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;
  const pageColor = comp.params?.colorOverrides?.pageColor ?? "#f9f7f2";
  const accentColor = comp.params?.colorOverrides?.accentColor ?? "#1a1a2e";
  const pageColorInt = parseInt(pageColor.replace("#", ""), 16) || 0xf9f7f2;
  const accentColorInt = parseInt(accentColor.replace("#", ""), 16) || 0x1a1a2e;

  const container = new pixi.Container();

  // Outer shell (skill quality standard)
  container.addChild(new pixi.Graphics().roundRect(14, 16, width, height, 14).fill({ color: 0x000000, alpha: 0.22 }));
  container.addChild(new pixi.Graphics().roundRect(6, 10, width, height, 14).fill({ color: 0x000000, alpha: 0.08 }));
  container.addChild(new pixi.Graphics().roundRect(1.5, 1.5, width - 3, height - 3, 12).stroke({ color: 0x8f877a, width: 4.5, alpha: 0.2 }));
  container.addChild(new pixi.Graphics().roundRect(0, 0, width, height, 12).fill({ color: pageColorInt }));

  // Accent header band
  container.addChild(
    new pixi.Graphics()
      .roundRect(0, 0, width, height * 0.13, 12)
      .fill({ color: accentColorInt, alpha: 0.07 })
  );

  // Bag: top-right area
  const bagSize = Math.max(48, Math.min(76, width * 0.21));
  const bagMargin = width * 0.07;
  const bagX = width - bagSize - bagMargin;
  const bagY = height * 0.055;
  const bagCX = bagX + bagSize / 2;
  const bagCY = bagY + bagSize / 2;

  // Card: centered below header band
  const cardW = width * 0.78;
  const cardH = height * 0.68;
  const cardX = (width - cardW) / 2;
  const cardY = height * 0.18;

  // Build slot cards
  const slotCount = Math.max(1, comp.slots.length);
  const slots: SlotState[] = [];

  for (let i = 0; i < slotCount; i++) {
    const slot = comp.slots[i] ?? null;
    const card = buildCard(ctx, pixi, slot, cardW, cardH, pageColorInt, accentColorInt, textureCache, textureLoading, normalizeAssetSrc, i);
    card.x = cardX;
    card.y = cardY;
    card.pivot.set(cardW / 2, cardH / 2);
    card.x += cardW / 2;
    card.y += cardH / 2;
    card.visible = i === 0;
    container.addChild(card);
    slots.push({ card, baseX: cardX + cardW / 2, baseY: cardY + cardH / 2 });
  }

  // Bag (on top of cards so product "lands inside" visually)
  const bag = buildBag(pixi, bagSize, accentColorInt);
  bag.x = bagX;
  bag.y = bagY;
  bag.pivot.set(bagSize / 2, bagSize / 2);
  bag.x += bagSize / 2;
  bag.y += bagSize / 2;
  container.addChild(bag);

  // Checkmark overlaid on bag (same pivot)
  const checkmark = buildCheckmark(pixi, bagSize);
  checkmark.x = bagX;
  checkmark.y = bagY;
  container.addChild(checkmark);

  // Burst particles — pre-built, hidden until bounce
  const particles: { g: import("pixi.js").Container; angle: number }[] = [];
  const numP = 8;
  for (let i = 0; i < numP; i++) {
    const angle = (Math.PI * 2 * i) / numP - Math.PI / 2;
    const dot = new pixi.Graphics()
      .circle(0, 0, Math.max(2.5, bagSize * 0.055))
      .fill({ color: accentColorInt, alpha: 0.75 });
    dot.alpha = 0;
    dot.x = bagCX;
    dot.y = bagCY;
    container.addChild(dot);
    particles.push({ g: dot, angle });
  }

  // Outer border + highlight on top of everything
  container.addChild(new pixi.Graphics().roundRect(0, 0, width, height, 12).stroke({ color: accentColorInt, width: 2.2, alpha: 0.5 }));
  container.addChild(new pixi.Graphics().roundRect(14, 7, width - 28, 10, 7).fill({ color: 0xffffff, alpha: 0.075 }));

  (container as any)._productCartState = {
    slots, bag, checkmark, particles,
    bagCX, bagCY, bagSize,
    cardX: cardX + cardW / 2,
    cardY: cardY + cardH / 2,
    cardW, cardH,
  } satisfies ProductCartState;

  return container;
}

export function updateProductCartNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  sceneDurationMs: number
): void {
  const state = (node as any)._productCartState as ProductCartState | undefined;
  if (!state) return;

  const { slots, bag, checkmark, particles, bagCX, bagCY, bagSize, cardH } = state;

  // ── Reset everything ──────────────────────────────────────────────────────
  slots.forEach((s) => {
    s.card.visible = false;
    s.card.x = s.baseX;
    s.card.y = s.baseY;
    s.card.scale.set(1, 1);
    s.card.alpha = 1;
    s.card.rotation = 0;
  });
  bag.scale.set(1, 1);
  bag.rotation = 0;
  checkmark.alpha = 0;
  particles.forEach((p) => { p.g.alpha = 0; p.g.x = bagCX; p.g.y = bagCY; });

  // ── Resolve time ──────────────────────────────────────────────────────────
  const { currentIndex, flyProgress, bounceProgress } =
    resolveProductCartPhase(comp, localTimeMs, sceneDurationMs);

  const current = slots[currentIndex];
  if (!current) return;

  current.card.visible = true;

  // ── Phase 1: static display with gentle float ─────────────────────────────
  if (flyProgress === 0) {
    const floatY = Math.sin(localTimeMs * Math.PI / 1400) * 5;
    current.card.y = state.cardY + floatY;
    // Bag sits quietly, slight pulse
    const bagPulse = 1 + 0.03 * Math.sin(localTimeMs * Math.PI / 1100);
    bag.scale.set(bagPulse, bagPulse);
    return;
  }

  // ── Phase 2: product flies into bag ──────────────────────────────────────
  if (flyProgress < 1) {
    const ease = flyProgress * flyProgress * (3 - 2 * flyProgress); // smoothstep

    current.card.x = state.cardX + (bagCX - state.cardX) * ease;
    current.card.y = state.cardY + (bagCY - state.cardY) * ease;
    current.card.scale.set(1 - ease * 0.78, 1 - ease * 0.78);
    current.card.alpha = 1 - ease * 0.9;
    current.card.rotation = ease * 0.22;

    // Bag grows and tilts in anticipation
    const bagPrep = 1 + ease * 0.18;
    bag.scale.set(bagPrep, bagPrep);
    bag.rotation = -ease * 0.08;
    return;
  }

  // ── Phase 3: bag bounce + burst + next card entering ─────────────────────
  current.card.alpha = 0;

  // Damped bounce: 4 oscillations decaying to rest
  const bounce = Math.sin(bounceProgress * Math.PI * 4.5) * Math.exp(-bounceProgress * 4.2);
  bag.rotation = bounce * 0.22;
  const scaleJolt = 1 + Math.abs(bounce) * 0.12;
  bag.scale.set(scaleJolt, scaleJolt);

  // Checkmark fades in
  checkmark.alpha = Math.min(1, bounceProgress * 4);

  // Particle burst — fires in first 40% of bounce phase
  if (bounceProgress < 0.42) {
    const burstP = bounceProgress / 0.42;
    const radius = bagSize * 0.5 + burstP * bagSize * 0.95;
    const fadeAlpha = (1 - burstP) * 0.75;
    particles.forEach((p) => {
      p.g.alpha = fadeAlpha;
      p.g.x = bagCX + Math.cos(p.angle) * radius;
      p.g.y = bagCY + Math.sin(p.angle) * radius;
    });
  }

  // Next card enters from below during the last 35% of bounce phase
  if (bounceProgress > 0.65) {
    const nextIndex = currentIndex + 1;
    const next = slots[nextIndex];
    if (next) {
      const enterP = (bounceProgress - 0.65) / 0.35;
      const easeIn = enterP * enterP;
      next.card.visible = true;
      next.card.alpha = easeIn;
      next.card.y = state.cardY + (1 - easeIn) * cardH * 0.28;
      next.card.scale.set(0.88 + easeIn * 0.12, 0.88 + easeIn * 0.12);
    }
  }
}
