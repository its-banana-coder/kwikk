import type { ImageFilters, StyleProps, TextEffectType } from "@kwikk/shared-types";
import type { AnimatedEffects } from "@kwikk/animation-engine";

// ─── CSS filter string ────────────────────────────────────────────────────────

/**
 * Builds the CSS `filter` property value combining static image filters
 * and per-frame animated effects (blur, brightness flash, etc.).
 */
export function buildCSSFilter(
  f: ImageFilters | undefined,
  e: AnimatedEffects,
  elementId?: string
): string {
  const parts: string[] = [];

  // Animated effects — change every frame
  if (e.blur > 0)          parts.push(`blur(${e.blur.toFixed(1)}px)`);
  if (e.brightness !== 1)  parts.push(`brightness(${e.brightness.toFixed(3)})`);

  // Static image filters — change only when project edits
  if (f?.blur)             parts.push(`blur(${f.blur}px)`);
  if (f?.brightness !== undefined && f.brightness !== 1)
                           parts.push(`brightness(${f.brightness})`);
  if (f?.contrast !== undefined && f.contrast !== 1)
                           parts.push(`contrast(${f.contrast})`);
  if (f?.saturation !== undefined && f.saturation !== 1)
                           parts.push(`saturate(${f.saturation})`);
  if (f?.monochrome)       parts.push(`grayscale(1)`);
  if (f?.sepia)            parts.push(`sepia(0.9)`);
  if (f?.hdr)              parts.push(`brightness(1.1) contrast(1.75) saturate(1.5)`);
  if (f?.vintage)          parts.push(`sepia(0.45) contrast(1.2) brightness(0.9) saturate(0.8)`);
  if (f?.cinematic)        parts.push(`contrast(1.3) saturate(0.85) brightness(0.95)`);
  if (f?.y2k)              parts.push(`saturate(1.4) contrast(1.15) hue-rotate(5deg)`);
  if (f?.lomo)             parts.push(`saturate(1.6) contrast(1.4) brightness(0.9)`);
  if (f?.cross_process)    parts.push(`saturate(1.8) contrast(1.5) hue-rotate(15deg)`);
  if (f?.thermal)          parts.push(`grayscale(0.05) sepia(0.6) hue-rotate(-20deg) saturate(2)`);
  if (f?.night_vision)     parts.push(`grayscale(0.1) sepia(0.3) hue-rotate(90deg) brightness(1.3) saturate(3)`);
  if (f?.kodachrome)       parts.push(`contrast(1.45) brightness(1.05) saturate(1.2) sepia(0.15)`);
  if (f?.infrared)         parts.push(`hue-rotate(180deg) saturate(1.5) brightness(1.1)`);
  if (f?.comic)            parts.push(`saturate(1.8) contrast(1.6)`);
  if (f?.glow)             parts.push(`drop-shadow(0 0 ${f.glow.blur}px ${f.glow.color}) drop-shadow(0 0 ${f.glow.blur * 2}px ${f.glow.color})`);
  if (f?.dropShadow)       parts.push(`drop-shadow(${f.dropShadow.offsetX}px ${f.dropShadow.offsetY}px ${f.dropShadow.blur}px ${hexToRgba(f.dropShadow.color, f.dropShadow.alpha)})`);
  if (f?.sharpen)          parts.push(`contrast(${1 + f.sharpen * 0.15})`);
  if (f?.pixelate && f.pixelate > 0) {
    // Pixelate: handled via element scale trick — flag it for the renderer to handle
    // CSS doesn't have a native pixelate filter; we use image-rendering on a scaled wrapper
  }
  if (f?.posterize && f.posterize > 0)
                           parts.push(`contrast(${1 + f.posterize * 0.2})`);
  if (f?.chromatic_aberration && f.chromatic_aberration > 0)
                           parts.push(`url(#kwikk-ca)`); // SVG filter, injected by scene root
  if (f?.noise && f.noise > 0)
                           parts.push(`url(#kwikk-noise)`); // SVG filter
  if (f?.duotone && elementId)
                           parts.push(`url(#kwikk-duotone-${elementId})`);
  if (f?.oil_paint)        parts.push(`url(#kwikk-oilpaint)`);
  if (f?.pencil_sketch)    parts.push(`url(#kwikk-sketch)`);
  if (f?.vhs_tracking)     parts.push(`url(#kwikk-ca)`);

  return parts.join(" ");
}

// ─── Vignette overlay ────────────────────────────────────────────────────────

/**
 * Returns inline CSS for a radial-gradient vignette overlay div.
 * Caller appends this div as a child of the element container.
 */
export function vignetteStyle(intensity: number): string {
  return [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "border-radius:inherit",
    `background:radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity.toFixed(2)}) 100%)`,
  ].join(";");
}

// ─── Text effects → CSS ──────────────────────────────────────────────────────

export interface TextEffectCSS {
  textShadow?: string;
  webkitTextStroke?: string;
  color?: string;
  background?: string;
  backgroundClip?: string;
  webkitBackgroundClip?: string;
  filter?: string;
  /** Extra wrapper class for effects that need keyframe animations */
  animationClass?: string;
}

export function buildTextEffectCSS(
  effect: TextEffectType | undefined,
  effectColor: string | undefined,
  effectIntensity: number | undefined,
  baseColor: string
): TextEffectCSS {
  if (!effect) return {};

  const color = effectColor ?? baseColor ?? "#ffffff";
  const intensity = effectIntensity ?? 0.8;

  switch (effect) {
    case "glow": {
      const d1 = Math.round(10 * intensity);
      const d2 = Math.round(20 * intensity);
      const d3 = Math.round(40 * intensity);
      return { textShadow: `0 0 ${d1}px ${color}, 0 0 ${d2}px ${color}, 0 0 ${d3}px ${color}` };
    }

    case "neon": {
      const d = Math.round(20 * intensity);
      return {
        textShadow: `0 0 4px #fff, 0 0 ${d}px ${color}, 0 0 ${d * 2}px ${color}`,
        color: "#fff",
      };
    }

    case "hollow":
      return {
        webkitTextStroke: `${Math.max(1, Math.round(2 * intensity))}px ${color}`,
        color: "transparent",
      };

    case "outline":
      return {
        webkitTextStroke: `${Math.max(1, Math.round(2 * intensity))}px ${color}`,
      };

    case "retro":
      return {
        textShadow: `3px 3px 0 ${color}, 5px 5px 0 ${darken(color, 0.3)}`,
        color: baseColor,
      };

    case "echo": {
      const off = Math.round(6 * intensity);
      return {
        textShadow: `${off}px ${off}px 0 ${hexToRgba(color, 0.5)}, ${off * 2}px ${off * 2}px 0 ${hexToRgba(color, 0.25)}`,
      };
    }

    case "scifi": {
      const d = Math.round(12 * intensity);
      return {
        textShadow: `0 0 ${d}px #0ff, 0 0 ${d * 2}px #0ff`,
        color: "#0ff",
      };
    }

    case "western":
      return {
        webkitTextStroke: `${Math.max(1, Math.round(2 * intensity))}px #8B6914`,
        textShadow: `2px 2px 0 #5a3e00`,
      };

    case "arcade":
      return {
        webkitTextStroke: `${Math.max(1, Math.round(2 * intensity))}px #000`,
        textShadow: `3px 3px 0 #000`,
      };

    case "gold":
      return {
        background: `linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f6d365 100%)`,
        backgroundClip: "text",
        webkitBackgroundClip: "text",
        color: "transparent",
        textShadow: `0 1px 2px rgba(0,0,0,0.3)`,
      };

    case "glitch":
      return {
        textShadow: `${Math.round(3 * intensity)}px 0 #f00, ${-Math.round(3 * intensity)}px 0 #00f`,
        color: baseColor,
      };

    case "matrix": {
      const d = Math.round(10 * intensity);
      return {
        color: "#00ff41",
        textShadow: `0 0 ${d}px #00ff41, 0 0 ${d * 2}px #00ff41`,
        filter: `brightness(1.1)`,
      };
    }

    case "frost": {
      const d = Math.round(16 * intensity);
      return {
        color: "#a8d8ea",
        textShadow: `0 0 ${d}px #a8d8ea, 0 0 ${Math.round(d * 0.5)}px #fff`,
      };
    }

    case "shadow_stack": {
      const s = Math.round(3 * intensity);
      return {
        textShadow: `${s}px ${s}px 0 ${color}, ${s * 2}px ${s * 2}px 0 rgba(0,0,0,0.4), ${s * 3}px ${s * 3}px 6px rgba(0,0,0,0.25)`,
      };
    }

    case "hologram": {
      const d = Math.round(14 * intensity);
      return {
        color: "#00ffcc",
        textShadow: `0 0 ${d}px #00ffcc, 0 0 ${d * 2}px #00ffcc`,
        filter: `brightness(1.2)`,
      };
    }

    case "chrome":
      return {
        background: `linear-gradient(180deg, #fff 0%, #aaa 40%, #fff 60%, #888 100%)`,
        backgroundClip: "text",
        webkitBackgroundClip: "text",
        color: "transparent",
        textShadow: `0 1px 3px rgba(0,0,0,0.3)`,
      };

    case "emboss":
      return {
        textShadow: `-2px -2px 0 rgba(255,255,255,0.6), 2px 2px 0 rgba(0,0,0,0.5)`,
        color: baseColor,
        filter: `contrast(1.2)`,
      };

    case "chalk":
      return {
        color: baseColor,
        textShadow: `1px 1px 2px rgba(0,0,0,0.3), -1px -1px 1px rgba(255,255,255,0.1)`,
        filter: `contrast(0.9) brightness(1.1)`,
      };

    case "spray_paint": {
      const d = Math.round(6 * intensity);
      return {
        textShadow: `0 0 ${d}px ${hexToRgba(color, 0.8)}, 1px 1px ${d}px ${hexToRgba(color, 0.4)}`,
        filter: `saturate(1.5)`,
      };
    }

    case "blood": {
      const d = Math.round(10 * intensity);
      return {
        color: "#cc0000",
        textShadow: `0 ${Math.round(8 * intensity)}px ${d}px rgba(136,0,0,0.7), 0 0 ${d}px rgba(136,0,0,0.5)`,
      };
    }

    case "ice": {
      const d = Math.round(12 * intensity);
      return {
        color: "#a8d8f0",
        textShadow: `0 0 ${d}px #fff, 0 0 ${d * 2}px #a8d8f0`,
        filter: `brightness(1.15)`,
      };
    }

    case "lava": {
      const d = Math.round(20 * intensity);
      return {
        color: "#ff4500",
        textShadow: `0 0 ${Math.round(d * 0.3)}px #ffee00, 0 0 ${d}px #ff6600, 0 0 ${d * 2}px #ff4500`,
        filter: `brightness(1.1)`,
      };
    }

    case "typewriter_ink":
      return {
        color: baseColor,
        textShadow: `1px 1px 1px rgba(26,26,46,0.4)`,
        filter: `contrast(1.2) brightness(0.95)`,
      };

    case "fire": {
      const d = Math.round(22 * intensity);
      return {
        color: "#ff6600",
        textShadow: [
          `0 0 ${Math.round(d * 0.3)}px #fff`,
          `0 0 ${Math.round(d * 0.5)}px #ff8c00`,
          `0 0 ${d}px #ff4500`,
          `0 0 ${d * 1.5}px #ff0000`,
        ].join(", "),
      };
    }

    case "pixel":
      // Pixelated rendering hint — renderer will apply image-rendering
      return { filter: `url(#kwikk-pixelate)` };

    case "cosmic": {
      const d = Math.round(18 * intensity);
      return {
        color: "#c39bd3",
        textShadow: `0 0 ${d}px #9b59b6, 0 0 ${d * 2}px #8e44ad`,
        filter: `brightness(1.1)`,
      };
    }

    default:
      return {};
  }
}

// ─── Background color helpers ────────────────────────────────────────────────

/** Converts a hex color + alpha (0-1) to an rgba() CSS string. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const len = h.length === 3 ? 1 : 2;
  const r = parseInt(h.substring(0, len) + (len === 1 ? h[0] : ""), 16);
  const g = parseInt(h.substring(len, len * 2) + (len === 1 ? h[len] : ""), 16);
  const b = parseInt(h.substring(len * 2, len * 3) + (len === 1 ? h[len * 2] : ""), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

/** Darkens a hex color by a fraction (0-1). */
function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const len = h.length === 3 ? 1 : 2;
  const r = Math.max(0, parseInt(h.substring(0, len), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(h.substring(len, len * 2), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(h.substring(len * 2, len * 3), 16) - Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

// ─── Scene-level SVG filter defs ─────────────────────────────────────────────

function hexToRGBNormalized(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const len = h.length === 3 ? 1 : 2;
  const r = parseInt(h.substring(0, len) + (len === 1 ? h[0] : ""), 16) / 255;
  const g = parseInt(h.substring(len, len * 2) + (len === 1 ? h[len] : ""), 16) / 255;
  const b = parseInt(h.substring(len * 2, len * 3) + (len === 1 ? h[len * 2] : ""), 16) / 255;
  return [r, g, b];
}

export function getDuotoneMatrixValues(color1: string, color2: string): string {
  const [r1, g1, b1] = hexToRGBNormalized(color1);
  const [r2, g2, b2] = hexToRGBNormalized(color2);
  const dr = r2 - r1;
  const dg = g2 - g1;
  const db = b2 - b1;
  const wR = 0.2126, wG = 0.7152, wB = 0.0722;
  return [
    wR * dr, wG * dr, wB * dr, 0, r1,
    wR * dg, wG * dg, wB * dg, 0, g1,
    wR * db, wG * db, wB * db, 0, b1,
    0, 0, 0, 1, 0
  ].map((v) => v.toFixed(4)).join(" ");
}

/**
 * Returns an SVG <defs> string containing all reusable filters used by the CSS renderer:
 * chromatic aberration, noise/grain, and pixelate.
 * Inject this once into the scene root element.
 */
export function buildSceneSVGFilterDefs(
  chromaticAberration = 0,
  filmGrain = 0
): string {
  const ca = Math.max(0, chromaticAberration) * 4;
  const grain = Math.max(0, filmGrain);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;pointer-events:none">
  <defs id="kwikk-svg-defs">
    <filter id="kwikk-ca" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feOffset in="SourceGraphic" dx="${ca}" dy="0" result="r" />
      <feOffset in="SourceGraphic" dx="${-ca}" dy="0" result="b" />
      <feBlend in="r" in2="SourceGraphic" mode="screen" result="rb" />
      <feBlend in="rb" in2="b" mode="screen" />
    </filter>
    <filter id="kwikk-noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
      <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
      <feBlend in="SourceGraphic" in2="grey" mode="overlay" result="blend" />
      <feComponentTransfer in="blend">
        <feFuncA type="linear" slope="${(grain * 0.4).toFixed(2)}" />
      </feComponentTransfer>
    </filter>
    <filter id="kwikk-pixelate">
      <feFlood x="4" y="4" height="2" width="2" />
      <feComposite width="8" height="8" />
      <feTile result="a" />
      <feComposite in="SourceGraphic" in2="a" operator="in" />
      <feMorphology operator="dilate" radius="4" />
    </filter>
    <filter id="kwikk-oilpaint" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced" />
      <feColorMatrix type="matrix" values="1.2 0 0 0 -0.1  0 1.2 0 0 -0.1  0 0 1.2 0 -0.1  0 0 0 1 0" in="displaced" />
    </filter>
    <filter id="kwikk-sketch" x="0%" y="0%" width="100%" height="100%">
      <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="gray" />
      <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" bias="0" preserveAlpha="true" in="gray" result="edges" />
      <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" in="edges" />
    </filter>
  </defs>
</svg>`;
}

// ─── CSS text styles from StyleProps ─────────────────────────────────────────

/** Maps StyleProps to a CSS object for inline style assignment on a text div. */
export function buildTextCSS(style: StyleProps): Record<string, string> {
  const css: Record<string, string> = {
    fontFamily: style.fontFamily ?? "Inter, sans-serif",
    fontSize: `${style.fontSize ?? 48}px`,
    fontWeight: String(style.fontWeight ?? 600),
    fontStyle: style.fontStyle ?? "normal",
    color: style.color ?? "#0f172a",
    textAlign: (style.textAlign ?? "left") as string,
    letterSpacing: `${style.letterSpacing ?? 0}px`,
    lineHeight: String(style.lineHeight ?? 1.2),
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    textRendering: "geometricPrecision",
    WebkitFontSmoothing: "antialiased",
  };

  if (style.textTransform && style.textTransform !== "none") {
    css.textTransform = style.textTransform;
  }

  if (style.backgroundColor && style.backgroundColor !== "transparent") {
    css.background = style.backgroundColor;
    css.borderRadius = `${style.borderRadius ?? 8}px`;
    css.padding = "4px 8px";
    css.boxSizing = "border-box";
  }

  if (style.textShadow) {
    const s = style.textShadow;
    css.textShadow = `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${hexToRgba(s.color, s.alpha ?? 1)}`;
  }

  if (style.textStroke) {
    css["-webkit-text-stroke"] = `${style.textStroke.width}px ${style.textStroke.color}`;
  }

  if (style.textGradient) {
    const g = style.textGradient;
    const stops = g.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
    css.background = g.type === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${g.angle ?? 0}deg, ${stops})`;
    css.backgroundClip = "text";
    css["-webkit-background-clip"] = "text";
    css.color = "transparent";
  }

  // Apply text effect CSS (merges over base styles)
  const effectCSS = buildTextEffectCSS(
    style.textEffect,
    style.textEffectColor,
    style.textEffectIntensity,
    style.color ?? "#ffffff"
  );

  if (effectCSS.textShadow) {
    // Append to existing text-shadow if any
    css.textShadow = css.textShadow
      ? `${css.textShadow}, ${effectCSS.textShadow}`
      : effectCSS.textShadow;
  }
  if (effectCSS.webkitTextStroke) css["-webkit-text-stroke"] = effectCSS.webkitTextStroke;
  if (effectCSS.color)            css.color = effectCSS.color;
  if (effectCSS.background)       css.background = effectCSS.background;
  if (effectCSS.backgroundClip)   { css.backgroundClip = effectCSS.backgroundClip; css["-webkit-background-clip"] = effectCSS.backgroundClip; }
  if (effectCSS.filter)           css.filter = effectCSS.filter;

  return css;
}
