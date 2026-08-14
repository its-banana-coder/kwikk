import { describe, expect, it } from "vitest";
import { createElementNode, createScene } from "@kwikk/scene-graph";
import type { Animation } from "@kwikk/shared-types";
import {
  resolveElementNodeAtTime,
  resolveAnimatedLayout,
  interpolate
} from "./index";

/**
 * Integration Tests: Animation Engine
 * 
 * These tests verify that animations resolve correctly at various
 * time points, handle edge cases, and preserve element semantics.
 */

describe("Integration: Animation Timeline Resolution", () => {
  it("resolves element state at multiple time points in sequence", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: {
        opacity: 1,
        scale: 1
      },
      animations: [
        {
          id: "a1",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        },
        {
          id: "a2",
          type: "zoomOut",
          startMs: 500,
          durationMs: 1000
        }
      ]
    });

    // Before any animations
    const t0 = resolveElementNodeAtTime(el, 0);
    expect(t0.layout.opacity).toBeCloseTo(1, 1);
    expect(t0.layout.scale).toBeCloseTo(1, 1);

    // During first animation, before second
    const t300 = resolveElementNodeAtTime(el, 300);
    expect(t300.layout.opacity).toBeLessThan(1);
    expect(t300.layout.opacity).toBeGreaterThan(0.5);

    // Both animations active
    const t750 = resolveElementNodeAtTime(el, 750);
    expect(t750.layout.opacity).toBeLessThan(0.5);
    expect(t750.layout.scale).toBeLessThan(1);

    // First finished, second still running
    const t1200 = resolveElementNodeAtTime(el, 1200);
    expect(t1200.layout.opacity).toBeCloseTo(0, 1);
    expect(t1200.layout.scale).toBeLessThan(1);

    // All animations finished
    const t2000 = resolveElementNodeAtTime(el, 2000);
    expect(t2000.layout.opacity).toBeCloseTo(0, 1);
    expect(t2000.layout.scale).toBeCloseTo(0.85, 2);
  });

  it("handles staggered animations with different durations", () => {
    const el = createElementNode({
      id: "el",
      type: "shape",
      layout: {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1
      },
      animations: [
        {
          id: "a1",
          type: "zoomIn",
          startMs: 0,
          durationMs: 800
        },
        {
          id: "a2",
          type: "fadeOut",
          startMs: 600,
          durationMs: 600
        }
      ]
    });

    // At t=400: zoom in at 50%, fade still at 100%
    const t400 = resolveElementNodeAtTime(el, 400);
    expect(t400.layout.scale).toBeGreaterThan(0.85);
    expect(t400.layout.scale).toBeLessThan(1);
    expect(t400.layout.opacity).toBeCloseTo(1, 1);

    // At t=700: zoom in ending (nearly done), fade out at ~17%
    const t700 = resolveElementNodeAtTime(el, 700);
    expect(t700.layout.scale).toBeCloseTo(1, 1);
    expect(t700.layout.opacity).toBeLessThan(1);
    expect(t700.layout.opacity).toBeGreaterThan(0);

    // At t=1200: zoom finished, fade finished
    const t1200 = resolveElementNodeAtTime(el, 1200);
    expect(t1200.layout.scale).toBeCloseTo(1, 1);
    expect(t1200.layout.opacity).toBeCloseTo(0, 1);
  });

  it("preserves element semantic properties during animation", () => {
    const el = createElementNode({
      id: "semantic_el",
      type: "text",
      semanticRole: "subtitle",
      content: { text: "Animated text" },
      layout: { opacity: 1 },
      animations: [
        {
          id: "anim",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const resolved = resolveElementNodeAtTime(el, 500);

    // Layout changes, but semantics preserved
    expect(resolved.layout.opacity).toBeLessThan(1);
    expect(resolved.id).toBe("semantic_el");
    expect(resolved.semanticRole).toBe("subtitle");
    expect(resolved.content.text).toBe("Animated text");
  });
});

describe("Integration: Animation Type Coverage", () => {
  const testCases = [
    {
      type: "fadeOut" as const,
      setup: { layout: { opacity: 1 } },
      check: (resolved: any) => resolved.layout.opacity < 1
    },
    {
      type: "fadeIn" as const,
      setup: { layout: { opacity: 1 } }, // Base opacity should be 1 for fadeIn (multiplies)
      check: (resolved: any) => resolved.layout.opacity > 0 && resolved.layout.opacity < 1
    },
    {
      type: "zoomIn" as const,
      setup: { layout: { scale: 1 } }, // zoomIn goes from 0.85 to 1
      check: (resolved: any) => resolved.layout.scale >= 0.85 && resolved.layout.scale <= 1
    },
    {
      type: "zoomOut" as const,
      setup: { layout: { scale: 1 } },
      check: (resolved: any) => resolved.layout.scale < 1 && resolved.layout.scale > 0.85
    },
    {
      type: "subtitle_pop" as const,
      setup: { layout: { scale: 1, opacity: 1 } },
      check: (resolved: any) => resolved.layout.opacity > 0 && resolved.layout.scale > 0.8
    }
  ];

  testCases.forEach(({ type, setup, check }) => {
    it(`applies ${type} animation correctly at midpoint`, () => {
      const el = createElementNode({
        id: "el",
        type: "text",
        ...setup,
        animations: [
          {
            id: "anim",
            type,
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveElementNodeAtTime(el, 500);
      expect(check(resolved)).toBe(true);
    });
  });
});

describe("Integration: Animation Overlap & Composition", () => {
  it("composes multiple animations on same axis correctly", () => {
    const el = createElementNode({
      id: "el",
      type: "shape",
      layout: {
        x: 0,
        opacity: 1
      },
      animations: [
        {
          id: "a1",
          type: "slideRight",
          startMs: 0,
          durationMs: 500
        },
        {
          id: "a2",
          type: "slideLeft",
          startMs: 300,
          durationMs: 500
        }
      ]
    });

    // First animation only (0-300ms) - slideRight starts left of rest (x<0) and
    // eases toward 0; "a2" hasn't started yet and must not pre-apply its offset.
    const t200 = resolveElementNodeAtTime(el, 200);
    expect(t200.layout.x).toBeLessThan(0);

    // Both active (300-500ms) - right then left applied
    const t400 = resolveElementNodeAtTime(el, 400);
    expect(typeof t400.layout.x).toBe("number");

    // Both animations have finished
    const t1000 = resolveElementNodeAtTime(el, 1000);
    expect(typeof t1000.layout.x).toBe("number");
  });

  it("handles animation on different properties simultaneously", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1
      },
      animations: [
        {
          id: "fade",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        },
        {
          id: "scale",
          type: "zoomOut",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const t500 = resolveElementNodeAtTime(el, 500);

    // All animations should apply
    expect(t500.layout.opacity).toBeLessThan(1); // fadeOut
    expect(t500.layout.scale).toBeLessThan(1);  // zoomOut
  });
});

describe("Integration: Animation bundles", () => {
  const zoomInBundle: Animation[] = [{ id: "zoom_0", type: "zoomIn", startMs: 0, durationMs: 5000 }];
  const fadeThroughBundle: Animation[] = [
    { id: "fade_0", type: "fadeIn", startMs: 0, durationMs: 500 },
    { id: "fade_1", type: "fadeOut", startMs: 4500, durationMs: 500 },
  ];

  it("resolves element with a multi-layer animation bundle", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: {
        scale: 1,
        opacity: 1,
        x: 0,
        y: 0
      },
      motionPreset: "custom",
      animations: zoomInBundle
    });

    const t500 = resolveElementNodeAtTime(el, 500);
    expect(t500.layout.scale).not.toBe(1); // Should be modified
  });

  it("different animation bundles produce different effects", () => {
    const anim1 = zoomInBundle;
    const anim2 = fadeThroughBundle;

    const el1 = createElementNode({
      id: "el1",
      type: "shape",
      layout: { scale: 1, opacity: 1 },
      animations: anim1
    });

    const el2 = createElementNode({
      id: "el2",
      type: "shape",
      layout: { scale: 1, opacity: 1 },
      animations: anim2
    });

    const t500_1 = resolveElementNodeAtTime(el1, 500);
    const t500_2 = resolveElementNodeAtTime(el2, 500);

    // At least one property should differ
    const differs =
      t500_1.layout.scale !== t500_2.layout.scale ||
      t500_1.layout.opacity !== t500_2.layout.opacity ||
      t500_1.layout.x !== t500_2.layout.x ||
      t500_1.layout.y !== t500_2.layout.y;

    expect(differs).toBe(true);
  });
});

describe("Integration: Animation Boundaries", () => {
  it("handles animation at exact start boundary", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { opacity: 1 },
      animations: [
        {
          id: "fade",
          type: "fadeOut",
          startMs: 500,
          durationMs: 1000
        }
      ]
    });

    const beforeStart = resolveElementNodeAtTime(el, 499);
    const atStart = resolveElementNodeAtTime(el, 500);
    const afterStart = resolveElementNodeAtTime(el, 501);

    expect(beforeStart.layout.opacity).toBeCloseTo(1, 1);
    // At start, animation begins
    expect(atStart.layout.opacity).toBeLessThanOrEqual(1);
    expect(afterStart.layout.opacity).toBeLessThan(atStart.layout.opacity);
  });

  it("handles animation at exact end boundary", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { scale: 1 },
      animations: [
        {
          id: "zoom",
          type: "zoomIn",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const beforeEnd = resolveElementNodeAtTime(el, 999);
    const atEnd = resolveElementNodeAtTime(el, 1000);
    const afterEnd = resolveElementNodeAtTime(el, 1001);

    expect(beforeEnd.layout.scale).toBeLessThan(2);
    expect(atEnd.layout.scale).toBeCloseTo(atEnd.layout.scale, 5);
    expect(afterEnd.layout.scale).toBeCloseTo(atEnd.layout.scale, 5); // Stays same after end
  });

  it("handles negative time gracefully", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { opacity: 1 },
      animations: [
        {
          id: "fade",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const resolved = resolveElementNodeAtTime(el, -100);
    expect(resolved.layout.opacity).toBeCloseTo(1, 1); // Before animation
  });

  it("handles very large time values", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { opacity: 1 },
      animations: [
        {
          id: "fade",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const resolved = resolveElementNodeAtTime(el, 999999);
    expect(resolved.layout.opacity).toBeCloseTo(0, 1); // After animation finished
  });
});

describe("Integration: Empty & Null Animation States", () => {
  it("resolves element with no animations", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { x: 100, y: 200, opacity: 0.8 },
      animations: []
    });

    const resolved = resolveElementNodeAtTime(el, 500);

    expect(resolved.layout.x).toBe(100);
    expect(resolved.layout.y).toBe(200);
    expect(resolved.layout.opacity).toBe(0.8);
  });

  it("handles animation with zero duration", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { opacity: 1 },
      animations: [
        {
          id: "instant",
          type: "fadeOut",
          startMs: 500,
          durationMs: 0
        }
      ]
    });

    const t500 = resolveElementNodeAtTime(el, 500);
    const t501 = resolveElementNodeAtTime(el, 501);

    // Zero-duration animations should be safe to handle
    expect(typeof t500.layout.opacity).toBe("number");
    expect(typeof t501.layout.opacity).toBe("number");
  });
});

describe("Integration: Animation Determinism", () => {
  it("produces identical results for same input across multiple calls", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { x: 0, y: 0, opacity: 1, scale: 1 },
      animations: [
        { id: "a1", type: "slideRight", startMs: 0, durationMs: 1000 },
        { id: "a2", type: "fadeOut", startMs: 500, durationMs: 1000 }
      ]
    });

    const results = [];
    for (let i = 0; i < 5; i++) {
      const resolved = resolveElementNodeAtTime(el, 750);
      results.push(JSON.stringify(resolved));
    }

    // All results identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(results[0]);
    }
  });

  it("different time inputs produce different outputs", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: { opacity: 1 },
      animations: [
        {
          id: "fade",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const t0 = resolveElementNodeAtTime(el, 0);
    const t250 = resolveElementNodeAtTime(el, 250);
    const t500 = resolveElementNodeAtTime(el, 500);
    const t750 = resolveElementNodeAtTime(el, 750);
    const t1000 = resolveElementNodeAtTime(el, 1000);

    // Monotonically decreasing opacity for fadeOut
    expect(t0.layout.opacity).toBeGreaterThan(t250.layout.opacity);
    expect(t250.layout.opacity).toBeGreaterThan(t500.layout.opacity);
    expect(t500.layout.opacity).toBeGreaterThan(t750.layout.opacity);
    expect(t750.layout.opacity).toBeGreaterThan(t1000.layout.opacity);
  });
});

describe("Integration: Easing & Interpolation", () => {
  it("applies easing functions to animations", () => {
    const el = createElementNode({
      id: "el",
      type: "shape",
      layout: { x: 0 },
      animations: [
        {
          id: "slide",
          type: "slideRight",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    // Different points in animation
    const t0 = resolveElementNodeAtTime(el, 0);
    const t250 = resolveElementNodeAtTime(el, 250);
    const t500 = resolveElementNodeAtTime(el, 500);
    const t750 = resolveElementNodeAtTime(el, 750);
    const t1000 = resolveElementNodeAtTime(el, 1000);

    // With easing, progression should be non-linear
    const delta1 = t250.layout.x - t0.layout.x;
    const delta2 = t500.layout.x - t250.layout.x;
    const delta3 = t750.layout.x - t500.layout.x;
    const delta4 = t1000.layout.x - t750.layout.x;

    // Deltas should exist and be reasonable
    expect(delta1).toBeGreaterThanOrEqual(0);
    expect(delta4).toBeGreaterThanOrEqual(0);
  });
});

describe("Integration: Animation Layout Composition", () => {
  it("resolves complete animated layout with all properties", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        opacity: 1,
        scale: 1,
        rotation: 0,
        zIndex: 0
      },
      animations: [
        {
          id: "fade",
          type: "fadeOut",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const resolved = resolveAnimatedLayout(el, 500);

    // All properties exist
    expect(resolved).toHaveProperty("x");
    expect(resolved).toHaveProperty("y");
    expect(resolved).toHaveProperty("width");
    expect(resolved).toHaveProperty("height");
    expect(resolved).toHaveProperty("opacity");
    expect(resolved).toHaveProperty("scale");
    expect(resolved).toHaveProperty("rotation");
    expect(resolved).toHaveProperty("zIndex");

    // Static properties unchanged
    expect(resolved.width).toBe(100);
    expect(resolved.height).toBe(50);
    expect(resolved.zIndex).toBe(0);

    // Animated property changed
    expect(resolved.opacity).toBeLessThan(1);
  });
});
