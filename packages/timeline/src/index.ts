import type { ProjectDocument, Scene, TimelineTrack } from "@kwikk/shared-types";

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
  return tracks.reduce((maxDuration, track) => {
    return Math.max(maxDuration, track.startMs + track.durationMs);
  }, 0);
}

export function getActiveTrack(tracks: TimelineTrack[], timeMs: number): TimelineTrack | null {
  const activeTrack =
    [...tracks]
      .filter((track) => timeMs >= track.startMs && timeMs < track.startMs + track.durationMs)
      .sort((left, right) => right.layer - left.layer)[0] ?? null;

  if (activeTrack) {
    return activeTrack;
  }

  const timelineDurationMs = getTimelineDurationMs(tracks);
  if (timeMs !== timelineDurationMs || tracks.length === 0) {
    return null;
  }

  return [...tracks].sort((left, right) => {
    const leftEnd = left.startMs + left.durationMs;
    const rightEnd = right.startMs + right.durationMs;

    if (leftEnd !== rightEnd) {
      return rightEnd - leftEnd;
    }

    return right.layer - left.layer;
  })[0] ?? null;
}

export function getActiveSceneWindow(project: ProjectDocument, timeMs: number): ActiveSceneWindow | null {
  const track = getActiveTrack(project.timelineTracks, timeMs);
  if (!track) {
    return null;
  }

  const scene = project.scenes.find((candidate) => candidate.id === track.sceneId);
  if (!scene) {
    return null;
  }

  return {
    track,
    scene,
    localTimeMs: Math.max(0, timeMs - track.startMs)
  };
}
