import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

// Gift-reveal composition — ported from codepen/giftstyle.
// Three phases driven by localTimeMs:
//   Phase 1  [0, timerMs)           — gift static, gentle bob
//   Phase 2  [timerMs, +2000ms)     — hat flies upper-left, box drops down
//   Phase 3  [timerMs+2000ms, ∞)    — winter scene: snow + customisable text

// ── Constants ────────────────────────────────────────────────────────────────
const OPEN_DURATION_MS = 2000;
const SNOW_COUNT = 50;

// ── SVG → fraction coordinate table ─────────────────────────────────────────
// Source: codepen/giftstyle/index.html — <div class="gift"> viewBox="-20 -50 490 557"
// x_frac = (svgX + 20) / 490,  y_frac = (svgY + 50) / 557

const BOX_POLY_F   = [0.080, 0.485, 0.142, 0.911, 0.847, 0.911, 0.930, 0.435];
const BOX_SHADOW_F = [0.907, 0.567, 0.902, 0.596, 0.102, 0.634, 0.099, 0.615];
const HAT_RIBBON_F = [0.041, 0.450, 0.069, 0.618, 0.924, 0.566, 0.959, 0.365];

// [x_frac, y_frac, r_frac]  r_frac = r_svg / 490
const BOX_DOTS: [number, number, number][] = [
  [0.169, 0.648, 0.003],  [0.171, 0.739, 0.0043],
  [0.262, 0.639, 0.0055], [0.261, 0.697, 0.0059],
  [0.204, 0.689, 0.003],  [0.186, 0.847, 0.0051],
  [0.240, 0.764, 0.0045], [0.187, 0.813, 0.0045],
  [0.328, 0.845, 0.0053], [0.412, 0.633, 0.0051],
  [0.441, 0.746, 0.0061], [0.503, 0.641, 0.0063],
  [0.559, 0.701, 0.0059], [0.520, 0.810, 0.0053],
  [0.618, 0.757, 0.0053], [0.610, 0.641, 0.0045],
  [0.796, 0.628, 0.0053], [0.684, 0.699, 0.0049],
  [0.694, 0.636, 0.0049], [0.843, 0.631, 0.0063],
  [0.836, 0.770, 0.0061], [0.731, 0.727, 0.0071],
  [0.655, 0.808, 0.0057], [0.798, 0.816, 0.0076],
  [0.778, 0.877, 0.0069],
];

// ── Utilities ────────────────────────────────────────────────────────────────
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }
function easeInQuad(t: number) { const c = clamp01(t); return c * c; }
function easeOutCubic(t: number) { const c = clamp01(t); return 1 - (1 - c) ** 3; }
function hexToInt(hex: string) { return parseInt(hex.replace("#", ""), 16); }
function polyPts(fracs: number[], W: number, H: number) {
  const pts: number[] = [];
  for (let i = 0; i < fracs.length; i += 2) pts.push(fracs[i] * W, fracs[i + 1] * H);
  return pts;
}

// Seeded LCG — no Math.random() allowed in create/update
function makePrng(seed: number) {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };
}

// ── State ────────────────────────────────────────────────────────────────────
type Snowflake = {
  g: import("pixi.js").Graphics;
  xFrac: number;
  y0: number;
  speed: number; // px / ms
};

type GiftRevealState = {
  giftWrapper: import("pixi.js").Container;
  giftDarkBg: import("pixi.js").Graphics;
  hatContainer: import("pixi.js").Container;
  boxContainer: import("pixi.js").Container;
  sceneContainer: import("pixi.js").Container;
  snowflakes: Snowflake[];
  hatPivotX: number;
  hatPivotY: number;
  width: number;
  height: number;
  timerMs: number;
};

// ── Create ───────────────────────────────────────────────────────────────────
export function createGiftRevealNode(
  ctx: RenderContext,
  comp: CompositionNode,
  _textureCache: Map<string, unknown>,
  _textureLoading: Set<string>,
  _normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width: W, height: H } = comp.layout;

  const timerMs   = comp.params?.timerMs ?? 3000;
  const ribbonInt = hexToInt(comp.params?.colorOverrides?.accentColor ?? "#E9454F");
  const boxInt    = hexToInt(comp.params?.colorOverrides?.pageColor   ?? "#B8CDB7");
  const sceneBg   = hexToInt(comp.params?.colorOverrides?.bgColor     ?? "#BFE2DC");
  const textColor = comp.params?.colorOverrides?.textColor ?? "#1D1F3F";
  const msgText   = comp.params?.displayText ?? "HAPPY NEW YEAR!";
  const fontFamily = comp.params?.fontOverride ?? "Inter, Arial, sans-serif";

  const HAT_BOW_C  = 0xC3373E;
  const HAT_DOT_C  = 0xF0F2C2;
  const DOT_C      = 0xFAEECD;
  const SHADOW_C   = 0xA4BBA7;

  const root = new pixi.Container();

  // ── Scene (behind gift, fades in during opening) ──────────────────────────
  const sceneContainer = new pixi.Container();
  sceneContainer.alpha = 0;

  sceneContainer.addChild(new pixi.Graphics().rect(0, 0, W, H).fill({ color: sceneBg }));

  const snowLayer = new pixi.Container();
  sceneContainer.addChild(snowLayer);
  const rng = makePrng(0xC0FFEE);
  const snowflakes: Snowflake[] = [];
  for (let i = 0; i < SNOW_COUNT; i++) {
    const r = 1.5 + rng() * 5;
    const g = new pixi.Graphics().circle(0, 0, r).fill({ color: 0xFFFFFF, alpha: 0.6 + rng() * 0.4 });
    const xFrac = rng();
    const y0    = rng() * H;
    const speed = 0.012 + rng() * 0.038;
    g.x = xFrac * W;
    g.y = y0;
    snowLayer.addChild(g);
    snowflakes.push({ g, xFrac, y0, speed });
  }

  // Message text — no entrance animation, just appears
  const fontSize = Math.round(Math.min(W * 0.11, H * 0.085, 72));
  const label = new pixi.Text({
    text: msgText,
    style: {
      fill: textColor,
      fontSize,
      fontFamily,
      fontWeight: "700",
      align: "center",
      wordWrap: true,
      wordWrapWidth: W * 0.82,
    },
  });
  label.anchor.set(0.5, 0.5);
  label.x = W / 2;
  label.y = H / 2;
  sceneContainer.addChild(label);

  root.addChild(sceneContainer);

  // ── Gift wrapper ──────────────────────────────────────────────────────────
  const giftWrapper = new pixi.Container();

  const giftDarkBg = new pixi.Graphics().rect(0, 0, W, H).fill({ color: 0x080810 });
  giftWrapper.addChild(giftDarkBg);

  // ── Box body ──────────────────────────────────────────────────────────────
  const boxContainer = new pixi.Container();

  boxContainer.addChild(
    new pixi.Graphics().poly(polyPts(BOX_POLY_F, W, H)).fill({ color: boxInt })
  );
  boxContainer.addChild(
    new pixi.Graphics().poly(polyPts(BOX_SHADOW_F, W, H)).fill({ color: SHADOW_C })
  );
  for (const [xf, yf, rf] of BOX_DOTS) {
    boxContainer.addChild(
      new pixi.Graphics().circle(xf * W, yf * H, rf * W).fill({ color: DOT_C })
    );
  }

  // ── Hat (lid + bow) ───────────────────────────────────────────────────────
  const hatContainer = new pixi.Container();

  // Bow — two lobes + knot + ribbon tails
  const bowCx = W * 0.50, bowCy = H * 0.21;
  const lobeRx = W * 0.195, lobeRy = H * 0.115;
  hatContainer.addChild(
    new pixi.Graphics().ellipse(bowCx - lobeRx * 0.7, bowCy, lobeRx, lobeRy).fill({ color: HAT_BOW_C })
  );
  hatContainer.addChild(
    new pixi.Graphics().ellipse(bowCx + lobeRx * 0.7, bowCy, lobeRx, lobeRy).fill({ color: HAT_BOW_C })
  );
  hatContainer.addChild(
    new pixi.Graphics().circle(bowCx, bowCy, W * 0.048).fill({ color: HAT_BOW_C })
  );
  // Tails dropping from knot to ribbon
  const tailW = W * 0.028;
  hatContainer.addChild(
    new pixi.Graphics()
      .poly([
        bowCx - tailW,     bowCy + H * 0.032,
        bowCx - tailW * 1.6, H * 0.405,
        bowCx - tailW * 0.2, H * 0.405,
        bowCx + tailW * 0.4, bowCy + H * 0.032,
      ])
      .fill({ color: HAT_BOW_C })
  );
  hatContainer.addChild(
    new pixi.Graphics()
      .poly([
        bowCx - tailW * 0.4, bowCy + H * 0.032,
        bowCx + tailW * 0.2, H * 0.405,
        bowCx + tailW * 1.6, H * 0.405,
        bowCx + tailW,     bowCy + H * 0.032,
      ])
      .fill({ color: HAT_BOW_C })
  );

  // Red ribbon trapezoid
  hatContainer.addChild(
    new pixi.Graphics().poly(polyPts(HAT_RIBBON_F, W, H)).fill({ color: ribbonInt })
  );

  // Decorative cream dots on ribbon (replacing the original letter paths)
  const ribbonMidY = H * 0.505;
  for (let i = 0; i < 9; i++) {
    const xf = 0.14 + i * 0.092;
    hatContainer.addChild(
      new pixi.Graphics()
        .circle(xf * W, ribbonMidY, W * 0.006)
        .fill({ color: HAT_DOT_C })
    );
  }

  // Hat pivot: left-bottom corner of the ribbon (matches original transformOrigin)
  const hatPivotX = HAT_RIBBON_F[0] * W; // 0.041 * W
  const hatPivotY = HAT_RIBBON_F[3] * H; // 0.618 * H
  hatContainer.pivot.set(hatPivotX, hatPivotY);
  hatContainer.position.set(hatPivotX, hatPivotY);

  giftWrapper.addChild(boxContainer);
  giftWrapper.addChild(hatContainer);
  root.addChild(giftWrapper);

  (root as any)._giftRevealState = {
    giftWrapper,
    giftDarkBg,
    hatContainer,
    boxContainer,
    sceneContainer,
    snowflakes,
    hatPivotX,
    hatPivotY,
    width: W,
    height: H,
    timerMs,
  } satisfies GiftRevealState;

  return root;
}

// ── Update ───────────────────────────────────────────────────────────────────
export function updateGiftRevealNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._giftRevealState as GiftRevealState | undefined;
  if (!state) return;

  const {
    giftWrapper, giftDarkBg, hatContainer, boxContainer,
    sceneContainer, snowflakes,
    hatPivotX, hatPivotY,
    width: W, height: H, timerMs,
  } = state;

  const compStart = comp.startMs ?? 0;
  const speed     = comp.params?.speed ?? 1;
  const elapsed   = Math.max(0, localTimeMs - compStart) * speed;

  // Reset all animated properties before applying new state
  giftWrapper.visible  = true;
  giftWrapper.alpha    = 1;
  giftWrapper.y        = 0;
  giftDarkBg.alpha     = 1;
  hatContainer.position.set(hatPivotX, hatPivotY);
  hatContainer.rotation = 0;
  hatContainer.alpha    = 1;
  boxContainer.position.set(0, 0);
  boxContainer.alpha    = 1;
  sceneContainer.alpha  = 0;

  const phaseT = elapsed - timerMs; // negative = gift not yet opening

  if (phaseT < 0) {
    // ── Phase 1: static gift with gentle bob ──────────────────────────────
    giftWrapper.y = Math.sin(elapsed * 0.0018) * 4;

  } else if (phaseT < OPEN_DURATION_MS) {
    // ── Phase 2: opening animation ────────────────────────────────────────
    const p = clamp01(phaseT / OPEN_DURATION_MS);

    // Hat: rotate around left-bottom pivot and fly upper-left
    const hatP = easeInQuad(p);
    hatContainer.position.x = hatPivotX - hatP * W * 0.60;
    hatContainer.position.y = hatPivotY - hatP * H * 0.78;
    hatContainer.rotation   = -hatP * 1.40; // ~-80°
    hatContainer.alpha      = 1 - clamp01((p - 0.40) / 0.60);

    // Box: drop straight down
    const boxP = easeInQuad(p);
    boxContainer.position.y = boxP * H * 0.88;
    boxContainer.alpha      = 1 - clamp01((p - 0.30) / 0.70);

    // Dark bg fades away
    giftDarkBg.alpha = 1 - easeOutCubic(clamp01(p * 1.4));

    // Scene fades in from 40% into the opening
    sceneContainer.alpha = easeOutCubic(clamp01((p - 0.40) / 0.60));

    // Snow animates relative to opening start
    for (const flake of snowflakes) {
      flake.g.y = (flake.y0 + phaseT * flake.speed) % H;
    }

  } else {
    // ── Phase 3: full scene ───────────────────────────────────────────────
    giftWrapper.visible = false;
    sceneContainer.alpha = 1;

    for (const flake of snowflakes) {
      flake.g.y = (flake.y0 + phaseT * flake.speed) % H;
    }
  }
}
