import type { Animation, AnimationType, ElementNode, LayoutProps } from "@kwikk/shared-types";
import { ANIMATE_STYLE_KEYFRAMES, interpolateLayoutKeyframes } from "./animateKeyframes";

const SLIDE_DISTANCE_PX = 60;
const KINETIC_SLIDE_DISTANCE_PX = 120;

export function clampProgress(value: number): number {
  return Math.max(0, Math.min(value, 1));
}

function bounceEaseOut(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function elasticEaseOut(t: number): number {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function overshootEaseOut(t: number): number {
  // Slight overshoot (1.08×) then settle — premium deceleration with physicality
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function cinematicEaseOut(t: number): number {
  // CSS cubic-bezier(0.25, 0.46, 0.45, 0.94) approximation — film-quality decel
  const t2 = t * t;
  const t3 = t2 * t;
  return 3 * t3 - 3 * t2 * 2 + 3 * t + (1 - 3 * t3 + 3 * t2 - t) * 0.06;
}

function springGentleOut(t: number): number {
  // Lighter elastic spring — 5% overshoot, fast settle
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 4.5;
  return Math.pow(2, -8 * t) * Math.sin((t * 8 - 0.9) * c4) + 1;
}

export function applyEasing(p: number, easing?: string): number {
  const progress = clampProgress(p);
  switch (easing) {
    case "easeIn":
      return progress * progress;
    case "easeOut":
      return 1 - (1 - progress) * (1 - progress);
    case "easeInOut":
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    case "bounceOut":
      return bounceEaseOut(progress);
    case "bounceIn":
      return 1 - bounceEaseOut(1 - progress);
    case "elastic":
      return elasticEaseOut(progress);
    case "overshoot":
      return overshootEaseOut(progress);
    case "cinematicEaseOut":
      return cinematicEaseOut(progress);
    case "springGentle":
      return springGentleOut(progress);
    default:
      return progress;
  }
}

export function interpolate(
  currentTimeMs: number,
  startMs: number,
  endMs: number,
  from: number,
  to: number,
  easing?: string
): number {
  if (endMs <= startMs) {
    return to;
  }

  if (currentTimeMs <= startMs) {
    return from;
  }

  if (currentTimeMs >= endMs) {
    return to;
  }

  const progress = clampProgress((currentTimeMs - startMs) / (endMs - startMs));
  const eased = applyEasing(progress, easing);
  return from + (to - from) * eased;
}

function resolveAnimationWindow(animation: Animation, elementStartMs: number, staggerDelayMs = 0): { startMs: number; endMs: number } {
  const baseStartMs = elementStartMs + animation.startMs + staggerDelayMs;
  return {
    startMs: baseStartMs,
    endMs: baseStartMs + animation.durationMs
  };
}

/**
 * Case labels in the big `switch (animation.type)` below whose body mutates `opacity` via
 * literal code (`opacity *=`/`opacity =`) rather than through the data-driven
 * ANIMATE_STYLE_KEYFRAMES table. Hand-maintained because these are imperative branches, not
 * data — but it lives right next to the switch it describes, so anyone adding a new
 * opacity-touching case here is already editing this file and should add it to this set too.
 */
const OPACITY_AFFECTING_ANIMATION_TYPES = new Set<string>([
  "fadeIn", "fadeOut", "blur_in", "blur_out", "blur_transition", "subtitle_pop",
  "bounceIn", "bounceOut", "rotateIn", "rotateOut", "flicker", "stomp", "tumble_in",
  "glitch_in", "spring_in", "slam_down", "depth_charge", "drift_in", "whip_exit",
  "spiral_in", "flip_in_x", "swoop_in", "stamp", "pop_in", "rubber_band", "swoop_out",
  "implode", "whip_up", "bounce_floor", "flip_out_x", "roll_in", "zip_in",
  "neon_flicker", "momentum_carry", "atmosphere_pulse",
]);

/**
 * Whether an animation type ever writes a non-1 opacity into the animated layout — checks the
 * hand-maintained set above (for switch cases with literal opacity code) plus the keyframe data
 * table (ANIMATE_STYLE_KEYFRAMES, for the generic `default` case), so it doesn't miss either kind.
 */
function animationControlsOpacity(type: string): boolean {
  if (OPACITY_AFFECTING_ANIMATION_TYPES.has(type)) return true;
  const kfs = ANIMATE_STYLE_KEYFRAMES[type];
  return !!kfs && kfs.some((kf) => kf.opacity !== undefined);
}

/**
 * True only when NONE of the element's animations would ever restore opacity from 0 — the
 * one case where trusting an explicit `layout.opacity: 0` risks leaving the element invisible
 * forever (e.g. AI-authored content that set opacity:0 but forgot a fadeIn). When a real
 * opacity-affecting animation IS present, an explicit 0 is the correct, intentional "hidden
 * until it fades in" starting state and must be respected, not silently overridden.
 */
function wouldBePermanentlyInvisible(element: ElementNode): boolean {
  return !(element.animations ?? []).some((a) => animationControlsOpacity(a.type));
}

export function resolveAnimatedLayout(element: ElementNode, timeMs: number, showAllElements?: boolean): LayoutProps {
  const layout: LayoutProps = {
    ...element.layout,
    ...element.overrides?.layout
  };

  if (showAllElements) {
    const rawOpacity = layout.opacity ?? 1;
    const opacity = rawOpacity === 0 && (element.animations?.length ?? 0) > 0 ? 1 : rawOpacity;
    return { ...layout, opacity };
  }

  const baseX = layout.x;
  const baseY = layout.y;
  const baseOpacity = layout.opacity ?? 1;
  const baseScale = layout.scale ?? 1;
  const baseRotation = layout.rotation ?? 0;

  let xOffset = 0;
  let yOffset = 0;
  let opacity = baseOpacity === 0 && wouldBePermanentlyInvisible(element) ? 1 : baseOpacity;
  let scale = baseScale;
  let rotationOffset = 0;

  // True only while `opacity` still holds the untouched `layout.opacity: 0` base value (the
  // "hidden until revealed" case handled below at the first opacity-controlling animation).
  // Cleared the moment that substitution happens so a LEGITIMATE later 0 — e.g. a fadeOut that
  // has actually finished fading the element out — is never re-substituted back to 1.
  let opacityBaseIsUnresolvedZero = baseOpacity === 0 && !wouldBePermanentlyInvisible(element);

  const elementStartMs = element.startMs ?? 0;
  const staggerDelayMs = element.staggerDelayMs ?? 0;

  for (const animation of (element.animations ?? [])) {
    const { startMs, endMs } = resolveAnimationWindow(animation, elementStartMs, staggerDelayMs);

    // Skip animations that haven't started yet so they don't pre-apply their
    // "from" value (e.g. opacity=0) and corrupt concurrent or preceding animations.
    if (timeMs < startMs) continue;

    // Every opacity effect below is multiplicative (`opacity *= interpolate(...)`) — it fades
    // TOWARD the running opacity value, not to an absolute 1. That's correct when the running
    // value is a real resting opacity (e.g. 0.3 for an atmospheric orb), but degenerates to a
    // permanent 0 for the entire animation once this animation's window is entered if the base
    // was literally 0 — "fade to 0" is never a meaningful reveal target. A `layout.opacity: 0`
    // base is only ever meant as "hidden until this animation reveals it", so the FIRST time an
    // opacity-controlling animation actually starts running, treat that 0 as 1 here. Only fires
    // once (see opacityBaseIsUnresolvedZero) so a later, legitimate 0 — e.g. a fadeOut that has
    // actually finished — is never re-substituted back to visible.
    if (opacityBaseIsUnresolvedZero && animationControlsOpacity(animation.type)) {
      opacity = 1;
      opacityBaseIsUnresolvedZero = false;
    }

    switch (animation.type) {
      case "fadeIn":
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, animation.easing);
        break;
      case "fadeOut":
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, animation.easing);
        break;
      case "slideUp": {
        const from = animation.fromOffset ?? SLIDE_DISTANCE_PX;
        const to = animation.toOffset ?? 0;
        yOffset += interpolate(timeMs, startMs, endMs, from, to, animation.easing);
        break;
      }
      case "slideDown": {
        const from = animation.fromOffset ?? -SLIDE_DISTANCE_PX;
        const to = animation.toOffset ?? 0;
        yOffset += interpolate(timeMs, startMs, endMs, from, to, animation.easing);
        break;
      }
      case "slideLeft": {
        const from = animation.fromOffset ?? SLIDE_DISTANCE_PX;
        const to = animation.toOffset ?? 0;
        xOffset += interpolate(timeMs, startMs, endMs, from, to, animation.easing);
        break;
      }
      case "slideRight": {
        const from = animation.fromOffset ?? -SLIDE_DISTANCE_PX;
        const to = animation.toOffset ?? 0;
        xOffset += interpolate(timeMs, startMs, endMs, from, to, animation.easing);
        break;
      }
      case "zoomIn":
        scale *= interpolate(timeMs, startMs, endMs, 0.85, 1, animation.easing);
        break;
      case "zoomOut":
        scale *= interpolate(timeMs, startMs, endMs, 1, 0.85, animation.easing);
        break;
      case "kinetic_slide":
        yOffset += interpolate(timeMs, startMs, endMs, KINETIC_SLIDE_DISTANCE_PX, 0, animation.easing);
        break;
      case "subtitle_pop":
        scale *= interpolate(timeMs, startMs, endMs, 0.8, 1, animation.easing);
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, animation.easing);
        break;
      case "blur_transition":
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, animation.easing);
        break;
      case "bounceIn": {
        const amp = animation.amplitude ?? 0.3;
        scale *= interpolate(timeMs, startMs, endMs, amp, 1, "bounceOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "bounceOut": {
        const amp = animation.amplitude ?? 0.3;
        scale *= interpolate(timeMs, startMs, endMs, 1, amp, "bounceIn");
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        break;
      }
      case "rotateIn":
        rotationOffset += interpolate(timeMs, startMs, endMs, -90, 0, animation.easing ?? "easeOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      case "rotateOut":
        rotationOffset += interpolate(timeMs, startMs, endMs, 0, 90, animation.easing ?? "easeIn");
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        break;
      case "shake": {
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP > 0 && rawP < 1) {
          xOffset += 10 * Math.sin(rawP * 8 * Math.PI * 2) * (1 - rawP);
        }
        break;
      }
      case "pulse": {
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP > 0 && rawP < 1) {
          scale *= 1 + 0.12 * Math.sin(rawP * 4 * Math.PI);
        }
        break;
      }
      case "flicker": {
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP > 0 && rawP < 1) {
          // deterministic flicker: sin at two different frequencies multiplied
          opacity *= Math.max(0.15, 0.5 + 0.5 * Math.sin(rawP * 47) * Math.sin(rawP * 19 + 0.7));
        }
        break;
      }
      case "stomp": {
        // Overshoots to 1.3, then settles to 1.0 with a quick bounce
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP < 1) {
          const bounced = rawP < 0.4
            ? interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.4, 0, 1.35, "easeOut")
            : interpolate(timeMs, startMs + (endMs - startMs) * 0.4, endMs, 1.35, 1, "bounceOut");
          scale *= bounced;
          opacity *= interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.25, 0, 1, "easeOut");
        }
        break;
      }
      case "tumble_in": {
        rotationOffset += interpolate(timeMs, startMs, endMs, -180, 0, animation.easing ?? "easeOut");
        scale *= interpolate(timeMs, startMs, endMs, 0, 1, animation.easing ?? "easeOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "glitch_in": {
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP < 0.7) {
          // position jitter that settles as animation progresses
          const jitter = (1 - rawP / 0.7) * 12;
          xOffset += jitter * Math.sin(rawP * 43);
          yOffset += jitter * 0.4 * Math.sin(rawP * 37 + 1.2);
        }
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "spring_in": {
        // Elastic spring: coils tight then releases with overshoot and settle
        scale *= interpolate(timeMs, startMs, endMs, 0, 1, "elastic");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "slam_down": {
        // Falls from far above with a hard bounce landing
        const fallDist = animation.fromOffset ?? 200;
        yOffset += interpolate(timeMs, startMs, endMs, -fallDist, 0, "bounceOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "depth_charge": {
        // Explodes from tiny → overshoots → settles
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP < 1) {
          const scaleVal = rawP < 0.5
            ? interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.5, 0.05, 1.25, "easeOut")
            : interpolate(timeMs, startMs + (endMs - startMs) * 0.5, endMs, 1.25, 1, "bounceOut");
          scale *= scaleVal;
          opacity *= interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.3, 0, 1, "easeOut");
        }
        break;
      }
      case "drift_in": {
        // Ultra-gentle luxury float — 20 px vertical drift + long fade
        const driftDist = animation.fromOffset ?? 20;
        yOffset += interpolate(timeMs, startMs, endMs, driftDist, 0, "easeOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeInOut");
        break;
      }
      case "whip_exit": {
        const exitDist = animation.toOffset ?? 300;
        xOffset += interpolate(timeMs, startMs, endMs, 0, exitDist, "easeIn");
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        break;
      }
      // ── Looping / sustained ───────────────────────────────────────────────
      case "float": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const amp = animation.amplitude ?? 10;
          const spd = animation.speed ?? 1;
          yOffset += Math.sin((elapsed / 1000) * spd * Math.PI * 2) * amp;
        }
        break;
      }
      case "breathe": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 0.5;
          scale *= 1 + 0.04 * Math.sin((elapsed / 1000) * spd * Math.PI * 2);
        }
        break;
      }
      case "spin": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 1;
          rotationOffset += (elapsed / 1000) * spd * 360;
        }
        break;
      }
      case "sway": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const amp = animation.amplitude ?? 15;
          const spd = animation.speed ?? 0.8;
          rotationOffset += Math.sin((elapsed / 1000) * spd * Math.PI * 2) * amp;
        }
        break;
      }
      case "heartbeat": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 1.2;
          const t = (elapsed / 1000) * spd;
          const cycle = t - Math.floor(t);
          const beat1 = cycle < 0.1 ? Math.sin(cycle / 0.1 * Math.PI) : 0;
          const beat2 = cycle > 0.15 && cycle < 0.25 ? Math.sin((cycle - 0.15) / 0.1 * Math.PI) : 0;
          const amp = animation.amplitude ?? 0.15;
          scale *= 1 + (beat1 + beat2 * 0.7) * amp;
        }
        break;
      }
      // ── Entry ─────────────────────────────────────────────────────────────
      case "spiral_in": {
        const eased = applyEasing(clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs)), animation.easing ?? "easeOut");
        scale *= eased;
        rotationOffset += (1 - eased) * -360;
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "flip_in_x": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        if (rawP < 0.5) {
          scale *= Math.max(0.001, 1 - rawP / 0.5);
          opacity *= rawP / 0.5;
        }
        break;
      }
      case "swoop_in": {
        const dist = animation.fromOffset ?? 200;
        xOffset += interpolate(timeMs, startMs, endMs, -dist, 0, "easeOut");
        yOffset += interpolate(timeMs, startMs, endMs, dist, 0, "easeOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "stamp": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        const snapP = rawP < 0.5 ? 0 : (rawP - 0.5) / 0.5;
        rotationOffset += (1 - applyEasing(snapP, "easeOut")) * -8;
        if (rawP < 0.1) scale *= 1.1 + rawP / 0.1 * 0.1;
        else if (rawP < 0.2) scale *= 1.2 - (rawP - 0.1) / 0.1 * 0.2;
        opacity *= interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.2, 0, 1, "easeOut");
        break;
      }
      case "pop_in": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        if (rawP < 0.15) scale *= rawP / 0.15 * 1.1;
        else if (rawP < 0.3) scale *= 1.1 - (rawP - 0.15) / 0.15 * 0.1;
        opacity *= rawP < 0.1 ? rawP / 0.1 : 1;
        break;
      }
      case "rubber_band": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        if (rawP < 1) {
          const decay = 1 - rawP;
          scale *= 1 + Math.abs(Math.sin(rawP * Math.PI * 2)) * 0.35 * decay;
          opacity *= interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.2, 0, 1, "easeOut");
        }
        break;
      }
      // ── Exit ──────────────────────────────────────────────────────────────
      case "swoop_out": {
        const dist = animation.toOffset ?? 200;
        xOffset += interpolate(timeMs, startMs, endMs, 0, dist, "easeIn");
        yOffset += interpolate(timeMs, startMs, endMs, 0, -dist, "easeIn");
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        break;
      }
      case "implode": {
        scale *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        break;
      }
      case "whip_up": {
        const dist = animation.toOffset ?? 300;
        yOffset += interpolate(timeMs, startMs, endMs, 0, -dist, "easeIn");
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, "easeIn");
        break;
      }
      // ── Attention / loop ──────────────────────────────────────────────────
      case "tada": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        if (rawP > 0 && rawP < 1) {
          rotationOffset += Math.sin(rawP * 6 * Math.PI) * 12 * (1 - rawP);
          scale *= 1 + Math.sin(rawP * 3 * Math.PI) * 0.08;
        }
        break;
      }
      case "jello": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        if (rawP > 0 && rawP < 1) {
          const decay = 1 - rawP;
          xOffset += Math.sin(rawP * 8 * Math.PI) * 6 * decay;
          scale *= 1 + Math.abs(Math.sin(rawP * 5 * Math.PI)) * 0.08 * decay;
        }
        break;
      }
      case "vibrate": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        if (rawP > 0 && rawP < 1) {
          xOffset += Math.sin(rawP * 80 * Math.PI) * 3;
          yOffset += Math.sin(rawP * 73 * Math.PI + 0.5) * 2;
        }
        break;
      }
      // ── Animated filter drivers — effects resolved in resolveAnimatedEffects ──
      case "brightness_flash":
      case "chromatic_pulse":
      case "grain_surge":
      case "vignette_close":
      case "vignette_open":
        break;
      // blur_in / blur_out — layout pass: fade opacity; blur value resolved in resolveAnimatedEffects
      case "blur_in":
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, animation.easing ?? "easeOut");
        break;
      case "blur_out":
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, animation.easing ?? "easeIn");
        break;
      // ── New motion animations ─────────────────────────────────────────────
      case "orbit": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 1;
          const radius = animation.amplitude ?? 30;
          const angle = (elapsed / 1000) * spd * Math.PI * 2;
          xOffset += Math.cos(angle) * radius;
          yOffset += Math.sin(angle) * radius;
        }
        break;
      }
      case "pendulum": {
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 0.8;
          const amp = animation.amplitude ?? 45;
          rotationOffset += Math.sin((elapsed / 1000) * spd * Math.PI * 2) * amp;
        }
        break;
      }
      case "bounce_floor": {
        const fallDist = animation.fromOffset ?? 300;
        yOffset += interpolate(timeMs, startMs, endMs, -fallDist, 0, "bounceOut");
        opacity *= interpolate(timeMs, startMs, startMs + (endMs - startMs) * 0.2, 0, 1, "easeOut");
        break;
      }
      case "flip_out_x": {
        const rawP = clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs));
        scale *= Math.max(0, 1 - rawP);
        opacity *= 1 - rawP;
        break;
      }
      case "roll_in": {
        const dist = animation.fromOffset ?? 300;
        xOffset += interpolate(timeMs, startMs, endMs, -dist, 0, animation.easing ?? "easeOut");
        rotationOffset += interpolate(timeMs, startMs, endMs, -360, 0, animation.easing ?? "easeOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "zip_in": {
        const dist = animation.fromOffset ?? 200;
        yOffset += interpolate(timeMs, startMs, endMs, -dist, 0, "easeOut");
        scale *= interpolate(timeMs, startMs, endMs, 0.5, 1, "easeOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "neon_flicker": {
        if (timeMs >= startMs && timeMs <= endMs) {
          const elapsed = timeMs - startMs;
          const t = elapsed / 1000;
          // Deterministic neon flicker pattern: mostly on with brief offs
          const f1 = Math.sin(t * 51) > 0.96 ? 0.1 : 1.0;
          const f2 = Math.sin(t * 23 + 2.1) > 0.97 ? 0.3 : 1.0;
          opacity *= Math.min(f1, f2);
        }
        break;
      }
      case "glitch_split": {
        // Position jitter; chromatic aberration resolved in resolveAnimatedEffects
        if (timeMs >= startMs && timeMs <= endMs) {
          const elapsed = timeMs - startMs;
          const intensity = animation.amplitude ?? 0.5;
          xOffset += Math.sin(elapsed / 80) * 4 * intensity;
          yOffset += Math.sin(elapsed / 73 + 1) * 2 * intensity;
        }
        break;
      }
      case "typewriter_delete":
      case "count_down":
        // Handled in resolveElementNodeAtTime
        break;
      // Char/word-level animations — handled in render-core, not here.
      case "typewriter":
      case "typewriter_word":
      case "word_slide_up":
      case "word_fade_in":
      case "char_scale_in":
      case "wave_text":
      case "ascend":
      case "burst":
      case "bounce_letters":
      case "letter_drop":
      case "letter_spin":
      case "explode_in":
      case "scramble":
      case "stamp_in":
      case "highlight_sweep":
      case "count_up":
      case "char_rainbow":
      case "char_wave_scale":
      case "char_blur_in":
      case "karaoke":
      case "slot_machine":
        break;
      // Line draw animations — handled by resolveElementNodeAtTime, not here.
      case "draw_in":
      case "draw_out":
        break;
      // ── Premium Motion Intelligence (v2) ─────────────────────────────────
      case "cinematic_breathe": {
        // Slow ambient scale breath — atmospheric layer life
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 0.4;
          const amp = animation.amplitude ?? 0.025;
          scale *= 1 + amp * Math.sin((elapsed / 1000) * spd * Math.PI * 2);
        }
        break;
      }
      case "momentum_carry": {
        // Inherits directional momentum from previous element — slides along the dominant axis
        const from = animation.fromOffset ?? 40;
        const to = animation.toOffset ?? 0;
        yOffset += interpolate(timeMs, startMs, endMs, from, to, animation.easing ?? "cinematicEaseOut");
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, "easeOut");
        break;
      }
      case "depth_drift": {
        // zDepth-aware parallax float — near elements drift more, far elements less
        const zMod = (element.zDepth ?? 0) * 0.5 + 1;
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const amp = (animation.amplitude ?? 8) * zMod;
          const spd = animation.speed ?? 0.6;
          yOffset += Math.sin((elapsed / 1000) * spd * Math.PI * 2) * amp;
          xOffset += Math.cos((elapsed / 1000) * spd * 0.7 * Math.PI * 2) * amp * 0.4;
        }
        break;
      }
      case "atmosphere_pulse": {
        // Ambient scale + opacity pulse for background atmospheric elements
        if (timeMs >= startMs) {
          const elapsed = timeMs - startMs;
          const spd = animation.speed ?? 0.3;
          const amp = animation.amplitude ?? 0.06;
          scale *= 1 + amp * Math.sin((elapsed / 1000) * spd * Math.PI * 2);
          const baseOp = layout.opacity ?? 1;
          opacity = baseOp * (1 - amp * 0.6 * Math.abs(Math.sin((elapsed / 1000) * spd * Math.PI)));
        }
        break;
      }
      default: {
        const kfs = ANIMATE_STYLE_KEYFRAMES[animation.type];
        if (kfs) {
          const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
          const frame = interpolateLayoutKeyframes(kfs, rawP);
          if (frame.x !== undefined) xOffset += frame.x;
          if (frame.y !== undefined) yOffset += frame.y;
          if (frame.scale !== undefined) scale *= frame.scale;
          if (frame.rotation !== undefined) rotationOffset += frame.rotation;
          if (frame.opacity !== undefined) opacity *= frame.opacity;
        }
        break;
      }
    }
  }

  return {
    ...layout,
    x: baseX + xOffset,
    y: baseY + yOffset,
    opacity,
    scale,
    rotation: baseRotation + rotationOffset
  };
}

/** Extra render-state driven by animations that doesn't fit in LayoutProps. */
export interface AnimatedEffects {
  blur: number;
  /** 0 = none, 1 = full RGB channel split */
  chromaticAberration: number;
  /** 0 = none, 1 = heavy grain */
  filmGrain: number;
  /** Brightness multiplier: 1 = normal, >1 = brighter flash */
  brightness: number;
  /** 0 = no vignette, 1 = full black vignette */
  vignette: number;
}

export function resolveAnimatedEffects(element: ElementNode, timeMs: number): AnimatedEffects {
  let blur = 0;
  let chromaticAberration = 0;
  let filmGrain = 0;
  let brightness = 1;
  let vignette = 0;
  const elementStartMs = element.startMs ?? 0;
  const staggerDelayMs = element.staggerDelayMs ?? 0;
  for (const animation of (element.animations ?? [])) {
    const { startMs, endMs } = resolveAnimationWindow(animation, elementStartMs, staggerDelayMs);
    if (timeMs < startMs || timeMs > endMs) continue;
    const amp = animation.amplitude;
    switch (animation.type) {
      case "blur_in":
        blur += interpolate(timeMs, startMs, endMs, amp ?? 20, 0, animation.easing ?? "easeOut");
        break;
      case "blur_out":
        blur += interpolate(timeMs, startMs, endMs, 0, amp ?? 20, animation.easing ?? "easeIn");
        break;
      case "glitch_in": {
        const rawP = endMs > startMs ? clampProgress((timeMs - startMs) / (endMs - startMs)) : 1;
        if (rawP < 0.5) {
          blur += (1 - rawP / 0.5) * 6;
          chromaticAberration += (1 - rawP / 0.5) * 0.8;
        }
        break;
      }
      case "chromatic_pulse": {
        const peak = amp ?? 1;
        chromaticAberration += Math.sin(clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs)) * Math.PI) * peak;
        break;
      }
      case "brightness_flash": {
        const peak = amp ?? 2;
        brightness *= 1 + (peak - 1) * Math.sin(clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs)) * Math.PI);
        break;
      }
      case "grain_surge": {
        const peak = amp ?? 1;
        filmGrain += Math.sin(clampProgress((timeMs - startMs) / Math.max(1, endMs - startMs)) * Math.PI) * peak;
        break;
      }
      case "vignette_close":
        vignette += interpolate(timeMs, startMs, endMs, 0, amp ?? 1, animation.easing ?? "easeIn");
        break;
      case "vignette_open":
        vignette += interpolate(timeMs, startMs, endMs, amp ?? 1, 0, animation.easing ?? "easeOut");
        break;
      case "glitch_split": {
        // Drive sustained chromatic aberration oscillation
        if (timeMs >= startMs && timeMs <= endMs) {
          const intensity = amp ?? 1;
          chromaticAberration += Math.abs(Math.sin(timeMs / 80)) * 0.6 * intensity;
        }
        break;
      }
    }
  }
  return { blur, chromaticAberration, filmGrain, brightness, vignette };
}

export function resolveElementNodeAtTime(element: ElementNode, timeMs: number, showAllElements?: boolean): ElementNode {
  const content = {
    ...element.content,
    ...element.overrides?.content
  };
  const hasGeneratedTextAnimation = element.animations.some(
    (a) => a.type === "count_up" || a.type === "count_down" || a.type === "text_cycle"
  );

  // Resolve count_down: substitute element text with a descending animated counter value.
  if (!showAllElements && element.type === "text" && element.animations.some((a) => a.type === "count_down")) {
    const rawText = content.text ?? "";
    const parsedNum = parseFloat(rawText.replace(/[^0-9.-]/g, "")) || 0;
    const prefix = rawText.match(/^[^0-9.]*/)?.[0] ?? "";
    const suffix = rawText.match(/[^0-9.]*$/)?.[0] ?? "";
    const stagger = element.staggerDelayMs ?? 0;
    let displayNum = parsedNum;
    for (const anim of element.animations) {
      if (anim.type !== "count_down") continue;
      const baseStart = (element.startMs ?? 0) + anim.startMs + stagger;
      const baseEnd = baseStart + anim.durationMs;
      const progress = clampProgress((timeMs - baseStart) / Math.max(1, baseEnd - baseStart));
      const fallbackTarget = parsedNum || 100;
      const startValue = anim.fromValue ?? anim.toValue ?? fallbackTarget;
      const endValue = anim.toValue ?? 0;
      displayNum = Math.round(startValue + (endValue - startValue) * applyEasing(progress, anim.easing ?? "easeOut"));
    }
    content.text = `${prefix}${displayNum}${suffix}`;
  }

  // Resolve count_up: substitute element text with an animated counter value.
  if (!showAllElements && element.type === "text" && element.animations.some((a) => a.type === "count_up")) {
    const rawText = content.text ?? "";
    const parsedNum = parseFloat(rawText.replace(/[^0-9.-]/g, "")) || 0;
    const prefix = rawText.match(/^[^0-9.]*/)?.[0] ?? "";
    const suffix = rawText.match(/[^0-9.]*$/)?.[0] ?? "";
    const stagger = element.staggerDelayMs ?? 0;
    let displayNum = parsedNum;
    for (const anim of element.animations) {
      if (anim.type !== "count_up") continue;
      const baseStart = (element.startMs ?? 0) + anim.startMs + stagger;
      const baseEnd = baseStart + anim.durationMs;
      const progress = clampProgress((timeMs - baseStart) / Math.max(1, baseEnd - baseStart));
      const fallbackTarget = parsedNum || 100;
      const startValue = anim.fromValue ?? 0;
      const endValue = anim.toValue ?? fallbackTarget;
      displayNum = Math.round(startValue + (endValue - startValue) * applyEasing(progress, anim.easing ?? "easeOut"));
    }
    content.text = `${prefix}${displayNum}${suffix}`;
  }

  // Resolve text_cycle: swap the element text across a provided list of labels/statuses.
  if (!showAllElements && element.type === "text" && element.animations.some((a) => a.type === "text_cycle")) {
    const stagger = element.staggerDelayMs ?? 0;
    let displayText = content.text ?? "";
    for (const anim of element.animations) {
      if (anim.type !== "text_cycle") continue;
      const items = (anim.textItems ?? []).map((item) => item.trim()).filter(Boolean);
      if (items.length === 0) continue;
      const baseStart = (element.startMs ?? 0) + anim.startMs + stagger;
      const baseEnd = baseStart + anim.durationMs;
      const progress = clampProgress((timeMs - baseStart) / Math.max(1, baseEnd - baseStart));
      const eased = applyEasing(progress, anim.easing ?? "easeInOut");
      const idx = Math.min(items.length - 1, Math.floor(eased * items.length));
      displayText = items[idx];
    }
    content.text = displayText;
  }

  // Resolve draw_in / draw_out into lineDrawProgress for line shapes and graph elements.
  if (!showAllElements && (element.content?.shape === "line" || element.type === "graph")) {
    const hasDrawAnim = element.animations.some((a) => a.type === "draw_in" || a.type === "draw_out");
    if (hasDrawAnim) {
      const elementStartMs = element.startMs ?? 0;
      let drawProgress = 1;
      for (const animation of (element.animations ?? [])) {
        const baseStart = elementStartMs + animation.startMs;
        const baseEnd = baseStart + animation.durationMs;
        if (animation.type === "draw_in") {
          drawProgress = Math.min(drawProgress, interpolate(timeMs, baseStart, baseEnd, 0, 1, animation.easing));
        } else if (animation.type === "draw_out") {
          drawProgress = Math.min(drawProgress, interpolate(timeMs, baseStart, baseEnd, 1, 0, animation.easing));
        }
      }
      content.lineDrawProgress = Math.max(0, Math.min(1, drawProgress));
    }
  }

  return {
    ...element,
    style: {
      ...element.style,
      ...element.overrides?.style
    },
    content,
    ...(hasGeneratedTextAnimation ? { content: { ...content, richText: undefined } } : {}),
    layout: resolveAnimatedLayout(element, timeMs, showAllElements)
  };
}

export { resolveCharAnimations, hasCharLevelAnimations, isCharLevelAnimation } from "./typographyAnimations";
export type { CharState } from "./typographyAnimations";

export { expandMotionIntent, blueprintToPromptString } from "./motionSystemExpander";
export type { MotionBlueprint, ElementBlueprint } from "./motionSystemExpander";
