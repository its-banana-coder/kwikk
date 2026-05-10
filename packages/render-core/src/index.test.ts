import { describe, expect, it } from "vitest";
import { createProjectDocument, createScene, createElementNode } from "@kwikk/scene-graph";
import { resolveRenderFrame } from "./index";

describe("resolveRenderFrame", () => {
  it("returns a deterministic empty frame when no scene is active", () => {
    const project = createProjectDocument({
      id: "empty",
      name: "Empty",
      scenes: []
    });

    const frame = resolveRenderFrame(project, { timeMs: 0 });

    expect(frame.sceneId).toBeNull();
    expect(frame.elements).toEqual([]);
  });

  it("sorts elements by z-index and resolves scene-local animations", () => {
    const scene = createScene({
      id: "scene_a",
      name: "Scene A",
      elements: [
        createElementNode({
          id: "front",
          type: "text",
          layout: {
            zIndex: 10
          }
        }),
        createElementNode({
          id: "back",
          type: "shape",
          layout: {
            zIndex: 1
          }
        }),
        createElementNode({
          id: "animated",
          type: "text",
          layout: {
            y: 200
          },
          animations: [
            {
              id: "animated_slide",
              type: "slideUp",
              startMs: 0,
              durationMs: 1000
            }
          ]
        })
      ]
    });
    const project = createProjectDocument({
      id: "demo",
      name: "Demo",
      scenes: [scene]
    });

    const frame = resolveRenderFrame(project, { timeMs: 500 });

    expect(frame.sceneId).toBe("scene_a");
    expect(frame.elements[0].id).toBe("animated");
    expect(frame.elements[1].id).toBe("back");
    expect(frame.elements[2].id).toBe("front");
    expect(frame.elements[0].layout.y).toBeCloseTo(230, 3);
  });

  describe("scene boundaries", () => {
    it("resolves frame at exact scene start boundary", () => {
      const scene1 = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text",
            content: { text: "Scene 1" }
          })
        ]
      });
      const scene2 = createScene({
        id: "s2",
        name: "Scene 2",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_2",
            type: "text",
            content: { text: "Scene 2" }
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene1, scene2]
      });

      const frame = resolveRenderFrame(project, { timeMs: 2000 });

      expect(frame.sceneId).toBe("s2");
      expect(frame.elements[0].content?.text).toBe("Scene 2");
    });

    it("returns null frame at exact end boundary", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text"
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 2000 });

      expect(frame.sceneId).toBeNull();
      expect(frame.elements).toEqual([]);
    });

    it("resolves frame just before scene end", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text",
            content: { text: "Active" }
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 1999 });

      expect(frame.sceneId).toBe("s1");
      expect(frame.elements[0].content?.text).toBe("Active");
    });

    it("computes localTimeMs correctly at scene boundaries", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text",
            layout: { y: 0 },
            animations: [
              {
                id: "slide",
                type: "slideUp",
                startMs: 0,
                durationMs: 1000
              }
            ]
          })
        ]
      });
      const scene2 = createScene({
        id: "s2",
        name: "Scene 2",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_2",
            type: "text",
            layout: { y: 0 },
            animations: [
              {
                id: "slide",
                type: "slideUp",
                startMs: 0,
                durationMs: 1000
              }
            ]
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene, scene2]
      });

      const frame1 = resolveRenderFrame(project, { timeMs: 500 });
      const frame2 = resolveRenderFrame(project, { timeMs: 2500 });

      expect(frame1.elements[0].layout.y).toBeCloseTo(30, 1);
      expect(frame2.elements[0].layout.y).toBeCloseTo(30, 1);
    });
  });

  describe("exact end times", () => {
    it("handles animation exactly at end time", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        elements: [
          createElementNode({
            id: "el_1",
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
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 1000 });

      expect(frame.elements[0].layout.opacity).toBe(0);
    });

    it("handles scene exactly at final boundary", () => {
      const scene1 = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 1000
      });
      const scene2 = createScene({
        id: "s2",
        name: "Scene 2",
        durationMs: 1000
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene1, scene2]
      });

      const frameBeforeEnd = resolveRenderFrame(project, { timeMs: 1999 });
      const frameAtEnd = resolveRenderFrame(project, { timeMs: 2000 });

      expect(frameBeforeEnd.sceneId).toBe("s2");
      expect(frameAtEnd.sceneId).toBeNull();
    });

    it("resolves multiple animations with staggered end times", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 2000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text",
            layout: { opacity: 1 },
            animations: [
              {
                id: "fade1",
                type: "fadeOut",
                startMs: 0,
                durationMs: 500
              },
              {
                id: "fade2",
                type: "fadeIn",
                startMs: 500,
                durationMs: 500
              }
            ]
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const at500 = resolveRenderFrame(project, { timeMs: 500 });
      const at1000 = resolveRenderFrame(project, { timeMs: 1000 });

      expect(at500.elements[0].layout.opacity).toBe(0);
      expect(at1000.elements[0].layout.opacity).toBe(1);
    });
  });

  describe("multi-scene timelines", () => {
    it("transitions from scene A to scene B at boundary", () => {
      const sceneA = createScene({
        id: "scene_a",
        name: "Scene A",
        durationMs: 2000,
        backgroundColor: "#ff0000",
        elements: [
          createElementNode({
            id: "a_text",
            type: "text",
            content: { text: "A" }
          })
        ]
      });
      const sceneB = createScene({
        id: "scene_b",
        name: "Scene B",
        durationMs: 2000,
        backgroundColor: "#00ff00",
        elements: [
          createElementNode({
            id: "b_text",
            type: "text",
            content: { text: "B" }
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [sceneA, sceneB]
      });

      const frameBeforeTransition = resolveRenderFrame(project, { timeMs: 1999 });
      const frameAfterTransition = resolveRenderFrame(project, { timeMs: 2000 });

      expect(frameBeforeTransition.sceneId).toBe("scene_a");
      expect(frameBeforeTransition.backgroundColor).toBe("#ff0000");
      expect(frameAfterTransition.sceneId).toBe("scene_b");
      expect(frameAfterTransition.backgroundColor).toBe("#00ff00");
    });

    it("resolves animations relative to scene start", () => {
      const scene1 = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 1000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text",
            layout: { y: 0 },
            animations: [
              {
                id: "slide",
                type: "slideUp",
                startMs: 0,
                durationMs: 1000
              }
            ]
          })
        ]
      });
      const scene2 = createScene({
        id: "s2",
        name: "Scene 2",
        durationMs: 1000,
        elements: [
          createElementNode({
            id: "el_2",
            type: "text",
            layout: { y: 0 },
            animations: [
              {
                id: "slide",
                type: "slideUp",
                startMs: 0,
                durationMs: 1000
              }
            ]
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene1, scene2]
      });

      const frameAt500 = resolveRenderFrame(project, { timeMs: 500 });
      const frameAt1500 = resolveRenderFrame(project, { timeMs: 1500 });

      const yAt500 = frameAt500.elements[0].layout.y;
      const yAt1500 = frameAt1500.elements[0].layout.y;

      expect(yAt500).toBeCloseTo(yAt1500, 1);
    });

    it("applies overrides consistently across scene boundaries", () => {
      const el1 = createElementNode({
        id: "el_1",
        type: "text",
        layout: { opacity: 1 },
        overrides: {
          layout: { opacity: 0.5 }
        }
      });
      const scene1 = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 1000,
        elements: [el1]
      });
      const el2 = createElementNode({
        id: "el_2",
        type: "text",
        layout: { opacity: 1 },
        overrides: {
          layout: { opacity: 0.5 }
        }
      });
      const scene2 = createScene({
        id: "s2",
        name: "Scene 2",
        durationMs: 1000,
        elements: [el2]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene1, scene2]
      });

      const frame1 = resolveRenderFrame(project, { timeMs: 500 });
      const frame2 = resolveRenderFrame(project, { timeMs: 1500 });

      expect(frame1.elements[0].layout.opacity).toBe(0.5);
      expect(frame2.elements[0].layout.opacity).toBe(0.5);
    });
  });

  describe("edge cases", () => {
    it("handles timeMs at zero", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        elements: [
          createElementNode({
            id: "el_1",
            type: "text"
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 0 });

      expect(frame.sceneId).toBe("s1");
      expect(frame.elements).toHaveLength(1);
    });

    it("handles scene with no elements", () => {
      const scene = createScene({
        id: "s1",
        name: "Empty Scene",
        elements: []
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 500 });

      expect(frame.sceneId).toBe("s1");
      expect(frame.elements).toEqual([]);
    });

    it("handles very large timeMs beyond all scenes", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        durationMs: 1000,
        elements: [
          createElementNode({
            id: "el_1",
            type: "text"
          })
        ]
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 999999 });

      expect(frame.sceneId).toBeNull();
      expect(frame.elements).toEqual([]);
    });

    it("preserves viewport in frame output", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        elements: []
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 }
      });

      const frame = resolveRenderFrame(project, { timeMs: 500 });

      expect(frame.viewport.width).toBe(1080);
      expect(frame.viewport.height).toBe(1920);
    });

    it("includes timeMs in frame output", () => {
      const scene = createScene({
        id: "s1",
        name: "Scene 1",
        elements: []
      });
      const project = createProjectDocument({
        id: "proj",
        name: "Project",
        scenes: [scene]
      });

      const frame = resolveRenderFrame(project, { timeMs: 1234 });

      expect(frame.timeMs).toBe(1234);
    });
  });
});
