import { describe, expect, it } from "vitest";
import { createProjectDocument, createScene } from "@kwikk/scene-graph";
import {
  TimelineEngine,
  getActiveSceneWindow,
  getActiveTrack,
  getTimelineDurationMs
} from "./index";

describe("TimelineEngine", () => {
  it("ticks deterministically from explicit deltas", () => {
    const engine = new TimelineEngine({
      durationMs: 1000,
      loop: true
    });

    engine.play();
    expect(engine.tick(250)).toBe(250);
    expect(engine.tick(250)).toBe(500);
    expect(engine.tick(700)).toBe(200);
  });

  it("clamps seek operations to duration", () => {
    const engine = new TimelineEngine({
      durationMs: 800
    });

    engine.seek(1200);
    expect(engine.currentTimeMs).toBe(800);
  });

  describe("tick() loop behavior", () => {
    it("wraps time when loop=true and exceeds duration", () => {
      const engine = new TimelineEngine({
        durationMs: 1000,
        currentTimeMs: 900,
        isPlaying: true,
        loop: true
      });

      expect(engine.tick(200)).toBe(100);
    });

    it("stops playback when loop=false and exceeds duration", () => {
      const engine = new TimelineEngine({
        durationMs: 1000,
        currentTimeMs: 900,
        isPlaying: true,
        loop: false
      });

      engine.tick(200);

      expect(engine.currentTimeMs).toBe(1000);
      expect(engine.isPlaying).toBe(false);
    });

    it("clamps to duration boundary when loop=false", () => {
      const engine = new TimelineEngine({
        durationMs: 500,
        currentTimeMs: 450,
        isPlaying: true,
        loop: false
      });

      engine.tick(100);

      expect(engine.currentTimeMs).toBe(500);
      expect(engine.isPlaying).toBe(false);
    });

    it("stops playback exactly at duration boundary", () => {
      const engine = new TimelineEngine({
        durationMs: 1000,
        currentTimeMs: 0,
        isPlaying: true,
        loop: false
      });

      engine.tick(1000);

      expect(engine.currentTimeMs).toBe(1000);
      expect(engine.isPlaying).toBe(false);
    });

    it("does not tick when isPlaying=false", () => {
      const engine = new TimelineEngine({
        durationMs: 1000,
        currentTimeMs: 500,
        isPlaying: false
      });

      const result = engine.tick(200);

      expect(result).toBe(500);
      expect(engine.currentTimeMs).toBe(500);
    });

    it("ignores negative or zero deltaMs", () => {
      const engine = new TimelineEngine({
        durationMs: 1000,
        currentTimeMs: 500,
        isPlaying: true
      });

      expect(engine.tick(0)).toBe(500);
      expect(engine.tick(-100)).toBe(500);
      expect(engine.currentTimeMs).toBe(500);
    });

    it("wraps multiple times if delta exceeds duration", () => {
      const engine = new TimelineEngine({
        durationMs: 100,
        currentTimeMs: 0,
        isPlaying: true,
        loop: true
      });

      engine.tick(350);

      expect(engine.currentTimeMs).toBe(50);
    });

    it("emits snapshot on tick", () => {
      const engine = new TimelineEngine({
        durationMs: 1000,
        isPlaying: true,
        loop: true
      });

      let snapshotCount = 0;
      engine.subscribe(() => {
        snapshotCount++;
      });

      engine.tick(100);

      expect(snapshotCount).toBeGreaterThan(1);
    });
  });

  describe("play/pause", () => {
    it("does not re-emit when already playing", () => {
      const engine = new TimelineEngine({ durationMs: 1000, isPlaying: true });

      let count = 0;
      engine.subscribe(() => {
        count++;
      });

      engine.play();

      expect(count).toBe(1);
    });

    it("does not re-emit when already paused", () => {
      const engine = new TimelineEngine({ durationMs: 1000, isPlaying: false });

      let count = 0;
      engine.subscribe(() => {
        count++;
      });

      engine.pause();

      expect(count).toBe(1);
    });

    it("emits on state transition play -> pause", () => {
      const engine = new TimelineEngine({ durationMs: 1000, isPlaying: true });

      let emitCount = 0;
      engine.subscribe(() => {
        emitCount++;
      });

      engine.pause();

      expect(emitCount).toBeGreaterThan(0);
      expect(engine.isPlaying).toBe(false);
    });
  });

  describe("subscription", () => {
    it("returns unsubscribe function", () => {
      const engine = new TimelineEngine({ durationMs: 1000 });

      let callCount = 0;
      const unsubscribe = engine.subscribe(() => {
        callCount++;
      });

      const initialCount = callCount;

      unsubscribe();
      engine.play();

      expect(callCount).toBe(initialCount);
    });
  });
});

describe("timeline selectors", () => {
  const project = createProjectDocument({
    id: "demo",
    name: "Demo",
    scenes: [
      createScene({ id: "scene_a", name: "Scene A", durationMs: 3000 }),
      createScene({ id: "scene_b", name: "Scene B", durationMs: 2000 })
    ]
  });

  it("computes the total duration from tracks", () => {
    expect(getTimelineDurationMs(project.timelineTracks)).toBe(5000);
  });

  it("returns the active scene window for a time", () => {
    const active = getActiveSceneWindow(project, 3500);

    expect(active?.scene.id).toBe("scene_b");
    expect(active?.localTimeMs).toBe(500);
  });

  it("returns null when no track is active", () => {
    expect(getActiveTrack(project.timelineTracks, 6000)).toBeNull();
  });

  describe("getActiveTrack layer precedence", () => {
    it("selects highest layer when tracks overlap", () => {
      const projectWithOverlap = createProjectDocument({
        id: "overlap",
        name: "Overlap",
        scenes: [
          createScene({ id: "scene_a", name: "A", durationMs: 5000 }),
          createScene({ id: "scene_b", name: "B", durationMs: 5000 })
        ],
        timelineTracks: [
          { id: "track_a", sceneId: "scene_a", startMs: 0, durationMs: 5000, layer: 0 },
          { id: "track_b", sceneId: "scene_b", startMs: 1000, durationMs: 3000, layer: 2 },
          { id: "track_c", sceneId: "scene_a", startMs: 1000, durationMs: 3000, layer: 1 }
        ]
      });

      const activeAt2000 = getActiveTrack(projectWithOverlap.timelineTracks, 2000);

      expect(activeAt2000?.id).toBe("track_b");
      expect(activeAt2000?.layer).toBe(2);
    });

    it("respects explicit layer ordering", () => {
      const tracks = [
        { id: "low", sceneId: "s1", startMs: 0, durationMs: 1000, layer: 10 },
        { id: "high", sceneId: "s2", startMs: 0, durationMs: 1000, layer: 99 },
        { id: "mid", sceneId: "s3", startMs: 0, durationMs: 1000, layer: 50 }
      ];

      const active = getActiveTrack(tracks, 500);

      expect(active?.id).toBe("high");
    });

    it("handles negative layer values", () => {
      const tracks = [
        { id: "neg", sceneId: "s1", startMs: 0, durationMs: 1000, layer: -5 },
        { id: "zero", sceneId: "s2", startMs: 0, durationMs: 1000, layer: 0 },
        { id: "pos", sceneId: "s3", startMs: 0, durationMs: 1000, layer: 5 }
      ];

      const active = getActiveTrack(tracks, 500);

      expect(active?.id).toBe("pos");
    });

    it("returns first matching track when layers are equal", () => {
      const tracks = [
        { id: "track_1", sceneId: "s1", startMs: 0, durationMs: 1000, layer: 1 },
        { id: "track_2", sceneId: "s2", startMs: 0, durationMs: 1000, layer: 1 }
      ];

      const active = getActiveTrack(tracks, 500);

      expect(active?.id).toBeDefined();
      expect([tracks[0].id, tracks[1].id]).toContain(active?.id);
    });
  });

  describe("edge cases", () => {
    it("returns null at exact end boundary", () => {
      const active = getActiveSceneWindow(project, 5000);

      expect(active).toBeNull();
    });

    it("returns active at exact start boundary", () => {
      const active = getActiveSceneWindow(project, 3000);

      expect(active?.scene.id).toBe("scene_b");
      expect(active?.localTimeMs).toBe(0);
    });

    it("computes zero duration for empty track array", () => {
      expect(getTimelineDurationMs([])).toBe(0);
    });

    it("handles single track duration", () => {
      const duration = getTimelineDurationMs([
        { id: "track_1", sceneId: "s1", startMs: 100, durationMs: 500, layer: 0 }
      ]);

      expect(duration).toBe(600);
    });

    it("handles gaps in timeline", () => {
      const tracks = [
        { id: "t1", sceneId: "s1", startMs: 0, durationMs: 1000, layer: 0 },
        { id: "t2", sceneId: "s2", startMs: 2000, durationMs: 1000, layer: 0 }
      ];

      expect(getTimelineDurationMs(tracks)).toBe(3000);

      const activeAt1500 = getActiveTrack(tracks, 1500);
      expect(activeAt1500).toBeNull();
    });
  });
});
