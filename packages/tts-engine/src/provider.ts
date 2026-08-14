import type { TtsProvider } from "./types.js";
import { TinyTtsProvider } from "./providers/tinyTts.js";

let cached: TtsProvider | null = null;

/**
 * Resolves the active TTS backend from TTS_PROVIDER (default "tiny-tts"). This is the single
 * switch point for swapping providers — apps/api's tts route only ever calls getTtsProvider(),
 * never a provider class directly. To add a new backend (OpenAI, ElevenLabs, ...), implement
 * TtsProvider and add a case below. See ../README.md for a full walkthrough.
 */
export function getTtsProvider(): TtsProvider {
  if (cached) return cached;

  const name = (process.env.TTS_PROVIDER ?? "tiny-tts").toLowerCase();

  switch (name) {
    case "tiny-tts":
      cached = new TinyTtsProvider({
        modelPath: process.env.TTS_MODEL_PATH,
        device: process.env.TTS_DEVICE === "gpu" ? "gpu" : "cpu",
        defaultSpeaker: process.env.TTS_DEFAULT_SPEAKER,
      });
      return cached;
    default:
      throw new Error(
        `Unknown TTS_PROVIDER "${name}". Implement TtsProvider (see packages/tts-engine/src/types.ts) ` +
          `and register it in the switch in packages/tts-engine/src/provider.ts — see README.md.`
      );
  }
}

/** Test-only escape hatch to reset the cached singleton between test cases. */
export function _resetTtsProviderForTests(): void {
  cached = null;
}
