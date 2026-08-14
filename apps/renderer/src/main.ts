import { CSSSceneRenderer, waitForPendingShapeFillImages } from "@kwikk/render-core";
import type { ProjectDocument } from "@kwikk/shared-types";

interface KwikkRenderAPI {
  /** Load a project into the CSS renderer. Resolves when the first frame is painted. */
  loadProject(project: ProjectDocument): Promise<void>;
  /** Seek the renderer to the given timeline position. Resolves once the frame — including any
   *  async shape fill images it triggered — has fully settled, so callers can screenshot safely. */
  setTime(ms: number): Promise<void>;
  /** True once loadProject has resolved at least once. */
  isReady: boolean;
}

declare global {
  interface Window {
    __kwikk?: KwikkRenderAPI;
  }
}

let renderer: CSSSceneRenderer | null = null;

async function bootstrap() {
  const mountNode = document.getElementById("app");
  if (!(mountNode instanceof HTMLElement)) {
    throw new Error("Renderer mount node #app not found.");
  }

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#ffffff";
  mountNode.style.width = "100vw";
  mountNode.style.height = "100vh";

  window.__kwikk = {
    isReady: false,

    async loadProject(project: ProjectDocument) {
      // Destroy previous renderer if any
      if (renderer) {
        renderer.destroy();
        renderer = null;
      }
      mountNode.innerHTML = "";

      // Match viewport size to project dimensions so Puppeteer screenshots
      // capture exactly the scene at the right aspect ratio.
      if (project.viewport) {
        mountNode.style.width = `${project.viewport.width}px`;
        mountNode.style.height = `${project.viewport.height}px`;
      }

      renderer = new CSSSceneRenderer(project);
      await renderer.mount(mountNode);
      renderer.renderFrame({ timeMs: 0 });
      // Shape "image" fills load asynchronously — wait for them before declaring frame 0 ready,
      // otherwise Puppeteer can screenshot before they've resolved and bake in the default fill.
      await waitForPendingShapeFillImages();

      // Signal ready so Puppeteer's waitForFunction resolves
      (window.__kwikk as KwikkRenderAPI).isReady = true;
    },

    async setTime(ms: number) {
      renderer?.renderFrame({ timeMs: ms });
      await waitForPendingShapeFillImages();
    },
  };
}

void bootstrap();
