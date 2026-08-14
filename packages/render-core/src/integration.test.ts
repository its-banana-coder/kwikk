import { describe, expect, it } from "vitest";
import {
  createProjectDocument,
  createScene,
  createElementNode,
  applyOperation
} from "@kwikk/scene-graph";
import { resolveRenderFrame } from "./index";

/**
 * Integration Tests: Render Core
 * 
 * These tests verify that the rendering pipeline correctly:
 * - Resolves frame state from project + timeline
 * - Applies animations to render output
 * - Handles scene transitions
 * - Composes multiple elements correctly
 */

describe("Integration: Full Rendering Pipeline", () => {
  it("renders complete frame with multiple animated elements", () => {
    const scene = createScene({
      id: "scene_1",
      name: "Scene 1",
      durationMs: 2000,
      elements: [
        createElementNode({
          id: "title",
          type: "text",
          content: { text: "Title" },
          layout: {
            x: 0,
            y: 0,
            opacity: 0,
            zIndex: 2
          },
          animations: [
            {
              id: "title_fade",
              type: "fadeIn",
              startMs: 0,
              durationMs: 500
            }
          ]
        }),
        createElementNode({
          id: "subtitle",
          type: "text",
          content: { text: "Subtitle" },
          layout: {
            x: 0,
            y: 100,
            opacity: 0,
            zIndex: 1
          },
          animations: [
            {
              id: "subtitle_fade",
              type: "fadeIn",
              startMs: 300,
              durationMs: 500
            }
          ]
        }),
        createElementNode({
          id: "bg",
          type: "shape",
          layout: {
            x: 0,
            y: 0,
            width: 1080,
            height: 1920,
            opacity: 0.5,
            zIndex: 0
          }
        })
      ]
    });

    const project = createProjectDocument({
      id: "proj",
      name: "Project",
      scenes: [scene]
    });

    // Render at 250ms (title animating, subtitle not started)
    const frame250 = resolveRenderFrame(project, { timeMs: 250 });

    expect(frame250.sceneId).toBe("scene_1");
    expect(frame250.elements).toHaveLength(3);

    // Elements sorted by z-index (highest last)
    expect(frame250.elements[0].id).toBe("bg");
    expect(frame250.elements[2].id).toBe("title");

    // Title should be fading in
    expect(frame250.elements[2].layout.opacity).toBeGreaterThan(0);
    expect(frame250.elements[2].layout.opacity).toBeLessThan(1);

    // Subtitle not started — its fadeIn hasn't begun (startMs 300 > 250). Its base
    // opacity is 0 (an intentional "hidden until fade-in" placeholder), and since a
    // real opacity-controlling animation exists to reveal it, resolveAnimatedLayout
    // respects that 0 rather than forcing it visible — it only stays hidden until
    // its own fadeIn's window is actually entered.
    expect(frame250.elements[1].layout.opacity).toBe(0);

    // Render at 500ms (both animating)
    const frame500 = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame500.elements[2].layout.opacity).toBeCloseTo(1, 1); // Title done
    expect(frame500.elements[1].layout.opacity).toBeGreaterThan(0); // Subtitle started

    // Render at 1000ms (both finished)
    const frame1000 = resolveRenderFrame(project, { timeMs: 1000 });
    expect(frame1000.elements[2].layout.opacity).toBeCloseTo(1, 1);
    expect(frame1000.elements[1].layout.opacity).toBeCloseTo(1, 1);
  });

  it("maintains z-index order across animation states", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
          id: "el1",
          type: "shape",
          layout: { zIndex: 3, opacity: 1 }
        }),
        createElementNode({
          id: "el2",
          type: "text",
          layout: { zIndex: 1, opacity: 1 }
        }),
        createElementNode({
          id: "el3",
          type: "shape",
          layout: { zIndex: 2, opacity: 1 }
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    // Verify z-index ordering
    expect(frame.elements[0].id).toBe("el2"); // z-index 1
    expect(frame.elements[1].id).toBe("el3"); // z-index 2
    expect(frame.elements[2].id).toBe("el1"); // z-index 3
  });
});

describe("Integration: Multi-Scene Timeline Rendering", () => {
  it("renders correct scene at timeline boundaries", () => {
    const scene1 = createScene({
      id: "s1",
      name: "Scene 1",
      durationMs: 2000,
      elements: [
        createElementNode({
          id: "el_s1",
          type: "text",
          content: { text: "Scene 1" }
        })
      ]
    });

    const scene2 = createScene({
      id: "s2",
      name: "Scene 2",
      durationMs: 3000,
      elements: [
        createElementNode({
          id: "el_s2",
          type: "text",
          content: { text: "Scene 2" }
        })
      ]
    });

    const scene3 = createScene({
      id: "s3",
      name: "Scene 3",
      durationMs: 1500,
      elements: [
        createElementNode({
          id: "el_s3",
          type: "text",
          content: { text: "Scene 3" }
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene1, scene2, scene3]
    });

    // Scene 1 (0-2000ms)
    const frame500 = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame500.sceneId).toBe("s1");
    expect(frame500.elements[0].id).toBe("el_s1");

    // Scene 1 end boundary
    const frame2000 = resolveRenderFrame(project, { timeMs: 2000 });
    expect(frame2000.sceneId).toBe("s2");

    // Scene 2 (2000-5000ms)
    const frame3500 = resolveRenderFrame(project, { timeMs: 3500 });
    expect(frame3500.sceneId).toBe("s2");
    expect(frame3500.elements[0].id).toBe("el_s2");

    // Scene 3 (5000-6500ms)
    const frame5500 = resolveRenderFrame(project, { timeMs: 5500 });
    expect(frame5500.sceneId).toBe("s3");
    expect(frame5500.elements[0].id).toBe("el_s3");
  });

  it("handles scene transitions with staggered animations", () => {
    const scene1 = createScene({
      id: "s1",
      name: "S1",
      durationMs: 1500,
      elements: [
        createElementNode({
          id: "s1_text",
          type: "text",
          layout: { opacity: 1 },
          animations: [
            {
              id: "fade_out",
              type: "fadeOut",
              startMs: 1000,
              durationMs: 500
            }
          ]
        })
      ]
    });

    const scene2 = createScene({
      id: "s2",
      name: "S2",
      durationMs: 1500,
      elements: [
        createElementNode({
          id: "s2_text",
          type: "text",
          layout: { opacity: 0 },
          animations: [
            {
              id: "fade_in",
              type: "fadeIn",
              startMs: 0,
              durationMs: 500
            }
          ]
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene1, scene2]
    });

    // During scene 1 fade out
    const frame1200 = resolveRenderFrame(project, { timeMs: 1200 });
    expect(frame1200.sceneId).toBe("s1");
    expect(frame1200.elements[0].layout.opacity).toBeLessThan(1);

    // At scene transition
    const frame1500 = resolveRenderFrame(project, { timeMs: 1500 });
    expect(frame1500.sceneId).toBe("s2");
    expect(frame1500.elements[0].id).toBe("s2_text");

    // Scene 2 fading in
    const frame1750 = resolveRenderFrame(project, { timeMs: 1750 });
    expect(frame1750.sceneId).toBe("s2");
    expect(frame1750.elements[0].layout.opacity).toBeGreaterThan(0);
    expect(frame1750.elements[0].layout.opacity).toBeLessThan(1);
  });
});

describe("Integration: Empty & Edge Case Rendering", () => {
  it("renders empty frame when no scene is active", () => {
    const project = createProjectDocument({
      id: "p1",
      name: "Empty",
      scenes: []
    });

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    expect(frame.sceneId).toBeNull();
    expect(frame.elements).toHaveLength(0);
  });

  it("renders scene with no elements", () => {
    const scene = createScene({
      id: "s1",
      name: "Empty Scene",
      elements: []
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    expect(frame.sceneId).toBe("s1");
    expect(frame.elements).toHaveLength(0);
  });

  it("renders at time before any scene", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [createElementNode({ id: "el", type: "text" })]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: -1000 });

    // Should handle gracefully
    expect(frame.sceneId).toBeNull();
    expect(frame.elements).toHaveLength(0);
  });

  it("renders at time after all scenes", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      durationMs: 1000,
      elements: [createElementNode({ id: "el", type: "text" })]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 10000 });

    // Should stop at last scene
    expect(frame.sceneId).toBeNull();
    expect(frame.elements).toHaveLength(0);
  });
});

describe("Integration: Complex Element Compositions", () => {
  it("renders scene with various element types", () => {
    const scene = createScene({
      id: "s1",
      name: "Complex",
      elements: [
        createElementNode({
          id: "bg",
          type: "shape",
          layout: { width: 1080, height: 1920, opacity: 0.8 }
        }),
        createElementNode({
          id: "img",
          type: "image",
          layout: { x: 100, y: 100 }
        }),
        createElementNode({
          id: "title",
          type: "text",
          content: { text: "Title" }
        }),
        createElementNode({
          id: "subtitle",
          type: "text",
          content: { text: "Subtitle" }
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    expect(frame.elements).toHaveLength(4);
    expect(frame.elements.map((e) => e.type)).toEqual([
      "shape",
      "image",
      "text",
      "text"
    ]);
  });
});

describe("Integration: Animation State in Rendered Frame", () => {
  it("renders animation at specific time point", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
          id: "el",
          type: "text",
          layout: { x: 0, y: 0 },
          animations: [
            {
              id: "slide",
              type: "slideRight",
              startMs: 0,
              durationMs: 1000
            }
          ]
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    // Render at 25%, 50%, 75% through animation
    const frame250 = resolveRenderFrame(project, { timeMs: 250 });
    const frame500 = resolveRenderFrame(project, { timeMs: 500 });
    const frame750 = resolveRenderFrame(project, { timeMs: 750 });

    // X should increase monotonically
    expect(frame250.elements[0].layout.x).toBeGreaterThan(-60);
    expect(frame500.elements[0].layout.x).toBeGreaterThan(frame250.elements[0].layout.x);
    expect(frame750.elements[0].layout.x).toBeGreaterThan(frame500.elements[0].layout.x);
  });

  it("preserves semantic content through rendering", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
          id: "text_el",
          type: "text",
          semanticRole: "headline",
          content: { text: "Important Text" },
          layout: { opacity: 0 },
          animations: [
            {
              id: "fade",
              type: "fadeIn",
              startMs: 0,
              durationMs: 500
            }
          ]
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 250 });

    // Semantic properties preserved
    expect(frame.elements[0].id).toBe("text_el");
    expect(frame.elements[0].semanticRole).toBe("headline");
    expect(frame.elements[0].content.text).toBe("Important Text");

    // But layout animated
    expect(frame.elements[0].layout.opacity).toBeGreaterThan(0);
  });
});

describe("Integration: Rendering with Patches", () => {
  it("renders after patching element properties", () => {
    let scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
          id: "el",
          type: "text",
          layout: { opacity: 1, x: 0 }
        })
      ]
    });

    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    // Apply patch operation
    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "el",
      patch: { layout: { opacity: 0.5, x: 100 } }
    } as any);

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    expect(frame.elements[0].layout.opacity).toBe(0.5);
    expect(frame.elements[0].layout.x).toBe(100);
  });

  it("renders after adding animation via operation", () => {
    let scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
          id: "el",
          type: "text",
          layout: { opacity: 1 }
        })
      ]
    });

    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    // Add animation
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "el",
      animation: {
        id: "fade",
        type: "fadeOut",
        startMs: 0,
        durationMs: 1000
      }
    } as any);

    const frame250 = resolveRenderFrame(project, { timeMs: 250 });

    expect(frame250.elements[0].layout.opacity).toBeLessThan(1);
  });
});

describe("Integration: Deterministic Rendering", () => {
  it("produces identical frames for same project and time", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
          id: "el",
          type: "text",
          layout: { x: 0, y: 100, opacity: 1 },
          animations: [
            {
              id: "a1",
              type: "slideRight",
              startMs: 0,
              durationMs: 1000
            },
            {
              id: "a2",
              type: "fadeOut",
              startMs: 500,
              durationMs: 1000
            }
          ]
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frames = [];
    for (let i = 0; i < 5; i++) {
      const frame = resolveRenderFrame(project, { timeMs: 750 });
      frames.push(JSON.stringify(frame));
    }

    // All frames identical
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]).toBe(frames[0]);
    }
  });

  it("monotonic property changes during animations", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [
        createElementNode({
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
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const opacities = [];
    for (let t = 0; t <= 1000; t += 100) {
      const frame = resolveRenderFrame(project, { timeMs: t });
      opacities.push(frame.elements[0].layout.opacity);
    }

    // Monotonically decreasing
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeLessThanOrEqual(opacities[i - 1]);
    }
  });
});

describe("Integration: Viewport Consistency", () => {
  it("preserves viewport information in rendered frame", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [createElementNode({ id: "el", type: "text" })]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      viewport: { width: 1080, height: 1920 },
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    expect(frame.viewport).toBeDefined();
    expect(frame.viewport?.width).toBe(1080);
    expect(frame.viewport?.height).toBe(1920);
  });
});
