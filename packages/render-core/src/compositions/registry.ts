/**
 * Composition renderer registry.
 *
 * Adding a new composition type = create a file in this directory,
 * import it here, and register it. Nothing else in render-core changes.
 *
 * The registry is the only file that imports composition renderers,
 * so the main index.ts stays thin regardless of how many compositions exist.
 * Future: swap static imports for dynamic import() per compositionType
 * to code-split the bundle as the catalog grows past ~20 types.
 */

import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";
import { createBookFlipNode, updateBookFlipNode } from "./book_flip";
import { createProductCartNode, updateProductCartNode } from "./product_cart";
import { createChristmasTreeNode, updateChristmasTreeNode } from "./christmas_tree";
import { createFireworksNode, updateFireworksNode } from "./fireworks";
import { createChristmasPanelNode, updateChristmasPanelNode } from "./christmas_panel";
import { createIconParadeNode, updateIconParadeNode } from "./icon_parade";
import { createSpinningCarouselNode, updateSpinningCarouselNode } from "./spinning_carousel";
import { createWordScrollNode, updateWordScrollNode } from "./word_scroll";
import { createWillemLoaderNode, updateWillemLoaderNode } from "./willem_loader";
import { createGiftRevealNode, updateGiftRevealNode } from "./gift_reveal";

export type CompositionCreateFn = (
  ctx: RenderContext,
  comp: CompositionNode,
  textureCache: Map<string, unknown>,
  textureLoading: Set<string>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
) => import("pixi.js").Container;

export type CompositionUpdateFn = (
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  sceneDurationMs: number
) => void;

interface CompositionRenderer {
  create: CompositionCreateFn;
  update: CompositionUpdateFn;
}

const REGISTRY = new Map<string, CompositionRenderer>();

REGISTRY.set("book_flip", {
  create: createBookFlipNode,
  update: updateBookFlipNode,
});

REGISTRY.set("product_cart", {
  create: createProductCartNode,
  update: updateProductCartNode,
});

REGISTRY.set("christmas_tree", {
  create: createChristmasTreeNode,
  update: updateChristmasTreeNode,
});

REGISTRY.set("fireworks", {
  create: createFireworksNode,
  update: updateFireworksNode,
});

REGISTRY.set("christmas_panel", {
  create: createChristmasPanelNode,
  update: updateChristmasPanelNode,
});

REGISTRY.set("icon_parade", {
  create: createIconParadeNode,
  update: updateIconParadeNode,
});

REGISTRY.set("spinning_carousel", {
  create: createSpinningCarouselNode,
  update: updateSpinningCarouselNode,
});

REGISTRY.set("word_scroll", {
  create: createWordScrollNode,
  update: updateWordScrollNode,
});

REGISTRY.set("willem_loader", {
  create: createWillemLoaderNode,
  update: updateWillemLoaderNode,
});

REGISTRY.set("gift_reveal", {
  create: createGiftRevealNode,
  update: updateGiftRevealNode,
});

export function getCompositionRenderer(compositionType: string): CompositionRenderer | undefined {
  return REGISTRY.get(compositionType);
}

export function compositionNodeKey(
  comp: CompositionNode,
  textureCache: Map<string, unknown>,
  normalizeAssetSrc: (src: string | undefined) => string | undefined
): string {
  // Include slot text so word_scroll rebuilds when word content changes
  const slotKey = comp.slots
    .map((s) => `${s.id}:${normalizeAssetSrc(s.src) ?? ""}:${s.text ?? ""}`)
    .join("|");
  const allLoaded = comp.slots.every((s) => {
    const src = normalizeAssetSrc(s.src);
    return !src || textureCache.has(src);
  });
  return [
    comp.id,
    comp.compositionType,
    comp.layout.width,
    comp.layout.height,
    slotKey,
    allLoaded ? "1" : "0",
    comp.params?.colorOverrides?.pageColor ?? "",
    comp.params?.colorOverrides?.accentColor ?? "",
    comp.params?.colorOverrides?.bgColor ?? "",
    comp.params?.colorOverrides?.textColor ?? "",
    comp.params?.speed ?? 1,
    (comp.params?.iconSize as any) ?? "",
    (comp.params as any)?.prefix ?? "",
    comp.params?.fontOverride ?? "",
    comp.params?.timerMs ?? "",
    comp.params?.displayText ?? "",
  ].join(":");
}
