import { Hono } from "hono";
import { getTtsProvider, estimateSubtitleCues } from "@kwikk/tts-engine";
import { insertAssetFromBytes, requestBaseUrl } from "./assets.js";

const DEFAULT_USER_ID = 2;

export const ttsRoutes = new Hono();

// POST /v1/tts/narrate — synthesizes text via the configured TTS provider (see
// packages/tts-engine) and stores the result as a normal audio asset, same storage
// path as an upload or a Pixabay download (insertAssetFromBytes). The response is a
// regular asset row plus durationMs, so callers can feed { src: url, durationMs }
// straight into the add_audio_track EditorOperation.
//
// It also returns `subtitles`: cue-sized chunks of the input text with estimated
// startMs/endMs (audio-relative, 0-based) — no TTS provider here reports true
// word-level timing, so these are word-count-proportional estimates over the clip's
// real duration, not forced alignment. Callers place them via the existing
// `add_subtitle` operation (one call per cue), offsetting startMs/endMs by wherever
// the narration lands in the target scene's local timeline. Pass `subtitles: false`
// to skip the computation.
ttsRoutes.post("/narrate", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    text?: string;
    speaker?: string;
    speed?: number;
    name?: string;
    subtitles?: boolean;
    maxWordsPerCue?: number;
  } | null;

  const text = body?.text?.trim();
  if (!text) return c.json({ error: "text is required" }, 400);

  let result;
  try {
    result = await getTtsProvider().synthesize(text, { speaker: body?.speaker, speed: body?.speed });
  } catch (e) {
    return c.json({ error: `tts synthesis failed: ${(e as Error).message}` }, 502);
  }

  const ext = result.mimeType === "audio/wav" ? "wav" : result.mimeType === "audio/mpeg" ? "mp3" : "audio";
  const baseName = (body?.name?.trim() || "narration").replace(/[^a-z0-9-_]/gi, "_");

  const asset = await insertAssetFromBytes({
    name: `${baseName}.${ext}`,
    bytes: result.bytes,
    mime: result.mimeType,
    description: text.length > 280 ? `${text.slice(0, 277)}...` : text,
    tags: ["narration", "tts"],
    userId: DEFAULT_USER_ID,
    baseUrl: requestBaseUrl(c),
    assetType: "audio",
    source: "tts",
  });

  const subtitles = body?.subtitles === false
    ? []
    : estimateSubtitleCues(text, result.durationMs, { maxWordsPerCue: body?.maxWordsPerCue });

  return c.json({ ...asset, durationMs: result.durationMs, subtitles }, 201);
});
