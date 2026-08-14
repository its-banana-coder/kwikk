import { describe, expect, it } from "vitest";
import { createScene, createProjectDocument, buildSequentialTimelineTracks } from "@kwikk/scene-graph";
import { getActiveSceneWindow, TimelineEngine, getTimelineDurationMs } from "./index";

/**
 * Integration Tests: Timeline Package
 * 
 * These tests verify that:
 * - Timeline calculation correctly maps global time to scene local time
 * - Scene windows are calculated correctly
 * - Timeline boundaries are handled correctly
 * - Multiple scenes compose into coherent timeline
 */

describe("Integration: Timeline Scene Navigation", () => {
  it("navigates correctly through multiple sequential scenes", () => {
    const scene1 = createScene({
      id: "s1",
      name: "Scene 1",
      durationMs: 2000
    });
    const scene2 = createScene({
      id: "s2",
      name: "Scene 2",
      durationMs: 3000
    });
    const scene3 = createScene({
      id: "s3",
      name: "Scene 3",
      durationMs: 1500
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene1, scene2, scene3]
    });

    // Scene 1 (0-2000ms)
    const window500 = getActiveSceneWindow(project, 500);
    expect(window500?.scene.id).toBe("s1");
    expect(window500?.localTimeMs).toBe(500);

    // Scene 1 boundary
    const window2000 = getActiveSceneWindow(project, 2000);
    expect(window2000?.scene.id).toBe("s2");
    expect(window2000?.localTimeMs).toBe(0);

    // Scene 2 middle
    const window3500 = getActiveSceneWindow(project, 3500);
    expect(window3500?.scene.id).toBe("s2");
    expect(window3500?.localTimeMs).toBe(1500);

    // Scene 2 end / Scene 3 start
    const window5000 = getActiveSceneWindow(project, 5000);
    expect(window5000?.scene.id).toBe("s3");
    expect(window5000?.localTimeMs).toBe(0);

    // Scene 3 middle
    const window5750 = getActiveSceneWindow(project, 5750);
    expect(window5750?.scene.id).toBe("s3");
    expect(window5750?.localTimeMs).toBe(750);
  });

  it("handles scenes with different durations", () => {
    const shortScene = createScene({
      id: "short",
      name: "Short",
      durationMs: 500
    });
    const longScene = createScene({
      id: "long",
      name: "Long",
      durationMs: 3000
    });
    const shortScene2 = createScene({
      id: "short2",
      name: "Short 2",
      durationMs: 800
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [shortScene, longScene, shortScene2]
    });

    // Short scene complete at 500ms
    const window0 = getActiveSceneWindow(project, 0);
    expect(window0?.scene.id).toBe("short");

    const window499 = getActiveSceneWindow(project, 499);
    expect(window499?.scene.id).toBe("short");

    // Long scene starts at 500ms
    const window500 = getActiveSceneWindow(project, 500);
    expect(window500?.scene.id).toBe("long");
    expect(window500?.localTimeMs).toBe(0);

    // Long scene ends at 3500ms
    const window3499 = getActiveSceneWindow(project, 3499);
    expect(window3499?.scene.id).toBe("long");

    // Short scene 2 starts at 3500ms
    const window3500 = getActiveSceneWindow(project, 3500);
    expect(window3500?.scene.id).toBe("short2");

    // Total duration is 4300ms
    const window4300 = getActiveSceneWindow(project, 4300);
    expect(window4300?.scene.id).toBe("short2");
    expect(window4300?.localTimeMs).toBe(800);

    const window4301 = getActiveSceneWindow(project, 4301);
    expect(window4301).toBeNull();
  });

  it("returns null window before first scene", () => {
    const scene = createScene({ id: "s1", name: "S1" });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const window = getActiveSceneWindow(project, -1000);
    expect(window).toBeNull();
  });

  it("returns null window after last scene", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      durationMs: 2000
    });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const window = getActiveSceneWindow(project, 5000);
    expect(window).toBeNull();
  });
});

describe("Integration: Timeline with Empty Scene List", () => {
  it("handles project with no scenes", () => {
    const project = createProjectDocument({
      id: "p1",
      name: "Empty",
      scenes: []
    });

    const window = getActiveSceneWindow(project, 0);
    expect(window).toBeNull();
  });

  it("handles project with single scene", () => {
    const scene = createScene({
      id: "s1",
      name: "S1",
      durationMs: 1000
    });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const window0 = getActiveSceneWindow(project, 0);
    expect(window0?.scene.id).toBe("s1");

    const window999 = getActiveSceneWindow(project, 999);
    expect(window999?.scene.id).toBe("s1");

    const window1000 = getActiveSceneWindow(project, 1000);
    expect(window1000?.scene.id).toBe("s1");
    expect(window1000?.localTimeMs).toBe(1000);

    const window1001 = getActiveSceneWindow(project, 1001);
    expect(window1001).toBeNull();
  });
});

describe("Integration: Timeline Boundary Precision", () => {
  it("handles exact scene boundary times", () => {
    const s1 = createScene({ id: "s1", name: "S1", durationMs: 1000 });
    const s2 = createScene({ id: "s2", name: "S2", durationMs: 2000 });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [s1, s2]
    });

    // Exact end of scene 1
    const window1000 = getActiveSceneWindow(project, 1000);
    expect(window1000?.scene.id).toBe("s2");
    expect(window1000?.localTimeMs).toBe(0);

    // Just before
    const window999 = getActiveSceneWindow(project, 999);
    expect(window999?.scene.id).toBe("s1");
    expect(window999?.localTimeMs).toBe(999);

    // Exact end of s2
    const window3000 = getActiveSceneWindow(project, 3000);
    expect(window3000?.scene.id).toBe("s2");
    expect(window3000?.localTimeMs).toBe(2000);

    const window3001 = getActiveSceneWindow(project, 3001);
    expect(window3001).toBeNull();

    // Just before
    const window2999 = getActiveSceneWindow(project, 2999);
    expect(window2999?.scene.id).toBe("s2");
    expect(window2999?.localTimeMs).toBe(1999);
  });

  it("maintains local time correctness across boundaries", () => {
    const scenes = [
      createScene({ id: "s1", name: "S1", durationMs: 1500 }),
      createScene({ id: "s2", name: "S2", durationMs: 2500 }),
      createScene({ id: "s3", name: "S3", durationMs: 1000 })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    // Test various points
    const testCases = [
      { globalTime: 0, expectedScene: "s1", expectedLocal: 0 },
      { globalTime: 500, expectedScene: "s1", expectedLocal: 500 },
      { globalTime: 1500, expectedScene: "s2", expectedLocal: 0 },
      { globalTime: 2000, expectedScene: "s2", expectedLocal: 500 },
      { globalTime: 4000, expectedScene: "s3", expectedLocal: 0 },
      { globalTime: 4500, expectedScene: "s3", expectedLocal: 500 }
    ];

    testCases.forEach(({ globalTime, expectedScene, expectedLocal }) => {
      const window = getActiveSceneWindow(project, globalTime);
      expect(window?.scene.id).toBe(expectedScene);
      expect(window?.localTimeMs).toBe(expectedLocal);
    });
  });
});

describe("Integration: Timeline Window Structure", () => {
  it("provides complete window information", () => {
    const scene = createScene({
      id: "s1",
      name: "Scene 1",
      durationMs: 2000
    });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [scene]
    });

    const window = getActiveSceneWindow(project, 1000);

    expect(window).toHaveProperty("scene");
    expect(window).toHaveProperty("localTimeMs");
    expect(window?.scene.id).toBe("s1");
    expect(window?.localTimeMs).toBe(1000);
  });

  it("maintains consistent window calculations", () => {
    const s1 = createScene({ id: "s1", name: "S1", durationMs: 1000 });
    const s2 = createScene({ id: "s2", name: "S2", durationMs: 1500 });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [s1, s2]
    });

    // Multiple calls for same time should give same result
    const windows = [];
    for (let i = 0; i < 5; i++) {
      windows.push(getActiveSceneWindow(project, 1250));
    }

    for (let i = 1; i < windows.length; i++) {
      expect(windows[i]?.scene.id).toBe(windows[0]?.scene.id);
      expect(windows[i]?.localTimeMs).toBe(windows[0]?.localTimeMs);
    }
  });
});

describe("Integration: Complex Timeline Scenarios", () => {
  it("handles rapid scene transitions", () => {
    const scenes = Array.from({ length: 10 }, (_, i) =>
      createScene({
        id: `s${i}`,
        name: `Scene ${i}`,
        durationMs: 100
      })
    );

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    // Navigate through rapid transitions
    for (let i = 0; i < 10; i++) {
      const window = getActiveSceneWindow(project, i * 100 + 50);
      expect(window?.scene.id).toBe(`s${i}`);
      expect(window?.localTimeMs).toBe(50);
    }
  });

  it("handles very long single scene", () => {
    const longScene = createScene({
      id: "long",
      name: "Long",
      durationMs: 60000 // 60 seconds
    });

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [longScene]
    });

    // Sample various times
    const sampleTimes = [0, 5000, 15000, 30000, 45000, 59999];

    sampleTimes.forEach((time) => {
      const window = getActiveSceneWindow(project, time);
      expect(window?.scene.id).toBe("long");
      expect(window?.localTimeMs).toBe(time);
    });
  });

  it("handles alternating short and long scenes", () => {
    const scenes = [
      createScene({ id: "s1", name: "S1", durationMs: 500 }),
      createScene({ id: "s2", name: "S2", durationMs: 3000 }),
      createScene({ id: "s3", name: "S3", durationMs: 500 }),
      createScene({ id: "s4", name: "S4", durationMs: 2000 })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    // Verify boundaries
    let cumulativeTime = 0;
    scenes.forEach((scene) => {
      const window = getActiveSceneWindow(project, cumulativeTime);
      expect(window?.scene.id).toBe(scene.id);
      expect(window?.localTimeMs).toBe(0);
      cumulativeTime += scene.durationMs!;
    });
  });
});

describe("Integration: Timeline Engine", () => {
  it("creates and calculates total duration", () => {
    const scenes = [
      createScene({ id: "s1", name: "S1", durationMs: 2000 }),
      createScene({ id: "s2", name: "S2", durationMs: 3000 }),
      createScene({ id: "s3", name: "S3", durationMs: 1500 })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    const engine = new TimelineEngine({ durationMs: getTimelineDurationMs(project.timelineTracks) });

    // Total duration should be sum of all scenes
    expect(engine.getSnapshot().durationMs).toBe(6500);
  });

  it("timeline engine navigation", () => {
    const scenes = [
      createScene({ id: "s1", name: "S1", durationMs: 1000 }),
      createScene({ id: "s2", name: "S2", durationMs: 2000 })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    // Test playhead movement
    const window0 = getActiveSceneWindow(project, 500);
    expect(window0?.scene.id).toBe("s1");

    const window1 = getActiveSceneWindow(project, 1500);
    expect(window1?.scene.id).toBe("s2");
  });
});

describe("Integration: Scene Duration Changes", () => {
  it("timeline adjusts when scene duration changes", () => {
    const s1 = createScene({ id: "s1", name: "S1", durationMs: 1000 });
    const s2 = createScene({ id: "s2", name: "S2", durationMs: 2000 });
    let project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [s1, s2]
    });

    const engine1 = new TimelineEngine({ durationMs: getTimelineDurationMs(project.timelineTracks) });
    expect(engine1.getSnapshot().durationMs).toBe(3000);

    // Modify project with different duration
    project = {
      ...project,
      scenes: [
        { ...s1, durationMs: 2000 },
        s2
      ],
      timelineTracks: buildSequentialTimelineTracks([
        { ...s1, durationMs: 2000 },
        s2
      ])
    };

    const engine2 = new TimelineEngine({ durationMs: getTimelineDurationMs(project.timelineTracks) });
    expect(engine2.getSnapshot().durationMs).toBe(4000);

    // Scene 2 should start at 2000ms now
    const window = getActiveSceneWindow(project, 2000);
    expect(window?.scene.id).toBe("s2");
    expect(window?.localTimeMs).toBe(0);
  });
});

describe("Integration: Zero-Duration Scenes", () => {
  it("handles scenes with zero duration gracefully", () => {
    const scenes = [
      createScene({ id: "s1", name: "S1", durationMs: 0 }),
      createScene({ id: "s2", name: "S2", durationMs: 1000 })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    // Time 0 should be in scene 2 (scene 1 has no duration)
    const window = getActiveSceneWindow(project, 0);
    expect(window?.scene.id).toBe("s2");
  });
});

describe("Integration: Timeline Determinism", () => {
  it("produces same results for repeated queries", () => {
    const scenes = [
      createScene({ id: "s1", name: "S1", durationMs: 1500 }),
      createScene({ id: "s2", name: "S2", durationMs: 2500 })
    ];

    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes
    });

    const results = [];
    for (let i = 0; i < 10; i++) {
      const window = getActiveSceneWindow(project, 2000);
      results.push(JSON.stringify(window));
    }

    // All results identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(results[0]);
    }
  });

  it("maintains temporal ordering", () => {
    const s1 = createScene({ id: "s1", name: "S1", durationMs: 1000 });
    const s2 = createScene({ id: "s2", name: "S2", durationMs: 1000 });
    const project = createProjectDocument({
      id: "p1",
      name: "P1",
      scenes: [s1, s2]
    });

    const times = [0, 250, 500, 750, 1000, 1250, 1500, 1750];
    const windows = times.map((t) => getActiveSceneWindow(project, t));

    // Verify ordering
    expect(windows[0]?.scene.id).toBe("s1");
    expect(windows[1]?.scene.id).toBe("s1");
    expect(windows[2]?.scene.id).toBe("s1");
    expect(windows[3]?.scene.id).toBe("s1");
    expect(windows[4]?.scene.id).toBe("s2");
    expect(windows[5]?.scene.id).toBe("s2");
    expect(windows[6]?.scene.id).toBe("s2");
    expect(windows[7]?.scene.id).toBe("s2");
  });
});
