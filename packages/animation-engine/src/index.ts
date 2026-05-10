import type { Animation, ElementNode, LayoutProps } from "@kwikk/shared-types";

const SLIDE_DISTANCE_PX = 60;

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

export function resolveAnimatedLayout(element: ElementNode, timeMs: number): LayoutProps {
  const layout: LayoutProps = {
    ...element.layout,
    ...element.overrides?.layout
  };

  const baseX = layout.x;
  const baseY = layout.y;
  const baseOpacity = layout.opacity;
  const baseScale = layout.scale;

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
      case "zoomIn":
        scale *= interpolate(timeMs, startMs, endMs, 0.85, 1, animation.easing);
        break;
    }
  }

  return {
    ...layout,
    x: baseX,
    y: baseY + yOffset,
    opacity,
    scale
  };
}

export function resolveElementNodeAtTime(element: ElementNode, timeMs: number): ElementNode {
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
    layout: resolveAnimatedLayout(element, timeMs)
  };
}
