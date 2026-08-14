import { describe, expect, it } from "vitest";
import { createProjectDocument, createScene } from "@kwikk/scene-graph";
import type { ElementNode } from "@kwikk/shared-types";
import { CSSSceneRenderer, waitForPendingShapeFillImages } from "./cssRenderer";

function shapeElement(id: string, backgroundColor: string | undefined): ElementNode {
  return {
    id,
    type: "shape",
    semanticRole: "decoration",
    layout: { x: 0, y: 0, width: 200, height: 200, scale: 1, rotation: 0, opacity: 1 },
    style: { backgroundColor },
    animations: [],
    content: { shape: "rectangle" },
  };
}

async function renderShapeFill(backgroundColor: string | undefined): Promise<string | null> {
  const scene = createScene({ id: "s1", name: "Scene 1", elements: [shapeElement("rect1", backgroundColor)] });
  const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

  const container = document.createElement("div");
  document.body.appendChild(container);
  // happy-dom has no real layout engine — getBoundingClientRect() always returns 0x0, which
  // makes _drawFrame bail out early ("container not laid out yet"). Stub real dimensions so the
  // renderer actually builds DOM content.
  container.getBoundingClientRect = () => ({
    width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920, x: 0, y: 0, toJSON() {},
  });

  const renderer = new CSSSceneRenderer(project);
  await renderer.mount(container);
  renderer.renderFrame({ timeMs: 0, showAllElements: true });

  const svgShape = container.querySelector("rect");
  return svgShape?.getAttribute("fill") ?? null;
}

describe("CSSSceneRenderer shape fill", () => {
  it("renders an explicit color as-is", async () => {
    expect(await renderShapeFill("#0000ff")).toBe("#0000ff");
  });

  it('renders "" (the Fill swatch\'s None option) as transparent, not an invalid empty attribute', async () => {
    // Regression test: backgroundColor:"" used to pass straight through as fill="" in the SVG
    // markup, an invalid presentation attribute that browsers resolve to the paint initial value
    // (black) instead of transparent — so clicking "None" on a filled shape appeared to do nothing.
    expect(await renderShapeFill("")).toBe("transparent");
  });

  it("renders a never-set backgroundColor with the default fill, distinct from explicit None", async () => {
    expect(await renderShapeFill(undefined)).toBe("#334155");
  });
});

// ─── image fillPattern async load ──────────────────────────────────────────

describe("CSSSceneRenderer shape image fill", () => {
  const FAKE_SRC = "https://example.test/fake-fill.png";

  // happy-dom's Image never performs a real fetch or fires `load` — setting `.src` is a no-op
  // beyond reflecting the attribute (see HTMLImageElement.ts). Stub it for this suite so
  // `new Image()` inside cssRenderer.ts's ensureShapeFillImageLoaded resolves asynchronously,
  // exercising the same onload-driven rebuild path a real browser would take.
  const OriginalImage = globalThis.Image;
  class AutoLoadImage extends OriginalImage {
    set src(value: string) {
      super.src = value;
      queueMicrotask(() => (this as any).onload?.(new Event("load")));
    }
    get src(): string {
      return super.src;
    }
  }

  function imageFillShape(id: string, src: string): ElementNode {
    return {
      id,
      type: "shape",
      semanticRole: "decoration",
      layout: { x: 0, y: 0, width: 200, height: 200, scale: 1, rotation: 0, opacity: 1 },
      style: { backgroundColor: "#334155", fillPattern: "image" },
      animations: [],
      content: { shape: "rectangle", fillImageSrc: src },
    };
  }

  it("falls back to the solid fill until the image loads, then rebuilds with the pattern fill — regression for the 'blue shape until you touch Fill' bug", async () => {
    (globalThis as any).Image = AutoLoadImage;
    try {
      const scene = createScene({ id: "s1", name: "Scene 1", elements: [imageFillShape("img1", FAKE_SRC)] });
      const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

      const container = document.createElement("div");
      document.body.appendChild(container);
      container.getBoundingClientRect = () => ({
        width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920, x: 0, y: 0, toJSON() {},
      });

      const renderer = new CSSSceneRenderer(project);
      await renderer.mount(container);
      renderer.renderFrame({ timeMs: 0, showAllElements: true });

      // First paint: image hasn't loaded yet, so the shape must show its solid fallback fill,
      // not a pattern reference to an image that isn't ready.
      const rectBefore = container.querySelector("rect");
      expect(rectBefore?.getAttribute("fill")).toBe("#334155");

      // Once the image finishes loading, the renderer should self-trigger a rebuild — no manual
      // fill-toggle round trip required — and the shape should now reference the pattern.
      await waitForPendingShapeFillImages();

      const rectAfter = container.querySelector("rect");
      expect(rectAfter?.getAttribute("fill")).toBe("url(#ip-img1)");

      renderer.destroy();
    } finally {
      (globalThis as any).Image = OriginalImage;
    }
  });
});

// ─── customCSS scoping ──────────────────────────────────────────────────────

function customCssElement(id: string, x: number, y: number, css: string): ElementNode {
  return {
    id,
    type: "shape",
    semanticRole: "decoration",
    layout: { x, y, width: 100, height: 100, scale: 1, rotation: 0, opacity: 1 },
    style: { backgroundColor: "#ff0000", customCSS: css },
    animations: [],
    content: { shape: "rectangle" },
  };
}

async function mountRenderer(elements: ElementNode[]): Promise<HTMLElement> {
  const scene = createScene({ id: "s1", name: "Scene 1", elements });
  const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.getBoundingClientRect = () => ({
    width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920, x: 0, y: 0, toJSON() {},
  });

  const renderer = new CSSSceneRenderer(project);
  await renderer.mount(container);
  renderer.renderFrame({ timeMs: 0, showAllElements: true });
  return container;
}

const DROP_CSS = `
@keyframes dropIn {
  0% { transform: translate(0, -300px); }
  100% { transform: translate(0, 0); }
}
:root { animation: dropIn 1000ms ease-out; }
`;

describe("CSSSceneRenderer customCSS scoping", () => {
  it("keeps the scoped id/animation off `outer` — outer's positioning transform must never compete with a native CSS animation on the same property", async () => {
    const container = await mountRenderer([customCssElement("box1", 400, 800, DROP_CSS)]);
    const outer = container.querySelector('[data-kwikk-id="box1"]') as HTMLElement;
    expect(outer).toBeTruthy();
    // outer keeps its base positioning transform...
    expect(outer.style.transform).toContain("translate(400px,800px)");
    // ...and does NOT carry the scoped id an active CSS `animation:` would need
    // to target it — that's the wrapper's job now.
    expect(outer.id).not.toBe("kwikk-el-box1");
    const scopedWrapper = outer.querySelector("#kwikk-el-box1");
    expect(scopedWrapper).toBeTruthy();
    expect(scopedWrapper?.querySelector("style")?.textContent).toContain("animation:");
  });

  it("namespaces identically-named @keyframes per element so two elements' animations never collide", async () => {
    const container = await mountRenderer([
      customCssElement("box1", 100, 100, DROP_CSS),
      customCssElement("box2", 500, 500, DROP_CSS),
    ]);
    const style1 = container.querySelector("#kwikk-el-box1 style")?.textContent ?? "";
    const style2 = container.querySelector("#kwikk-el-box2 style")?.textContent ?? "";

    expect(style1).toContain("dropIn__kwikk-el-box1");
    expect(style2).toContain("dropIn__kwikk-el-box2");
    // Each element's @keyframes declaration and its `animation:` reference must
    // agree on the same (renamed) name.
    expect(style1.match(/@keyframes\s+([\w-]+)/)?.[1]).toBe("dropIn__kwikk-el-box1");
    expect(style1).toMatch(/animation:\s*dropIn__kwikk-el-box1\b/);
  });
});

// ─── customCSS one-shot seek clamping ───────────────────────────────────────

// The exact repro CSS from the bug report — cubic-bezier's parenthesized args
// contain four bare numbers that a naive iteration-count regex would
// misparse, and iteration-count:1 + fill:both must hold, not loop.
const CHESS_DROP_CSS = `
@keyframes chessDrop0 {
  0%   { transform: translateY(-900px) rotate(6deg) scale(0.9); }
  72%  { transform: translateY(20px) rotate(-2deg) scale(1.08, 0.9); }
  86%  { transform: translateY(-10px) rotate(1deg) scale(0.96, 1.04); }
  100% { transform: translateY(0) rotate(0deg) scale(1); }
}
:root {
  animation: chessDrop0 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 0ms 1 both;
}
`;

const INFINITE_CSS = `
@keyframes floatBalloon {
  0% { transform: translate(0, 0); }
  100% { transform: translate(0, -120px); }
}
:root { animation: floatBalloon 4000ms ease-in-out infinite; }
`;

describe("CSSSceneRenderer customCSS one-shot seek clamping", () => {
  it("clamps a one-shot (iteration-count:1) animation to its total window instead of wrapping — regression for continuous bounce/loop bug", async () => {
    const scene = createScene({ id: "s1", name: "Scene 1", elements: [customCssElement("chess0", 100, 100, CHESS_DROP_CSS)] });
    const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.getBoundingClientRect = () => ({
      width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920, x: 0, y: 0, toJSON() {},
    });
    const renderer = new CSSSceneRenderer(project);
    await renderer.mount(container);

    // Well past the 700ms window (matches the report's "sampled every ~130ms
    // from t=2.0s-4.3s" — pick a point deep into that range).
    renderer.renderFrame({ timeMs: 3000 });
    const wrapper = container.querySelector("#kwikk-el-chess0") as HTMLElement;
    expect(wrapper.style.animationDelay).toBe("-700.0ms");

    // A second, later frame must clamp to the exact same value — proof it's
    // held, not still advancing/wrapping.
    renderer.renderFrame({ timeMs: 4200 });
    expect(wrapper.style.animationDelay).toBe("-700.0ms");
  });

  it("still wraps (does not clamp) a genuinely infinite animation", async () => {
    const scene = createScene({ id: "s1", name: "Scene 1", elements: [customCssElement("balloon", 100, 100, INFINITE_CSS)] });
    const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.getBoundingClientRect = () => ({
      width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920, x: 0, y: 0, toJSON() {},
    });
    const renderer = new CSSSceneRenderer(project);
    await renderer.mount(container);

    renderer.renderFrame({ timeMs: 9500 });
    const wrapper = container.querySelector("#kwikk-el-balloon") as HTMLElement;
    // Not clamped to the 4000ms duration — infinite animations seek with the
    // raw elapsed time (the browser wraps it internally).
    expect(wrapper.style.animationDelay).toBe("-9500.0ms");
  });

  it("seeks relative to the element's own startMs, not absolute project time", async () => {
    const el = customCssElement("chess0", 100, 100, CHESS_DROP_CSS);
    el.startMs = 500;
    el.endMs = 5000;
    const scene = createScene({ id: "s1", name: "Scene 1", elements: [el], durationMs: 5000 });
    const project = createProjectDocument({ id: "p1", name: "P1", scenes: [scene] });
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.getBoundingClientRect = () => ({
      width: 1080, height: 1920, top: 0, left: 0, right: 1080, bottom: 1920, x: 0, y: 0, toJSON() {},
    });
    const renderer = new CSSSceneRenderer(project);
    await renderer.mount(container);

    // Project time 505ms = 5ms after this element's own startMs of 500ms.
    renderer.renderFrame({ timeMs: 505 });
    const wrapper = container.querySelector("#kwikk-el-chess0") as HTMLElement;
    expect(wrapper.style.animationDelay).toBe("-5.0ms");
  });
});
