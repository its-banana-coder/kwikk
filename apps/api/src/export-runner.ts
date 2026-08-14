/**
 * Server-side export runner.
 *
 * Flow:
 *   1. Puppeteer loads the CSS renderer app at RENDERER_URL (default: http://localhost:5174)
 *   2. Injects the ProjectDocument via window.__kwikk.loadProject()
 *   3. Loops frame-by-frame: window.__kwikk.setTime(ms) → page.screenshot()
 *      This captures every CSS effect, @keyframes, filter, and HTML iframe at full fidelity.
 *   4. Downloads audio track files (if any)
 *   5. Runs FFmpeg: frames + audio → MP4
 *   6. Moves output to uploads/exports/ and returns the relative path
 *
 * Requires:
 *   - RENDERER_URL env var pointing to a running renderer app (default: http://localhost:5174)
 *   - ffmpeg on PATH
 *   - puppeteer package installed
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProjectDocument, AudioTrack } from "@kwikk/shared-types";
import { getTimelineDurationMs } from "@kwikk/timeline";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, "..");
const EXPORTS_DIR = path.join(API_ROOT, "uploads", "exports");

export type ExportPreset = "720p" | "1080p" | "4k" | "match";

export interface RunExportOptions {
  fps?: number;
  preset?: ExportPreset;
}

export interface ExportRunnerResult {
  outputPath: string; // absolute path to the MP4
  relativePath: string; // relative to uploads/ — served as /uploads/...
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rimraf(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function resolveOutputSize(preset: ExportPreset, vpWidth: number, vpHeight: number): { width: number; height: number } {
  if (preset === "match") return { width: vpWidth, height: vpHeight };
  const targetH = preset === "4k" ? 2160 : preset === "1080p" ? 1080 : 720;
  const scale = targetH / vpHeight;
  return {
    width: Math.round((vpWidth * scale) / 2) * 2,
    height: Math.round((vpHeight * scale) / 2) * 2,
  };
}

// ─── FFmpeg ───────────────────────────────────────────────────────────────────

async function runFFmpeg(args: string[]): Promise<void> {
  try {
    await execFileAsync("ffmpeg", args, { maxBuffer: 200 * 1024 * 1024 });
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    throw new Error(`FFmpeg failed: ${err.stderr ?? err.message ?? String(e)}`);
  }
}

async function assembleVideo(
  framesDir: string,
  fps: number,
  width: number,
  height: number,
  audioFiles: { path: string; track: AudioTrack }[],
  outputMp4: string,
): Promise<void> {
  const args: string[] = ["-y"];

  // Video input
  args.push("-framerate", String(fps), "-i", path.join(framesDir, "frame_%06d.jpg"));

  // Audio inputs
  const activeAudio = audioFiles.filter((a) => fs.existsSync(a.path));
  for (const { path: audioPath, track } of activeAudio) {
    // Seek to trim start within the source file
    if (track.trimStartMs && track.trimStartMs > 0) {
      args.push("-ss", String(track.trimStartMs / 1000));
    }
    if (track.trimEndMs != null) {
      args.push("-t", String((track.trimEndMs - (track.trimStartMs ?? 0)) / 1000));
    }
    args.push("-i", audioPath);
  }

  if (activeAudio.length === 0) {
    // Video only
    args.push(
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-vf", `scale=${width}:${height}`,
      outputMp4,
    );
  } else {
    // Build audio filter graph: delay + volume + fade per track, then mix
    const filterParts: string[] = [];
    const mixInputs: string[] = [];

    activeAudio.forEach(({ track }, i) => {
      const inputIdx = i + 1; // 0 is the video
      const label = `a${i}`;

      let filter = `[${inputIdx}:a]`;

      if (track.volume !== 1) filter += `volume=${track.volume},`;

      // Delay to place track at startMs in the project timeline
      if (track.startMs > 0) {
        const delayMs = Math.round(track.startMs);
        filter += `adelay=${delayMs}|${delayMs},`;
      }

      if (track.fadeInMs > 0) filter += `afade=t=in:st=${track.startMs / 1000}:d=${track.fadeInMs / 1000},`;

      // Strip trailing comma
      filter = filter.replace(/,$/, "");
      filter += `[${label}]`;
      filterParts.push(filter);
      mixInputs.push(`[${label}]`);
    });

    // duration=longest (not "first") — the mix must never be truncated to the
    // first track's length. Video frame count is already the authoritative
    // length (computed from the full scene timeline); -shortest is deliberately
    // omitted so a short/missing audio tail can never clip the captured video.
    const mixFilter = `${mixInputs.join("")}amix=inputs=${activeAudio.length}:duration=longest:normalize=0[aout]`;
    filterParts.push(mixFilter);

    args.push(
      "-filter_complex", filterParts.join(";"),
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-c:a", "aac",
      "-b:a", "128k",
      "-pix_fmt", "yuv420p",
      "-vf", `scale=${width}:${height}`,
      outputMp4,
    );
  }

  await runFFmpeg(args);
}

// ─── Puppeteer frame capture ──────────────────────────────────────────────────

type PuppeteerModule = {
  launch: (opts: Record<string, unknown>) => Promise<{
    newPage: () => Promise<{
      setViewport: (v: { width: number; height: number }) => Promise<void>;
      goto: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
      waitForFunction: (fn: () => unknown, opts?: Record<string, unknown>) => Promise<void>;
      evaluate: <T>(fn: (...args: unknown[]) => T, ...args: unknown[]) => Promise<T>;
      screenshot: (opts?: Record<string, unknown>) => Promise<Buffer>;
    }>;
    close: () => Promise<void>;
  }>;
};

async function captureFrames(
  project: ProjectDocument,
  fps: number,
  tmpDir: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  let puppeteer: PuppeteerModule;
  try {
    // @ts-ignore — dynamic import for optional dep
    puppeteer = (await import("puppeteer")) as unknown as PuppeteerModule;
  } catch {
    throw new Error("puppeteer is not installed. Run: pnpm add puppeteer --filter @kwikk/api");
  }

  const rendererUrl = process.env.RENDERER_URL ?? "http://localhost:5174";
  const vp = project.viewport ?? { width: 1080, height: 1920 };

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(rendererUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    // Wait for the CSS renderer app to expose window.__kwikk
    await page.waitForFunction(
      () => typeof (window as any).__kwikk !== "undefined",
      { timeout: 15_000 }
    );

    // Inject the project — CSS renderer mounts and paints frame 0
    await (page.evaluate as any)((p: unknown) => (window as any).__kwikk.loadProject(p), project);

    // Wait until CSSSceneRenderer has painted at least one frame
    await page.waitForFunction(
      () => (window as any).__kwikk?.isReady === true,
      { timeout: 20_000 }
    );

    // Calculate how many frames to capture
    const durationMs = getTimelineDurationMs(project.timelineTracks ?? []);
    const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps));

    console.log(`[export] capturing ${totalFrames} frames at ${fps}fps (${durationMs}ms)`);

    for (let i = 0; i < totalFrames; i++) {
      const timeMs = (i / fps) * 1000;

      // Seek CSS renderer to this frame
      await (page.evaluate as any)((t: number) => (window as any).__kwikk.setTime(t), timeMs);

      // One rAF tick to let CSS transitions settle before screenshot
      await (page.evaluate as any)(() => new Promise((r) => requestAnimationFrame(r)));

      const buf = await page.screenshot({ type: "jpeg", quality: 85 }) as Buffer;
      fs.writeFileSync(path.join(tmpDir, `frame_${String(i).padStart(6, "0")}.jpg`), buf);

      if (i % 15 === 0) onProgress(Math.round((i / totalFrames) * 60)); // 0–60% for frames
    }

    onProgress(60);
  } finally {
    await browser.close();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Inline export — accepts a full ProjectDocument directly without a DB job record.
 * Used by the /v1/render/export SSE route so the ExportModal doesn't need a saved project.
 */
export async function runInlineExport(
  project: ProjectDocument,
  options: RunExportOptions = {},
  onProgress: (pct: number) => void = () => {},
): Promise<ExportRunnerResult> {
  const jobId = Date.now();
  return runExportJob(jobId, project, options, onProgress);
}

export async function runExportJob(
  jobId: number,
  project: ProjectDocument,
  options: RunExportOptions = {},
  onProgress: (pct: number) => void = () => {},
): Promise<ExportRunnerResult> {
  const fps = options.fps ?? 30;
  const preset = options.preset ?? "1080p";
  const vp = project.viewport ?? { width: 1080, height: 1920 };
  const { width, height } = resolveOutputSize(preset, vp.width, vp.height);

  const tmpDir = path.join("/tmp", `kwikk-export-${jobId}-${Date.now()}`);
  ensureDir(tmpDir);
  ensureDir(EXPORTS_DIR);

  try {
    // ── 1. Render frames via Puppeteer ──────────────────────────────────────
    onProgress(0);
    await captureFrames(project, fps, tmpDir, onProgress);

    // ── 2. Download audio files ─────────────────────────────────────────────
    onProgress(62);
    const audioFiles: { path: string; track: AudioTrack }[] = [];
    for (const track of project.audioTracks ?? []) {
      if (track.muted || !track.src) continue;
      const ext = track.src.split("?")[0].split(".").pop() ?? "mp3";
      const audioPath = path.join(tmpDir, `audio_${track.id}.${ext}`);
      const ok = await downloadFile(track.src, audioPath);
      if (ok) audioFiles.push({ path: audioPath, track });
    }

    // ── 3. FFmpeg assemble ──────────────────────────────────────────────────
    onProgress(70);
    const outputFilename = `export_${jobId}.mp4`;
    const outputPath = path.join(EXPORTS_DIR, outputFilename);

    await assembleVideo(tmpDir, fps, width, height, audioFiles, outputPath);

    onProgress(100);

    return {
      outputPath,
      relativePath: `exports/${outputFilename}`,
    };
  } finally {
    rimraf(tmpDir);
  }
}
