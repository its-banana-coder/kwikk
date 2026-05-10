import { describe, expect, it } from "vitest";
import { createElementNode } from "@kwikk/scene-graph";
import {
  applyEasing,
  interpolate,
  resolveAnimatedLayout,
  resolveElementNodeAtTime
} from "./index";

describe("interpolate", () => {
  it("returns stable endpoints outside the animation window", () => {
    expect(interpolate(0, 100, 200, 0, 1)).toBe(0);
    expect(interpolate(250, 100, 200, 0, 1)).toBe(1);
  });

  it("interpolates linearly at midpoint", () => {
    expect(interpolate(150, 100, 200, 0, 1)).toBe(0.5);
  });

  it("handles negative and reverse ranges", () => {
    expect(interpolate(150, 100, 200, 100, 0)).toBe(50);
  });

  it("clamps progress to 0-1 range", () => {
    const result = interpolate(50, 100, 200, 0, 100);

    expect(result).toBe(0);
  });

  it("returns to value when end <= start", () => {
    expect(interpolate(150, 100, 100, 0, 100)).toBe(100);
  });
});

describe("applyEasing", () => {
  it("returns linear progress by default", () => {
    expect(applyEasing(0.5)).toBe(0.5);
  });

  it("applies easeIn correctly (quadratic)", () => {
    const eased = applyEasing(0.5, "easeIn");
    expect(eased).toBe(0.25);
  });

  it("applies easeOut correctly (inverse quadratic)", () => {
    const eased = applyEasing(0.5, "easeOut");
    expect(eased).toBeCloseTo(0.75, 5);
  });

  it("applies easeInOut correctly (S-curve)", () => {
    const eased = applyEasing(0.5, "easeInOut");
    expect(eased).toBe(0.5);
  });

  it("handles boundary values for easeInOut", () => {
    expect(applyEasing(0, "easeInOut")).toBe(0);
    expect(applyEasing(1, "easeInOut")).toBe(1);
  });

  it("handles progress > 1 by clamping", () => {
    const result = applyEasing(1.5, "easeIn");
    expect(result).toBeLessThanOrEqual(1);
  });

  it("handles negative progress by clamping", () => {
    const result = applyEasing(-0.5, "easeOut");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("resolveAnimatedLayout", () => {
  it("applies fade and slide modifiers from timeMs", () => {
    const element = createElementNode({
      id: "caption",
      type: "text",
      layout: {
        x: 120,
        y: 400
      },
      animations: [
        {
          id: "caption_fade",
          type: "fadeIn",
          startMs: 0,
          durationMs: 1000
        },
        {
          id: "caption_slide",
          type: "slideUp",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const resolved = resolveAnimatedLayout(element, 500);

    expect(resolved.opacity).toBeCloseTo(0.5, 3);
    expect(resolved.y).toBeCloseTo(430, 3);
  });

  it("merges manual overrides before animation resolution", () => {
    const element = createElementNode({
      id: "image",
      type: "image",
      overrides: {
        layout: {
          scale: 1.2
        }
      },
      animations: [
        {
          id: "zoom",
          type: "zoomIn",
          startMs: 0,
          durationMs: 1000
        }
      ]
    });

    const resolved = resolveElementNodeAtTime(element, 1000);
    expect(resolved.layout.scale).toBeCloseTo(1.2, 3);
  });

  describe("animation combinations", () => {
    it("applies multiple fade animations multiplicatively", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { opacity: 1 },
        animations: [
          {
            id: "fade_in",
            type: "fadeIn",
            startMs: 0,
            durationMs: 1000
          },
          {
            id: "fade_out",
            type: "fadeOut",
            startMs: 500,
            durationMs: 500
          }
        ]
      });

      const at250ms = resolveAnimatedLayout(element, 250);
      const at750ms = resolveAnimatedLayout(element, 750);

      expect(at250ms.opacity).toBeCloseTo(0.25, 1);
      expect(at750ms.opacity).toBeCloseTo(0.25, 1);
    });

    it("applies slide and zoom animations simultaneously", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { y: 0, scale: 1 },
        animations: [
          {
            id: "slide",
            type: "slideUp",
            startMs: 0,
            durationMs: 1000
          },
          {
            id: "zoom",
            type: "zoomIn",
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 500);

      expect(resolved.y).not.toBe(0);
      expect(resolved.scale).not.toBe(1);
    });

    it("handles all animation types on same element", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { y: 0, opacity: 1, scale: 1 },
        animations: [
          {
            id: "fade_in",
            type: "fadeIn",
            startMs: 0,
            durationMs: 1000
          },
          {
            id: "slide_up",
            type: "slideUp",
            startMs: 0,
            durationMs: 1000
          },
          {
            id: "zoom",
            type: "zoomIn",
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 500);

      expect(resolved.opacity).toBeCloseTo(0.5, 1);
      expect(resolved.y).toBeGreaterThan(0);
      expect(resolved.scale).toBeGreaterThan(1);
    });

    it("applies animations with different timing", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { x: 0, y: 0, opacity: 1 },
        animations: [
          {
            id: "slide",
            type: "slideUp",
            startMs: 0,
            durationMs: 500
          },
          {
            id: "fade",
            type: "fadeOut",
            startMs: 500,
            durationMs: 500
          }
        ]
      });

      const at250ms = resolveAnimatedLayout(element, 250);
      const at750ms = resolveAnimatedLayout(element, 750);

      expect(at250ms.y).toBeGreaterThan(0);
      expect(at250ms.opacity).toBe(1);

      expect(at750ms.y).toBe(0);
      expect(at750ms.opacity).toBeLessThan(1);
    });

    it("sequences slideDown after slideUp correctly", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { y: 0 },
        animations: [
          {
            id: "up",
            type: "slideUp",
            startMs: 0,
            durationMs: 500
          },
          {
            id: "down",
            type: "slideDown",
            startMs: 500,
            durationMs: 500
          }
        ]
      });

      const at250ms = resolveAnimatedLayout(element, 250);
      const at500ms = resolveAnimatedLayout(element, 500);
      const at750ms = resolveAnimatedLayout(element, 750);

      expect(at250ms.y).toBeCloseTo(30, 1);
      expect(at500ms.y).toBe(0);
      expect(at750ms.y).toBeCloseTo(-30, 1);
    });

    it("handles empty animations array", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { x: 10, y: 20, opacity: 0.8, scale: 1.5 },
        animations: []
      });

      const resolved = resolveAnimatedLayout(element, 500);

      expect(resolved.x).toBe(10);
      expect(resolved.y).toBe(20);
      expect(resolved.opacity).toBe(0.8);
      expect(resolved.scale).toBe(1.5);
    });

    it("ignores animations outside current timeMs", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { opacity: 1 },
        animations: [
          {
            id: "fade",
            type: "fadeOut",
            startMs: 1000,
            durationMs: 500
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 500);

      expect(resolved.opacity).toBe(1);
    });
  });

  describe("easing application", () => {
    it("applies easeIn to fade animations", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { opacity: 1 },
        animations: [
          {
            id: "fade",
            type: "fadeIn",
            startMs: 0,
            durationMs: 1000,
            easing: "easeIn"
          }
        ]
      });

      const at500ms = resolveAnimatedLayout(element, 500);

      expect(at500ms.opacity).toBeLessThan(0.5);
    });

    it("applies easeOut to slide animations", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { y: 0 },
        animations: [
          {
            id: "slide",
            type: "slideUp",
            startMs: 0,
            durationMs: 1000,
            easing: "easeOut"
          }
        ]
      });

      const at500ms = resolveAnimatedLayout(element, 500);

      expect(at500ms.y).toBeGreaterThan(30);
    });
  });

  describe("override merging", () => {
    it("layout overrides take precedence over animation", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { x: 0, y: 0 },
        overrides: {
          layout: { x: 50 }
        },
        animations: [
          {
            id: "slide",
            type: "slideUp",
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 500);

      expect(resolved.x).toBe(50);
      expect(resolved.y).toBeGreaterThan(0);
    });

    it("style overrides persist through animation resolution", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        style: { color: "#000000" },
        overrides: {
          style: { fontSize: 48 }
        },
        animations: [
          {
            id: "fade",
            type: "fadeIn",
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveElementNodeAtTime(element, 500);

      expect(resolved.style.fontSize).toBe(48);
      expect(resolved.style.color).toBe("#000000");
    });

    it("content overrides apply correctly", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        content: { text: "Original" },
        overrides: {
          content: { text: "Override" }
        }
      });

      const resolved = resolveElementNodeAtTime(element, 0);

      expect(resolved.content?.text).toBe("Override");
    });
  });

  describe("edge cases", () => {
    it("handles timeMs exactly at animation start", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { opacity: 1 },
        animations: [
          {
            id: "fade",
            type: "fadeOut",
            startMs: 1000,
            durationMs: 500
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 1000);

      expect(resolved.opacity).toBe(1);
    });

    it("handles timeMs exactly at animation end", () => {
      const element = createElementNode({
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

      const resolved = resolveAnimatedLayout(element, 1000);

      expect(resolved.opacity).toBe(0);
    });

    it("preserves X position through Y animations", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { x: 100, y: 0 },
        animations: [
          {
            id: "slide",
            type: "slideUp",
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 500);

      expect(resolved.x).toBe(100);
    });

    it("does not negative opacity", () => {
      const element = createElementNode({
        id: "el",
        type: "text",
        layout: { opacity: 0.2 },
        animations: [
          {
            id: "fade",
            type: "fadeOut",
            startMs: 0,
            durationMs: 1000
          }
        ]
      });

      const resolved = resolveAnimatedLayout(element, 1000);

      expect(resolved.opacity).toBeGreaterThanOrEqual(0);
    });
  });
});
