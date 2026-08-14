import { describe, expect, it } from "vitest";
import {
  createElementNode,
  createScene,
  createProjectDocument,
  applyOperation
} from "./index";

describe("applyOperation mutations", () => {
  it("adds and deletes an element", () => {
    const scene = createScene({ id: "s1", name: "S1" });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });

    const afterAdd = applyOperation(project, {
      operation: "add_element",
      sceneId: "s1",
      elementId: "new_el",
      type: "text"
    } as any);

    expect(afterAdd.scenes[0].elements.some((e) => e.id === "new_el")).toBe(true);

    const afterDelete = applyOperation(afterAdd, {
      operation: "delete_element",
      sceneId: "s1",
      elementId: "new_el"
    } as any);

    expect(afterDelete.scenes[0].elements.some((e) => e.id === "new_el")).toBe(false);
  });

  it("adds, updates and deletes animations on an element", () => {
    const el = createElementNode({ id: "el1", type: "text" });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });

    const afterAddAnim = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "el1",
      animation: { id: "a1", type: "fadeIn", startMs: 0, durationMs: 100 }
    } as any);

    expect(afterAddAnim.scenes[0].elements[0].animations.some((a) => a.id === "a1")).toBe(true);

    const afterUpdateAnim = applyOperation(afterAddAnim, {
      operation: "update_animation",
      sceneId: "s1",
      elementId: "el1",
      animationId: "a1",
      patch: { durationMs: 200 }
    } as any);

    expect(afterUpdateAnim.scenes[0].elements[0].animations.find((a) => a.id === "a1")?.durationMs).toBe(200);

    const afterDeleteAnim = applyOperation(afterUpdateAnim, {
      operation: "delete_animation",
      sceneId: "s1",
      elementId: "el1",
      animationId: "a1"
    } as any);

    expect(afterDeleteAnim.scenes[0].elements[0].animations).toHaveLength(0);
  });

  it("sets motion presets and replaces animations", () => {
    const el = createElementNode({ id: "el1", type: "text" });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });

    const presetAnims = [{ id: "p0", type: "zoomIn", startMs: 0, durationMs: 100 }];

    const afterPreset = applyOperation(project, {
      operation: "set_element_motion_preset",
      sceneId: "s1",
      elementId: "el1",
      motionPreset: "aggressive_zoom",
      animations: presetAnims
    } as any);

    expect(afterPreset.scenes[0].elements[0].motionPreset).toBe("aggressive_zoom");
    expect(afterPreset.scenes[0].elements[0].animations).toEqual(presetAnims);
  });

  it("adds, deletes and reorders scenes and updates scene metadata", () => {
    const s1 = createScene({ id: "s1", name: "One", durationMs: 1000 });
    const s2 = createScene({ id: "s2", name: "Two", durationMs: 1000 });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [s1] });

    const afterAddScene = applyOperation(project, { operation: "add_scene", scene: s2 } as any);
    expect(afterAddScene.scenes.map((s) => s.id)).toEqual(["s1", "s2"]);

    const afterUpdateScene = applyOperation(afterAddScene, { operation: "update_scene", sceneId: "s1", patch: { name: "Uno" } } as any);
    expect(afterUpdateScene.scenes.find((s) => s.id === "s1")?.name).toBe("Uno");

    const afterReorder = applyOperation(afterUpdateScene, { operation: "reorder_scenes", fromIndex: 0, toIndex: 1 } as any);
    expect(afterReorder.scenes.map((s) => s.id)).toEqual(["s2", "s1"]);

    const afterDeleteScene = applyOperation(afterReorder, { operation: "delete_scene", sceneId: "s2" } as any);
    expect(afterDeleteScene.scenes.map((s) => s.id)).toEqual(["s1"]);
  });

  it("enforces minimum duration when updating scene duration", () => {
    const scene = createScene({ id: "s1", name: "S1", durationMs: 5000 });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });

    const afterShort = applyOperation(project, { operation: "update_scene_duration", sceneId: "s1", durationMs: 500 } as any);
    // update_scene_duration clamps to Math.max(1000, durationMs)
    expect(afterShort.scenes.find((s) => s.id === "s1")?.durationMs).toBe(1000);
  });

  it("sets brand theme", () => {
    const scene = createScene({ id: "s1", name: "S1" });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });

    const afterTheme = applyOperation(project, { operation: "set_brand_theme", brandTheme: "acme" } as any);
    expect((afterTheme as any).brandTheme).toBe("acme");
  });

  it("sets viewport without touching existing element layouts", () => {
    const el = createElementNode({ id: "e1", type: "text", layout: { x: 10, y: 10, width: 100, height: 50 } });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });
    expect(project.viewport).toEqual({ width: 1080, height: 1920 });

    const afterViewport = applyOperation(project, {
      operation: "set_viewport",
      viewport: { width: 1920, height: 1080 }
    } as any);

    expect(afterViewport.viewport).toEqual({ width: 1920, height: 1080 });
    expect(afterViewport.scenes[0].elements[0].layout).toEqual(el.layout);
  });

  it("updates asset metadata", () => {
    const scene = createScene({ id: "s1", name: "S1" });
    let project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });
    project = applyOperation(project, {
      operation: "add_asset",
      asset: { id: "a1", name: "x.png", type: "image", src: "http://localhost/uploads/a1.png" }
    } as any);

    const after = applyOperation(project, {
      operation: "update_asset_metadata",
      assetId: "a1",
      patch: { favorite: true, tags: ["hero"] }
    } as any);

    const a = after.assets?.find((x) => x.id === "a1");
    expect(a?.favorite).toBe(true);
    expect(a?.tags).toEqual(["hero"]);
  });
});
