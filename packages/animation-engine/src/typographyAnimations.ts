import type { Animation, ElementNode } from "@kwikk/shared-types";
import { applyEasing, clampProgress } from "./index";

export interface CharState {
  opacity: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  /** Substitute character to render instead of the actual character (used by scramble). */
  charOverride?: string;
  /** Override the character's color (used by char_rainbow, karaoke). */
  colorOverride?: string;
  /** Per-character blur radius in pixels (used by char_blur_in). */
  blur?: number;
}

const CHAR_ANIMATION_TYPES = new Set([
  "typewriter",
  "typewriter_word",
  "typewriter_delete",
  "word_slide_up",
  "word_fade_in",
  "word_pop_reveal",
  "caption_drop",
  "word_zoom_blur",
  "char_scale_in",
  "wave_text",
  "ascend",
  "burst",
  "bounce_letters",
  "letter_drop",
  "letter_spin",
  "explode_in",
  "scramble",
  "stamp_in",
  "char_rainbow",
  "char_wave_scale",
  "char_blur_in",
  "karaoke",
  "slot_machine",
]);

export function isCharLevelAnimation(type: string): boolean {
  return CHAR_ANIMATION_TYPES.has(type);
}

export function hasCharLevelAnimations(element: ElementNode): boolean {
  return element.animations.some((a) => isCharLevelAnimation(a.type));
}

function getFullText(element: ElementNode): string {
  if (element.content?.richText && element.content.richText.length > 0) {
    return element.content.richText.map((s) => s.text).join("");
  }
  return element.content?.text ?? "";
}

// Returns one CharState per character in the element's visible text.
// Returns null if no char-level animations are active (caller falls back to
// standard text rendering).
export function resolveCharAnimations(
  element: ElementNode,
  timeMs: number,
  showAllElements?: boolean,
): CharState[] | null {
  const charAnims = element.animations.filter((a) => isCharLevelAnimation(a.type));
  if (charAnims.length === 0) return null;

  const text = getFullText(element);
  if (!text) return null;

  const chars = [...text]; // Unicode-safe
  const elementStartMs = element.startMs ?? 0;

  // In "show all" mode (editor still preview), skip animation math — show everything at rest.
  if (showAllElements) {
    return chars.map(() => ({ opacity: 1, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 }));
  }

  // Start with all chars at their rest state.
  const states: CharState[] = chars.map(() => ({
    opacity: 1,
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  }));

  for (const anim of charAnims) {
    const animStart = elementStartMs + anim.startMs;
    const animEnd = animStart + anim.durationMs;

    switch (anim.type) {
      case "typewriter":
        applyTypewriter(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "word_slide_up":
        applyWordSlide(states, text, anim, animStart, timeMs, "up");
        break;
      case "word_fade_in":
        applyWordFade(states, text, anim, animStart, timeMs);
        break;
      case "char_scale_in":
        applyCharScaleIn(states, chars.length, anim, animStart, timeMs);
        break;
      case "wave_text":
        applyWaveText(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "typewriter_word":
        applyTypewriterWord(states, text, anim, animStart, animEnd, timeMs);
        break;
      case "ascend":
        applyAscend(states, text, anim, animStart, timeMs);
        break;
      case "burst":
        applyBurst(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "bounce_letters":
        applyBounceLetters(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "letter_drop":
        applyLetterDrop(states, chars.length, anim, animStart, timeMs);
        break;
      case "letter_spin":
        applyLetterSpin(states, chars.length, anim, animStart, timeMs);
        break;
      case "explode_in":
        applyExplodeIn(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "scramble":
        applyScramble(states, chars, anim, animStart, animEnd, timeMs);
        break;
      case "stamp_in":
        applyStampIn(states, text, anim, animStart, timeMs);
        break;
      case "typewriter_delete":
        applyTypewriterDelete(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "word_pop_reveal":
        applyWordPopReveal(states, text, anim, animStart, timeMs);
        break;
      case "caption_drop":
        applyCaptionDrop(states, text, anim, animStart, timeMs);
        break;
      case "word_zoom_blur":
        applyWordZoomBlur(states, text, anim, animStart, timeMs);
        break;
      case "char_rainbow":
        applyCharRainbow(states, chars.length, anim, animStart, timeMs);
        break;
      case "char_wave_scale":
        applyCharWaveScale(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "char_blur_in":
        applyCharBlurIn(states, chars.length, anim, animStart, timeMs);
        break;
      case "karaoke":
        applyKaraoke(states, chars.length, anim, animStart, animEnd, timeMs);
        break;
      case "slot_machine":
        applySlotMachine(states, chars, anim, animStart, animEnd, timeMs);
        break;
    }
  }

  return states;
}

// ─── Per-animation resolvers ──────────────────────────────────────────────────

function applyTypewriter(
  states: CharState[],
  charCount: number,
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) {
    for (const s of states) s.opacity = 0;
    return;
  }
  if (timeMs >= endMs) return; // all visible

  const progress = clampProgress((timeMs - startMs) / (endMs - startMs));
  const revealedCount = Math.floor(progress * charCount);

  for (let i = 0; i < states.length; i++) {
    if (i >= revealedCount) states[i].opacity = 0;
  }
}

function applyWordSlide(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number,
  direction: "up" | "down"
): void {
  const words = tokenizeByWord(text);
  const staggerMs = Math.min(120, anim.durationMs * 0.15);
  const wordDuration = anim.durationMs * 0.55;

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const t = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));
    const eased = applyEasing(t, anim.easing ?? "easeOut");
    const slideAmt = direction === "up" ? (1 - eased) * 50 : (1 - eased) * -50;

    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) {
        states[charIdx].opacity *= eased;
        states[charIdx].offsetY += slideAmt;
      }
      charIdx++;
    }
  }
}

function applyWordFade(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const words = tokenizeByWord(text);
  const staggerMs = Math.min(100, anim.durationMs * 0.12);
  const wordDuration = anim.durationMs * 0.5;

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const t = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));
    const opacity = applyEasing(t, anim.easing ?? "easeOut");

    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) states[charIdx].opacity *= opacity;
      charIdx++;
    }
  }
}

function applyCharScaleIn(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const staggerMs = Math.min(60, anim.durationMs * 0.08);
  const charDuration = anim.durationMs * 0.45;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const charStart = startMs + i * staggerMs;
    const charEnd = charStart + charDuration;
    const t = clampProgress((timeMs - charStart) / Math.max(1, charEnd - charStart));
    const sc = applyEasing(t, anim.easing ?? "easeOut");
    states[i].scaleX *= sc;
    states[i].scaleY *= sc;
    states[i].opacity *= sc;
  }
}

function applyWaveText(
  states: CharState[],
  charCount: number,
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs < startMs) return;
  const elapsed = timeMs - startMs;
  const duration = Math.max(1, endMs - startMs);
  const cycles = 2.5;
  const amplitude = 18;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const phase = (i / Math.max(1, charCount - 1)) * Math.PI * 2 * cycles;
    const time = (elapsed / duration) * Math.PI * 2 * cycles;
    states[i].offsetY += Math.sin(time + phase) * amplitude;
  }
}

function applyTypewriterWord(
  states: CharState[],
  text: string,
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) { for (const s of states) s.opacity = 0; return; }
  if (timeMs >= endMs) return;

  const words = tokenizeByWord(text);
  const progress = clampProgress((timeMs - startMs) / (endMs - startMs));
  const revealedWords = Math.floor(progress * words.length);

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length && wi >= revealedWords) {
        states[charIdx].opacity = 0;
      }
      charIdx++;
    }
  }
}

function applyAscend(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const words = tokenizeByWord(text);
  const staggerMs = Math.min(80, anim.durationMs * 0.1);
  const wordDuration = anim.durationMs * 0.5;

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const t = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));
    const eased = applyEasing(t, anim.easing ?? "easeOut");

    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) {
        states[charIdx].opacity *= eased;
        // ascend from 80px below
        states[charIdx].offsetY += (1 - eased) * 80;
      }
      charIdx++;
    }
  }
}

function applyBurst(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) { for (const s of states) { s.opacity = 0; } return; }
  if (timeMs >= endMs) return;

  const rawP = clampProgress((timeMs - startMs) / (endMs - startMs));
  const center = (charCount - 1) / 2;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const eased = applyEasing(rawP, anim.easing ?? "easeOut");
    states[i].opacity *= eased;
    // burst from center: chars spread out then contract to rest
    const dist = (i - center) * 30 * (1 - eased);
    states[i].offsetX += dist;
    states[i].offsetY += Math.abs(i - center) * 20 * (1 - eased) * -1;
    states[i].scaleX *= 0.3 + 0.7 * eased;
    states[i].scaleY *= 0.3 + 0.7 * eased;
  }
}

function applyBounceLetters(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  _endMs: number,
  timeMs: number
): void {
  const staggerMs = Math.min(50, anim.durationMs * 0.06);
  const charDuration = anim.durationMs * 0.4;
  const amplitude = anim.amplitude ?? 0.4;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const charStart = startMs + i * staggerMs;
    const charEnd = charStart + charDuration;
    const rawP = clampProgress((timeMs - charStart) / Math.max(1, charEnd - charStart));
    // scale: from (1-amplitude) → overshoot back to 1 using bounceOut easing
    const sc = applyEasing(rawP, "bounceOut") * amplitude + (1 - amplitude);
    const maxScale = 1 + amplitude;
    const bounced = rawP < 0.4
      ? rawP / 0.4 * maxScale
      : maxScale - (rawP - 0.4) / 0.6 * amplitude;
    states[i].scaleX *= bounced;
    states[i].scaleY *= bounced;
    states[i].offsetY += (1 - applyEasing(rawP, "easeOut")) * -30;
    if (timeMs < charStart) { states[i].opacity = 0; }
    else { states[i].opacity *= Math.min(1, rawP * 4); }
    void sc;
  }
}

// Split text into same-length word tokens preserving spaces as their own tokens,
// so charIdx stays aligned with the flat character array.
function tokenizeByWord(text: string): string[] {
  return text.match(/(\s+|\S+)/g) ?? [];
}

// ── New char animations ───────────────────────────────────────────────────────

function applyLetterDrop(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const staggerMs = Math.min(50, anim.durationMs * 0.07);
  const charDuration = anim.durationMs * 0.45;
  const dropDist = 70;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const charStart = startMs + i * staggerMs;
    const charEnd = charStart + charDuration;
    const rawP = clampProgress((timeMs - charStart) / Math.max(1, charEnd - charStart));
    const eased = applyEasing(rawP, "bounceOut");
    states[i].offsetY += (1 - eased) * -dropDist;
    states[i].opacity *= rawP < 0.05 ? rawP / 0.05 : 1;
    if (timeMs < charStart) states[i].opacity = 0;
  }
}

function applyLetterSpin(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const staggerMs = Math.min(55, anim.durationMs * 0.07);
  const charDuration = anim.durationMs * 0.5;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const charStart = startMs + i * staggerMs;
    const charEnd = charStart + charDuration;
    const rawP = clampProgress((timeMs - charStart) / Math.max(1, charEnd - charStart));
    const eased = applyEasing(rawP, anim.easing ?? "easeOut");
    states[i].rotation += (1 - eased) * -180;
    states[i].opacity *= eased;
    if (timeMs < charStart) states[i].opacity = 0;
  }
}

function applyExplodeIn(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) { for (const s of states) s.opacity = 0; return; }
  if (timeMs >= endMs) return;

  const rawP = clampProgress((timeMs - startMs) / (endMs - startMs));
  const eased = applyEasing(rawP, anim.easing ?? "easeOut");
  const center = (charCount - 1) / 2;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const dist = (i - center);
    // Starts scattered outward, assembles to center
    states[i].offsetX += dist * 60 * (1 - eased);
    states[i].offsetY += Math.abs(dist) * 30 * (1 - eased) * (i % 2 === 0 ? -1 : 1);
    states[i].opacity *= eased;
    states[i].scaleX *= 0.4 + 0.6 * eased;
    states[i].scaleY *= 0.4 + 0.6 * eased;
  }
}

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

function applyScramble(
  states: CharState[],
  chars: string[],
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) { for (const s of states) { s.opacity = 0; } return; }

  const totalDuration = endMs - startMs;
  // Each char resolves in sequence; last char resolves at end
  for (let i = 0; i < Math.min(chars.length, states.length); i++) {
    const resolveAt = startMs + (i / Math.max(1, chars.length)) * totalDuration;
    if (timeMs < startMs + (i / Math.max(1, chars.length)) * totalDuration * 0.3) {
      states[i].opacity = 0;
      continue;
    }
    if (timeMs >= resolveAt) {
      // Char has resolved — show real char
      states[i].charOverride = undefined;
      continue;
    }
    // Scrambling phase: deterministic "random" based on time bucket
    const bucket = Math.floor((timeMs - startMs) / 40);
    const idx = (i * 7 + bucket * 13) % SCRAMBLE_CHARS.length;
    states[i].charOverride = chars[i] === " " ? " " : SCRAMBLE_CHARS[idx];
    states[i].opacity = clampProgress((timeMs - startMs - (i / chars.length) * totalDuration * 0.3) / 60);
  }
}

function applyStampIn(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const words = tokenizeByWord(text);
  const staggerMs = Math.min(100, anim.durationMs * 0.15);
  const wordDuration = anim.durationMs * 0.4;

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const rawP = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));
    // Stamp: scale 1.4 → 1.0 with slight rotation that snaps straight
    const sc = rawP < 0.5 ? 1 + (1 - rawP / 0.5) * 0.4 : 1;
    const rot = (1 - applyEasing(rawP, "easeOut")) * -6 * (wi % 2 === 0 ? 1 : -1);
    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) {
        states[charIdx].scaleX *= sc;
        states[charIdx].scaleY *= sc;
        states[charIdx].rotation += rot;
        states[charIdx].opacity *= rawP < 0.1 ? rawP / 0.1 : 1;
        if (timeMs < wordStart) states[charIdx].opacity = 0;
      }
      charIdx++;
    }
  }
}

// ── New char animations (phase 2) ─────────────────────────────────────────────

function applyTypewriterDelete(
  states: CharState[],
  charCount: number,
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) return; // all visible before start
  if (timeMs >= endMs) { for (const s of states) s.opacity = 0; return; }

  const progress = clampProgress((timeMs - startMs) / (endMs - startMs));
  const hiddenCount = Math.floor(progress * charCount);

  for (let i = charCount - 1; i >= charCount - hiddenCount; i--) {
    if (i >= 0 && i < states.length) states[i].opacity = 0;
  }
}

// HSL hue wheel — returns a CSS color string deterministically per char + time
function hslColor(hueDeg: number): string {
  const h = ((hueDeg % 360) + 360) % 360;
  return `hsl(${h.toFixed(0)},90%,60%)`;
}

function applyCharRainbow(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  if (timeMs < startMs) return;
  const elapsed = timeMs - startMs;
  const speed = anim.speed ?? 1;
  const spread = 360 / Math.max(1, charCount);

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const hue = (elapsed * speed * 0.1 + i * spread) % 360;
    states[i].colorOverride = hslColor(hue);
  }
}

function applyCharWaveScale(
  states: CharState[],
  charCount: number,
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs < startMs) return;
  const elapsed = timeMs - startMs;
  const duration = Math.max(1, endMs - startMs);
  const cycles = 2;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const phase = (i / Math.max(1, charCount - 1)) * Math.PI * 2;
    const t = (elapsed / duration) * Math.PI * 2 * cycles;
    const sc = 1 + Math.sin(t + phase) * 0.35;
    states[i].scaleX *= sc;
    states[i].scaleY *= sc;
  }
}

function applyCharBlurIn(
  states: CharState[],
  charCount: number,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const staggerMs = Math.min(60, anim.durationMs * 0.08);
  const charDuration = anim.durationMs * 0.5;
  const maxBlur = 12;

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    const charStart = startMs + i * staggerMs;
    const charEnd = charStart + charDuration;
    const rawP = clampProgress((timeMs - charStart) / Math.max(1, charEnd - charStart));
    const eased = applyEasing(rawP, anim.easing ?? "easeOut");
    states[i].blur = (1 - eased) * maxBlur;
    states[i].opacity *= eased < 0.05 ? eased / 0.05 : 1;
    if (timeMs < charStart) { states[i].opacity = 0; states[i].blur = maxBlur; }
  }
}

function applyKaraoke(
  states: CharState[],
  charCount: number,
  _anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  const progress = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
  const highlighted = Math.floor(progress * charCount);

  for (let i = 0; i < Math.min(charCount, states.length); i++) {
    if (i <= highlighted) {
      states[i].colorOverride = "#FFE600"; // karaoke highlight color
    }
  }
}

const SLOT_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function applySlotMachine(
  states: CharState[],
  chars: string[],
  anim: Animation,
  startMs: number,
  endMs: number,
  timeMs: number
): void {
  if (timeMs <= startMs) { for (const s of states) s.opacity = 0; return; }

  const totalDuration = Math.max(1, endMs - startMs);
  const staggerMs = Math.min(120, anim.durationMs * 0.12);

  for (let i = 0; i < Math.min(chars.length, states.length); i++) {
    const resolveAt = startMs + i * staggerMs + totalDuration * 0.3;
    if (timeMs < startMs + i * staggerMs * 0.3) {
      states[i].opacity = 0;
      continue;
    }
    if (timeMs >= resolveAt) {
      states[i].charOverride = undefined;
      states[i].offsetY = 0;
      continue;
    }
    // Spinning slot: cycle through chars + slide offset cycling vertically
    const elapsed = timeMs - startMs - i * staggerMs * 0.3;
    const bucket = Math.floor(elapsed / 50);
    const idx = (i * 11 + bucket * 7) % SLOT_CHARS.length;
    states[i].charOverride = chars[i] === " " ? " " : SLOT_CHARS[idx];
    // Vertical slot reel motion
    states[i].offsetY = (elapsed % 50) - 25;
    states[i].opacity = clampProgress(elapsed / 60);
  }
}

// ── Subtitle word-reveal animations ──────────────────────────────────────────

function applyWordPopReveal(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const words = tokenizeByWord(text);
  // Each word gets an equal share of the animation duration.
  const wordDuration = Math.min(300, anim.durationMs * 0.4);
  const staggerMs = (anim.durationMs - wordDuration) / Math.max(1, words.length - 1);

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const rawP = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));

    // Pop: scale drops from 1.35 → 1.0 with elastic, opacity 0 → 1 with easeOut
    const scaleFactor = rawP < 1
      ? 1.35 - 0.35 * applyEasing(rawP, "elastic")
      : 1.0;
    const opacityFactor = applyEasing(rawP, "easeOut");

    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) {
        states[charIdx].scaleX *= scaleFactor;
        states[charIdx].scaleY *= scaleFactor;
        states[charIdx].opacity *= opacityFactor;
        if (timeMs < wordStart) states[charIdx].opacity = 0;
      }
      charIdx++;
    }
  }
}

function applyCaptionDrop(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const words = tokenizeByWord(text);
  const staggerMs = Math.min(80, anim.durationMs * 0.1);
  const wordDuration = anim.durationMs * 0.4;
  const dropDist = 50;

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const rawP = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));
    const eased = applyEasing(rawP, "bounceOut");

    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) {
        states[charIdx].offsetY += (1 - eased) * -dropDist;
        states[charIdx].opacity *= rawP < 0.1 ? rawP / 0.1 : 1;
        if (timeMs < wordStart) states[charIdx].opacity = 0;
      }
      charIdx++;
    }
  }
}

function applyWordZoomBlur(
  states: CharState[],
  text: string,
  anim: Animation,
  startMs: number,
  timeMs: number
): void {
  const words = tokenizeByWord(text);
  const staggerMs = Math.min(100, anim.durationMs * 0.12);
  const wordDuration = anim.durationMs * 0.5;
  const maxBlur = 8;

  let charIdx = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const wordStart = startMs + wi * staggerMs;
    const wordEnd = wordStart + wordDuration;
    const rawP = clampProgress((timeMs - wordStart) / Math.max(1, wordEnd - wordStart));
    const eased = applyEasing(rawP, "easeOut");
    const scaleFactor = 0.7 + 0.3 * eased;

    for (let ci = 0; ci < word.length; ci++) {
      if (charIdx < states.length) {
        states[charIdx].scaleX *= scaleFactor;
        states[charIdx].scaleY *= scaleFactor;
        states[charIdx].opacity *= eased;
        states[charIdx].blur = (1 - eased) * maxBlur;
        if (timeMs < wordStart) { states[charIdx].opacity = 0; states[charIdx].blur = maxBlur; }
      }
      charIdx++;
    }
  }
}
