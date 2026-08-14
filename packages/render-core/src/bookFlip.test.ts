import { describe, expect, it } from "vitest";
import type { CompositionNode } from "@kwikk/shared-types";
import { resolveBookFlipState } from "./compositions/book_flip";

function makeComp(slotCount: number): CompositionNode {
  return {
    id: "comp_book",
    compositionType: "book_flip",
    layout: {
      x: 0,
      y: 0,
      width: 480,
      height: 600,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: 1,
    },
    slots: Array.from({ length: slotCount }, (_, i) => ({
      id: `slot_${i}`,
      type: "image" as const,
      src: `asset_${i}.jpg`,
    })),
    params: { speed: 1 },
  };
}

describe("resolveBookFlipState", () => {
  it("treats pairs of slots as one visible spread", () => {
    const comp = makeComp(4);

    expect(resolveBookFlipState(comp, 100, 2000)).toEqual({
      currentIndex: 0,
      nextIndex: 1,
      flipProgress: 0,
    });

    const flipping = resolveBookFlipState(comp, 900, 2000);
    expect(flipping.currentIndex).toBe(0);
    expect(flipping.nextIndex).toBe(1);
    expect(flipping.flipProgress).toBeGreaterThan(0);
  });

  it("supports an odd last page by creating a partial final spread", () => {
    const comp = makeComp(3);
    const state = resolveBookFlipState(comp, 1200, 2000);

    expect(state.currentIndex).toBe(1);
    expect(state.nextIndex).toBe(1);
    expect(state.flipProgress).toBe(0);
  });

  it("does not animate when only one spread exists", () => {
    const comp = makeComp(2);
    expect(resolveBookFlipState(comp, 1500, 2000)).toEqual({
      currentIndex: 0,
      nextIndex: 0,
      flipProgress: 0,
    });
  });
});
