import { describe, expect, it, vi } from "vitest";

// Mock the runtime 'pixi.js' module used by PixiSceneRenderer.mount()
vi.mock("pixi.js", () => {
  const createdTextNodes: any[] = [];
  const graphicsCalls: any[] = [];

  class Graphics {
    rect(_x: number, _y: number, _w: number, _h: number) {
      graphicsCalls.push({ rect: [_x, _y, _w, _h] });
      return this;
    }
    roundRect(_x: number, _y: number, _w: number, _h: number, _r: number) {
      graphicsCalls.push({ roundRect: [_x, _y, _w, _h, _r] });
      return this;
    }
    fill(opts: any) {
      graphicsCalls.push({ fill: opts });
      return this;
    }
  }

  class Container {
    children: any[] = [];
    x = 0;
    y = 0;
    alpha = 1;
    zIndex = 0;
    visible = true;
    sortableChildren = false;
    scale = {
      x: 1,
      y: 1,
      set(x: number, y?: number) {
        this.x = x;
        this.y = y ?? x;
      }
    };
    pivot = {
      x: 0,
      y: 0,
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
    };
    position = {
      x: 0,
      y: 0,
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
    };
    filters: any[] = [];
    addChild(c: any) {
      this.children.push(c);
    }
    addChildAt(c: any, _idx: number) {
      this.children.push(c);
    }
    removeChildren() {
      this.children = [];
    }
  }

  class Text {
    x = 0;
    y = 0;
    constructor(public config: any) {
      createdTextNodes.push(config);
    }
  }

  class Application {
    canvas = { nodeName: "CANVAS" } as any;
    stage = new Container();
    renderer = { width: 1080, height: 1920 } as any;
    ticker = {
      add: vi.fn(),
      remove: vi.fn()
    } as any;
    async init(_opts: any) {
      // simulate initialization
      return Promise.resolve();
    }
    destroy() {}
  }

  return {
    Application,
    Container,
    Graphics,
    Text,
    Assets: {
      load: vi.fn(() => Promise.resolve())
    },
    __testHelpers: { createdTextNodes, graphicsCalls }
  };
});

import { PixiSceneRenderer } from "./index";
import { createProjectDocument, createScene, createElementNode } from "@kwikk/scene-graph";
import * as PixiMock from "pixi.js";

describe("PixiSceneRenderer (mocked pixi)", () => {
  it("mounts, renders a frame and normalizes font weight", async () => {
    const el = createElementNode({ id: "t1", type: "text", content: { text: "Hi" }, style: { fontWeight: 700 } as any });
    const scene = createScene({ id: "s1", name: "Scene 1", elements: [el] });
    const project = createProjectDocument({ id: "p", name: "P", scenes: [scene] });

    if (!(globalThis as any).document.fonts) {
      (globalThis as any).document.fonts = { ready: Promise.resolve() };
    }
    const container = (globalThis as any).document.createElement("div");
    // set some client size so init can read it if needed
    Object.defineProperty(container, "clientWidth", { value: 800 });
    Object.defineProperty(container, "clientHeight", { value: 1200 });

    const renderer = new PixiSceneRenderer(project, { backgroundColor: "#abcdef" });

    // Mount should import the mocked pixi and attach a canvas to the container
    await renderer.mount(container);

    expect(container.firstChild).toBeDefined();

    const frame = renderer.renderFrame({ timeMs: 0 });
    expect(frame.sceneId).toBe("s1");

    // ensure our mock Text got created with a normalized fontWeight string
    const helpers: any = (PixiMock as any).__testHelpers;
    expect(helpers.createdTextNodes.length).toBeGreaterThan(0);
    const created = helpers.createdTextNodes[0];
    expect(created.style).toBeDefined();
    expect(String(created.style.fontWeight)).toBe("700");

    renderer.destroy();
    // private mounted flag should be reset
    expect((renderer as any).mounted).toBe(false);
  });
});
