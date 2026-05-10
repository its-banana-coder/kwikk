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

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) {
      return;
    }

    const renderer = new PixiSceneRenderer(project, {
      backgroundColor: "#020617"
    });
    rendererRef.current = renderer;

    void renderer.mount(mountNode).then(() => {
      renderer.renderFrame({ timeMs });
    });

    return () => {
      renderer.destroy();
      rendererRef.current = null;
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
