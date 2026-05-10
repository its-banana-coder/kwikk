import { PixiSceneRenderer } from "@kwikk/render-core";
import { createPrototypeProject } from "@kwikk/scene-graph";
import { TimelineEngine, getTimelineDurationMs } from "@kwikk/timeline";

const project = createPrototypeProject();
const timeline = new TimelineEngine({
  durationMs: getTimelineDurationMs(project.timelineTracks),
  loop: true
});
const renderer = new PixiSceneRenderer(project, {
  backgroundColor: "#020617"
});

export function renderFrame(timeMs: number) {
  return renderer.renderFrame({ timeMs });
}

async function bootstrap() {
  const mountNode = document.getElementById("app");
  if (!(mountNode instanceof HTMLElement)) {
    throw new Error("Renderer mount node not found.");
  }

  document.body.style.margin = "0";
  document.body.style.background = "#020617";
  document.body.style.fontFamily = "Inter, sans-serif";
  mountNode.style.width = "100vw";
  mountNode.style.height = "100vh";

  await renderer.mount(mountNode);
  renderFrame(0);
  timeline.play();

  let previousTimestamp = performance.now();
  const loop = (timestamp: number) => {
    const deltaMs = timestamp - previousTimestamp;
    previousTimestamp = timestamp;
    const timeMs = timeline.tick(deltaMs);
    renderFrame(timeMs);
    window.requestAnimationFrame(loop);
  };

  window.requestAnimationFrame(loop);
}

void bootstrap();
