# @kwikk/tts-engine

Narration/text-to-speech for kwikk, behind a small provider interface so the backend is swappable
without touching `apps/api` or `apps/mcp`.

## Why this exists

kwikk projects can now include spoken narration. Rather than hard-wiring one TTS vendor into the
API server, this package defines a single contract (`TtsProvider`) and a factory
(`getTtsProvider()`) that resolves the active implementation from an environment variable. Every
caller — the API route, and transitively the MCP `generate_narration` tool — talks to that
interface only. Swapping vendors is a config change plus one new file, not a refactor.

Default provider: **[tiny-tts](https://github.com/tronghieuit/tiny-tts)**, a ~1.6M-parameter local
ONNX model. It runs fully on-CPU, in-process, with zero external API calls or per-request cost
(the only network access is a one-time ~6MB model download from HuggingFace on first use, cached
afterward). That makes it a reasonable zero-config default for self-hosted deployments, but it's
a single English voice with modest quality — production deployments that want more voices/languages
or higher fidelity will likely want to swap in a hosted provider (see below).

**Known quirk:** `tiny-tts`'s `speak()` always writes a `.wav` file to disk (default
`output.wav` in the process's cwd if no `output` path is given) in addition to resolving
with the audio bytes — even though the returned buffer alone is sufficient. `TinyTtsProvider`
points `output` at a scratch temp path and deletes it immediately after reading the buffer, so
this never surfaces to callers, but it's worth knowing if you're debugging disk I/O from this
provider. It also resolves a plain `Uint8Array`, not a Node `Buffer` — `TinyTtsProvider` coerces
this explicitly since `Buffer`-only APIs used downstream (`Buffer#toString(encoding, start, end)`
in the WAV duration parser) silently misbehave on a raw `Uint8Array`.

## The interface

```ts
// src/types.ts
export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, options?: TtsSynthesisOptions): Promise<TtsSynthesisResult>;
}

export interface TtsSynthesisOptions {
  speaker?: string;   // provider-specific voice id
  speed?: number;     // 1.0 = normal, >1 faster, <1 slower — best-effort, not all providers honor it
}

export interface TtsSynthesisResult {
  bytes: Buffer;
  mimeType: string;   // e.g. "audio/wav", "audio/mpeg"
  durationMs: number;
}
```

That's the entire contract. A provider takes text in, returns audio bytes + a duration out. No
provider is allowed to touch the database, the scene graph, or the `assets` table — persistence
happens one layer up, in `apps/api/src/routes/tts.ts`, which is provider-agnostic.

## How a request flows

```
MCP generate_narration tool
  → POST /v1/tts/narrate            (apps/api/src/routes/tts.ts)
      → getTtsProvider().synthesize(text, opts)   (this package)
      → insertAssetFromBytes(...)                  (apps/api/src/routes/assets.ts — same path as
                                                     any other uploaded/generated asset)
      → estimateSubtitleCues(text, durationMs)     (this package — see Subtitles below)
      ← { id, url, mimeType, durationMs, subtitles, ... }
  ← same JSON, so the caller can immediately do add_audio_track({ src: url, durationMs, ... })
```

Generated narration becomes a normal `assets` row (tagged `narration`/`tts`) served at a plain
`/uploads/...` URL — the scene graph's `AudioTrack.src` field doesn't know or care that the audio
came from TTS rather than an upload or a Pixabay download.

## Subtitles

kwikk's subtitle system is cue-based: `add_subtitle` (`packages/scene-graph/src/index.ts`) creates
one plain-text `ElementNode` (`semanticRole: "subtitle"`) per `{ sceneId, elementId, startMs, endMs,
text }` call — there's no batch operation and no per-word timing anywhere in the type system
(see `packages/shared-types`). There's also no ASR/forced-alignment anywhere in this codebase, and
no `TtsProvider` here reports word-level timestamps either — `tiny-tts`'s `speak()` (and the
`TtsProvider` interface it implements) return only a total clip `durationMs`.

Given that, `POST /v1/tts/narrate` estimates cues instead of aligning them: `estimateSubtitleCues()`
(`src/subtitles.ts`) splits the input text into sentences (`Intl.Segmenter`, falling back to a
punctuation regex), further breaks any sentence longer than `maxWordsPerCue` (default 10) into
smaller chunks, then distributes the clip's real `durationMs` across those chunks proportionally to
word count. It's a heuristic, not real forced alignment — accurate enough for steady narration
pacing, and it will drift on clips with long pauses or wildly uneven delivery speed. If a provider
is added later that *does* report per-word timestamps, prefer wiring those through directly instead
of this heuristic (extend `TtsSynthesisResult` with an optional `words` field rather than replacing
`estimateSubtitleCues` — keep the estimate as the fallback for providers that don't).

The response's `subtitles` array is `{ text, startMs, endMs }[]`, timed from the start of the audio
clip (0-based) — not scene-relative. To place them, call `add_subtitle` once per cue against
whichever scene the narration lands in, adding the offset where the narration begins in that
scene's local timeline to every cue's `startMs`/`endMs`. Pass `subtitles: false` in the request body
to skip the computation.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `TTS_PROVIDER` | `tiny-tts` | Selects the provider — matched in `getTtsProvider()`'s switch. |
| `TTS_MODEL_PATH` | *(unset → auto-download)* | tiny-tts only: path to a local `G.pth`/onnx checkpoint. |
| `TTS_DEVICE` | `cpu` | tiny-tts only: `cpu` or `gpu`. |
| `TTS_DEFAULT_SPEAKER` | `MALE` | tiny-tts only: fallback speaker id when a request doesn't specify one. |

Provider-specific env vars (like the `TTS_MODEL_PATH`/`TTS_DEVICE` pair above) are read inside that
provider's own file, not centrally — same pattern the rest of the API server already uses
(`PIXABAY_API_KEY` in `pixabay.ts`, `GEMINI_API_KEY` in `gemini-image.ts`, etc.). A new provider
should do the same: read its own env vars where it's constructed, not in `provider.ts`.

## Adding a new provider (e.g. OpenAI)

1. Create `src/providers/openai.ts` implementing `TtsProvider`:

   ```ts
   import type { TtsProvider, TtsSynthesisOptions, TtsSynthesisResult } from "../types.js";

   export class OpenAiTtsProvider implements TtsProvider {
     readonly name = "openai";

     constructor(private readonly apiKey: string, private readonly model = "gpt-4o-mini-tts") {}

     async synthesize(text: string, options: TtsSynthesisOptions = {}): Promise<TtsSynthesisResult> {
       const res = await fetch("https://api.openai.com/v1/audio/speech", {
         method: "POST",
         headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
         body: JSON.stringify({
           model: this.model,
           input: text,
           voice: options.speaker ?? "alloy",
           speed: options.speed ?? 1.0,
           response_format: "mp3",
         }),
       });
       if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status} ${await res.text()}`);
       const bytes = Buffer.from(await res.arrayBuffer());
       // mp3 duration isn't in the header the way WAV's is — either decode it, or have the
       // caller (apps/api/src/routes/tts.ts) accept an optional provider-reported durationMs
       // of 0/undefined and let the editor read real duration client-side on first load.
       return { bytes, mimeType: "audio/mpeg", durationMs: 0 };
     }
   }
   ```

2. Register it in `src/provider.ts`:

   ```ts
   case "openai":
     cached = new OpenAiTtsProvider(requireEnv("OPENAI_API_KEY"));
     return cached;
   ```

3. Set `TTS_PROVIDER=openai` and `OPENAI_API_KEY=...` in `apps/api`'s environment. Nothing else
   changes — the route, the MCP tool, and the scene graph are all already provider-agnostic.

## Node-only

Like `packages/font-manager`, this package pulls in Node-native dependencies (`tiny-tts` wraps
`onnxruntime-node`) and must only ever be imported by `apps/api`. Never import
`@kwikk/tts-engine` from `apps/editor`, `packages/render-core`, or any other browser-facing
package.
