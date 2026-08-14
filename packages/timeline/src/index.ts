import type { ProjectDocument, Scene, TimelineTrack, TransitionType } from "@kwikk/shared-types";

// Per-project cache for getTransitionWindow. Invalidated when project reference changes.
// Avoids O(scenes) sort + scan on every tick during non-transition playback.
let _twCacheProject: ProjectDocument | null = null;
let _twCacheSortedTracks: TimelineTrack[] = [];
let _twCacheSceneMap: Map<string, Scene> = new Map();

export interface ActiveSceneWindow {
  track: TimelineTrack;
  scene: Scene;
  localTimeMs: number;
}

export interface TimelineSnapshot {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
}

export interface TransitionWindow {
  type: TransitionType;
  durationMs: number;
  /** Linear 0→1 over the transition duration. Apply easing before use. */
  progress: number;
  outgoing: ActiveSceneWindow;
  /** localTimeMs on incoming is timeMs - nextTrack.startMs — same formula used after the transition completes, so animations run continuously without restarting. */
  incoming: ActiveSceneWindow & { sceneId: string };
}

export function getTransitionWindow(
  project: ProjectDocument,
  timeMs: number
): TransitionWindow | null {
  if (project !== _twCacheProject) {
    _twCacheProject = project;
    _twCacheSortedTracks = [...(project?.timelineTracks || [])].sort((a, b) => a.startMs - b.startMs);
    _twCacheSceneMap = new Map((project?.scenes || []).map((s) => [s.id, s]));
  }
  const sortedTracks = _twCacheSortedTracks;
  const currTrack = getActiveTrack(sortedTracks, timeMs);
  if (!currTrack) return null;

  const currIdx = sortedTracks.indexOf(currTrack);
  const nextTrack = sortedTracks[currIdx + 1] ?? null;
  if (!nextTrack) return null;

  const currScene = _twCacheSceneMap.get(currTrack.sceneId);
  if (!currScene?.transition) return null;

  const { durationMs, type } = currScene.transition;
  const trackEnd = currTrack.startMs + currTrack.durationMs;
  const transitionStart = trackEnd - durationMs;
  if (timeMs < transitionStart) return null;

  const progress = Math.min(1, (timeMs - transitionStart) / durationMs);

  // incomingLocalMs must match the formula used once this scene becomes active:
  //   localTimeMs = timeMs - nextTrack.startMs + (nextTrack.startOffsetMs ?? 0)
  // nextTrack.startOffsetMs equals durationMs (the transition duration), so at
  // the transition boundary (timeMs === nextTrack.startMs) this resolves to
  // exactly durationMs — the same value incomingLocalMs reaches at progress=1.
  // The animation clock is therefore continuous across the transition.
  const incomingLocalMs = (timeMs - nextTrack.startMs) + (nextTrack.startOffsetMs ?? 0);

  const incomingScene = _twCacheSceneMap.get(nextTrack.sceneId)!;

  return {
    type,
    durationMs,
    progress,
    outgoing: {
      track: currTrack,
      scene: currScene,
      localTimeMs: timeMs - currTrack.startMs + (currTrack.startOffsetMs ?? 0),
    },
    incoming: {
      track: nextTrack,
      scene: incomingScene,
      sceneId: incomingScene.id,
      localTimeMs: incomingLocalMs,
    },
  };
}

type TimelineListener = (snapshot: TimelineSnapshot) => void;

function clampTime(timeMs: number, durationMs: number): number {
  if (durationMs <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(timeMs, durationMs));
}

export class TimelineEngine {
  currentTimeMs: number;
  isPlaying: boolean;

  private durationMs: number;
  private readonly listeners = new Set<TimelineListener>();
  private readonly loop: boolean;

  constructor(options?: {
    durationMs?: number;
    currentTimeMs?: number;
    isPlaying?: boolean;
    loop?: boolean;
  }) {
    this.durationMs = options?.durationMs ?? 0;
    this.currentTimeMs = clampTime(options?.currentTimeMs ?? 0, this.durationMs);
    this.isPlaying = options?.isPlaying ?? false;
    this.loop = options?.loop ?? true;
  }

  play(): void {
    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.emit();
  }

  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;
    this.emit();
  }

  seek(timeMs: number): void {
    this.currentTimeMs = clampTime(timeMs, this.durationMs);
    this.emit();
  }

  setDuration(durationMs: number): void {
    this.durationMs = Math.max(0, durationMs);
    this.currentTimeMs = clampTime(this.currentTimeMs, this.durationMs);
    this.emit();
  }

  tick(deltaMs: number): number {
    if (!this.isPlaying || deltaMs <= 0) {
      return this.currentTimeMs;
    }

    const nextTimeMs = this.currentTimeMs + deltaMs;
    if (this.loop && this.durationMs > 0) {
      this.currentTimeMs = nextTimeMs % this.durationMs;
    } else {
      this.currentTimeMs = clampTime(nextTimeMs, this.durationMs);
      if (this.currentTimeMs >= this.durationMs) {
        this.isPlaying = false;
      }
    }

    this.emit();
    return this.currentTimeMs;
  }

  getSnapshot(): TimelineSnapshot {
    return {
      currentTimeMs: this.currentTimeMs,
      durationMs: this.durationMs,
      isPlaying: this.isPlaying
    };
  }

  subscribe(listener: TimelineListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export function getTimelineDurationMs(tracks: TimelineTrack[]): number {
  const safeTracks = tracks || [];
  return safeTracks.reduce((maxDuration, track) => {
    return Math.max(maxDuration, track.startMs + track.durationMs);
  }, 0);
}

export function getActiveTrack(tracks: TimelineTrack[], timeMs: number): TimelineTrack | null {
  const safeTracks = tracks || [];
  const activeTrack =
    [...safeTracks]
      .filter((track) => timeMs >= track.startMs && timeMs < track.startMs + track.durationMs)
      .sort((left, right) => right.layer - left.layer)[0] ?? null;

  if (activeTrack) {
    return activeTrack;
  }

  const timelineDurationMs = getTimelineDurationMs(safeTracks);
  if (timeMs !== timelineDurationMs || safeTracks.length === 0) {
    return null;
  }

  return [...safeTracks].sort((left, right) => {
    const leftEnd = left.startMs + left.durationMs;
    const rightEnd = right.startMs + right.durationMs;

    if (leftEnd !== rightEnd) {
      return rightEnd - leftEnd;
    }

    return right.layer - left.layer;
  })[0] ?? null;
}

export function getActiveSceneWindow(project: ProjectDocument, timeMs: number): ActiveSceneWindow | null {
  // Reuse the cache populated by getTransitionWindow (or warm it if called first).
  if (project !== _twCacheProject) {
    _twCacheProject = project;
    _twCacheSortedTracks = [...(project?.timelineTracks || [])].sort((a, b) => a.startMs - b.startMs);
    _twCacheSceneMap = new Map((project?.scenes || []).map((s) => [s.id, s]));
  }
  const track = getActiveTrack(_twCacheSortedTracks, timeMs);
  if (!track) {
    return null;
  }

  const scene = _twCacheSceneMap.get(track.sceneId);
  if (!scene) {
    return null;
  }

  return {
    track,
    scene,
    localTimeMs: Math.max(0, timeMs - track.startMs + (track.startOffsetMs ?? 0))
  };
}
