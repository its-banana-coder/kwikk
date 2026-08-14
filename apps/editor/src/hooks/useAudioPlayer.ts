import { useEffect, useRef } from "react";
import type { AudioTrack } from "@kwikk/shared-types";

interface AudioPlayerOptions {
  audioTracks: AudioTrack[];
  currentTimeMs: number;
  isPlaying: boolean;
}

/**
 * HTMLAudioElement lifecycle synced to timeline time. Does not mutate project state (CLAUDE.md).
 * Behaviour matches SPEC_AUDIO.md (including fade in/out); end-of-window uses `trimEndMs ?? durationMs`.
 */
export function useAudioPlayer({ audioTracks, currentTimeMs, isPlaying }: AudioPlayerOptions) {
  const elementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const elements = elementsRef.current;
    const currentIds = new Set(audioTracks.map((t) => t.id));

    for (const [id, el] of elements.entries()) {
      if (!currentIds.has(id)) {
        el.pause();
        elements.delete(id);
      }
    }

    for (const track of audioTracks) {
      if (!elements.has(track.id)) {
        const el = new Audio(track.src);
        el.preload = "auto";
        el.loop = track.loop;
        elements.set(track.id, el);
      }
    }
  }, [audioTracks]);

  useEffect(() => {
    for (const track of audioTracks) {
      const el = elementsRef.current.get(track.id);
      if (!el) continue;

      el.loop = track.loop;

      const localMs = currentTimeMs - track.startMs;
      const sourceEndMs = track.trimEndMs ?? track.durationMs;
      const effectiveDuration = sourceEndMs - track.trimStartMs;

      if (effectiveDuration <= 0) {
        el.pause();
        continue;
      }

      if (localMs < 0 || localMs + track.trimStartMs > sourceEndMs) {
        el.pause();
        continue;
      }

      let fadeFactor = 1;
      if (track.fadeInMs > 0 && localMs < track.fadeInMs) {
        fadeFactor = localMs / track.fadeInMs;
      }
      if (track.fadeOutMs > 0 && localMs > effectiveDuration - track.fadeOutMs) {
        fadeFactor = Math.min(fadeFactor, (effectiveDuration - localMs) / track.fadeOutMs);
      }
      el.volume = track.muted ? 0 : track.volume * Math.max(0, Math.min(1, fadeFactor));

      const targetSec = (track.trimStartMs + localMs) / 1000;
      const SEEK_TOLERANCE_S = 0.1;

      if (Math.abs(el.currentTime - targetSec) > SEEK_TOLERANCE_S) {
        el.currentTime = targetSec;
      }

      if (isPlaying) {
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
  }, [audioTracks, currentTimeMs, isPlaying]);

  useEffect(() => {
    return () => {
      for (const el of elementsRef.current.values()) {
        el.pause();
        el.src = "";
      }
      elementsRef.current.clear();
    };
  }, []);
}
