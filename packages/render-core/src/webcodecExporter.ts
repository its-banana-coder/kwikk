import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { getTimelineDurationMs } from "@kwikk/timeline";
import type { ProjectDocument, AudioTrack } from "@kwikk/shared-types";

declare const AudioEncoder: any;
declare const AudioData: any;

export type ExportFormat = "mp4";
export type ExportPreset = "720p" | "1080p" | "4k" | "match";

/**
 * Minimal interface for what the exporter needs from a renderer.
 * PixiSceneRenderer satisfies this — typed this way to avoid a circular import
 * (index.ts re-exports webcodecExporter, so importing PixiSceneRenderer from
 * index.ts would create a cycle).
 */
export interface ExportRenderer {
  setProject(project: ProjectDocument): void;
  captureFrame(
    timeMs: number,
    mimeType?: "image/png" | "image/jpeg" | "image/webp",
    quality?: number
  ): Promise<Blob>;
  destroy(): void;
}

export interface ExportOptions {
  format?: ExportFormat;
  frameRate?: 24 | 30 | 60;
  preset?: ExportPreset;
  /** 1 (lowest) – 10 (highest), mapped to bitrate */
  quality?: number;
  onProgress?: (progress: number) => void;
  /**
   * Factory that mounts a fresh renderer at the given pixel dimensions.
   * When provided, the exporter renders at native export resolution instead
   * of capturing from the small editor preview canvas.
   * The exporter calls destroy() on it when done.
   */
  mountExportRenderer?: (
    container: HTMLElement,
    width: number,
    height: number
  ) => Promise<ExportRenderer>;
}

export interface ExportResult {
  blob: Blob;
  durationMs: number;
  totalFrames: number;
  frameRate: number;
}

const QUALITY_TO_BITRATE: Record<number, number> = {
  1: 1_000_000,
  2: 2_000_000,
  3: 3_000_000,
  4: 4_500_000,
  5: 6_000_000,
  6: 8_000_000,
  7: 10_000_000,
  8: 14_000_000,
  9: 18_000_000,
  10: 25_000_000,
};

function clampQuality(q: number): number {
  return Math.max(1, Math.min(10, Math.round(q)));
}

function resolveOutputSize(
  preset: ExportPreset,
  vpWidth: number,
  vpHeight: number
): { width: number; height: number } {
  if (preset === "match") return { width: vpWidth, height: vpHeight };
  const targetH = preset === "4k" ? 2160 : preset === "1080p" ? 1080 : 720;
  const scale = targetH / vpHeight;
  return {
    width: Math.round((vpWidth * scale) / 2) * 2,
    height: Math.round((vpHeight * scale) / 2) * 2,
  };
}

async function withOffscreenRenderer<T>(
  width: number,
  height: number,
  mountExportRenderer: NonNullable<ExportOptions["mountExportRenderer"]>,
  project: ProjectDocument,
  fn: (renderer: ExportRenderer) => Promise<T>
): Promise<T> {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-${width * 2}px;top:0;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;`;
  document.body.appendChild(container);
  const renderer = await mountExportRenderer(container, width, height);
  renderer.setProject(project);
  try {
    return await fn(renderer);
  } finally {
    renderer.destroy();
    document.body.removeChild(container);
  }
}

// ─── Audio mixing helpers ─────────────────────────────────────────────────────

const AUDIO_SAMPLE_RATE = 44100;
const AUDIO_CHANNELS = 2;
const AUDIO_CHUNK_FRAMES = 1024; // AAC frame size

function activeTracks(project: ProjectDocument): AudioTrack[] {
  return (project.audioTracks ?? []).filter((t) => !t.muted && t.src);
}

async function mixAudioTracks(
  tracks: AudioTrack[],
  durationMs: number,
): Promise<AudioBuffer | null> {
  if (tracks.length === 0) return null;
  const totalSamples = Math.ceil((durationMs / 1000) * AUDIO_SAMPLE_RATE);
  const ctx = new OfflineAudioContext(AUDIO_CHANNELS, totalSamples, AUDIO_SAMPLE_RATE);

  await Promise.all(
    tracks.map(async (track) => {
      let arrayBuffer: ArrayBuffer;
      try {
        const res = await fetch(track.src);
        arrayBuffer = await res.arrayBuffer();
      } catch {
        return; // skip unavailable tracks
      }

      let decoded: AudioBuffer;
      try {
        decoded = await ctx.decodeAudioData(arrayBuffer);
      } catch {
        return;
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(track.volume, 0);

      const startSec = track.startMs / 1000;
      const trimStart = (track.trimStartMs ?? 0) / 1000;
      const srcDuration = track.trimEndMs != null
        ? (track.trimEndMs - (track.trimStartMs ?? 0)) / 1000
        : decoded.duration - trimStart;

      if (track.fadeInMs > 0) {
        gain.gain.setValueAtTime(0, startSec);
        gain.gain.linearRampToValueAtTime(track.volume, startSec + track.fadeInMs / 1000);
      }
      if (track.fadeOutMs > 0) {
        const fadeOutStart = Math.max(0, durationMs / 1000 - track.fadeOutMs / 1000);
        gain.gain.setValueAtTime(track.volume, fadeOutStart);
        gain.gain.linearRampToValueAtTime(0, durationMs / 1000);
      }

      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.loop = track.loop;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(startSec, trimStart, track.loop ? undefined : srcDuration);
    }),
  );

  return ctx.startRendering();
}

async function encodeAudioTrack(
  mixed: AudioBuffer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  muxer: Muxer<any>,
): Promise<void> {
  if (typeof AudioEncoder === "undefined") return;

  const left = mixed.getChannelData(0);
  const right = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : left;
  const totalSamples = mixed.length;

  let audioEncoderError: Error | null = null;
  const audioEncoder = new AudioEncoder({
    output: (chunk: any, meta?: any) => muxer.addAudioChunk(chunk, meta ?? undefined),
    error: (e: any) => { audioEncoderError = e; },
  });

  audioEncoder.configure({
    codec: "mp4a.40.2",
    sampleRate: AUDIO_SAMPLE_RATE,
    numberOfChannels: AUDIO_CHANNELS,
    bitrate: 128_000,
  });

  for (let offset = 0; offset < totalSamples; offset += AUDIO_CHUNK_FRAMES) {
    if (audioEncoderError) throw audioEncoderError;
    const frameCount = Math.min(AUDIO_CHUNK_FRAMES, totalSamples - offset);
    const timestamp = Math.round((offset / AUDIO_SAMPLE_RATE) * 1_000_000);

    const planeBytes = frameCount * Float32Array.BYTES_PER_ELEMENT;
    const buf = new ArrayBuffer(planeBytes * AUDIO_CHANNELS);
    new Float32Array(buf, 0, frameCount).set(left.subarray(offset, offset + frameCount));
    new Float32Array(buf, planeBytes, frameCount).set(right.subarray(offset, offset + frameCount));

    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate: AUDIO_SAMPLE_RATE,
      numberOfFrames: frameCount,
      numberOfChannels: AUDIO_CHANNELS,
      timestamp,
      data: buf,
    });
    audioEncoder.encode(audioData);
    audioData.close();
  }

  await audioEncoder.flush();
  audioEncoder.close();
}

// ─── MP4 export ───────────────────────────────────────────────────────────────

/**
 * Encodes a full project to MP4 in the browser using WebCodecs + mp4-muxer.
 * No server round-trip. No WASM. Chrome 94+ (WebCodecs required).
 * Includes audio tracks when present and AudioEncoder is available.
 *
 * Pass `mountExportRenderer` to render at true export resolution.
 * Without it the exporter captures from whatever renderer is passed — which
 * is typically the small editor preview, producing upscaled/blurry output.
 */
export async function exportToMp4(
  project: ProjectDocument,
  options: ExportOptions = {}
): Promise<ExportResult> {
  if (typeof VideoEncoder === "undefined") {
    throw new Error(
      "WebCodecs VideoEncoder is not available in this browser. Use Chrome 94+ or Edge 94+."
    );
  }

  const {
    frameRate = 30,
    preset = "1080p",
    quality = 7,
    onProgress,
    mountExportRenderer,
  } = options;

  const durationMs = getTimelineDurationMs(project.timelineTracks);
  const frameDurationMs = 1000 / frameRate;
  const totalFrames = Math.ceil(durationMs / frameDurationMs);

  const vp = project.viewport ?? { width: 1080, height: 1920 };
  const { width, height } = resolveOutputSize(preset, vp.width, vp.height);
  const bitrate = QUALITY_TO_BITRATE[clampQuality(quality)];

  const tracks = activeTracks(project);
  const hasAudio = tracks.length > 0 && typeof AudioEncoder !== "undefined";

  const encode = async (renderer: ExportRenderer) => {
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width, height, frameRate },
      ...(hasAudio ? { audio: { codec: "aac", sampleRate: AUDIO_SAMPLE_RATE, numberOfChannels: AUDIO_CHANNELS } } : {}),
      fastStart: "in-memory",
    });

    let encoderError: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
      error: (e) => { encoderError = e; },
    });

    encoder.configure({
      codec: "avc1.64001f",
      width,
      height,
      bitrate,
      framerate: frameRate,
      latencyMode: "quality",
    });

    for (let i = 0; i < totalFrames; i++) {
      if (encoderError) throw encoderError;

      const timeMs = Math.min(i * frameDurationMs, durationMs);
      const blob = await renderer.captureFrame(timeMs, "image/png");
      const bitmap = await createImageBitmap(blob);

      const videoFrame = new VideoFrame(bitmap, {
        timestamp: Math.round(timeMs * 1000),
        duration: Math.round(frameDurationMs * 1000),
      });
      bitmap.close();

      encoder.encode(videoFrame, { keyFrame: i % (frameRate * 2) === 0 });
      videoFrame.close();

      onProgress?.((i + 1) / totalFrames);
      if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
    }

    await encoder.flush();
    encoder.close();

    if (hasAudio) {
      const mixed = await mixAudioTracks(tracks, durationMs);
      if (mixed) await encodeAudioTrack(mixed, muxer);
    }

    muxer.finalize();

    return new Blob([target.buffer], { type: "video/mp4" });
  };

  let blob: Blob;
  if (mountExportRenderer) {
    blob = await withOffscreenRenderer(width, height, mountExportRenderer, project, encode);
  } else {
    throw new Error(
      "mountExportRenderer is required — pass a factory that mounts a PixiSceneRenderer at the export size."
    );
  }

  return { blob, durationMs, totalFrames, frameRate };
}

/**
 * Exports all frames as individual PNGs in a .tar archive.
 * Fallback for browsers without WebCodecs.
 */
export async function exportFramesAsZip(
  project: ProjectDocument,
  options: Pick<ExportOptions, "frameRate" | "onProgress" | "preset" | "mountExportRenderer"> = {}
): Promise<{ blob: Blob; totalFrames: number }> {
  const { frameRate = 30, onProgress, mountExportRenderer, preset = "1080p" } = options;

  if (!mountExportRenderer) {
    throw new Error("mountExportRenderer is required.");
  }

  const durationMs = getTimelineDurationMs(project.timelineTracks);
  const frameDurationMs = 1000 / frameRate;
  const totalFrames = Math.ceil(durationMs / frameDurationMs);
  const vp = project.viewport ?? { width: 1080, height: 1920 };
  const { width, height } = resolveOutputSize(preset, vp.width, vp.height);

  const parts: Uint8Array[] = [];

  function writeTarEntry(name: string, data: Uint8Array): void {
    const header = new Uint8Array(512);
    const enc = new TextEncoder();
    enc.encodeInto(name, header);
    enc.encodeInto("0000644\0", header.subarray(100));
    enc.encodeInto("0000000\0", header.subarray(108));
    enc.encodeInto("0000000\0", header.subarray(116));
    enc.encodeInto(data.byteLength.toString(8).padStart(11, "0") + "\0", header.subarray(124));
    enc.encodeInto("00000000000\0", header.subarray(136));
    header[156] = 48;
    enc.encodeInto("ustar  \0", header.subarray(257));
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
    enc.encodeInto(checksum.toString(8).padStart(6, "0") + "\0 ", header.subarray(148));
    parts.push(header, data);
    const pad = 512 - (data.byteLength % 512);
    if (pad < 512) parts.push(new Uint8Array(pad));
  }

  await withOffscreenRenderer(width, height, mountExportRenderer, project, async (renderer) => {
    for (let i = 0; i < totalFrames; i++) {
      const timeMs = Math.min(i * frameDurationMs, durationMs);
      const blob = await renderer.captureFrame(timeMs, "image/png");
      writeTarEntry(`frame_${String(i).padStart(4, "0")}.png`, new Uint8Array(await blob.arrayBuffer()));
      onProgress?.((i + 1) / totalFrames);
      if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
    }
  });

  parts.push(new Uint8Array(1024));

  const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.byteLength; }

  return { blob: new Blob([result], { type: "application/x-tar" }), totalFrames };
}
