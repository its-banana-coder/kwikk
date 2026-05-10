import { PixiSceneRenderer, resolveRenderFrame } from "@kwikk/render-core";
import type { ElementContent, ProjectDocument } from "@kwikk/shared-types";
import { useEffect, useRef, useState } from "react";

interface PreviewCanvasProps {
  project: ProjectDocument;
  timeMs: number;
  selectedElementId?: string | null;
  onUpdateElement?: (id: string, updates: { content: Partial<ElementContent> }) => void;
  onSelectElement?: (id: string | null) => void;
}

export function PreviewCanvas({ project, timeMs, selectedElementId, onUpdateElement, onSelectElement }: PreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiSceneRenderer | null>(null);
  const latestProjectRef = useRef(project);
  const latestTimeRef = useRef(timeMs);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
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

  const frame = resolveRenderFrame(project, { timeMs });
  const selectedElement = frame.elements.find((e) => e.id === selectedElementId);
  const isEditingText = selectedElement && selectedElement.type === "text";

  let textOverlay = null;
  if (isEditingText && dimensions.width > 0 && dimensions.height > 0) {
    const rendererWidth = dimensions.width;
    const rendererHeight = dimensions.height;
    const scale = Math.min(
      rendererWidth / frame.viewport.width,
      rendererHeight / frame.viewport.height
    );
    const frameWidth = frame.viewport.width * scale;
    const frameHeight = frame.viewport.height * scale;
    const offsetX = (rendererWidth - frameWidth) / 2;
    const offsetY = (rendererHeight - frameHeight) / 2;

    const elX = offsetX + selectedElement.layout.x * scale;
    const elY = offsetY + selectedElement.layout.y * scale;
    const elWidth = selectedElement.layout.width * scale;
    const elHeight = selectedElement.layout.height * scale;
    
    const fontSize = (selectedElement.style.fontSize ?? 48) * scale;
    const fontFamily = selectedElement.style.fontFamily ?? "Inter";
    const fontWeight = selectedElement.style.fontWeight ?? "600";

    textOverlay = (
      <textarea
        style={{
          position: "absolute",
          left: elX,
          top: elY,
          width: elWidth,
          height: elHeight,
          background: "transparent",
          border: "1px dashed #3b82f6",
          color: "transparent",
          caretColor: "#3b82f6",
          zIndex: 10,
          resize: "none",
          outline: "none",
          padding: 0,
          margin: 0,
          overflow: "hidden",
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          lineHeight: "normal"
        }}
        value={selectedElement.content?.text ?? ""}
        onChange={(e) => {
          if (onUpdateElement) {
            onUpdateElement(selectedElement.id, {
              content: { ...selectedElement.content, text: e.target.value }
            });
          }
        }}
      />
    );
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectElement) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rendererWidth = dimensions.width;
    const rendererHeight = dimensions.height;
    const scale = Math.min(
      rendererWidth / frame.viewport.width,
      rendererHeight / frame.viewport.height
    );
    const frameWidth = frame.viewport.width * scale;
    const frameHeight = frame.viewport.height * scale;
    const offsetX = (rendererWidth - frameWidth) / 2;
    const offsetY = (rendererHeight - frameHeight) / 2;

    const frameX = (x - offsetX) / scale;
    const frameY = (y - offsetY) / scale;

    for (let i = frame.elements.length - 1; i >= 0; i--) {
      const el = frame.elements[i];
      if (
        frameX >= el.layout.x &&
        frameX <= el.layout.x + el.layout.width &&
        frameY >= el.layout.y &&
        frameY <= el.layout.y + el.layout.height
      ) {
        onSelectElement(el.id);
        return;
      }
    }
    
    onSelectElement(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div 
        className="preview-canvas" 
        ref={mountRef} 
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} 
        onClick={handleCanvasClick}
      />
      {textOverlay}
    </div>
  );
}
