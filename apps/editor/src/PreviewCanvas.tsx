import { PixiSceneRenderer } from "@kwikk/render-core";
import type { ProjectDocument } from "@kwikk/shared-types";
import { useEffect, useRef } from "react";

interface PreviewCanvasProps {
  project: ProjectDocument;
  timeMs: number;
}

export function PreviewCanvas({ project, timeMs }: PreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiSceneRenderer | null>(null);
  const latestProjectRef = useRef(project);
  const latestTimeRef = useRef(timeMs);

  latestProjectRef.current = project;
  latestTimeRef.current = timeMs;

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) {
      return;
    }

    let isCancelled = false;
    let redrawFrameId = 0;

    const renderer = new PixiSceneRenderer(latestProjectRef.current, {
      backgroundColor: "#020617"
    });
    rendererRef.current = renderer;

    const drawLatestFrame = () => {
      renderer.setProject(latestProjectRef.current);
      renderer.renderFrame({ timeMs: latestTimeRef.current });
    };

    void renderer.mount(mountNode).then(() => {
      if (isCancelled || rendererRef.current !== renderer) {
        renderer.destroy();
        return;
      }

      drawLatestFrame();

      // Render once more on the next frame so Pixi draws after the container
      // has settled to its final responsive size.
      redrawFrameId = window.requestAnimationFrame(() => {
        if (!isCancelled && rendererRef.current === renderer) {
          drawLatestFrame();
        }
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      redrawFrameId = window.requestAnimationFrame(() => {
        if (!isCancelled && rendererRef.current === renderer) {
          drawLatestFrame();
        }
      });
    });
    resizeObserver.observe(mountNode);

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(redrawFrameId);
      resizeObserver.disconnect();
      renderer.destroy();
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    renderer.setProject(project);
    renderer.renderFrame({ timeMs });
  }, [project, timeMs]);

  return <div className="preview-canvas" ref={mountRef} />;
}
