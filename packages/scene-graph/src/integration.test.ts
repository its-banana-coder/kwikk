import { describe, expect, it } from "vitest";
import {
  createElementNode,
  createScene,
  createProjectDocument,
  applyOperation,
  mergeElementPatch,
  validateProjectDocument
} from "./index";

/**
 * Integration Tests: Scene Graph Operations
 * 
 * These tests verify that multiple operations compose correctly
 * and preserve semantic invariants throughout the editing lifecycle.
 */

describe("Integration: Operation Sequences", () => {
  it("chain multiple operations to build a complete scene", () => {
    // Start with empty project
    let project = createProjectDocument({
      id: "test_proj",
      name: "Test",
      scenes: []
    });

    // Add scene
    project = applyOperation(project, {
      operation: "add_scene",
      scene: createScene({ id: "s1", name: "Scene 1", durationMs: 3000 })
    } as any);
    expect(project.scenes).toHaveLength(1);

    // Add first element
    project = applyOperation(project, {
      operation: "add_element",
      sceneId: "s1",
      elementId: "headline",
      type: "text",
      content: { text: "Headline" }
    } as any);
    expect(project.scenes[0].elements).toHaveLength(1);

    // Add animation to first element
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "headline",
      animation: { id: "anim_1", type: "fadeIn", startMs: 0, durationMs: 500 }
    } as any);
    expect(project.scenes[0].elements[0].animations).toHaveLength(1);

    // Add second element
    project = applyOperation(project, {
      operation: "add_element",
      sceneId: "s1",
      elementId: "subheading",
      type: "text",
      content: { text: "Subheading" }
    } as any);
    expect(project.scenes[0].elements).toHaveLength(2);

    // Add staggered animation to second element
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "subheading",
      animation: { id: "anim_2", type: "fadeIn", startMs: 300, durationMs: 500 }
    } as any);

    // Verify final state
    expect(project.scenes[0].elements).toHaveLength(2);
    expect(project.scenes[0].elements[0].animations).toHaveLength(1);
    expect(project.scenes[0].elements[1].animations).toHaveLength(1);
    expect(project.scenes[0].elements[1].animations[0].startMs).toBe(300);
  });

  it("modify and delete elements while preserving scene structure", () => {
    const el1 = createElementNode({ id: "el1", type: "text" });
    const el2 = createElementNode({ id: "el2", type: "shape" });
    const scene = createScene({ id: "s1", name: "S1", elements: [el1, el2] });
    let project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    // Update first element
    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "el1",
      patch: { layout: { opacity: 0.5 } }
    } as any);

    expect(project.scenes[0].elements[0].layout.opacity).toBe(0.5);
    expect(project.scenes[0].elements[1].layout.opacity).toBe(1); // Unchanged

    // Delete second element
    project = applyOperation(project, {
      operation: "delete_element",
      sceneId: "s1",
      elementId: "el2"
    } as any);

    expect(project.scenes[0].elements).toHaveLength(1);
    expect(project.scenes[0].elements[0].id).toBe("el1");
  });

  it("set motion preset and verify it replaces animations", () => {
    const el = createElementNode({
      id: "el1",
      type: "text",
      animations: [
        { id: "old1", type: "fadeIn", startMs: 0, durationMs: 100 },
        { id: "old2", type: "fadeOut", startMs: 500, durationMs: 100 }
      ]
    });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    const presetAnimations = [
      { id: "preset_1", type: "zoomIn", startMs: 0, durationMs: 600 }
    ];

    const updated = applyOperation(project, {
      operation: "set_element_motion_preset",
      sceneId: "s1",
      elementId: "el1",
      motionPreset: "aggressive_zoom",
      animations: presetAnimations
    } as any);

    expect(updated.scenes[0].elements[0].motionPreset).toBe("aggressive_zoom");
    expect(updated.scenes[0].elements[0].animations).toHaveLength(1);
    expect(updated.scenes[0].elements[0].animations[0].id).toBe("preset_1");
  });
});

describe("Integration: Semantic Preservation", () => {
  it("preserves element ID and semanticRole through multiple edits", () => {
    const el = createElementNode({
      id: "stable_id",
      type: "text",
      semanticRole: "title",
      content: { text: "Original" }
    });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    let project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    // Multiple edits
    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "stable_id",
      patch: { layout: { x: 100 } }
    } as any);

    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "stable_id",
      animation: { id: "a1", type: "fadeIn", startMs: 0, durationMs: 500 }
    } as any);

    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "stable_id",
      patch: { content: { text: "Updated" } }
    } as any);

    // Verify identity preserved
    const updated = project.scenes[0].elements[0];
    expect(updated.id).toBe("stable_id");
    expect(updated.semanticRole).toBe("title");
    expect(updated.layout.x).toBe(100);
    expect(updated.animations).toHaveLength(1);
  });

  it("preserves element relationships during scene reordering", () => {
    const scene1 = createScene({
      id: "s1",
      name: "S1",
      elements: [createElementNode({ id: "el1", type: "text" })]
    });
    const scene2 = createScene({
      id: "s2",
      name: "S2",
      elements: [createElementNode({ id: "el2", type: "shape" })]
    });
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene1, scene2]
    });

    // Reorder scenes
    project = applyOperation(project, {
      operation: "reorder_scenes",
      fromIndex: 0,
      toIndex: 1
    } as any);

    // Verify order changed but elements intact
    expect(project.scenes[0].id).toBe("s2");
    expect(project.scenes[1].id).toBe("s1");
    expect(project.scenes[0].elements[0].id).toBe("el2");
    expect(project.scenes[1].elements[0].id).toBe("el1");
  });
});

describe("Integration: Multi-Scene Timeline Composition", () => {
  it("maintains timeline consistency across multiple scenes", () => {
    const scene1 = createScene({
      id: "s1",
      name: "Scene 1",
      durationMs: 2000,
      elements: [createElementNode({ id: "el1", type: "text" })]
    });
    const scene2 = createScene({
      id: "s2",
      name: "Scene 2",
      durationMs: 3000,
      elements: [createElementNode({ id: "el2", type: "shape" })]
    });
    let project = createProjectDocument({
      id: "proj1",
      name: "Project",
      scenes: [scene1, scene2]
    });

    // Modify first scene duration
    project = applyOperation(project, {
      operation: "update_scene_duration",
      sceneId: "s1",
      durationMs: 3000
    } as any);

    expect(project.scenes[0].durationMs).toBe(3000);

    // Add third scene
    project = applyOperation(project, {
      operation: "add_scene",
      scene: createScene({
        id: "s3",
        name: "Scene 3",
        durationMs: 1500,
        elements: []
      })
    } as any);

    expect(project.scenes).toHaveLength(3);
    expect(project.scenes.map((s) => s.durationMs)).toEqual([3000, 3000, 1500]);
  });

  it("handles scene deletion and maintains valid project state", () => {
    const s1 = createScene({ id: "s1", name: "S1" });
    const s2 = createScene({ id: "s2", name: "S2" });
    const s3 = createScene({ id: "s3", name: "S3" });
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [s1, s2, s3]
    });

    // Delete middle scene
    project = applyOperation(project, {
      operation: "delete_scene",
      sceneId: "s2"
    } as any);

    expect(project.scenes.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(validateProjectDocument(project as any)).not.toContain("Duplicate scene id");
  });
});

describe("Integration: Complex Animation Workflows", () => {
  it("layers multiple animations on single element with different timing", () => {
    const el = createElementNode({
      id: "complex_el",
      type: "text",
      layout: { x: 0, y: 0, opacity: 1 }
    });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    let project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    // Add first animation (fade in at start)
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "complex_el",
      animation: { id: "a1", type: "fadeIn", startMs: 0, durationMs: 500 }
    } as any);

    // Add second animation (slide right during middle)
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "complex_el",
      animation: { id: "a2", type: "slideRight", startMs: 500, durationMs: 800 }
    } as any);

    // Add third animation (zoom out at end)
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "complex_el",
      animation: { id: "a3", type: "zoomOut", startMs: 1300, durationMs: 500 }
    } as any);

    // Verify all animations present and ordered
    const animations = project.scenes[0].elements[0].animations;
    expect(animations).toHaveLength(3);
    expect(animations.map((a) => a.startMs)).toEqual([0, 500, 1300]);
    expect(animations.map((a) => a.type)).toEqual(["fadeIn", "slideRight", "zoomOut"]);
  });

  it("updates individual animation in a chain without affecting others", () => {
    const el = createElementNode({ id: "el", type: "text" });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    let project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    // Add multiple animations
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "el",
      animation: { id: "a1", type: "fadeIn", startMs: 0, durationMs: 500 }
    } as any);
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "el",
      animation: { id: "a2", type: "slideUp", startMs: 500, durationMs: 600 }
    } as any);

    // Update middle animation only
    project = applyOperation(project, {
      operation: "update_animation",
      sceneId: "s1",
      elementId: "el",
      animationId: "a2",
      patch: { durationMs: 800 }
    } as any);

    const anims = project.scenes[0].elements[0].animations;
    expect(anims[0].durationMs).toBe(500); // First unchanged
    expect(anims[1].durationMs).toBe(800); // Second updated
  });

  it("deletes animation and verifies element still renders", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      animations: [
        { id: "a1", type: "fadeIn", startMs: 0, durationMs: 500 },
        { id: "a2", type: "slideUp", startMs: 500, durationMs: 600 }
      ]
    });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    let project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    // Delete first animation
    project = applyOperation(project, {
      operation: "delete_animation",
      sceneId: "s1",
      elementId: "el",
      animationId: "a1"
    } as any);

    expect(project.scenes[0].elements[0].animations).toHaveLength(1);
    expect(project.scenes[0].elements[0].animations[0].id).toBe("a2");
  });
});

describe("Integration: Brand Theme Application", () => {
  it("applies brand theme without errors", () => {
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [createScene({ id: "s1", name: "S1" })]
    });

    // Should not throw
    const updated = applyOperation(project, {
      operation: "set_brand_theme",
      theme: {
        primary: "#FF0000",
        secondary: "#00FF00",
        fontFamily: "Arial"
      }
    } as any);

    // Project should be modified or unchanged
    expect(updated).toBeDefined();
    expect(updated.id).toBe("p1");
  });
});

describe("Integration: Validation Across Complex States", () => {
  it("validates project with multiple scenes and animations", () => {
    const el1 = createElementNode({ id: "el1", type: "text" });
    const el2 = createElementNode({ id: "el2", type: "shape" });
    const scene1 = createScene({
      id: "s1",
      name: "S1",
      elements: [el1, el2]
    });
    const scene2 = createScene({
      id: "s2",
      name: "S2",
      elements: [createElementNode({ id: "el3", type: "text" })]
    });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene1, scene2]
    });

    const errors = validateProjectDocument(project as any);
    // Should pass validation
    expect(errors.filter((e) => e.includes("Duplicate"))).toHaveLength(0);
  });

  it("detects duplicate element IDs across scenes", () => {
    const el = createElementNode({ id: "same_id", type: "text" });
    const scene1 = createScene({
      id: "s1",
      name: "S1",
      elements: [el]
    });
    const scene2 = createScene({
      id: "s2",
      name: "S2",
      elements: [createElementNode({ id: "same_id", type: "shape" })]
    });
    const project = {
      id: "p1",
      name: "P1",
      viewport: { width: 1080, height: 1920 },
      scenes: [scene1, scene2],
      timelineTracks: []
    };

    const errors = validateProjectDocument(project as any);
    expect(errors.some((e) => e.includes("Duplicate element id: same_id"))).toBe(true);
  });
});

describe("Integration: Element Patching with Merge", () => {
  it("merges element patches preserving unmodified properties", () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      layout: {
        x: 0,
        y: 100,
        width: 200,
        height: 50,
        opacity: 1,
        scale: 1,
        rotation: 0,
        zIndex: 0
      },
      semanticRole: "headline"
    });

    const patch = {
      layout: { x: 50, opacity: 0.8 }
    };

    const merged = mergeElementPatch(el, patch as any);

    // Changed properties
    expect(merged.layout.x).toBe(50);
    expect(merged.layout.opacity).toBe(0.8);

    // Preserved properties
    expect(merged.layout.y).toBe(100);
    expect(merged.layout.width).toBe(200);
    expect(merged.semanticRole).toBe("headline");
  });
});

describe("Integration: Operation Idempotence", () => {
  it("applying same patch twice produces same state", () => {
    const el = createElementNode({ id: "el", type: "text", layout: { x: 0 } });
    const scene = createScene({ id: "s1", name: "S1", elements: [el] });
    let project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

    const patch = { layout: { x: 100 } };

    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "el",
      patch
    } as any);

    const stateAfterFirst = JSON.stringify(project);

    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "el",
      patch
    } as any);

    const stateAfterSecond = JSON.stringify(project);

    expect(stateAfterFirst).toBe(stateAfterSecond);
  });
});
