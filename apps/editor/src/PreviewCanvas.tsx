import { PixiSceneRenderer, resolveRenderFrame } from "@kwikk/render-core";
import { spansFromPlainText } from "@kwikk/scene-graph";
import type { ElementContent, ProjectDocument, LayoutProps, TextSpan } from "@kwikk/shared-types";
import { useEffect, useRef, useState, useCallback } from "react";

interface PreviewCanvasProps {
  project: ProjectDocument;
  timeMs: number;
  showAllElements?: boolean;
  isPlaying?: boolean;
  selectedElementId?: string | null;
  onUpdateElement?: (id: string, updates: { content?: Partial<ElementContent>, layout?: Partial<LayoutProps>, style?: any }) => void;
  onSelectElement?: (id: string | null) => void;
  onPatchTextSpans?: (elementId: string, spans: TextSpan[]) => void;
  onTextSelectionChange?: (range: { start: number; end: number } | null) => void;
}

function charOffsetOf(root: HTMLElement, targetNode: Node, nodeOffset: number): number {
  let count = 0;
  function walk(node: Node): boolean {
    if (node === targetNode) { count += nodeOffset; return true; }
    if (node.nodeType === Node.TEXT_NODE) { count += node.textContent?.length ?? 0; return false; }
    for (let i = 0; i < node.childNodes.length; i++) { if (walk(node.childNodes[i])) return true; }
    return false;
  }
  walk(root);
  return count;
}

function getSelectionCharRange(el: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;
  const start = charOffsetOf(el, range.startContainer, range.startOffset);
  const end = charOffsetOf(el, range.endContainer, range.endOffset);
  return start < end ? { start, end } : null;
}

function spansToEditableHtml(spans: TextSpan[]): string {
  return spans
    .map((span) => {
      const css: string[] = [];
      if (span.style?.fontWeight !== undefined) css.push(`font-weight:${span.style.fontWeight}`);
      if (span.style?.fontStyle) css.push(`font-style:${span.style.fontStyle}`);
      if (span.style?.color) css.push(`color:${span.style.color}`);
      if (span.style?.fontSize !== undefined) css.push(`font-size:${span.style.fontSize}px`);
      if (span.style?.fontFamily) css.push(`font-family:${span.style.fontFamily}`);
      const text = span.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return css.length > 0 ? `<span style="${css.join(";")};">${text}</span>` : `<span>${text}</span>`;
    })
    .join("");
}

function domToSpans(el: HTMLElement): TextSpan[] {
  const spans: TextSpan[] = [];
  for (const child of el.childNodes) {
    const text = child.textContent ?? "";
    if (!text) continue;
    if (child.nodeType === Node.TEXT_NODE) {
      spans.push({ text });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const spanEl = child as HTMLElement;
      const s = spanEl.style;
      const style: TextSpan["style"] = {};
      if (s.fontWeight) style.fontWeight = s.fontWeight;
      if (s.fontStyle && s.fontStyle !== "normal") style.fontStyle = s.fontStyle;
      if (s.color) style.color = s.color;
      if (s.fontSize) style.fontSize = parseInt(s.fontSize, 10);
      if (s.fontFamily) style.fontFamily = s.fontFamily;
      spans.push(Object.keys(style).length > 0 ? { text, style } : { text });
    }
  }
  return spans.length > 0 ? spans : [{ text: el.textContent ?? "" }];
}

export function PreviewCanvas({ project, timeMs, showAllElements, isPlaying, selectedElementId, onUpdateElement, onSelectElement, onPatchTextSpans, onTextSelectionChange }: PreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiSceneRenderer | null>(null);
  const latestProjectRef = useRef(project);
  const latestTimeRef = useRef(timeMs);
  const latestShowAllRef = useRef(showAllElements);
  const editableRef = useRef<HTMLDivElement | null>(null);
  const editableIsFocusedRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [resizeStartBounds, setResizeStartBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const latestSelectedElementIdRef = useRef(selectedElementId);
  latestProjectRef.current = project;
  latestTimeRef.current = timeMs;
  latestShowAllRef.current = showAllElements;
  latestSelectedElementIdRef.current = selectedElementId;

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
      const proj = latestProjectRef.current;
      const selId = latestSelectedElementIdRef.current;
      const isText = selId ? proj.scenes.some((s) => s.elements.some((e) => e.id === selId && e.type === "text")) : false;
      renderer.setProject(proj);
      renderer.renderFrame({ timeMs: latestTimeRef.current, showAllElements: latestShowAllRef.current, excludeElementId: isText ? selId ?? undefined : undefined });
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

    const isText = !isPlaying && selectedElementId ? project.scenes.some((s) => s.elements.some((e) => e.id === selectedElementId && e.type === "text")) : false;
    renderer.setProject(project);
    renderer.renderFrame({ timeMs, showAllElements, excludeElementId: isText ? selectedElementId ?? undefined : undefined });
  }, [project, timeMs, showAllElements, isPlaying, selectedElementId]);

  const frame = resolveRenderFrame(project, { timeMs, showAllElements });
  const selectedElement = frame.elements.find((e) => e.id === selectedElementId);
  const isEditingText = !isPlaying && selectedElement && selectedElement.type === "text";

  const handleSelectionChange = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const range = getSelectionCharRange(el);
    onTextSelectionChange?.(range);
  }, [onTextSelectionChange]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  // Reset innerHTML when switching to a different text element
  useEffect(() => {
    const el = editableRef.current;
    if (!el || !isEditingText || !selectedElement) return;
    const spans: TextSpan[] = selectedElement.content?.richText ?? spansFromPlainText(selectedElement.content?.text ?? "");
    el.innerHTML = spansToEditableHtml(spans);
  }, [selectedElementId]);

  // Sync innerHTML from external edits (e.g. inspector) when overlay is not focused
  useEffect(() => {
    const el = editableRef.current;
    if (!el || !isEditingText || !selectedElement || editableIsFocusedRef.current) return;
    const spans: TextSpan[] = selectedElement.content?.richText ?? spansFromPlainText(selectedElement.content?.text ?? "");
    el.innerHTML = spansToEditableHtml(spans);
  });

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
    const fontWeight = String(selectedElement.style.fontWeight ?? "600");
    const fontStyle = selectedElement.style.fontStyle ?? "normal";
    const color = selectedElement.style.color ?? "#0f172a";
    const textAlign = (selectedElement.style.textAlign ?? "left") as "left" | "center" | "right" | "justify";

    textOverlay = (
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={() => { editableIsFocusedRef.current = true; }}
        onBlur={() => { editableIsFocusedRef.current = false; }}
        onInput={(e) => {
          if (!onPatchTextSpans) return;
          const newSpans = domToSpans(e.currentTarget);
          onPatchTextSpans(selectedElement.id, newSpans);
        }}
        style={{
          position: "absolute",
          left: elX,
          top: elY,
          width: elWidth,
          minHeight: elHeight,
          background: selectedElement.style.backgroundColor || "transparent",
          borderRadius: selectedElement.style.backgroundColor && selectedElement.style.backgroundColor !== "transparent" ? 24 : 0,
          border: "1px dashed #3b82f6",
          outline: "none",
          padding: 0,
          margin: 0,
          overflow: "visible",
          opacity: 1,
          fontSize: `${fontSize}px`,
          fontFamily,
          fontWeight,
          fontStyle,
          color,
          textAlign,
          lineHeight: "normal",
          zIndex: 10,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          cursor: "text"
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
    const rect = e.currentTarget.getBoundingClientRect();
    const { frameX, frameY } = getFrameCoordinates(e.clientX, e.clientY, rect);

    if (isResizing && resizeDir && resizeStartPos && resizeStartBounds && selectedElementId && onUpdateElement) {
      const dx = frameX - resizeStartPos.x;
      const dy = frameY - resizeStartPos.y;
      const { x, y, width, height } = resizeStartBounds;
      let newX = x, newY = y, newW = width, newH = height;

      if (resizeDir.includes("e")) newW = Math.max(20, width + dx);
      if (resizeDir.includes("s")) newH = Math.max(20, height + dy);
      if (resizeDir.includes("w")) { newW = Math.max(20, width - dx); newX = x + (width - newW); }
      if (resizeDir.includes("n")) { newH = Math.max(20, height - dy); newY = y + (height - newH); }

      onUpdateElement(selectedElementId, { layout: { x: newX, y: newY, width: newW, height: newH } });
      return;
    }

    if (!isDragging || !dragStartPos || !elementStartPos || !selectedElementId || !onUpdateElement) return;
    const deltaX = frameX - dragStartPos.x;
    const deltaY = frameY - dragStartPos.y;
    onUpdateElement(selectedElementId, {
      layout: { x: elementStartPos.x + deltaX, y: elementStartPos.y + deltaY }
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setDragStartPos(null);
    setElementStartPos(null);
    setIsResizing(false);
    setResizeDir(null);
    setResizeStartPos(null);
    setResizeStartBounds(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  let selectionOverlay = null;
  if (selectedElement && dimensions.width > 0 && dimensions.height > 0) {
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

    const handleStyle = (pos: { top?: number | string; bottom?: number | string; left?: number | string; right?: number | string }, cursor: string): React.CSSProperties => ({
      position: "absolute",
      width: 9,
      height: 9,
      background: "#ffffff",
      border: "2px solid #3b82f6",
      borderRadius: 2,
      pointerEvents: "all",
      cursor,
      ...pos
    });

    const startResize = (dir: "nw" | "ne" | "sw" | "se", e: React.PointerEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget.closest(".preview-canvas-container") as HTMLElement)?.getBoundingClientRect();
      if (!rect || !selectedElement) return;
      const { frameX, frameY } = getFrameCoordinates(e.clientX, e.clientY, rect);
      setIsResizing(true);
      setResizeDir(dir);
      setResizeStartPos({ x: frameX, y: frameY });
      setResizeStartBounds({
        x: selectedElement.layout.x,
        y: selectedElement.layout.y,
        width: selectedElement.layout.width,
        height: selectedElement.layout.height
      });
    };

    selectionOverlay = (
      <div
        style={{
          position: "absolute",
          left: elX,
          top: elY,
          width: elWidth,
          height: elHeight,
          border: "2px solid #3b82f6",
          borderRadius: 3,
          pointerEvents: "none",
          zIndex: 20,
          boxSizing: "border-box"
        }}
      >
        {(["nw", "ne", "sw", "se"] as const).map((dir) => (
          <div
            key={dir}
            style={handleStyle(
              {
                top: dir.includes("n") ? -5 : undefined,
                bottom: dir.includes("s") ? -5 : undefined,
                left: dir.includes("w") ? -5 : undefined,
                right: dir.includes("e") ? -5 : undefined
              },
              `${dir}-resize`
            )}
            onPointerDown={(e) => startResize(dir, e)}
          />
        ))}
      </div>
    );
  }

  const resizeCursor = resizeDir ? `${resizeDir}-resize` : "crosshair";

  return (
    <div className="preview-canvas-container" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        className="preview-canvas"
        ref={mountRef}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, cursor: isDragging ? "grabbing" : "default" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {selectionOverlay}
      {textOverlay}
      {isResizing && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 50, cursor: resizeCursor }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
    </div>
  );
}
