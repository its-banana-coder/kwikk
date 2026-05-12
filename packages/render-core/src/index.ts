import { resolveElementNodeAtTime } from "@kwikk/animation-engine";
import type { ElementNode, ProjectDocument, SceneBackground, TextSpan, Viewport } from "@kwikk/shared-types";
import type {
  Application as PixiApplication,
  Container as PixiContainer,
  Filter as PixiFilter,
  Graphics as PixiGraphics,
  TextStyleFontWeight
} from "pixi.js";
import { getActiveSceneWindow } from "@kwikk/timeline";

export interface RenderFrameInput {
  timeMs: number;
  showAllElements?: boolean;
  excludeElementId?: string;
}

export interface ResolvedRenderFrame {
  timeMs: number;
  sceneId: string | null;
  viewport: Viewport;
  backgroundColor: string;
  background?: SceneBackground;
  elements: ElementNode[];
}

export interface PixiSceneRendererOptions {
  backgroundColor?: string;
}

type PixiModule = typeof import("pixi.js");

export interface RenderContext {
  pixi: PixiModule;
  requestRedraw: () => void;
}

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


interface LineWord {
  node: PixiContainer;
  width: number;
  height: number;
  isSpace: boolean;
}

function layoutTextSegments(
  pixi: PixiModule,
  spans: TextSpan[],
  baseStyle: any,
  maxWidth: number,
  align: "left" | "center" | "right" | "justify"
): PixiContainer {
  const container = new pixi.Container();
  let currentX = 0;
  let maxLineHeight = 0;
  const lines: LineWord[][] = [[]];

  for (const span of spans) {
    const style = {
      fontFamily: span.style?.fontFamily ?? baseStyle.fontFamily,
      fontSize: span.style?.fontSize ?? baseStyle.fontSize,
      fontWeight: normalizeFontWeight(span.style?.fontWeight ?? baseStyle.fontWeight) ?? "600",
      fontStyle: (span.style?.fontStyle ?? baseStyle.fontStyle) as any,
      fill: span.style?.color ?? baseStyle.fill,
    };

    const tokens = span.text.match(/(\n|[^\S\n]+|\S+)/g) || [];

    for (const token of tokens) {
      if (token === "\n") {
        currentX = 0;
        maxLineHeight = 0;
        lines.push([]);
        continue;
      }

      const isSpace = /^[^\S\n]+$/.test(token);
      const textNode = new pixi.Text({ text: token, style });
      const width = textNode.width;
      const height = textNode.height;

      if (!isSpace && currentX + width > maxWidth && currentX > 0) {
        currentX = 0;
        maxLineHeight = 0;
        lines.push([]);
      }

      textNode.x = currentX;

      currentX += width;
      maxLineHeight = Math.max(maxLineHeight, height);

      lines[lines.length - 1].push({
        node: textNode,
        width,
        height,
        isSpace
      });

      container.addChild(textNode);
    }
  }

  let currentLineY = 0;
  for (const line of lines) {
    if (line.length === 0) continue;

    let lineWidth = 0;
    let lastNonSpaceIdx = -1;
    for (let i = line.length - 1; i >= 0; i--) {
      if (!line[i].isSpace) {
        lastNonSpaceIdx = i;
        break;
      }
    }

    if (lastNonSpaceIdx >= 0) {
      const lastNode = line[lastNonSpaceIdx].node;
      lineWidth = lastNode.x + line[lastNonSpaceIdx].width;
    }

    let offsetX = 0;
    if (align === "center") {
      offsetX = (maxWidth - lineWidth) / 2;
    } else if (align === "right") {
      offsetX = maxWidth - lineWidth;
    }

    const lineMaxH = Math.max(...line.map(w => w.height));

    for (const word of line) {
      word.node.x += offsetX;
      word.node.y = currentLineY + (lineMaxH - word.height); // bottom baseline align
    }

    currentLineY += lineMaxH;
  }

  return container;
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
  const richText = element.content?.richText;

  const baseStyle = {
    fontFamily: element.style.fontFamily ?? "Inter",
    fontSize: element.style.fontSize ?? 48,
    fontWeight: normalizeFontWeight(element.style.fontWeight) ?? "600",
    fontStyle: (element.style.fontStyle ?? "normal") as any,
    fill: element.style.color ?? "#0f172a",
  };

  const spans = richText && richText.length > 0 
    ? richText 
    : [{ text: element.content?.text ?? element.semanticRole ?? element.id }];

  const textNode = layoutTextSegments(pixi, spans, baseStyle, element.layout.width, align as any);
  container.addChild(textNode);

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

function createImageNode(ctx: RenderContext, element: ElementNode): PixiContainer {
  const container = new ctx.pixi.Container();
  const { width, height } = element.layout;
  const src = element.content?.src;

  let mainNode: PixiContainer;

  if (src && !src.startsWith("placeholder://")) {
    const texture = ctx.pixi.Assets.cache.get(src);
    if (!texture) {
      ctx.pixi.Assets.load(src).then(() => {
        ctx.requestRedraw();
      }).catch((e) => console.error("Asset load error", e));
      mainNode = createPlaceholderNode(
        ctx.pixi,
        element,
        element.style.backgroundColor ?? "#1d4ed8",
        "Loading..."
      );
    } else {
      try {
        const sprite = new ctx.pixi.Sprite(texture);

        // Handle Crop
        if (element.content?.crop) {
          const { x, y, width: cw, height: ch } = element.content.crop;
          const cropTexture = new ctx.pixi.Texture({
            source: texture.source,
            frame: new ctx.pixi.Rectangle(x, y, cw, ch),
          });
          sprite.texture = cropTexture;
        }

        sprite.width = width;
        sprite.height = height;

        const radius = element.style.borderRadius ?? 0;
        if (radius > 0) {
          const mask = new ctx.pixi.Graphics().roundRect(0, 0, width, height, radius).fill({ color: 0xffffff });
          sprite.mask = mask as any;
          container.addChild(mask);
        }
        mainNode = sprite;
      } catch (e) {
        mainNode = createPlaceholderNode(
          ctx.pixi,
          element,
          element.style.backgroundColor ?? "#1d4ed8",
          "Error loading image"
        );
      }
    }
  } else {
    mainNode = createPlaceholderNode(
      ctx.pixi,
      element,
      element.style.backgroundColor ?? "#1d4ed8",
      element.content?.label ?? "Image placeholder"
    );
  }

  // Apply filters
  if (element.style.filters) {
    const filters: PixiFilter[] = [];
    const f = element.style.filters;

    if (f.blur) filters.push(new ctx.pixi.BlurFilter({ strength: f.blur }));

    if (f.brightness !== undefined || f.contrast !== undefined || f.saturation !== undefined || f.monochrome) {
      const cm = new ctx.pixi.ColorMatrixFilter();
      if (f.brightness !== undefined) cm.brightness(f.brightness, false);
      if (f.contrast !== undefined) cm.contrast(f.contrast, false);
      if (f.saturation !== undefined) cm.saturate(f.saturation, false);
      if (f.monochrome) cm.blackAndWhite(false);
      filters.push(cm);
    }

    // HDR simulation
    if (f.hdr) {
      const hdr = new ctx.pixi.ColorMatrixFilter();
      hdr.contrast(0.2, true);
      hdr.saturate(0.2, true);
      filters.push(hdr);
    }

    if (f.sharpen) {
      // Simplified sharpen using a high contrast + brightness tweak on a matrix
      // Proper sharpen usually needs a convolution filter, but ColorMatrix can simulate it.
      const sh = new ctx.pixi.ColorMatrixFilter();
      sh.contrast(0.15 * f.sharpen, true);
      filters.push(sh);
    }

    if (f.vintage) {
      const vin = new ctx.pixi.ColorMatrixFilter();
      vin.sepia(true);
      vin.contrast(0.1, true);
      filters.push(vin);
    }

    if (f.cinematic) {
      const cin = new ctx.pixi.ColorMatrixFilter();
      cin.night(0.1, true);
      cin.contrast(0.2, true);
      filters.push(cin);
    }

    if (f.y2k) {
      const y2k = new ctx.pixi.ColorMatrixFilter();
      y2k.technicolor(true);
      y2k.hue(300, true); // Pinkish hue
      filters.push(y2k);
    }

    if (f.monochrome) {
      const mono = new ctx.pixi.ColorMatrixFilter();
      mono.blackAndWhite(true);
      filters.push(mono);
    }

    if (f.duotone) {
      // Simulate duotone using blackAndWhite + colorize
      // A proper duotone usually requires a custom shader or two passes.
      const duo = new ctx.pixi.ColorMatrixFilter();
      duo.blackAndWhite(true);
      // We can't easily do two colors with just one ColorMatrixFilter without custom logic
      // but we can colorize towards one.
      duo.tint(parseInt(f.duotone.color1.replace("#", ""), 16), true);
      filters.push(duo);
    }

    if (filters.length > 0) {
      mainNode.filters = filters;
    }

    // Vignette (added as an overlay)
    if (f.vignette) {
      const vig = new ctx.pixi.Graphics();
      // Using a radial gradient for vignette
      // Pixi 8 doesn't have an easy radial gradient on Graphics directly without FillGradient
      try {
        const w = width;
        const h = height;
        const gradient = new (ctx.pixi as any).FillGradient(w / 2, h / 2, w / 2, h / 2, Math.max(w, h) / 2);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, `rgba(0,0,0,${f.vignette})`);
        vig.rect(0, 0, w, h).fill(gradient);
        container.addChild(vig);
      } catch (e) {
        // Fallback or skip
      }
    }

    // Glow (implemented via a drop shadow or extra blur pass)
    if (f.glow) {
      const glowFilter = new ctx.pixi.BlurFilter({ strength: f.glow.blur });
      // Extra container for glow if we want it to be "around"
      // Simplified: apply a tinted blur filter to a clone or similar
    }
  }

  // Apply Blend Mode
  if (element.style.blendMode) {
    mainNode.blendMode = element.style.blendMode as any;
  }

  container.addChild(mainNode);

  // Apply Frame (simplified as an overlay graphics for now)
  if (element.content?.frame) {
    const frameOverlay = new ctx.pixi.Graphics();
    if (element.content.frame === "phone") {
      frameOverlay.roundRect(0, 0, width, height, 40).stroke({ width: 10, color: 0x333333 });
      container.addChild(frameOverlay);
    } else if (element.content.frame === "laptop") {
      frameOverlay.rect(0, 0, width, height).stroke({ width: 10, color: 0x333333 });
      frameOverlay.moveTo(-20, height).lineTo(width + 20, height).stroke({ width: 15, color: 0x333333 });
      container.addChild(frameOverlay);
    } else if (element.content.frame === "polaroid") {
      const p = new ctx.pixi.Graphics();
      p.rect(-10, -10, width + 20, height + 60).fill({ color: 0xffffff });
      container.addChildAt(p, 0);
    } else if (element.content.frame === "cinematic") {
      const topBar = new ctx.pixi.Graphics().rect(0, 0, width, 40).fill({ color: 0x000000 });
      const bottomBar = new ctx.pixi.Graphics().rect(0, height - 40, width, 40).fill({ color: 0x000000 });
      container.addChild(topBar, bottomBar);
    }
  }

  return container;
}

function createElementDisplay(ctx: RenderContext, element: ElementNode): PixiContainer {
  const pixi = ctx.pixi;
  switch (element.type) {
    case "text":
      return createTextNode(pixi, element);
    case "shape":
      return createShapeNode(pixi, element);
    case "image":
      return createImageNode(ctx, element);
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

  const scaleX = element.layout.scale * (element.layout.flipX ? -1 : 1);
  const scaleY = element.layout.scale * (element.layout.flipY ? -1 : 1);
  node.scale.set(scaleX, scaleY);

  if (element.layout.flipX) {
    node.pivot.x = element.layout.width;
  } else {
    node.pivot.x = 0;
  }
  if (element.layout.flipY) {
    node.pivot.y = element.layout.height;
  } else {
    node.pivot.y = 0;
  }

  node.zIndex = element.layout.zIndex;
  node.visible = element.layout.visible !== false;
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
    background: active.scene.background,
    elements: active.scene.elements
      .map((element) => resolveElementNodeAtTime(element, active.localTimeMs, input.showAllElements))
      .filter((element) => element.id !== input.excludeElementId)
      .sort((left, right) => left.layout.zIndex - right.layout.zIndex)
  };
}

export class PixiSceneRenderer {
  private app: PixiApplication | null = null;
  private root: PixiContainer | null = null;
  private pixi: PixiModule | null = null;
  private project: ProjectDocument;
  private mounted = false;
  private lastFrame: ResolvedRenderFrame | null = null;

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

    // Wait for all web fonts (Google Fonts etc.) to finish loading before
    // the first frame so pixi.Text canvas rendering uses the correct typefaces.
    await document.fonts.ready;

    // For HTMLText to support custom fonts inside its isolated SVG foreignObject,
    // we must load the Google Fonts CSS through Pixi's Assets system. Pixi will
    // automatically parse the CSS, download the fonts, and embed them as base64.
    await pixi.Assets.load({
      alias: 'GoogleFonts',
      src: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap'
    });

    this.mounted = true;
  }

  setProject(project: ProjectDocument): void {
    this.project = project;
  }

  renderFrame(input: RenderFrameInput): ResolvedRenderFrame {
    const frame = resolveRenderFrame(this.project, input);
    this.lastFrame = frame;
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

    // Draw scene background
    const bgOpacity = frame.background?.opacity ?? 1;
    const bgColor2 = frame.background?.color2;

    if (bgColor2) {
      // Gradient background
      try {
        const angle = frame.background?.gradientAngle ?? 180;
        const rad = (angle * Math.PI) / 180;
        const w = frame.viewport.width;
        const h = frame.viewport.height;
        const cx = w / 2;
        const cy = h / 2;
        const len = Math.sqrt(w * w + h * h) / 2;
        const x0 = cx - Math.sin(rad) * len;
        const y0 = cy - Math.cos(rad) * len;
        const x1 = cx + Math.sin(rad) * len;
        const y1 = cy + Math.cos(rad) * len;
        const gradient = new (this.pixi as any).FillGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, frame.backgroundColor);
        gradient.addColorStop(1, bgColor2);
        const bgGraphics = new this.pixi.Graphics()
          .rect(0, 0, frame.viewport.width, frame.viewport.height)
          .fill(gradient);
        bgGraphics.alpha = bgOpacity;
        frameContainer.addChild(bgGraphics);
      } catch {
        const bgGraphics = new this.pixi.Graphics()
          .rect(0, 0, frame.viewport.width, frame.viewport.height)
          .fill({ color: frame.backgroundColor });
        bgGraphics.alpha = bgOpacity;
        frameContainer.addChild(bgGraphics);
      }
    } else {
      const bgGraphics = new this.pixi.Graphics()
        .rect(0, 0, frame.viewport.width, frame.viewport.height)
        .fill({ color: frame.backgroundColor });
      bgGraphics.alpha = bgOpacity;
      frameContainer.addChild(bgGraphics);
    }

    // Draw background image if set
    const bgImageSrc = frame.background?.imageSrc;
    if (bgImageSrc) {
      const texture = this.pixi.Assets.cache.get(bgImageSrc);
      if (!texture) {
        this.pixi.Assets.load(bgImageSrc).then(() => {
          if (this.lastFrame) this.drawFrame(this.lastFrame);
        }).catch(() => {});
      } else {
        try {
          const bgSprite = new this.pixi.Sprite(texture);
          const vw = frame.viewport.width;
          const vh = frame.viewport.height;
          const tw = texture.width;
          const th = texture.height;
          const fitMode = frame.background?.imageFit ?? "stretch";

          if (fitMode === "stretch") {
            bgSprite.width = vw;
            bgSprite.height = vh;
          } else if (fitMode === "cover") {
            const coverScale = Math.max(vw / tw, vh / th);
            bgSprite.width = tw * coverScale;
            bgSprite.height = th * coverScale;
            bgSprite.x = (vw - bgSprite.width) / 2;
            bgSprite.y = (vh - bgSprite.height) / 2;
          } else if (fitMode === "contain") {
            const containScale = Math.min(vw / tw, vh / th);
            bgSprite.width = tw * containScale;
            bgSprite.height = th * containScale;
            bgSprite.x = (vw - bgSprite.width) / 2;
            bgSprite.y = (vh - bgSprite.height) / 2;
          } else if (fitMode === "custom") {
            const customScale = frame.background?.imageScale ?? Math.max(vw / tw, vh / th);
            bgSprite.width = tw * customScale;
            bgSprite.height = th * customScale;
            bgSprite.x = frame.background?.imageOffsetX ?? 0;
            bgSprite.y = frame.background?.imageOffsetY ?? 0;
          }

          bgSprite.alpha = bgOpacity;

          // Clip the background image to viewport bounds
          const clipMask = new this.pixi.Graphics()
            .rect(0, 0, vw, vh)
            .fill({ color: 0xffffff });
          bgSprite.mask = clipMask as any;
          frameContainer.addChild(clipMask, bgSprite);
        } catch {
          // skip background image on error
        }
      }
    }

    const ctx: RenderContext = {
      pixi: this.pixi,
      requestRedraw: () => {
        if (this.lastFrame) {
          this.drawFrame(this.lastFrame);
        }
      }
    };

    function renderRecursive(elements: ElementNode[], parent: PixiContainer) {
      for (const element of elements) {
        const display = createElementDisplay(ctx, element);
        applyElementTransform(display, element);
        parent.addChild(display);

        if (element.children && element.children.length > 0) {
          renderRecursive(element.children, display);
        }
      }
    }

    renderRecursive(frame.elements, frameContainer);

    this.root.addChild(frameContainer);
  }
}
