import { resolveElementNodeAtTime } from "@kwikk/animation-engine";
import type { ElementNode, ProjectDocument, Viewport } from "@kwikk/shared-types";
import type {
  Application as PixiApplication,
  Container as PixiContainer,
  Graphics as PixiGraphics,
  TextStyleFontWeight
} from "pixi.js";
import { getActiveSceneWindow } from "@kwikk/timeline";

export interface RenderFrameInput {
  timeMs: number;
  showAllElements?: boolean;
}

export interface ResolvedRenderFrame {
  timeMs: number;
  sceneId: string | null;
  viewport: Viewport;
  backgroundColor: string;
  elements: ElementNode[];
}

export interface PixiSceneRendererOptions {
  backgroundColor?: string;
}

type PixiModule = typeof import("pixi.js");

function normalizeFontWeight(value: string | number | undefined): TextStyleFontWeight | undefined {
  if (typeof value === "number") {
    return String(value) as TextStyleFontWeight;
  }

  if (typeof value === "string") {
    return value as TextStyleFontWeight;
  }

  return undefined;
}

function createRoundedRect(
  pixi: PixiModule,
  width: number,
  height: number,
  color: string,
  alpha = 1
): PixiGraphics {
  return new pixi.Graphics().roundRect(0, 0, width, height, 24).fill({ color, alpha });
}

function createTextNode(pixi: PixiModule, element: ElementNode): PixiContainer {
  const container = new pixi.Container();
  const backgroundColor = element.style.backgroundColor;

  if (backgroundColor && backgroundColor !== "transparent") {
    container.addChild(
      createRoundedRect(pixi, element.layout.width, element.layout.height, backgroundColor, 0.95)
    );
  }

  const align = element.style.textAlign ?? "left";

  const text = new pixi.Text({
    text: element.content?.text ?? element.semanticRole ?? element.id,
    style: {
      fill: element.style.color ?? "#0f172a",
      fontFamily: element.style.fontFamily ?? "Inter",
      fontSize: element.style.fontSize ?? 48,
      fontWeight: normalizeFontWeight(element.style.fontWeight) ?? "600",
      fontStyle: (element.style.fontStyle ?? "normal") as any,
      align: align as any,
      wordWrap: true,
      wordWrapWidth: element.layout.width
    }
  });

  if (align === "center") {
    text.anchor.x = 0.5;
    text.x = element.layout.width / 2;
  } else if (align === "right") {
    text.anchor.x = 1;
    text.x = element.layout.width;
  } else {
    text.anchor.x = 0;
    text.x = 0;
  }

  container.addChild(text);
  return container;
}

function createPlaceholderNode(
  pixi: PixiModule,
  element: ElementNode,
  fillColor: string,
  label: string
): PixiContainer {
  const container = new pixi.Container();
  const box = createRoundedRect(pixi, element.layout.width, element.layout.height, fillColor, 0.95);
  const text = new pixi.Text({
    text: label,
    style: {
      fill: "#0f172a",
      fontFamily: "Inter",
        fontSize: 32,
        fontWeight: "600",
        fontStyle: "normal",
      wordWrap: true,
      wordWrapWidth: Math.max(120, element.layout.width - 32)
    }
  });

  text.x = 16;
  text.y = 16;
  container.addChild(box, text);
  return container;
}

function createShapeNode(pixi: PixiModule, element: ElementNode): PixiContainer {
  const container = new pixi.Container();
  const { width, height } = element.layout;
  const fillColor = element.style.backgroundColor ?? "#334155";
  const radius = element.style.borderRadius ?? 8;
  const fillPattern = element.style.fillPattern ?? "solid";
  const fillColor2 = element.style.fillColor2;
  const borderColor = element.style.borderColor;
  const borderWidth = element.style.borderWidth ?? 0;

  // Base fill
  const base = new pixi.Graphics();
  if (fillPattern === "gradient" && fillColor2) {
    try {
      const gradient = new (pixi as any).FillGradient(0, 0, width, height);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, fillColor2);
      base.roundRect(0, 0, width, height, radius).fill(gradient);
    } catch {
      base.roundRect(0, 0, width, height, radius).fill({ color: fillColor });
    }
  } else {
    base.roundRect(0, 0, width, height, radius).fill({ color: fillColor });
  }
  container.addChild(base);

  // Pattern overlay — clipped to shape bounds via a mask
  if ((fillPattern === "stripes" || fillPattern === "dots" || fillPattern === "grid") && fillColor2) {
    const patternColor = fillColor2;
    const overlay = new pixi.Graphics();
    if (fillPattern === "stripes") {
      const gap = 20;
      for (let i = -(height); i < width + height; i += gap * 2) {
        overlay.moveTo(i, 0).lineTo(i + height, height);
      }
      overlay.stroke({ color: patternColor, width: 6, alpha: 0.45 });
    } else if (fillPattern === "dots") {
      const dotR = 3;
      const step = 18;
      for (let row = step / 2; row < height; row += step) {
        for (let col = step / 2; col < width; col += step) {
          overlay.circle(col, row, dotR);
        }
      }
      overlay.fill({ color: patternColor, alpha: 0.55 });
    } else if (fillPattern === "grid") {
      const step = 24;
      for (let x = 0; x <= width; x += step) {
        overlay.moveTo(x, 0).lineTo(x, height);
      }
      for (let y = 0; y <= height; y += step) {
        overlay.moveTo(0, y).lineTo(width, y);
      }
      overlay.stroke({ color: patternColor, width: 1, alpha: 0.4 });
    }
    // Mask clips the pattern to the rounded-rect shape bounds
    const clipMask = new pixi.Graphics().roundRect(0, 0, width, height, radius).fill({ color: 0xffffff });
    overlay.mask = clipMask as any;
    container.addChild(clipMask, overlay);
  }

  // Border stroke
  if (borderWidth > 0 && borderColor) {
    const border = new pixi.Graphics()
      .roundRect(0, 0, width, height, radius)
      .stroke({ color: borderColor, width: borderWidth });
    container.addChild(border);
  }

  return container;
}

function createElementDisplay(pixi: PixiModule, element: ElementNode): PixiContainer {
  switch (element.type) {
    case "text":
      return createTextNode(pixi, element);
    case "shape":
      return createShapeNode(pixi, element);
    case "image":
      return createPlaceholderNode(
        pixi,
        element,
        element.style.backgroundColor ?? "#1d4ed8",
        element.content?.label ?? "Image placeholder"
      );
    case "video":
      return createPlaceholderNode(
        pixi,
        element,
        element.style.backgroundColor ?? "#7c3aed",
        element.content?.label ?? "Video placeholder"
      );
  }
}

function applyElementTransform(node: PixiContainer, element: ElementNode): void {
  node.x = element.layout.x;
  node.y = element.layout.y;
  node.alpha = element.layout.opacity;
  node.rotation = (element.layout.rotation * Math.PI) / 180;
  node.scale.set(element.layout.scale);
  node.zIndex = element.layout.zIndex;
}

export function resolveRenderFrame(
  project: ProjectDocument,
  input: RenderFrameInput
): ResolvedRenderFrame {
  const active = getActiveSceneWindow(project, input.timeMs);
  if (!active) {
    return {
      timeMs: input.timeMs,
      sceneId: null,
      viewport: project.viewport,
      backgroundColor: "#ffffff",
      elements: []
    };
  }

  return {
    timeMs: input.timeMs,
    sceneId: active.scene.id,
    viewport: project.viewport,
    backgroundColor: active.scene.backgroundColor ?? "#ffffff",
    elements: active.scene.elements
      .map((element) => resolveElementNodeAtTime(element, active.localTimeMs, input.showAllElements))
      .sort((left, right) => left.layout.zIndex - right.layout.zIndex)
  };
}

export class PixiSceneRenderer {
  private app: PixiApplication | null = null;
  private root: PixiContainer | null = null;
  private pixi: PixiModule | null = null;
  private project: ProjectDocument;
  private mounted = false;

  constructor(project: ProjectDocument, private readonly options?: PixiSceneRendererOptions) {
    this.project = project;
  }

  async mount(container: HTMLElement): Promise<void> {
    if (this.mounted) {
      return;
    }

    const pixi = await import("pixi.js");
    this.pixi = pixi;
    this.app = new pixi.Application();
    this.root = new pixi.Container();
    this.root.sortableChildren = true;

    const bg = this.options?.backgroundColor;
    await this.app.init({
      resizeTo: container,
      ...(bg === "transparent" ? { backgroundAlpha: 0 } : { background: bg ?? "#ffffff" }),
      antialias: true
    });

    container.replaceChildren(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.mounted = true;
  }

  setProject(project: ProjectDocument): void {
    this.project = project;
  }

  renderFrame(input: RenderFrameInput): ResolvedRenderFrame {
    const frame = resolveRenderFrame(this.project, input);
    if (this.app && this.root && this.pixi) {
      this.drawFrame(frame);
    }
    return frame;
  }

  destroy(): void {
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.root = null;
    this.pixi = null;
    this.mounted = false;
  }

  private drawFrame(frame: ResolvedRenderFrame): void {
    if (!this.app || !this.root || !this.pixi) {
      return;
    }

    this.root.removeChildren();

    const rendererWidth = this.app.renderer.width;
    const rendererHeight = this.app.renderer.height;
    const scale = Math.min(
      rendererWidth / frame.viewport.width,
      rendererHeight / frame.viewport.height
    );
    const frameWidth = frame.viewport.width * scale;
    const frameHeight = frame.viewport.height * scale;
    const offsetX = (rendererWidth - frameWidth) / 2;
    const offsetY = (rendererHeight - frameHeight) / 2;

    const frameContainer = new this.pixi.Container();
    frameContainer.x = offsetX;
    frameContainer.y = offsetY;
    frameContainer.scale.set(scale);
    frameContainer.sortableChildren = true;

    frameContainer.addChild(
      new this.pixi.Graphics()
        .rect(0, 0, frame.viewport.width, frame.viewport.height)
        .fill({ color: frame.backgroundColor })
    );

    for (const element of frame.elements) {
      const display = createElementDisplay(this.pixi, element);
      applyElementTransform(display, element);
      frameContainer.addChild(display);
    }

    this.root.addChild(frameContainer);
  }
}
