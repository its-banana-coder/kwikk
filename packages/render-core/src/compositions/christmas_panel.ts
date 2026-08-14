import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

// 3-D rotating Christmas light panel — same Y-axis rotation as christmas_tree
// but the lights sit on a CYLINDER (constant radius) instead of a cone.
// A cylinder viewed face-on has a rectangular silhouette, so this fills the
// canvas as a square/full-screen panel of rotating colorful bulbs.

const LIGHT_COUNT = 200;

const BULB_COLORS = [0xff3333, 0x33ee55, 0x3399ff, 0xffdd22, 0xff55cc, 0xffffff, 0xff6600, 0xcc44ff];

type BulbNode = {
  container: import("pixi.js").Container;
  theta0: number;
  yFrac: number;
  r3d: number;
  bulbR: number;
  flashSpeed: number;
  flashPhase: number;
};

type ChristmasPanelState = {
  bulbs: BulbNode[];
  topY: number;
  bottomY: number;
  cx: number;
};

export function createChristmasPanelNode(
  ctx: RenderContext,
  comp: CompositionNode,
  _textureCache: Map<string, unknown>,
  _textureLoading: Set<string>,
  _normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;
  const cx = width / 2;

  const container = new pixi.Container();

  const topY = height * 0.01;
  const bottomY = height * 0.99;
  // Constant radius for all lights — cylinder not cone.
  // Same ratio as the tree base so the panel spans the full width face-on.
  const r3d = width * 0.44;
  // Scale bulb size proportionally to canvas (christmas_tree was designed at 360px wide)
  const sizeScale = width / 360;

  const bulbLayer = new pixi.Container();
  (bulbLayer as any).sortableChildren = true;
  container.addChild(bulbLayer);

  const bulbs: BulbNode[] = [];

  for (let i = 0; i < LIGHT_COUNT; i++) {
    const yFrac = i / (LIGHT_COUNT - 1);
    const theta0 = i * 2.399195; // golden angle ≈ 137.5° — evenly covers the cylinder
    const color = BULB_COLORS[i % BULB_COLORS.length];

    // Moderate size variation; does NOT grow with yFrac (panel is flat, not tapered)
    const bulbR = sizeScale * (3.5 + (i % 7) * 0.75);
    const auraR = bulbR * 2.6;

    const lc = new pixi.Container();
    lc.addChild(new pixi.Graphics().circle(0, 0, auraR).fill({ color, alpha: 0.28 }));
    lc.addChild(new pixi.Graphics().circle(0, 0, bulbR).fill({ color }));
    lc.addChild(
      new pixi.Graphics()
        .circle(-bulbR * 0.25, -bulbR * 0.25, bulbR * 0.32)
        .fill({ color: 0xffffff, alpha: 0.55 })
    );

    bulbLayer.addChild(lc);

    bulbs.push({
      container: lc,
      theta0,
      yFrac,
      r3d,
      bulbR,
      flashSpeed: 0.0016 + (i % 7) * 0.00035,
      flashPhase: i * 0.91,
    });
  }

  (container as any)._christmasPanelState = {
    bulbs,
    topY,
    bottomY,
    cx,
  } satisfies ChristmasPanelState;

  return container;
}

export function updateChristmasPanelNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._christmasPanelState as ChristmasPanelState | undefined;
  if (!state) return;

  const { bulbs, topY, bottomY, cx } = state;
  const compStart = comp.startMs ?? 0;
  const speed = comp.params?.speed ?? 1;
  const elapsed = Math.max(0, localTimeMs - compStart) * speed;

  const panelH = bottomY - topY;
  const rotAngle = elapsed * 0.000698; // same rotation speed as christmas_tree (~9s per revolution)
  const bulbSize = comp.params?.bulbSize ?? 1;

  for (const b of bulbs) {
    const angle = b.theta0 + rotAngle;
    const x3d = b.r3d * Math.cos(angle);
    const z3d = b.r3d * Math.sin(angle);

    b.container.x = cx + x3d;
    b.container.y = topY + b.yFrac * panelH;

    const depth = (z3d + b.r3d) / (2 * b.r3d + 0.001);

    b.container.scale.set((0.38 + depth * 0.88) * bulbSize);

    const flash = 0.6 + 0.4 * Math.sin(elapsed * b.flashSpeed + b.flashPhase);
    b.container.alpha = (0.3 + depth * 0.7) * flash;

    b.container.zIndex = Math.round(depth * 1000);
  }
}
