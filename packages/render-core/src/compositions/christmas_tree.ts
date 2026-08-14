import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

// 3-D rotating Christmas tree — lights only, transparent background, no star.
// Bulbs spiral on a cone surface; the tree rotates continuously around Y axis.

const LIGHT_COUNT = 72;

const BULB_COLORS = [0xff3333, 0x33ee55, 0x3399ff, 0xffdd22, 0xff55cc, 0xffffff];

type BulbNode = {
  container: import("pixi.js").Container;
  theta0: number;
  yFrac: number;
  r3d: number;
  bulbR: number;
  flashSpeed: number;
  flashPhase: number;
};

type ChristmasTreeState = {
  bulbs: BulbNode[];
  apexY: number;
  baseY: number;
  cx: number;
};

export function createChristmasTreeNode(
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

  // ── Bulb layer (3-D projection) ────────────────────────────────────────────
  const apexY = height * 0.06;
  const baseY = height * 0.92;
  const maxR3d = width * 0.44;

  const bulbLayer = new pixi.Container();
  (bulbLayer as any).sortableChildren = true;
  container.addChild(bulbLayer);

  const bulbs: BulbNode[] = [];

  for (let i = 0; i < LIGHT_COUNT; i++) {
    const yFrac = i / (LIGHT_COUNT - 1);
    const theta0 = i * 2.399195; // golden angle ≈ 137.5°
    const r3d = maxR3d * Math.pow(yFrac, 0.9);
    const color = BULB_COLORS[i % BULB_COLORS.length];

    const bulbR = 3.5 + yFrac * 4.5;
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

  (container as any)._christmasTreeState = {
    bulbs,
    apexY,
    baseY,
    cx,
  } satisfies ChristmasTreeState;

  return container;
}

export function updateChristmasTreeNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._christmasTreeState as ChristmasTreeState | undefined;
  if (!state) return;

  const { bulbs, apexY, baseY, cx } = state;
  const compStart = comp.startMs ?? 0;
  const speed = comp.params?.speed ?? 1;
  const elapsed = Math.max(0, localTimeMs - compStart) * speed;

  const treeH = baseY - apexY;
  const rotAngle = elapsed * 0.000698; // ~9s per full rotation

  for (const b of bulbs) {
    const angle = b.theta0 + rotAngle;
    const x3d = b.r3d * Math.cos(angle);
    const z3d = b.r3d * Math.sin(angle);

    b.container.x = cx + x3d;
    b.container.y = apexY + b.yFrac * treeH;

    const depth = (z3d + b.r3d) / (2 * b.r3d + 0.001);

    b.container.scale.set(0.38 + depth * 0.88);

    const flash = 0.6 + 0.4 * Math.sin(elapsed * b.flashSpeed + b.flashPhase);
    b.container.alpha = (0.3 + depth * 0.7) * flash;

    b.container.zIndex = Math.round(depth * 1000);
  }
}
