import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import TinyTTS from "tiny-tts";
import { parseWavDurationMs } from "../wav.js";
import type { TtsProvider, TtsSynthesisOptions, TtsSynthesisResult } from "../types.js";

export interface TinyTtsProviderOptions {
  /** Path to a local G.pth/onnx checkpoint. Omit to auto-download the default model from HuggingFace on first use. */
  modelPath?: string;
  device?: "cpu" | "gpu";
  /** Default speaker id if a request doesn't specify one. tiny-tts ships a single voice, "MALE", as of v5. */
  defaultSpeaker?: string;
}

/**
 * Wraps the `tiny-tts` npm package (local ONNX inference, no network calls per-request — only the
 * first synthesize() call may hit the network, to download the ~6MB model from HuggingFace if it
 * isn't cached yet). The underlying model is loaded once and kept warm across requests; call
 * dispose() on process shutdown if you need a clean unload, but it's not required for correctness.
 */
export class TinyTtsProvider implements TtsProvider {
  readonly name = "tiny-tts";

  private instance: TinyTTS | null = null;
  private initializing: Promise<TinyTTS> | null = null;

  constructor(private readonly options: TinyTtsProviderOptions = {}) {}

  private async getInstance(): Promise<TinyTTS> {
    if (this.instance) return this.instance;
    if (!this.initializing) {
      this.initializing = (async () => {
        const tts = new TinyTTS({ modelPath: this.options.modelPath, device: this.options.device ?? "cpu" });
        await tts.init();
        this.instance = tts;
        return tts;
      })();
    }
    return this.initializing;
  }

  async synthesize(text: string, options: TtsSynthesisOptions = {}): Promise<TtsSynthesisResult> {
    const tts = await this.getInstance();
    // tts.speak() always writes a .wav file to `output` (default "output.wav" in the *process's
    // cwd* if omitted — it does this unconditionally, even though the Buffer it resolves with is
    // already sufficient). Point it at a scratch temp path so it doesn't litter the server's cwd,
    // and clean that file up immediately — only the returned Buffer is actually used.
    const scratchPath = path.join(os.tmpdir(), `kwikk-tts-${randomUUID()}.wav`);
    // tts.speak() resolves a plain Uint8Array, not a Node Buffer — coerce explicitly, since
    // Buffer-only APIs (Buffer#toString(encoding, start, end), fs writes expecting Buffer) rely
    // on it being a real Buffer.
    let raw: Uint8Array;
    try {
      raw = await tts.speak(text, {
        output: scratchPath,
        speaker: options.speaker ?? this.options.defaultSpeaker ?? "MALE",
        speed: options.speed ?? 1.0,
      });
    } finally {
      await unlink(scratchPath).catch(() => {});
    }
    const bytes = Buffer.from(raw);
    return {
      bytes,
      mimeType: "audio/wav",
      durationMs: parseWavDurationMs(bytes),
    };
  }

  async dispose(): Promise<void> {
    await this.instance?.dispose();
    this.instance = null;
    this.initializing = null;
  }
}
