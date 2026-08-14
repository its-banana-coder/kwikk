/**
 * The provider contract every TTS backend implements. `apps/api` only ever talks to this
 * interface (via getTtsProvider() in provider.ts) — never to a specific SDK/model directly.
 * See ../README.md for how to add a new provider (e.g. OpenAI, ElevenLabs).
 */
export interface TtsProvider {
  /** Short identifier, e.g. "tiny-tts" — matched against the TTS_PROVIDER env var. */
  readonly name: string;
  synthesize(text: string, options?: TtsSynthesisOptions): Promise<TtsSynthesisResult>;
}

export interface TtsSynthesisOptions {
  /** Provider-specific voice/speaker id. Meaning varies by provider — see each provider's docs. */
  speaker?: string;
  /** Playback speed multiplier: 1.0 = normal, >1 = faster, <1 = slower. Not all providers honor this. */
  speed?: number;
}

export interface TtsSynthesisResult {
  bytes: Buffer;
  /** e.g. "audio/wav", "audio/mpeg" */
  mimeType: string;
  durationMs: number;
}
