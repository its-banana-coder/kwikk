import type { CompositionNode } from "@kwikk/shared-types";
import type { RenderContext } from "../index";

const SHELL_COUNT = 10;
const STAR_COUNT = 28;
const SPARK_COUNT = 14;
const LAUNCH_GAP_MS = 820;
const LOOP_MS = SHELL_COUNT * LAUNCH_GAP_MS;

const PALETTE = [0xff4d6d, 0x54d2ff, 0xffd166, 0x8aff80, 0xc084fc, 0xffffff];

type Variant = "peony" | "willow" | "crossette" | "crackle";

type ShellState = {
  container: import("pixi.js").Container;
  trail: import("pixi.js").Graphics;
  rocket: import("pixi.js").Container;
  stars: import("pixi.js").Container[];
  sparks: import("pixi.js").Container[];
  launchX: number;
  launchArc: number;
  burstY: number;
  color: number;
  variant: Variant;
  rocketMs: number;
  lifetimeMs: number;
  burstRadius: number;
  gravity: number;
  phase: number;
};

type FireworksState = {
  shells: ShellState[];
  baseY: number;
};

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function easeOutQuad(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  return 1 - (1 - p) * (1 - p);
}

function normalizeProgress(elapsed: number, delayMs: number, loopMs: number): number {
  const raw = (elapsed - delayMs) % loopMs;
  return raw < 0 ? raw + loopMs : raw;
}

export function resolveFireworksShellState(
  localTimeMs: number,
  compStartMs: number,
  shellIndex: number,
  speed = 1
): { sinceLaunchMs: number; active: boolean } {
  const elapsed = Math.max(0, localTimeMs - compStartMs) * speed;
  const sinceLaunchMs = normalizeProgress(elapsed, shellIndex * LAUNCH_GAP_MS, LOOP_MS);
  return {
    sinceLaunchMs,
    active: sinceLaunchMs < 1600,
  };
}

function buildParticle(pixi: any, color: number, radius: number, glowAlpha: number): import("pixi.js").Container {
  const particle = new pixi.Container();
  particle.addChild(new pixi.Graphics().circle(0, 0, radius * 2.6).fill({ color, alpha: glowAlpha }));
  particle.addChild(new pixi.Graphics().circle(0, 0, radius).fill({ color }));
  return particle;
}

export function createFireworksNode(
  ctx: RenderContext,
  comp: CompositionNode,
  _textureCache: Map<string, unknown>,
  _textureLoading: Set<string>,
  _normalizeAssetSrc: (src: string | undefined) => string | undefined
): import("pixi.js").Container {
  const pixi = ctx.pixi;
  const { width, height } = comp.layout;
  const container = new pixi.Container();
  const baseY = height * 0.94;

  const shells: ShellState[] = [];
  for (let i = 0; i < SHELL_COUNT; i++) {
    const shell = new pixi.Container();
    const trail = new pixi.Graphics();
    shell.addChild(trail);

    const color = PALETTE[Math.floor(hash01(i + 1) * PALETTE.length) % PALETTE.length];
    const rocket = buildParticle(pixi, color, 3.2, 0.28);
    shell.addChild(rocket);

    const stars: import("pixi.js").Container[] = [];
    for (let s = 0; s < STAR_COUNT; s++) {
      const star = buildParticle(pixi, color, 2.4 + hash01((i + 1) * 100 + s) * 1.8, 0.22);
      star.visible = false;
      shell.addChild(star);
      stars.push(star);
    }

    const sparks: import("pixi.js").Container[] = [];
    for (let s = 0; s < SPARK_COUNT; s++) {
      const spark = buildParticle(pixi, 0xfff2c6, 1.2 + hash01((i + 1) * 200 + s) * 0.8, 0.18);
      spark.visible = false;
      shell.addChild(spark);
      sparks.push(spark);
    }

    shell.visible = false;
    container.addChild(shell);

    const launchX = width * (0.16 + hash01(i + 11) * 0.68);
    const launchArc = (hash01(i + 21) - 0.5) * width * 0.12;
    const burstY = height * (0.18 + hash01(i + 31) * 0.36);
    const variantPick = hash01(i + 41);
    const variant: Variant =
      variantPick < 0.25 ? "willow" :
      variantPick < 0.5 ? "crossette" :
      variantPick < 0.75 ? "crackle" :
      "peony";

    shells.push({
      container: shell,
      trail,
      rocket,
      stars,
      sparks,
      launchX,
      launchArc,
      burstY,
      color,
      variant,
      rocketMs: 560 + Math.round(hash01(i + 51) * 180),
      lifetimeMs: 1500 + Math.round(hash01(i + 61) * 240),
      burstRadius: width * (0.08 + hash01(i + 71) * 0.07),
      gravity: height * (0.06 + hash01(i + 81) * 0.04),
      phase: hash01(i + 91) * Math.PI * 2,
    });
  }

  (container as any)._fireworksState = { shells, baseY } satisfies FireworksState;
  return container;
}

export function updateFireworksNode(
  node: import("pixi.js").Container,
  comp: CompositionNode,
  localTimeMs: number,
  _sceneDurationMs: number
): void {
  const state = (node as any)._fireworksState as FireworksState | undefined;
  if (!state) return;

  const speed = comp.params?.speed ?? 1;
  const compStart = comp.startMs ?? 0;

  for (let i = 0; i < state.shells.length; i++) {
    const shell = state.shells[i];
    const timing = resolveFireworksShellState(localTimeMs, compStart, i, speed);

    if (!timing.active || timing.sinceLaunchMs >= shell.lifetimeMs) {
      shell.container.visible = false;
      continue;
    }

    shell.container.visible = true;
    shell.trail.clear();
    shell.rocket.visible = true;
    shell.sparks.forEach((spark) => { spark.visible = false; });

    const launchMs = Math.min(shell.rocketMs, shell.lifetimeMs * 0.45);
    if (timing.sinceLaunchMs <= launchMs) {
      const p = easeOutQuad(timing.sinceLaunchMs / launchMs);
      const x = shell.launchX + shell.launchArc * p;
      const y = state.baseY - (state.baseY - shell.burstY) * p;
      const tailY = Math.min(state.baseY, y + 34 + (1 - p) * 28);

      shell.rocket.x = x;
      shell.rocket.y = y;
      shell.rocket.alpha = 0.92;
      shell.rocket.scale.set(0.85 + p * 0.35);

      shell.trail
        .moveTo(x, tailY)
        .lineTo(x - shell.launchArc * 0.08, y + 6)
        .stroke({ color: shell.color, width: 2.2, alpha: 0.34 + (1 - p) * 0.22, cap: "round" });

      shell.stars.forEach((star) => { star.visible = false; });
      continue;
    }

    shell.rocket.visible = false;
    const burstP = Math.max(0, Math.min(1, (timing.sinceLaunchMs - launchMs) / Math.max(1, shell.lifetimeMs - launchMs)));
    const radiusP = easeOutQuad(burstP);

    for (let s = 0; s < shell.stars.length; s++) {
      const star = shell.stars[s];
      const angle = (Math.PI * 2 * s) / shell.stars.length + shell.phase;
      const spread = 0.72 + hash01((i + 1) * 300 + s) * 0.46;
      let r = shell.burstRadius * radiusP * spread;
      let x = shell.launchX + shell.launchArc;
      let y = shell.burstY;
      let alpha = 1 - burstP;

      if (shell.variant === "willow") {
        r *= 0.76;
        x += Math.cos(angle) * r;
        y += Math.sin(angle) * r * 0.55 + shell.gravity * burstP * burstP * 1.7;
        alpha = 1 - burstP * 0.82;
      } else if (shell.variant === "crossette") {
        x += Math.cos(angle) * r;
        y += Math.sin(angle) * r + shell.gravity * burstP * burstP * 0.72;
        const splitP = Math.max(0, (burstP - 0.45) / 0.55);
        const branch = 12 + 24 * splitP;
        x += Math.cos(angle + Math.PI / 2) * branch * Math.sign(Math.sin(angle * 2));
        y += Math.sin(angle + Math.PI / 2) * branch * Math.sign(Math.cos(angle * 2));
      } else if (shell.variant === "crackle") {
        r *= 0.92;
        x += Math.cos(angle) * r;
        y += Math.sin(angle) * r + shell.gravity * burstP * burstP * 0.82;
        alpha = 1 - burstP * 1.08;
      } else {
        x += Math.cos(angle) * r;
        y += Math.sin(angle) * r + shell.gravity * burstP * burstP * 0.68;
      }

      star.visible = true;
      star.x = x;
      star.y = y;
      star.alpha = Math.max(0, alpha);
      const scale = shell.variant === "willow" ? 0.9 + (1 - burstP) * 0.55 : 0.8 + (1 - burstP) * 0.42;
      star.scale.set(scale);
    }

    if (shell.variant === "crackle") {
      for (let s = 0; s < shell.sparks.length; s++) {
        const spark = shell.sparks[s];
        const angle = shell.phase + (Math.PI * 2 * s) / shell.sparks.length;
        const sparkP = Math.max(0, (burstP - 0.12) / 0.88);
        const radius = shell.burstRadius * 0.4 * sparkP * (0.7 + hash01((i + 1) * 500 + s));
        spark.visible = true;
        spark.x = shell.launchX + shell.launchArc + Math.cos(angle) * radius;
        spark.y = shell.burstY + Math.sin(angle) * radius + shell.gravity * sparkP * sparkP * 0.5;
        spark.alpha = Math.max(0, 0.8 - burstP);
        spark.scale.set(0.8 + (1 - burstP) * 0.5);
      }
    }
  }
}
