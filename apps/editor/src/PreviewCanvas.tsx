import { PixiSceneRenderer, resolveRenderFrame } from "@kwikk/render-core";
import type { ElementContent, ProjectDocument, LayoutProps } from "@kwikk/shared-types";
import { useEffect, useRef, useState } from "react";

interface PreviewCanvasProps {
  project: ProjectDocument;
  timeMs: number;
  showAllElements?: boolean;
  selectedElementId?: string | null;
  onUpdateElement?: (id: string, updates: { content?: Partial<ElementContent>, layout?: Partial<LayoutProps>, style?: any }) => void;
  onSelectElement?: (id: string | null) => void;
}

export function PreviewCanvas({ project, timeMs, showAllElements, selectedElementId, onUpdateElement, onSelectElement }: PreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiSceneRenderer | null>(null);
  const latestProjectRef = useRef(project);
  const latestTimeRef = useRef(timeMs);
  const latestShowAllRef = useRef(showAllElements);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number } | null>(null);

  latestProjectRef.current = project;
  latestTimeRef.current = timeMs;
  latestShowAllRef.current = showAllElements;

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) {
      return;
    }

    let isCancelled = false;
    let redrawFrameId = 0;

    const renderer = new PixiSceneRenderer(latestProjectRef.current, {
      backgroundColor: "transparent"
    });
    rendererRef.current = renderer;

    const drawLatestFrame = () => {
      renderer.setProject(latestProjectRef.current);
      renderer.renderFrame({ timeMs: latestTimeRef.current, showAllElements: latestShowAllRef.current });
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
    renderer.renderFrame({ timeMs, showAllElements });
  }, [project, timeMs, showAllElements]);

  const frame = resolveRenderFrame(project, { timeMs, showAllElements });
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
    const fontStyle = selectedElement.style.fontStyle ?? "normal";

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
              fontStyle: fontStyle,
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

  const getFrameCoordinates = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const y = clientY - rect.top;

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

    return {
      frameX: (x - offsetX) / scale,
      frameY: (y - offsetY) / scale,
      scale
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onSelectElement) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const { frameX, frameY } = getFrameCoordinates(e.clientX, e.clientY, rect);

    let clickedElementId: string | null = null;
    let clickedElement = null;

    for (let i = frame.elements.length - 1; i >= 0; i--) {
      const el = frame.elements[i];
      if (
        frameX >= el.layout.x &&
        frameX <= el.layout.x + el.layout.width &&
        frameY >= el.layout.y &&
        frameY <= el.layout.y + el.layout.height
      ) {
        clickedElementId = el.id;
        clickedElement = el;
        break;
      }
    }

    onSelectElement(clickedElementId);

    if (clickedElementId && clickedElement) {
      setIsDragging(true);
      setDragStartPos({ x: frameX, y: frameY });
      setElementStartPos({ x: clickedElement.layout.x, y: clickedElement.layout.y });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartPos || !elementStartPos || !selectedElementId || !onUpdateElement) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const { frameX, frameY } = getFrameCoordinates(e.clientX, e.clientY, rect);

    const deltaX = frameX - dragStartPos.x;
    const deltaY = frameY - dragStartPos.y;

    onUpdateElement(selectedElementId, {
      layout: {
        x: elementStartPos.x + deltaX,
        y: elementStartPos.y + deltaY
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setDragStartPos(null);
    setElementStartPos(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div 
        className="preview-canvas" 
        ref={mountRef} 
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, cursor: isDragging ? "grabbing" : "default" }} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {textOverlay}
    </div>
  );
}
