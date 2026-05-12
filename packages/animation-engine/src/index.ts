import type { Animation, AnimationType, ElementNode, LayoutProps } from "@kwikk/shared-types";

const SLIDE_DISTANCE_PX = 60;
const KINETIC_SLIDE_DISTANCE_PX = 120;

function clampProgress(value: number): number {
  return Math.max(0, Math.min(value, 1));
}

export function applyEasing(progress: number, easing?: string): number {
  switch (easing) {
    case "easeIn":
      return progress * progress;
    case "easeOut":
      return 1 - (1 - progress) * (1 - progress);
    case "easeInOut":
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
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

function resolveAnimationWindow(animation: Animation): { startMs: number; endMs: number } {
  return {
    startMs: animation.startMs,
    endMs: animation.startMs + animation.durationMs
  };
}

export function resolveAnimatedLayout(element: ElementNode, timeMs: number, showAllElements?: boolean): LayoutProps {
  const layout: LayoutProps = {
    ...element.layout,
    ...element.overrides?.layout
  };

  if (showAllElements) return layout;

  const baseX = layout.x;
  const baseY = layout.y;
  const baseOpacity = layout.opacity ?? 1;
  const baseScale = layout.scale ?? 1;

  let xOffset = 0;
  let yOffset = 0;
  let opacity = baseOpacity;
  let scale = baseScale;

  for (const animation of element.animations) {
    const { startMs, endMs } = resolveAnimationWindow(animation);

    switch (animation.type) {
      case "fadeIn":
        opacity *= interpolate(timeMs, startMs, endMs, 0, 1, animation.easing);
        break;
      case "fadeOut":
        opacity *= interpolate(timeMs, startMs, endMs, 1, 0, animation.easing);
        break;
      case "slideUp":
        yOffset += interpolate(timeMs, startMs, endMs, SLIDE_DISTANCE_PX, 0, animation.easing);
        break;
      case "slideDown":
        yOffset += interpolate(timeMs, startMs, endMs, -SLIDE_DISTANCE_PX, 0, animation.easing);
        break;
      case "slideLeft":
        xOffset += interpolate(timeMs, startMs, endMs, SLIDE_DISTANCE_PX, 0, animation.easing);
        break;
      case "slideRight":
        xOffset += interpolate(timeMs, startMs, endMs, -SLIDE_DISTANCE_PX, 0, animation.easing);
        break;
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
    }
  }

  return {
    ...layout,
    x: baseX + xOffset,
    y: baseY + yOffset,
    opacity,
    scale
  };
}

// ─── Motion presets (Principle 8 & 13) ───────────────────────────────────────

export type MotionPresetKey =
  | "aggressive_zoom"
  | "subtitle_pop"
  | "kinetic_slide"
  | "fade_through"
  | "blur_transition"
  | "slide_left_in"
  | "slide_right_in";

export const MOTION_PRESETS: Record<MotionPresetKey, (sceneDurationMs?: number) => Omit<Animation, "id">[]> = {
  aggressive_zoom: (d = 5000) => [
    { type: "zoomIn" as AnimationType, startMs: 0, durationMs: d, easing: "easeOut" }
  ],
  subtitle_pop: (_d = 5000) => [
    { type: "subtitle_pop" as AnimationType, startMs: 0, durationMs: 400, easing: "easeOut" },
    { type: "fadeOut" as AnimationType, startMs: 4000, durationMs: 400, easing: "easeIn" }
  ],
  kinetic_slide: (_d = 5000) => [
    { type: "kinetic_slide" as AnimationType, startMs: 0, durationMs: 600, easing: "easeOut" },
    { type: "fadeIn" as AnimationType, startMs: 0, durationMs: 400, easing: "easeOut" },
    { type: "fadeOut" as AnimationType, startMs: 4400, durationMs: 400, easing: "easeIn" }
  ],
  fade_through: (d = 5000) => [
    { type: "fadeIn" as AnimationType, startMs: 0, durationMs: 500, easing: "easeOut" },
    { type: "fadeOut" as AnimationType, startMs: d - 500, durationMs: 500, easing: "easeIn" }
  ],
  blur_transition: (_d = 5000) => [
    { type: "blur_transition" as AnimationType, startMs: 0, durationMs: 800, easing: "easeOut" }
  ],
  slide_left_in: (_d = 5000) => [
    { type: "slideLeft" as AnimationType, startMs: 0, durationMs: 600, easing: "easeOut" },
    { type: "fadeIn" as AnimationType, startMs: 0, durationMs: 400, easing: "easeOut" }
  ],
  slide_right_in: (_d = 5000) => [
    { type: "slideRight" as AnimationType, startMs: 0, durationMs: 600, easing: "easeOut" },
    { type: "fadeIn" as AnimationType, startMs: 0, durationMs: 400, easing: "easeOut" }
  ]
};

export function buildPresetAnimations(
  presetKey: MotionPresetKey,
  sceneDurationMs?: number
): Animation[] {
  const factory = MOTION_PRESETS[presetKey];
  return factory(sceneDurationMs).map((partial, i) => ({
    ...partial,
    id: `${presetKey}_${i}`
  }));
}

export function resolveElementNodeAtTime(element: ElementNode, timeMs: number, showAllElements?: boolean): ElementNode {
  return {
    ...element,
    style: {
      ...element.style,
      ...element.overrides?.style
    },
    content: {
      ...element.content,
      ...element.overrides?.content
    },
    layout: resolveAnimatedLayout(element, timeMs, showAllElements)
  };
}
