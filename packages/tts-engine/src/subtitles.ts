export interface SubtitleCue {
  text: string;
  /** ms from the start of the audio clip (not scene- or timeline-relative — caller offsets it). */
  startMs: number;
  endMs: number;
}

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function splitSentences(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return Array.from(segmenter.segment(text), (s) => s.segment.trim()).filter(Boolean);
  }
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function chunkSentence(sentence: string, maxWords: number): string[] {
  const words = splitWords(sentence);
  if (words.length <= maxWords) return [sentence];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

/**
 * Splits narration text into caption-sized cues and distributes the audio's known duration
 * across them proportionally to word count. This is a heuristic, not real forced alignment —
 * tiny-tts (and TtsProvider generally) reports only a total clip duration, no per-word timing,
 * so cue boundaries are an estimate. It reads naturally for steady narration speech; it will
 * drift on clips with long pauses or heavily variable pacing.
 */
export function estimateSubtitleCues(
  text: string,
  durationMs: number,
  opts: { maxWordsPerCue?: number } = {}
): SubtitleCue[] {
  const maxWordsPerCue = opts.maxWordsPerCue ?? 10;
  const chunks = splitSentences(text).flatMap((s) => chunkSentence(s, maxWordsPerCue));
  if (chunks.length === 0) return [];

  const wordCounts = chunks.map((c) => splitWords(c).length || 1);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  const cues: SubtitleCue[] = [];
  let cursor = 0;
  chunks.forEach((chunk, i) => {
    const isLast = i === chunks.length - 1;
    const start = Math.round(cursor);
    const end = isLast ? durationMs : Math.round(cursor + (wordCounts[i] / totalWords) * durationMs);
    cues.push({ text: chunk, startMs: start, endMs: Math.max(end, start + 1) });
    cursor = end;
  });
  return cues;
}
