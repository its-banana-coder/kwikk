import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

type TextureCache = Map<string, unknown>;
type TextureLoadingSet = Set<string>;

type PageState = {
  node: import("pixi.js").Container;
  baseX: number;
};

type SpreadState = {
  root: import("pixi.js").Container;
  left: PageState;
  right: PageState;
};

type BookShellState = {
  gutterShadow: import("pixi.js").Container;
  gutterGlow: import("pixi.js").Container;
  pageEdgeLeft: import("pixi.js").Container;
  pageEdgeRight: import("pixi.js").Container;
  pageEdgeBottom: import("pixi.js").Container;
  spreadShadow: import("pixi.js").Container;
  coverLip: import("pixi.js").Container;
  topHighlight: import("pixi.js").Container;
  outerShadeLeft: import("pixi.js").Container;
  outerShadeRight: import("pixi.js").Container;
  innerGutterLeft: import("pixi.js").Container;
  innerGutterRight: import("pixi.js").Container;
};

export interface BookFlipRenderer {
  create(
    ctx: RenderContext,
    comp: CompositionNode,
    textureCache: TextureCache,
    textureLoading: TextureLoadingSet,
    normalizeAssetSrc: (src: string | undefined) => string | undefined
  ): import("pixi.js").Container;

  update(
    node: import("pixi.js").Container,
    comp: CompositionNode,
    localTimeMs: number,
    sceneDurationMs: number
  ): void;
}

function getSpreadCount(comp: CompositionNode): number {
  return Math.max(1, Math.ceil(comp.slots.length / 2));
}

function getSpreadSlotPair(comp: CompositionNode, spreadIndex: number) {
  const leftSlot = comp.slots[spreadIndex * 2] ?? null;
  const rightSlot = comp.slots[spreadIndex * 2 + 1] ?? null;
  return { leftSlot, rightSlot };
}

export function resolveBookFlipState(
  comp: CompositionNode,
  localTimeMs: number,
  sceneDurationMs: number
): { currentIndex: number; nextIndex: number; flipProgress: number } {
  const spreadCount = getSpreadCount(comp);
  if (spreadCount <= 1) return { currentIndex: 0, nextIndex: 0, flipProgress: 0 };

  const compStart = comp.startMs ?? 0;
  const compEnd = comp.endMs ?? sceneDurationMs;
  const totalMs = Math.max(1, compEnd - compStart);
  const speed = comp.params?.speed ?? 1;
  const t = Math.max(0, Math.min(totalMs, (localTimeMs - compStart) * speed));

  const timePerSpread = totalMs / spreadCount;
  const rawIndex = t / timePerSpread;
  const currentIndex = Math.min(spreadCount - 1, Math.floor(rawIndex));
  const withinSpread = rawIndex - currentIndex;

  const flipFraction = 0.34;
  const isFlipping = currentIndex < spreadCount - 1 && withinSpread > 1 - flipFraction;
  const flipProgress = isFlipping
    ? (withinSpread - (1 - flipFraction)) / flipFraction
    : 0;

  return {
    currentIndex,
    nextIndex: Math.min(spreadCount - 1, currentIndex + 1),
    flipProgress,
  };
}

function buildPageContent(
  pixi: any,
  pageContainer: import("pixi.js").Container,
  width: number,
  height: number,
  pageColorInt: number,
  accentColorInt: number,
  texture: unknown | null,
  isLoading: boolean,
  pageNumber: number
): void {
  const pageBg = new pixi.Graphics()
    .roundRect(0, 0, width, height, 8)
    .fill({ color: pageColorInt });
  pageContainer.addChild(pageBg);

  const pageBorder = new pixi.Graphics()
    .roundRect(0, 0, width, height, 8)
    .stroke({ color: accentColorInt, width: 1.4, alpha: 0.16 });
  pageContainer.addChild(pageBorder);

  const contentInset = Math.max(10, width * 0.04);
  const contentWidth = width - contentInset * 2;
  const contentHeight = height - contentInset * 2;

  if (isLoading) {
    const label = new pixi.Text({
      text: "Loading…",
      style: {
        fill: "#888888",
        fontSize: Math.max(14, width * 0.055),
        fontFamily: "Inter, sans-serif",
      },
    });
    label.anchor.set(0.5, 0.5);
    label.x = width / 2;
    label.y = height / 2;
    pageContainer.addChild(label);
    return;
  }

  if (texture) {
    try {
      const imageMask = new pixi.Graphics()
        .roundRect(contentInset, contentInset, contentWidth, contentHeight, 6)
        .fill({ color: 0xffffff });
      pageContainer.addChild(imageMask);

      const sprite = new pixi.Sprite(texture as any);
      sprite.x = contentInset;
      sprite.y = contentInset;
      sprite.width = contentWidth;
      sprite.height = contentHeight;
      sprite.mask = imageMask;
      pageContainer.addChild(sprite);
    } catch {
      // Keep the page background if the asset cannot be mounted yet.
    }
    return;
  }

  const dashG = new pixi.Graphics();
  const dashLen = 10;
  const gapLen = 6;
  const drawDash = (x: number, y: number, w: number, h: number) =>
    dashG.rect(x, y, w, h).fill({ color: accentColorInt, alpha: 0.26 });

  for (let x = contentInset; x < contentInset + contentWidth; x += dashLen + gapLen) {
    const segW = Math.min(dashLen, contentInset + contentWidth - x);
    drawDash(x, contentInset, segW, 2);
    drawDash(x, contentInset + contentHeight - 2, segW, 2);
  }
  for (let y = contentInset; y < contentInset + contentHeight; y += dashLen + gapLen) {
    const segH = Math.min(dashLen, contentInset + contentHeight - y);
    drawDash(contentInset, y, 2, segH);
    drawDash(contentInset + contentWidth - 2, y, 2, segH);
  }
  pageContainer.addChild(dashG);

  const iconSize = Math.max(28, Math.min(48, width * 0.22));
  const iconX = width / 2 - iconSize / 2;
  const iconY = height / 2 - iconSize / 2 - 16;

  const iconBg = new pixi.Graphics()
    .roundRect(iconX, iconY, iconSize, iconSize, 6)
    .fill({ color: accentColorInt, alpha: 0.08 });
  pageContainer.addChild(iconBg);

  const iconBorder = new pixi.Graphics()
    .roundRect(iconX, iconY, iconSize, iconSize, 6)
    .stroke({ color: accentColorInt, width: 1.2, alpha: 0.32 });
  pageContainer.addChild(iconBorder);

  const iconG = new pixi.Graphics();
  const mx = iconX + iconSize * 0.18;
  const my = iconY + iconSize * 0.68;
  iconG
    .moveTo(mx, my)
    .lineTo(iconX + iconSize * 0.48, iconY + iconSize * 0.34)
    .lineTo(iconX + iconSize * 0.82, my)
    .closePath()
    .fill({ color: accentColorInt, alpha: 0.22 });
  pageContainer.addChild(iconG);

  const addImageLabel = new pixi.Text({
    text: "Add Image",
    style: {
      fill: `#${accentColorInt.toString(16).padStart(6, "0")}`,
      fontSize: Math.max(11, Math.min(15, width * 0.055)),
      fontFamily: "Inter, sans-serif",
      fontWeight: "600",
    },
  });
  addImageLabel.alpha = 0.65;
  addImageLabel.anchor.set(0.5, 0);
  addImageLabel.x = width / 2;
  addImageLabel.y = iconY + iconSize + 8;
  pageContainer.addChild(addImageLabel);

  const pageLabel = new pixi.Text({
    text: `Page ${pageNumber}`,
    style: {
      fill: `#${accentColorInt.toString(16).padStart(6, "0")}`,
      fontSize: Math.max(10, Math.min(13, width * 0.05)),
      fontFamily: "Inter, sans-serif",
    },
  });
  pageLabel.alpha = 0.34;
  pageLabel.anchor.set(0.5, 1);
  pageLabel.x = width / 2;
  pageLabel.y = height - contentInset;
  pageContainer.addChild(pageLabel);
}

function createPage(
  ctx: RenderContext,
  pixi: any,
  slot: CompositionNode["slots"][number] | null,
  pageNumber: number,
  width: number,
  height: number,
  pageColorInt: number,
  accentColorInt: number,
  textureCache: TextureCache,
  textureLoading: TextureLoadingSet,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const page = new pixi.Container();

  let texture: unknown | null = null;
  let isLoading = false;
  const src = normalizeAssetSrc(slot?.src);

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
          .catch(() => {
            textureLoading.delete(src);
          });
      }
    }
  }

  buildPageContent(pixi, page, width, height, pageColorInt, accentColorInt, texture, isLoading, pageNumber);
  return page;
}

function buildPageEdgeStack(
  pixi: any,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
  layers: number,
  dx: number,
  dy: number
): import("pixi.js").Container {
  const container = new pixi.Container();
  for (let i = 0; i < layers; i++) {
    const layerAlpha = alpha * (1 - i / (layers + 1));
    const edge = new pixi.Graphics()
      .roundRect(x + dx * i, y + dy * i, width, height, Math.min(6, width / 2))
      .fill({ color, alpha: layerAlpha });
    container.addChild(edge);
  }
  return container;
}

export function createBookFlipNode(
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
  (container as any)._isBookFlip = true;

  const dropShadow = new pixi.Graphics()
    .roundRect(14, 16, width, height, 14)
    .fill({ color: 0x000000, alpha: 0.22 });
  container.addChild(dropShadow);

  const underShadow = new pixi.Graphics()
    .roundRect(6, 10, width, height, 14)
    .fill({ color: 0x000000, alpha: 0.08 });
  container.addChild(underShadow);

  const coverLip = new pixi.Graphics()
    .roundRect(1.5, 1.5, width - 3, height - 3, 12)
    .stroke({ color: 0x8f877a, width: 4.5, alpha: 0.2 });
  container.addChild(coverLip);

  const coverShadow = new pixi.Graphics()
    .roundRect(0, 0, width, height, 12)
    .fill({ color: 0x000000, alpha: 0.04 });
  container.addChild(coverShadow);

  const bookBg = new pixi.Graphics()
    .roundRect(0, 0, width, height, 12)
    .fill({ color: pageColorInt });
  container.addChild(bookBg);

  const bookBorder = new pixi.Graphics()
    .roundRect(0, 0, width, height, 12)
    .stroke({ color: accentColorInt, width: 2.2, alpha: 0.5 });
  container.addChild(bookBorder);

  const spineWidth = Math.max(14, Math.min(28, width * 0.05));
  const gutter = spineWidth;
  const pageWidth = Math.max(40, (width - gutter) / 2);
  const leftX = 0;
  const rightX = width - pageWidth;
  const spineX = width / 2 - spineWidth / 2;
  const edgeColor = 0xd8d2c8;

  const pageEdgeLeft = buildPageEdgeStack(pixi, 2, 8, 7, height - 16, edgeColor, 0.22, 5, 1.2, 0.25);
  container.addChild(pageEdgeLeft);

  const pageEdgeRight = buildPageEdgeStack(pixi, width - 9, 8, 7, height - 16, edgeColor, 0.22, 5, -1.2, 0.25);
  container.addChild(pageEdgeRight);

  const pageEdgeBottom = buildPageEdgeStack(pixi, 18, height - 8, width - 36, 5, edgeColor, 0.14, 4, 0, -0.6);
  container.addChild(pageEdgeBottom);

  const spreadShadow = new pixi.Graphics()
    .roundRect(8, 10, width - 16, height - 20, 10)
    .fill({ color: 0x000000, alpha: 0.045 });
  container.addChild(spreadShadow);

  const topHighlight = new pixi.Graphics()
    .roundRect(14, 7, width - 28, 10, 7)
    .fill({ color: 0xffffff, alpha: 0.075 });
  container.addChild(topHighlight);

  const outerShadeLeft = new pixi.Graphics()
    .rect(0, 10, 18, height - 20)
    .fill({ color: 0x000000, alpha: 0.05 });
  container.addChild(outerShadeLeft);

  const outerShadeRight = new pixi.Graphics()
    .rect(width - 18, 10, 18, height - 20)
    .fill({ color: 0x000000, alpha: 0.05 });
  container.addChild(outerShadeRight);

  const innerGutterLeft = new pixi.Graphics()
    .rect(width / 2 - spineWidth / 2 - 14, 12, 14, height - 24)
    .fill({ color: 0x000000, alpha: 0.08 });
  container.addChild(innerGutterLeft);

  const innerGutterRight = new pixi.Graphics()
    .rect(width / 2 + spineWidth / 2, 12, 14, height - 24)
    .fill({ color: 0x000000, alpha: 0.08 });
  container.addChild(innerGutterRight);

  const spreads: SpreadState[] = [];
  const spreadCount = getSpreadCount(comp);
  for (let spreadIndex = 0; spreadIndex < spreadCount; spreadIndex++) {
    const { leftSlot, rightSlot } = getSpreadSlotPair(comp, spreadIndex);
    const root = new pixi.Container();

    const leftPage = createPage(
      ctx,
      pixi,
      leftSlot,
      spreadIndex * 2 + 1,
      pageWidth,
      height,
      pageColorInt,
      accentColorInt,
      textureCache,
      textureLoading,
      normalizeAssetSrc
    );
    leftPage.x = leftX;
    root.addChild(leftPage);

    const rightPage = createPage(
      ctx,
      pixi,
      rightSlot,
      spreadIndex * 2 + 2,
      pageWidth,
      height,
      pageColorInt,
      accentColorInt,
      textureCache,
      textureLoading,
      normalizeAssetSrc
    );
    rightPage.x = rightX;
    root.addChild(rightPage);

    root.visible = spreadIndex === 0;
    container.addChild(root);

    spreads.push({
      root,
      left: { node: leftPage, baseX: leftX },
      right: { node: rightPage, baseX: rightX },
    });
  }

  const flipShadow = new pixi.Graphics()
    .rect(0, 0, pageWidth, height)
    .fill({ color: 0x000000, alpha: 1 });
  flipShadow.alpha = 0;
  container.addChild(flipShadow);

  const pageEdgeShadow = new pixi.Graphics()
    .rect(0, 0, Math.max(12, pageWidth * 0.09), height)
    .fill({ color: 0x000000, alpha: 1 });
  pageEdgeShadow.alpha = 0;
  container.addChild(pageEdgeShadow);

  const spine = new pixi.Graphics()
    .rect(spineX, 0, spineWidth, height)
    .fill({ color: accentColorInt, alpha: 0.88 });
  container.addChild(spine);

  const gutterShadow = new pixi.Graphics()
    .rect(spineX - 12, 8, spineWidth + 24, height - 16)
    .fill({ color: 0x000000, alpha: 0.18 });
  gutterShadow.alpha = 0.7;
  container.addChild(gutterShadow);

  const gutterGlow = new pixi.Graphics()
    .rect(spineX - 1, 8, spineWidth + 2, height - 16)
    .fill({ color: 0xffffff, alpha: 0.06 });
  container.addChild(gutterGlow);

  const spineHighlight = new pixi.Graphics()
    .rect(spineX + 2, 0, 2, height)
    .fill({ color: 0xffffff, alpha: 0.14 });
  container.addChild(spineHighlight);

  const spineShadow = new pixi.Graphics()
    .rect(spineX + spineWidth - 2, 0, 2, height)
    .fill({ color: 0x000000, alpha: 0.14 });
  container.addChild(spineShadow);

  const borderTop = new pixi.Graphics()
    .roundRect(0, 0, width, height, 12)
    .stroke({ color: accentColorInt, width: 2.2, alpha: 0.5 });
  container.addChild(borderTop);

  (container as any)._bookFlipState = {
    spreads,
    flipShadow,
    pageEdgeShadow,
    pageWidth,
    rightX,
    shell: {
      gutterShadow,
      gutterGlow,
      pageEdgeLeft,
      pageEdgeRight,
      pageEdgeBottom,
      spreadShadow,
      coverLip,
      topHighlight,
      outerShadeLeft,
      outerShadeRight,
      innerGutterLeft,
      innerGutterRight,
    },
  };
  return container;
}

export function updateBookFlipNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  sceneDurationMs: number
): void {
  const state = (node as any)._bookFlipState as
    | {
        spreads: SpreadState[];
        flipShadow: import("pixi.js").Container;
        pageEdgeShadow: import("pixi.js").Container;
        pageWidth: number;
        rightX: number;
        shell: BookShellState;
      }
    | undefined;
  if (!state) return;

  const { currentIndex, nextIndex, flipProgress } = resolveBookFlipState(comp, localTimeMs, sceneDurationMs);
  const { spreads, flipShadow, pageEdgeShadow, pageWidth, rightX, shell } = state;

  spreads.forEach((spread) => {
    spread.root.visible = false;

    spread.left.node.visible = true;
    spread.left.node.x = spread.left.baseX;
    spread.left.node.alpha = 1;
    spread.left.node.pivot.set(0, 0);
    spread.left.node.scale.set(1, 1);
    spread.left.node.skew.set(0, 0);
    spread.left.node.rotation = 0;
    spread.left.node.y = 0;

    spread.right.node.visible = true;
    spread.right.node.x = spread.right.baseX;
    spread.right.node.alpha = 1;
    spread.right.node.pivot.set(0, 0);
    spread.right.node.scale.set(1, 1);
    spread.right.node.skew.set(0, 0);
    spread.right.node.rotation = 0;
    spread.right.node.y = 0;
  });

  shell.gutterShadow.alpha = 0.7;
  shell.gutterGlow.alpha = 1;
  shell.pageEdgeLeft.alpha = 1;
  shell.pageEdgeRight.alpha = 1;
  shell.pageEdgeBottom.alpha = 1;
  shell.spreadShadow.alpha = 1;
  shell.coverLip.alpha = 1;
  shell.topHighlight.alpha = 1;
  shell.outerShadeLeft.alpha = 1;
  shell.outerShadeRight.alpha = 1;
  shell.innerGutterLeft.alpha = 1;
  shell.innerGutterRight.alpha = 1;

  if (!spreads[currentIndex]) return;

  if (flipProgress === 0 || currentIndex === nextIndex || !spreads[nextIndex]) {
    spreads[currentIndex].root.visible = true;
    flipShadow.alpha = 0;
    pageEdgeShadow.alpha = 0;
    return;
  }

  const current = spreads[currentIndex];
  const next = spreads[nextIndex];
  const firstHalf = Math.min(1, flipProgress / 0.5);
  const secondHalf = Math.max(0, (flipProgress - 0.5) / 0.5);

  current.root.visible = true;
  next.root.visible = true;

  current.left.node.visible = true;
  next.right.node.visible = true;

  current.right.node.visible = firstHalf < 1;
  current.right.node.x = rightX;
  current.right.node.pivot.x = 0;
  current.right.node.scale.x = Math.max(0.04, 1 - firstHalf);
  current.right.node.scale.y = 1 - 0.035 * Math.sin(firstHalf * Math.PI);
  current.right.node.skew.y = -0.24 * Math.sin(firstHalf * Math.PI * 0.9);
  current.right.node.rotation = -0.075 * Math.sin(firstHalf * Math.PI);
  current.right.node.y = -6 * Math.sin(firstHalf * Math.PI);
  current.right.node.alpha = 0.94 - firstHalf * 0.18;

  next.left.node.visible = secondHalf > 0;
  next.left.node.x = rightX;
  next.left.node.pivot.x = pageWidth;
  next.left.node.scale.x = Math.max(0.04, secondHalf);
  next.left.node.scale.y = 1 - 0.028 * Math.sin(secondHalf * Math.PI);
  next.left.node.skew.y = -0.18 * Math.sin((1 - secondHalf) * Math.PI * 0.9);
  next.left.node.rotation = 0.06 * Math.sin(secondHalf * Math.PI);
  next.left.node.y = -5 * Math.sin(secondHalf * Math.PI);
  next.left.node.alpha = 0.82 + secondHalf * 0.18;

  flipShadow.alpha = 0.28 * Math.sin(flipProgress * Math.PI);
  flipShadow.x = rightX - pageWidth * secondHalf;
  (flipShadow as any).scale.x = Math.max(0.15, 0.55 - Math.abs(flipProgress - 0.5) * 0.7);

  pageEdgeShadow.alpha = 0.18 * Math.sin(flipProgress * Math.PI);
  pageEdgeShadow.x = rightX + pageWidth * Math.max(0.02, 1 - firstHalf) - (pageEdgeShadow as any).width * 0.5;
  shell.gutterShadow.alpha = 0.7 + 0.18 * Math.sin(flipProgress * Math.PI);
  shell.gutterGlow.alpha = 1 - 0.28 * Math.sin(flipProgress * Math.PI);
  shell.spreadShadow.alpha = 1 - 0.22 * Math.sin(flipProgress * Math.PI);
  shell.topHighlight.alpha = 1 - 0.22 * Math.sin(flipProgress * Math.PI);
  shell.outerShadeLeft.alpha = 1 - 0.08 * Math.sin(flipProgress * Math.PI);
  shell.outerShadeRight.alpha = 1 + 0.16 * Math.sin(flipProgress * Math.PI);
  shell.innerGutterLeft.alpha = 1 + 0.08 * Math.sin(flipProgress * Math.PI);
  shell.innerGutterRight.alpha = 1 + 0.14 * Math.sin(flipProgress * Math.PI);
}
