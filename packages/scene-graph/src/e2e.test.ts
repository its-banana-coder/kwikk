import { describe, expect, it, beforeEach } from "vitest";
import {
  createElementNode,
  createScene,
  createProjectDocument,
  applyOperation,
  createPrototypeProject
} from "@kwikk/scene-graph";
import { resolveRenderFrame } from "@kwikk/render-core";
import { getActiveSceneWindow } from "@kwikk/timeline";

/**
 * End-to-End Integration Tests: Full Pipeline
 * 
 * These tests verify that the complete pipeline works correctly:
 * Operations → Scene Graph → Timeline → Animation → Rendering
 */

describe("E2E: Complete Editing & Rendering Workflow", () => {
  let project: any;

  beforeEach(() => {
    // Start with empty project
    project = createProjectDocument({
      id: "e2e_test",
      name: "E2E Test",
      scenes: []
    });
  });

  it("creates project, adds elements, animates, and renders", async () => {
    // Create scene via operation
    project = applyOperation(project, {
      operation: "add_scene",
      scene: createScene({
        id: "s1",
        name: "Main",
        durationMs: 2000
      })
    } as any);

    expect(project.scenes).toHaveLength(1);

    // Add title element
    project = applyOperation(project, {
      operation: "add_element",
      sceneId: "s1",
      elementId: "title",
      type: "text",
      content: { text: "Hello World" }
    } as any);

    expect(project.scenes[0].elements).toHaveLength(1);

    // Add animation to title
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "title",
      animation: {
        id: "title_fade",
        type: "fadeIn",
        startMs: 0,
        durationMs: 1000
      }
    } as any);

    // Add subtitle element
    project = applyOperation(project, {
      operation: "add_element",
      sceneId: "s1",
      elementId: "subtitle",
      type: "text",
      content: { text: "Animated" }
    } as any);

    expect(project.scenes[0].elements).toHaveLength(2);

    // Add animation to subtitle
    project = applyOperation(project, {
      operation: "add_animation",
      sceneId: "s1",
      elementId: "subtitle",
      animation: {
        id: "subtitle_fade",
        type: "fadeIn",
        startMs: 500,
        durationMs: 1000
      }
    } as any);

    // Render at different time points and verify
    const frame0 = resolveRenderFrame(project, { timeMs: 0 });
    expect(frame0.elements).toHaveLength(2);
    expect(frame0.elements[0].layout.opacity).toBeCloseTo(0, 1);
    // Subtitle's fadeIn doesn't start until 500ms — before that it must show
    // its base opacity (1), not pre-apply the animation's "from" value.
    expect(frame0.elements[1].layout.opacity).toBeCloseTo(1, 1);

    const frame500 = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame500.elements[0].layout.opacity).toBeGreaterThan(0.4);
    expect(frame500.elements[1].layout.opacity).toBeCloseTo(0, 1);

    const frame1000 = resolveRenderFrame(project, { timeMs: 1000 });
    expect(frame1000.elements[0].layout.opacity).toBeCloseTo(1, 1);
    expect(frame1000.elements[1].layout.opacity).toBeGreaterThan(0.4);

    const frame1500 = resolveRenderFrame(project, { timeMs: 1500 });
    expect(frame1500.elements[0].layout.opacity).toBeCloseTo(1, 1);
    expect(frame1500.elements[1].layout.opacity).toBeGreaterThan(0.8);
  });

  it("edits existing animations through operations", async () => {
    const el = createElementNode({
      id: "el",
      type: "text",
      animations: [
        { id: "anim1", type: "fadeIn", startMs: 0, durationMs: 500 }
      ]
    });
    const scene = createScene({
      id: "s1",
      name: "S1",
      durationMs: 2000,
      elements: [el]
    });
    project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    // Update animation
    project = applyOperation(project, {
      operation: "update_animation",
      sceneId: "s1",
      elementId: "el",
      animationId: "anim1",
      patch: { durationMs: 1000 }
    } as any);

    // Verify updated state renders differently
    const frame500_after = resolveRenderFrame(project, { timeMs: 500 });

    expect(frame500_after.elements[0].layout.opacity).toBeLessThan(1); // Still animating
  });

  it("deletes elements and verifies rendering updates", async () => {
    const el1 = createElementNode({ id: "el1", type: "text" });
    const el2 = createElementNode({ id: "el2", type: "shape" });
    const scene = createScene({
      id: "s1",
      name: "S1",
      elements: [el1, el2]
    });
    project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const frame1 = resolveRenderFrame(project, { timeMs: 0 });
    expect(frame1.elements).toHaveLength(2);

    // Delete element
    project = applyOperation(project, {
      operation: "delete_element",
      sceneId: "s1",
      elementId: "el2"
    } as any);

    const frame2 = resolveRenderFrame(project, { timeMs: 0 });
    expect(frame2.elements).toHaveLength(1);
    expect(frame2.elements[0].id).toBe("el1");
  });
});

describe("E2E: Multi-Scene Timeline with Animations", () => {
  it("renders multiple scenes with animations at timeline boundaries", async () => {
    const s1 = createScene({
      id: "s1",
      name: "Scene 1",
      durationMs: 1000,
      elements: [
        createElementNode({
          id: "el_s1",
          type: "text",
          content: { text: "Scene 1" },
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

    const s2 = createScene({
      id: "s2",
      name: "Scene 2",
      durationMs: 1500,
      elements: [
        createElementNode({
          id: "el_s2",
          type: "text",
          content: { text: "Scene 2" },
          layout: { opacity: 0 },
          animations: [
            {
              id: "fade_in_2",
              type: "fadeIn",
              startMs: 0,
              durationMs: 600
            }
          ]
        })
      ]
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [s1, s2]
    });

    // Scene 1 start
    const frame100 = resolveRenderFrame(project, { timeMs: 100 });
    expect(frame100.sceneId).toBe("s1");
    expect(frame100.elements[0].layout.opacity).toBeGreaterThan(0);

    // Scene 1 end / Scene 2 start
    const frame1000 = resolveRenderFrame(project, { timeMs: 1000 });
    expect(frame1000.sceneId).toBe("s2");
    expect(frame1000.elements[0].id).toBe("el_s2");

    // Scene 2 animating
    const frame1500 = resolveRenderFrame(project, { timeMs: 1500 });
    expect(frame1500.sceneId).toBe("s2");
    expect(frame1500.elements[0].layout.opacity).toBeGreaterThan(0);
  });

  it("tracks timeline navigation across scenes", async () => {
    const scenes = [
      createScene({
        id: "s1",
        name: "S1",
        durationMs: 1000,
        elements: [createElementNode({ id: "el1", type: "text" })]
      }),
      createScene({
        id: "s2",
        name: "S2",
        durationMs: 1500,
        elements: [createElementNode({ id: "el2", type: "text" })]
      }),
      createScene({
        id: "s3",
        name: "S3",
        durationMs: 1000,
        elements: [createElementNode({ id: "el3", type: "text" })]
      })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    // Test timeline window calculations
    const w0 = getActiveSceneWindow(project, 500);
    expect(w0?.scene.id).toBe("s1");

    const w1 = getActiveSceneWindow(project, 1200);
    expect(w1?.scene.id).toBe("s2");

    const w2 = getActiveSceneWindow(project, 2750);
    expect(w2?.scene.id).toBe("s3");

    // Verify rendering follows timeline
    const frame0 = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame0.sceneId).toBe("s1");

    const frame1 = resolveRenderFrame(project, { timeMs: 1200 });
    expect(frame1.sceneId).toBe("s2");

    const frame2 = resolveRenderFrame(project, { timeMs: 2750 });
    expect(frame2.sceneId).toBe("s3");
  });
});

describe("E2E: Motion Presets Full Pipeline", () => {
  it("applies preset, renders, and verifies animation", async () => {
    const el = createElementNode({
      id: "el",
      type: "shape",
      layout: { scale: 1, opacity: 1 }
    });

    const scene = createScene({
      id: "s1",
      name: "S1",
      durationMs: 1000,
      elements: [el]
    });

    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    // Set motion preset
    const presetAnimations = [
      {
        id: "zoom_anim",
        type: "zoomIn" as const,
        startMs: 0,
        durationMs: 1000
      }
    ];

    project = applyOperation(project, {
      operation: "set_element_motion_preset",
      sceneId: "s1",
      elementId: "el",
      motionPreset: "aggressive_zoom",
      animations: presetAnimations
    } as any);

    // Verify preset applied
    expect(project.scenes[0].elements[0].motionPreset).toBe("aggressive_zoom");

    // Render and verify animation effect
    const frame0 = resolveRenderFrame(project, { timeMs: 0 });
    const frame500 = resolveRenderFrame(project, { timeMs: 500 });
    const frame1000 = resolveRenderFrame(project, { timeMs: 1000 });

    // Scale should increase
    expect(frame500.elements[0].layout.scale).toBeGreaterThan(
      frame0.elements[0].layout.scale
    );
    expect(frame1000.elements[0].layout.scale).toBeGreaterThan(
      frame500.elements[0].layout.scale
    );
  });
});

describe("E2E: Complex Editing Scenarios", () => {
  it("performs multiple edits without breaking state", async () => {
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: []
    });

    // Add scene
    project = applyOperation(project, {
      operation: "add_scene",
      scene: createScene({
        id: "s1",
        name: "S1",
        durationMs: 3000
      })
    } as any);

    // Add 3 elements
    for (let i = 0; i < 3; i++) {
      project = applyOperation(project, {
        operation: "add_element",
        sceneId: "s1",
        elementId: `el${i}`,
        type: "text"
      } as any);
    }

    // Add animations to each
    for (let i = 0; i < 3; i++) {
      project = applyOperation(project, {
        operation: "add_animation",
        sceneId: "s1",
        elementId: `el${i}`,
        animation: {
          id: `anim${i}`,
          type: "fadeIn",
          startMs: i * 300,
          durationMs: 500
        }
      } as any);
    }

    // Modify some elements
    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "el1",
      patch: { layout: { opacity: 0.8 } }
    } as any);

    // Delete one element
    project = applyOperation(project, {
      operation: "delete_element",
      sceneId: "s1",
      elementId: "el2"
    } as any);

    // Verify final state
    expect(project.scenes[0].elements).toHaveLength(2);

    // Render and verify it works
    const frame = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame.elements).toHaveLength(2);
  });

  it("creates prototype project and renders at various times", async () => {
    const project = createPrototypeProject();

    // Should have 3 scenes
    expect(project.scenes).toHaveLength(3);

    // Each scene should render without errors
    for (let sceneIdx = 0; sceneIdx < project.scenes.length; sceneIdx++) {
      const scene = project.scenes[sceneIdx];

      // Render at start, middle, and end of each scene
      let sceneStart = 0;
      for (let i = 0; i < sceneIdx; i++) {
        sceneStart += project.scenes[i].durationMs || 0;
      }

      const startTime = sceneStart;
      const midTime = sceneStart + (scene.durationMs || 1000) / 2;
      const endTime = sceneStart + (scene.durationMs || 1000);

      const frameStart = resolveRenderFrame(project, { timeMs: startTime });
      expect(frameStart.sceneId).toBe(scene.id);

      const frameMid = resolveRenderFrame(project, { timeMs: midTime });
      expect(frameMid.sceneId).toBe(scene.id);

      const frameEnd = resolveRenderFrame(project, { timeMs: endTime });
      const expectedIds = [scene.id, null] as any[];
      if (sceneIdx < project.scenes.length - 1) {
        expectedIds.push(project.scenes[sceneIdx + 1].id);
      }
      expect(expectedIds).toContain(frameEnd.sceneId);
    }
  });
});

describe("E2E: Scene Management Through Operations", () => {
  it("adds and removes scenes, verifying timeline consistency", async () => {
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [
        createScene({ id: "s1", name: "S1", durationMs: 1000 }),
        createScene({ id: "s2", name: "S2", durationMs: 1000 })
      ]
    });

    // Initial timeline
    let w1000 = getActiveSceneWindow(project, 1000);
    expect(w1000?.scene.id).toBe("s2");

    // Add scene in middle
    project = applyOperation(project, {
      operation: "add_scene",
      scene: createScene({ id: "s_new", name: "New", durationMs: 500 })
    } as any);

    // New scene at end
    expect(project.scenes).toHaveLength(3);

    // Delete first scene
    project = applyOperation(project, {
      operation: "delete_scene",
      sceneId: "s1"
    } as any);

    expect(project.scenes).toHaveLength(2);
    expect(project.scenes[0].id).toBe("s2");

    // Timeline updates
    const w0 = getActiveSceneWindow(project, 0);
    expect(w0?.scene.id).toBe("s2");
  });

  it("reorders scenes and verifies timeline adjusts", async () => {
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [
        createScene({
          id: "s1",
          name: "S1",
          durationMs: 1000,
          elements: [createElementNode({ id: "el1", type: "text" })]
        }),
        createScene({
          id: "s2",
          name: "S2",
          durationMs: 2000,
          elements: [createElementNode({ id: "el2", type: "text" })]
        })
      ]
    });

    // Render before reorder
    const frame0_before = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame0_before.elements[0].id).toBe("el1");

    // Reorder scenes
    project = applyOperation(project, {
      operation: "reorder_scenes",
      fromIndex: 0,
      toIndex: 1
    } as any);

    // Timeline updates
    const frame0_after = resolveRenderFrame(project, { timeMs: 500 });
    expect(frame0_after.elements[0].id).toBe("el2"); // Now s2 is first

    // s1 starts at 2000ms
    const frame2500 = resolveRenderFrame(project, { timeMs: 2500 });
    expect(frame2500.elements[0].id).toBe("el1");
  });
});

describe("E2E: Brand Theme Integration", () => {
  it("sets brand theme and verifies persistence", async () => {
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [createScene({ id: "s1", name: "S1" })]
    });

    project = applyOperation(project, {
      operation: "set_brand_theme",
      brandTheme: {
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        primaryFont: "Arial"
      }
    } as any);

    expect(project.brandTheme?.primaryColor).toBe("#FF0000");

    // Render and theme should be available
    const frame = resolveRenderFrame(project, { timeMs: 0 });
    expect(frame).toBeDefined();
  });
});

describe("E2E: Determinism & Consistency", () => {
  it("produces identical renders for same state across multiple renders", async () => {
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [
        createScene({
          id: "s1",
          name: "S1",
          elements: [
            createElementNode({
              id: "el",
              type: "text",
              layout: { x: 0, opacity: 1 },
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
        })
      ]
    });

    const frames = [];
    for (let i = 0; i < 10; i++) {
      const frame = resolveRenderFrame(project, { timeMs: 750 });
      frames.push(JSON.stringify(frame));
    }

    // All frames identical
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]).toBe(frames[0]);
    }
  });

  it("maintains semantic properties through full pipeline", async () => {
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [
        createScene({
          id: "s1",
          name: "S1",
          elements: [
            createElementNode({
              id: "headline",
              type: "text",
              semanticRole: "headline",
              content: { text: "Title" },
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
        })
      ]
    });

    // Through operations
    project = applyOperation(project, {
      operation: "patch_element",
      sceneId: "s1",
      elementId: "headline",
      patch: { layout: { x: 100 } }
    } as any);

    // Rendered frame
    const frame = resolveRenderFrame(project, { timeMs: 250 });
    const element = frame.elements[0];

    // Verify semantics preserved
    expect(element.id).toBe("headline");
    expect(element.semanticRole).toBe("headline");
    expect(element.content?.text).toBe("Title");
  });
});
