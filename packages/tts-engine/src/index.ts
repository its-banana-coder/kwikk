export type { TtsProvider, TtsSynthesisOptions, TtsSynthesisResult } from "./types.js";
export { getTtsProvider } from "./provider.js";
export { TinyTtsProvider } from "./providers/tinyTts.js";
export { parseWavDurationMs } from "./wav.js";
export { estimateSubtitleCues } from "./subtitles.js";
export type { SubtitleCue } from "./subtitles.js";
