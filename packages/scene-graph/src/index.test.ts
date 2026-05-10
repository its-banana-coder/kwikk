import { describe, expect, it } from "vitest";
import {
  buildSequentialTimelineTracks,
  createElementNode,
  createPrototypeProject,
  createScene,
  updateSceneDuration,
  updateSceneElement,
  validateProjectDocument
} from "./index";

describe("scene graph helpers", () => {
  it("creates serializable elements with explicit defaults", () => {
    const element = createElementNode({
      id: "headline",
      type: "text"
    });

    expect(element.layout.scale).toBe(1);
    expect(element.layout.opacity).toBe(1);
    expect(element.animations).toEqual([]);
  });

  it("builds a 15 second prototype reel", () => {
    const project = createPrototypeProject();

    expect(project.scenes).toHaveLength(3);
    expect(project.timelineTracks).toHaveLength(3);
    const lastTrack = project.timelineTracks[project.timelineTracks.length - 1];
    expect(lastTrack?.startMs).toBe(10000);
    expect(lastTrack?.durationMs).toBe(5000);
  });

  it("keeps visible animation coverage near the end of every prototype scene", () => {
    const project = createPrototypeProject();

    for (const scene of project.scenes) {
      const latestAnimationEndMs = Math.max(
        ...scene.elements.flatMap((element) =>
          element.animations.map((animation) => animation.startMs + animation.durationMs)
        )
      );

      expect(latestAnimationEndMs).toBeGreaterThanOrEqual(scene.durationMs - 800);
    }
  });

  it("reflows timeline tracks when a scene duration changes", () => {
    const sceneA = createScene({ id: "scene_a", name: "A", durationMs: 3000 });
    const sceneB = createScene({ id: "scene_b", name: "B", durationMs: 2000 });
    const project = {
      id: "demo",
      name: "Demo",
      scenes: [sceneA, sceneB],
      viewport: { width: 1080, height: 1920 },
      timelineTracks: buildSequentialTimelineTracks([sceneA, sceneB])
    };

    const updated = updateSceneDuration(project, "scene_a", 5000);

    expect(updated.timelineTracks[0].durationMs).toBe(5000);
    expect(updated.timelineTracks[1].startMs).toBe(5000);
  });

  it("validates duplicate element identifiers", () => {
    const duplicate = createElementNode({
      id: "same-id",
      type: "shape"
    });
    const project = {
      id: "invalid",
      name: "Invalid",
      viewport: { width: 1080, height: 1920 },
      scenes: [
        createScene({
          id: "scene_a",
          name: "A",
          elements: [duplicate, duplicate]
        })
      ],
      timelineTracks: buildSequentialTimelineTracks([
        createScene({
          id: "scene_a",
          name: "A",
          elements: [duplicate, duplicate]
        })
      ])
    };

    expect(validateProjectDocument(project)).toContain("Duplicate element id: same-id");
  });

  describe("updateSceneElement", () => {
    it("updates element properties in target scene only", () => {
      const element = createElementNode({
        id: "text_1",
        type: "text",
        layout: { x: 0, y: 0 }
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "text_1", (el) => ({
        ...el,
        layout: { ...el.layout, x: 100 }
      }));

      expect(updated.scenes[0].elements[0].layout.x).toBe(100);
    });

    it("preserves other elements in the scene", () => {
      const el1 = createElementNode({ id: "el_1", type: "text" });
      const el2 = createElementNode({ id: "el_2", type: "image" });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [el1, el2]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "el_1", (el) => ({
        ...el,
        layout: { ...el.layout, opacity: 0.5 }
      }));

      expect(updated.scenes[0].elements).toHaveLength(2);
      expect(updated.scenes[0].elements[1].id).toBe("el_2");
      expect(updated.scenes[0].elements[1].layout.opacity).toBe(1);
    });

    it("handles nested layout merge correctly", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text",
        layout: {
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          opacity: 0.8,
          scale: 1.5
        }
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "el_1", (el) => ({
        ...el,
        layout: { ...el.layout, x: 30, width: 200 }
      }));

      const updatedEl = updated.scenes[0].elements[0];
      expect(updatedEl.layout.x).toBe(30);
      expect(updatedEl.layout.width).toBe(200);
      expect(updatedEl.layout.y).toBe(20);
      expect(updatedEl.layout.opacity).toBe(0.8);
      expect(updatedEl.layout.scale).toBe(1.5);
    });

    it("handles nested style merge correctly", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text",
        style: {
          fontFamily: "Inter",
          fontSize: 24,
          color: "#ff0000"
        }
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "el_1", (el) => ({
        ...el,
        style: { ...el.style, fontSize: 36 }
      }));

      const updatedEl = updated.scenes[0].elements[0];
      expect(updatedEl.style.fontSize).toBe(36);
      expect(updatedEl.style.fontFamily).toBe("Inter");
      expect(updatedEl.style.color).toBe("#ff0000");
    });

    it("handles overrides merge correctly", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text",
        overrides: {
          layout: { opacity: 0.7 },
          style: { color: "#0000ff" }
        }
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "el_1", (el) => ({
        ...el,
        overrides: {
          ...el.overrides,
          layout: {
            ...(el.overrides?.layout ?? {}),
            scale: 1.2
          }
        }
      }));

      const updatedEl = updated.scenes[0].elements[0];
      expect(updatedEl.overrides?.layout?.opacity).toBe(0.7);
      expect(updatedEl.overrides?.layout?.scale).toBe(1.2);
      expect(updatedEl.overrides?.style?.color).toBe("#0000ff");
    });

    it("does not mutate original project", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text",
        layout: { x: 0 }
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const originalX = project.scenes[0].elements[0].layout.x;

      updateSceneElement(project, "scene_1", "el_1", (el) => ({
        ...el,
        layout: { ...el.layout, x: 999 }
      }));

      expect(project.scenes[0].elements[0].layout.x).toBe(originalX);
    });

    it("returns project unchanged if scene not found", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text"
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "missing_scene", "el_1", (el) => ({
        ...el,
        layout: { ...el.layout, x: 100 }
      }));

      expect(updated.scenes[0].elements[0].layout.x).toBe(0);
    });

    it("returns project unchanged if element not found", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text"
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "missing_el", (el) => ({
        ...el,
        layout: { ...el.layout, x: 100 }
      }));

      expect(updated.scenes[0].elements[0].layout.x).toBe(0);
    });

    it("applies complex updater function correctly", () => {
      const element = createElementNode({
        id: "el_1",
        type: "text",
        content: { text: "Old" }
      });
      const scene = createScene({
        id: "scene_1",
        name: "Scene 1",
        elements: [element]
      });
      const project = {
        id: "proj_1",
        name: "Project",
        scenes: [scene],
        viewport: { width: 1080, height: 1920 },
        timelineTracks: buildSequentialTimelineTracks([scene])
      };

      const updated = updateSceneElement(project, "scene_1", "el_1", (el) => ({
        ...el,
        layout: { ...el.layout, x: el.layout.x + 50 },
        content: { text: "New" },
        style: { ...el.style, fontSize: (el.style.fontSize ?? 48) + 12 }
      }));

      const updatedEl = updated.scenes[0].elements[0];
      expect(updatedEl.layout.x).toBe(50);
      expect(updatedEl.content?.text).toBe("New");
      expect(updatedEl.style.fontSize).toBe(60);
    });
  });
});
