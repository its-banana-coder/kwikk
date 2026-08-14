import type { ShapeKind } from "@kwikk/shared-types";

/** Returns the inner SVG markup (path/circle/rect/etc.) for a given shape. */
export function svgShapeMarkup(
  shape: ShapeKind,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  radius: number
): string {
  switch (shape) {
    case "circle": {
      const r = Math.min(w, h) / 2;
      return `<circle cx="${w / 2}" cy="${h / 2}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }
    case "ellipse":
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;

    case "triangle":
      return `<polygon points="${w / 2},0 ${w},${h} 0,${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;

    case "diamond":
      return `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;

    case "star": {
      const pts = starPoints(w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 2 * 0.4, 5);
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "hexagon": {
      const pts = regularPolygonPoints(w / 2, h / 2, Math.min(w, h) / 2, 6, -Math.PI / 6);
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "pentagon": {
      const pts = regularPolygonPoints(w / 2, h / 2, Math.min(w, h) / 2, 5, -Math.PI / 2);
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "octagon": {
      const pts = regularPolygonPoints(w / 2, h / 2, Math.min(w, h) / 2, 8, -Math.PI / 8);
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "starburst": {
      const pts = starPoints(w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 2 * 0.5, 12);
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "arrow": {
      const aw = w * 0.35, ah = h * 0.3;
      const pts = [
        `0,${h / 2 - ah / 2}`,
        `${w - aw},${h / 2 - ah / 2}`,
        `${w - aw},${h / 2 - ah}`,
        `${w},${h / 2}`,
        `${w - aw},${h / 2 + ah}`,
        `${w - aw},${h / 2 + ah / 2}`,
        `0,${h / 2 + ah / 2}`,
      ].join(" ");
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "line":
      return `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${fill || stroke}" stroke-width="${Math.max(strokeWidth, 4)}" stroke-linecap="round" />`;

    case "speech_bubble": {
      const tailH = h * 0.2;
      const bodyH = h - tailH;
      const r2 = radius || 12;
      return `<path d="M${r2},0 H${w - r2} Q${w},0 ${w},${r2} V${bodyH - r2} Q${w},${bodyH} ${w - r2},${bodyH} H${w * 0.35} L${w * 0.18},${h} L${w * 0.18},${bodyH} H${r2} Q0,${bodyH} 0,${bodyH - r2} V${r2} Q0,0 ${r2},0 Z" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "heart": {
      const pts = heartPath(w, h);
      return `<path d="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "cross": {
      const t = w * 0.3, b = w - t;
      const mt = h * 0.3, mb = h - mt;
      const pts = `${t},0 ${b},0 ${b},${mt} ${w},${mt} ${w},${mb} ${b},${mb} ${b},${h} ${t},${h} ${t},${mb} 0,${mb} 0,${mt} ${t},${mt}`;
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "cloud": {
      const d = cloudPath(w, h);
      return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "parallelogram": {
      const skew = w * 0.2;
      return `<polygon points="${skew},0 ${w},0 ${w - skew},${h} 0,${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "badge": {
      const pts = starPoints(w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 2 * 0.88, 16);
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }

    case "rectangle":
    default:
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
  }
}

/** Builds a complete inline SVG string for a shape element. */
export function buildShapeSVG(
  shape: ShapeKind,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  radius: number,
  filterId?: string
): string {
  const filterAttr = filterId ? ` filter="url(#${filterId})"` : "";
  const inner = svgShapeMarkup(shape, w, h, fill, stroke, strokeWidth, radius);
  // Wrap inner element in a group with the filter applied
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;display:block">`
    + `<g${filterAttr}>${inner}</g>`
    + `</svg>`;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function regularPolygonPoints(cx: number, cy: number, r: number, sides: number, startAngle: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = startAngle + (i / sides) * Math.PI * 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function heartPath(w: number, h: number): string {
  // SVG cubic bezier heart
  const cx = w / 2, top = h * 0.25;
  return [
    `M ${cx},${h * 0.95}`,
    `C ${w * 0.05},${h * 0.6} 0,${h * 0.35} ${w * 0.25},${top}`,
    `C ${w * 0.35},${h * 0.1} ${cx},${h * 0.2} ${cx},${h * 0.3}`,
    `C ${cx},${h * 0.2} ${w * 0.65},${h * 0.1} ${w * 0.75},${top}`,
    `C ${w},${h * 0.35} ${w * 0.95},${h * 0.6} ${cx},${h * 0.95} Z`,
  ].join(" ");
}

function cloudPath(w: number, h: number): string {
  // Approximated cloud via arc-based path
  const r1 = w * 0.18, r2 = w * 0.22, r3 = w * 0.16;
  const baseY = h * 0.75;
  return [
    `M ${w * 0.12},${baseY}`,
    `a ${r1},${r1} 0 0,1 ${r1 * 0.3},${-r1 * 1.6}`,
    `a ${r2},${r2} 0 0,1 ${r2 * 1.4},${-r2 * 0.2}`,
    `a ${r2},${r2} 0 0,1 ${r2 * 1.1},${r2 * 0.8}`,
    `a ${r3},${r3} 0 0,1 ${-r3 * 0.2},${r3 * 1.1}`,
    `Z`,
  ].join(" ");
}
