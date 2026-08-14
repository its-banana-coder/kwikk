import React, { useRef, useState } from "react";
import { IconCopy, IconArrowsRightLeft, IconTrash, IconEraser } from "@tabler/icons-react";
import { Popover, Badge, Box, Stack, Text, Select, NumberInput } from "@mantine/core";
import type { ElementNode } from "@kwikk/shared-types";
import { useEditorStore, useSelectedScene } from "../store";

const LABEL_W = 132;
const TRACK_H = 27;
const RULER_H = 22;
const PX_PER_S = 80;
const PX_PER_MS = PX_PER_S / 1000;
const HANDLE_W = 6;
const MIN_CLIP_MS = 100;

type DragMode = "move" | "start" | "end";

interface DragState {
  elementId: string;
  mode: DragMode;
  pointerStartX: number;
  initialStartMs: number;
  initialEndMs: number;
  liveStartMs: number;
  liveEndMs: number;
}

function elementLabel(el: ElementNode): string {
  const icon = el.semanticRole === "subtitle" ? "💬" : el.type === "image" ? "🖼" : el.type === "text" ? "T" : "▭";
  const name = el.content?.label?.slice(0, 18) || el.content?.text?.slice(0, 18) || el.semanticRole || el.id.slice(0, 8);
  return `${icon} ${name}`;
}

function clipColor(el: ElementNode): string {
  if (el.semanticRole === "subtitle") return "#16a34a";
  switch (el.type) {
    case "image": return "#ea580c";
    case "text": return "#2563eb";
    case "shape": return "#7c3aed";
    default: return "#475569";
  }
}

function TransitionChip({ sceneId, transition, onSet }: { sceneId: string; transition: any; onSet: (sceneId: string, transition: any) => void }) {
  const [open, setOpen] = useState(false);
  const label = transition ? (
    transition.type === 'fade' ? 'Fade' :
    transition.type === 'slide_left' ? 'Slide ←' :
    transition.type === 'slide_right' ? 'Slide →' :
    transition.type === 'slide_up' ? 'Slide ↑' :
    transition.type === 'slide_down' ? 'Slide ↓' :
    transition.type === 'zoom_out' ? 'Zoom Out' :
    transition.type === 'zoom_in' ? 'Zoom In' :
    transition.type === 'blur_out' ? 'Blur' :
    transition.type === 'whip_pan_left' ? 'Whip ←' :
    transition.type === 'whip_pan_right' ? 'Whip →' :
    transition.type === 'flash_cut' ? 'Flash' :
    transition.type === 'spin_in' ? 'Spin' :
    transition.type === 'glitch_cut' ? 'Glitch' :
    transition.type === 'cross_zoom' ? 'X-Zoom' :
    transition.type === 'iris_in' ? 'Iris ↓' :
    transition.type === 'iris_out' ? 'Iris ↑' :
    transition.type === 'split_h' ? 'Split H' :
    transition.type === 'split_v' ? 'Split V' :
    transition.type === 'diagonal_wipe' ? 'Diag' :
    transition.type === 'push_left' ? 'Push ←' :
    transition.type === 'push_right' ? 'Push →' :
    transition.type === 'dissolve' ? 'Dissolve' :
    transition.type === 'color_flash' ? 'C-Flash' :
    transition.type === 'page_flip' ? 'Flip' :
    transition.type === 'cube_left' ? 'Cube ←' :
    transition.type === 'cube_right' ? 'Cube →' :
    transition.type === 'ripple' ? 'Ripple' :
    transition.type === 'pixelate_wipe' ? 'Pixel' :
    transition.type === 'swirl_wipe' ? 'Swirl' :
    transition.type === 'clock_wipe' ? 'Clock' :
    transition.type === 'channel_split' ? 'RGB' :
    transition.type === 'burn_in' ? 'Burn' :
    transition.type === 'glitch_blocks' ? 'Glitch' :
    transition.type === 'lens_zoom' ? 'Lens' :
    String(transition.type)
  ) : null;

  return (
    <Popover opened={open} onChange={setOpen} position="right" withArrow shadow="md">
      <Popover.Target>
        <Box
          style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "6px 4px", cursor: "pointer", minWidth: 32 }}
          onClick={() => setOpen(true)}
          title="Set transition"
        >
          {transition ? (
            <Badge size="xs" variant="filled" color="violet" leftSection={<IconArrowsRightLeft size={10} />} style={{ cursor: "pointer" }}>{label}</Badge>
          ) : (
            <Box style={{ width: 24, height: 3, background: "rgba(120,120,120,0.3)", borderRadius: 2 }} />
          )}
        </Box>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={8} style={{ width: 180 }}>
          <Text fz="xs" fw={600} c="dimmed">Transition</Text>
          <Select
            size="xs"
            placeholder="None"
            clearable
            data={[
                { value: "fade", label: "Fade" },
                { value: "slide_left", label: "Slide Left ←" },
                { value: "slide_right", label: "Slide Right →" },
                { value: "slide_up", label: "Slide Up ↑" },
                { value: "slide_down", label: "Slide Down ↓" },
                { value: "zoom_in", label: "Zoom In" },
                { value: "zoom_out", label: "Zoom Out" },
                { value: "blur_out", label: "Blur Out" },
                { value: "whip_pan_left", label: "Whip Pan ←" },
                { value: "whip_pan_right", label: "Whip Pan →" },
                { value: "flash_cut", label: "Flash Cut" },
                { value: "spin_in", label: "Spin In" },
                { value: "glitch_cut", label: "Glitch Cut" },
                { value: "cross_zoom", label: "Cross Zoom" },
                { value: "iris_in", label: "Iris In" },
                { value: "iris_out", label: "Iris Out" },
                { value: "split_h", label: "Split Horizontal" },
                { value: "split_v", label: "Split Vertical" },
                { value: "diagonal_wipe", label: "Diagonal Wipe" },
                { value: "push_left", label: "Push Left" },
                { value: "push_right", label: "Push Right" },
                { value: "dissolve", label: "Dissolve" },
                { value: "color_flash", label: "Color Flash" },
                { value: "page_flip", label: "Page Flip" },
                { value: "cube_left", label: "Cube Left" },
                { value: "cube_right", label: "Cube Right" },
                { value: "ripple", label: "Ripple" },
                { value: "pixelate_wipe", label: "Pixelate Wipe" },
                { value: "swirl_wipe", label: "Swirl Wipe" },
                { value: "clock_wipe", label: "Clock Wipe" },
                { value: "channel_split", label: "Channel Split" },
                { value: "burn_in", label: "Burn In" },
                { value: "glitch_blocks", label: "Glitch Blocks" },
                { value: "lens_zoom", label: "Lens Zoom" },
              ]}
            value={transition?.type ?? null}
            onChange={(v) => {
              if (v === null) onSet(sceneId, undefined);
              else onSet(sceneId, { type: v as any, durationMs: transition?.durationMs ?? 500 });
            }}
          />
          {transition && (
            <NumberInput size="xs" label="Duration" min={100} max={2000} step={100} value={transition.durationMs} suffix=" ms" onChange={(v) => onSet(sceneId, { ...transition, durationMs: typeof v === 'number' ? v : 500 })} />
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function nextElId(): string {
  return `el_${Math.random().toString(36).slice(2, 9)}`;
}

function collectAllElementIds(elements: ElementNode[]): string[] {
  const out: string[] = [];
  for (const el of elements) {
    out.push(el.id);
    if (el.children?.length) out.push(...collectAllElementIds(el.children));
  }
  return out;
}

function formatSec(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SceneTimeline() {
  const project = useEditorStore((s) => s.project);
  const selectedSceneId = useEditorStore((s) => s.selectedSceneId);
  const currentTimeMs = useEditorStore((s) => s.timeline.currentTimeMs);
  const dispatchOperation = useEditorStore((s) => s.dispatchOperation);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const selectScene = useEditorStore((s) => s.selectScene);
  const selectElement = useEditorStore((s) => s.selectElement);
  const addScene = useEditorStore((s) => s.addScene);
  const updateScene = useEditorStore((s) => s.updateScene);
  const deleteScene = useEditorStore((s) => s.deleteScene);
  const setSceneTransition = useEditorStore((s) => s.setSceneTransition);
  const selectedElementId = useEditorStore((s) => s.selectedElementIds[0] ?? null);
  const selectedScene = useSelectedScene();

  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sceneDurationMsRef = useRef(0);

  const sceneTrack = project.timelineTracks.find((t) => t.sceneId === selectedSceneId);
  const sceneStartMs = sceneTrack?.startMs ?? 0;
  const sceneDurationMs = selectedScene?.durationMs ?? 10000;
  sceneDurationMsRef.current = sceneDurationMs;

  const elements = selectedScene?.elements ?? [];
  const regularElements = elements.filter((el) => el.semanticRole !== "subtitle");
  const subtitleElements = elements.filter((el) => el.semanticRole === "subtitle");
  const localTimeMs = Math.max(0, Math.min(sceneDurationMs, currentTimeMs - sceneStartMs));
  const totalTrackW = LABEL_W + sceneDurationMs * PX_PER_MS;
  const playheadX = LABEL_W + localTimeMs * PX_PER_MS;

  // ── Seek on ruler / empty track click ──────────────────────────────────────

  function seekFromScrollX(clientX: number) {
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const contentX = clientX - rect.left + container.scrollLeft;
    const trackX = contentX - LABEL_W;
    if (trackX < 0) return;
    const newLocalMs = Math.max(0, Math.min(sceneDurationMs, trackX / PX_PER_MS));
    setCurrentTime(sceneStartMs + newLocalMs);
  }

  function handleRulerMouseDown(e: React.MouseEvent) {
    seekFromScrollX(e.clientX);
  }

  function handleTrackBgMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return;
    seekFromScrollX(e.clientX);
  }

  // ── Clip drag ──────────────────────────────────────────────────────────────
  // Listeners are attached inline on mousedown and torn down in the onUp
  // closure — no useEffect needed. Mutable local variables track live
  // positions so onUp always reads the final value, not stale React state.

  function handleClipMouseDown(e: React.MouseEvent, element: ElementNode, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();

    const initialStartMs = element.startMs ?? 0;
    const initialEndMs = element.endMs ?? sceneDurationMs;
    const pointerStartX = e.clientX;
    const clipDuration = initialEndMs - initialStartMs;

    // Mutable — updated by onMove, read by onUp
    let liveStartMs = initialStartMs;
    let liveEndMs = initialEndMs;

    selectElement(selectedSceneId, element.id);
    setDragState({ elementId: element.id, mode, pointerStartX, initialStartMs, initialEndMs, liveStartMs, liveEndMs });

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - pointerStartX;
      const deltaMs = dx / PX_PER_MS;
      const sdMs = sceneDurationMsRef.current;

      if (mode === "move") {
        liveStartMs = Math.max(0, Math.min(sdMs - clipDuration, initialStartMs + deltaMs));
        liveEndMs = liveStartMs + clipDuration;
      } else if (mode === "start") {
        liveStartMs = Math.max(0, Math.min(initialEndMs - MIN_CLIP_MS, initialStartMs + deltaMs));
        liveEndMs = initialEndMs;
      } else {
        liveStartMs = initialStartMs;
        liveEndMs = Math.min(sdMs, Math.max(initialStartMs + MIN_CLIP_MS, initialEndMs + deltaMs));
      }

      setDragState({ elementId: element.id, mode, pointerStartX, initialStartMs, initialEndMs, liveStartMs, liveEndMs });
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDragState(null);
      dispatchOperation({
        operation: "set_element_timing",
        sceneId: selectedSceneId,
        elementId: element.id,
        startMs: Math.round(liveStartMs),
        endMs: Math.round(liveEndMs)
      });
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderTrackRow(element: ElementNode, trackBg = "transparent") {
    return (
      <div key={element.id} style={{ height: TRACK_H, display: "flex", position: "relative", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
        <div
          style={{
            width: LABEL_W, flexShrink: 0, display: "flex", alignItems: "center",
            paddingLeft: 8, paddingRight: 6, fontSize: 10, fontWeight: 600,
            color: selectedElementId === element.id ? "#c2410c" : "#475569",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            cursor: "pointer", borderRight: "1px solid rgba(0,0,0,0.08)",
            background: selectedElementId === element.id ? "rgba(249,115,22,0.06)" : "#ffffff",
            position: "sticky", left: 0, zIndex: 2
          }}
          onClick={() => {
            selectElement(selectedSceneId, element.id);
            // Jump the playhead only if the element is outside the currently visible window.
            if (element.startMs !== undefined) {
              const elemEnd = element.endMs ?? sceneDurationMs;
              if (localTimeMs < element.startMs || localTimeMs > elemEnd) {
                setCurrentTime(sceneStartMs + element.startMs);
              }
            }
          }}
          title={element.semanticRole ?? element.id}
        >
          {elementLabel(element)}
        </div>
        <div
          style={{ flex: 1, position: "relative", background: selectedElementId === element.id ? "rgba(249,115,22,0.03)" : trackBg }}
          onMouseDown={handleTrackBgMouseDown}
        >
          {renderClip(element)}
        </div>
      </div>
    );
  }

  function renderRuler() {
    const marks: React.ReactNode[] = [];
    const stepMs = sceneDurationMs <= 5000 ? 500 : 1000;
    for (let ms = 0; ms <= sceneDurationMs; ms += stepMs) {
      const x = LABEL_W + ms * PX_PER_MS;
      marks.push(
        <div
          key={ms}
          style={{ position: "absolute", left: x, top: 0, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}
        >
          <div style={{ width: 1, height: 6, background: "rgba(0,0,0,0.2)" }} />
          <span style={{ fontSize: 9, color: "#94a3b8", transform: "translateX(-50%)", whiteSpace: "nowrap", marginLeft: 1 }}>
            {formatSec(ms)}
          </span>
        </div>
      );
    }
    return marks;
  }

  function renderClip(element: ElementNode) {
    const isDragging = dragState?.elementId === element.id;
    const startMs = isDragging ? dragState!.liveStartMs : (element.startMs ?? 0);
    const endMs = isDragging ? dragState!.liveEndMs : (element.endMs ?? sceneDurationMs);

    const left = startMs * PX_PER_MS;
    const width = Math.max(HANDLE_W * 2 + 4, (endMs - startMs) * PX_PER_MS);
    const color = clipColor(element);
    const isSelected = selectedElementId === element.id;

    return (
      <div
        style={{
          position: "absolute",
          left,
          width,
          top: 2,
          height: TRACK_H - 4,
          borderRadius: 4,
          background: color,
          opacity: isDragging ? 0.75 : 1,
          outline: isSelected ? `2px solid ${color}` : "none",
          outlineOffset: 1,
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          userSelect: "none",
          boxShadow: isSelected ? `0 0 0 2px ${color}40` : "none"
        }}
        onMouseDown={(e) => handleClipMouseDown(e, element, "move")}
      >
        <div
          style={{ width: HANDLE_W, height: "100%", cursor: "ew-resize", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRadius: "4px 0 0 4px" }}
          onMouseDown={(e) => handleClipMouseDown(e, element, "start")}
        />
        <span style={{ flex: 1, fontSize: 10, color: "#fff", fontWeight: 600, paddingLeft: 4, paddingRight: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {element.content?.text?.slice(0, 24) || element.semanticRole || element.id.slice(0, 8)}
        </span>
        <div
          style={{ width: HANDLE_W, height: "100%", cursor: "ew-resize", flexShrink: 0, background: "rgba(0,0,0,0.25)", borderRadius: "0 4px 4px 0" }}
          onMouseDown={(e) => handleClipMouseDown(e, element, "end")}
        />
      </div>
    );
  }

  // ── Add subtitle ───────────────────────────────────────────────────────────

  function addSubtitle() {
    const id = nextElId();
    const startMs = Math.round(localTimeMs);
    const endMs = Math.round(Math.min(sceneDurationMs, localTimeMs + 3000));
    dispatchOperation({ operation: "add_subtitle", sceneId: selectedSceneId, elementId: id, startMs, endMs, text: "Subtitle text" });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f5f7fb", overflow: "hidden" }}>

      {/* ── Scene tabs row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#ffffff", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {project.timelineTracks.map((track, idx) => {
          const scene = project.scenes.find((s) => s.id === track.sceneId);
          const active = track.sceneId === selectedSceneId;
          const isRenaming = renamingSceneId === track.sceneId;
          return (
            <React.Fragment key={track.id}>
              <div
                onClick={() => !isRenaming && selectScene(track.sceneId)}
                onDoubleClick={() => { setRenamingSceneId(track.sceneId); setRenameValue(scene?.name ?? track.sceneId); }}
                style={{
                  flexShrink: 0,
                  minWidth: 64,
                  height: 24,
                  borderRadius: 5,
                  border: `1.5px solid ${active ? "rgba(249,115,22,0.5)" : "rgba(0,0,0,0.1)"}`,
                  background: active ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: "0 6px 0 8px",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? "#c2410c" : "#374151",
                  whiteSpace: "nowrap",
                  transition: "border-color 0.1s, background 0.1s"
                }}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => { if (renameValue.trim()) updateScene(track.sceneId, { name: renameValue.trim() }); setRenamingSceneId(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { if (renameValue.trim()) updateScene(track.sceneId, { name: renameValue.trim() }); setRenamingSceneId(null); }
                      else if (e.key === "Escape") setRenamingSceneId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ border: "none", outline: "none", background: "transparent", fontSize: 11, fontWeight: 600, color: "inherit", textAlign: "center", width: "100%", padding: 0 }}
                  />
                ) : (
                  <>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{scene?.name ?? track.sceneId}</span>
                    <button
                      type="button"
                      title="Duplicate scene"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!scene) return;
                        const ids = collectAllElementIds(scene.elements);
                        const newElementIds = Object.fromEntries(ids.map((id) => [id, crypto.randomUUID()]));
                        dispatchOperation({
                          operation: "duplicate_scene",
                          sceneId: scene.id,
                          newSceneId: crypto.randomUUID(),
                          newElementIds
                        });
                      }}
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        border: "none",
                        borderRadius: 4,
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "inherit",
                        opacity: 0.7
                      }}
                    >
                      <IconCopy size={14} />
                    </button>
                    <button
                      type="button"
                      title="Clear all elements in scene"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatchOperation({ operation: "clear_scene_elements", sceneId: track.sceneId });
                      }}
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        border: "none",
                        borderRadius: 4,
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "inherit",
                        opacity: 0.7
                      }}
                    >
                      <IconEraser size={14} />
                    </button>
                    <button
                      type="button"
                      title="Delete scene"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (project.scenes.length <= 1) return;
                        deleteScene(track.sceneId);
                      }}
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        border: "none",
                        borderRadius: 4,
                        background: "transparent",
                        cursor: project.scenes.length <= 1 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: project.scenes.length <= 1 ? "#d1d5db" : "inherit",
                        opacity: project.scenes.length <= 1 ? 0.4 : 0.7
                      }}
                    >
                      <IconTrash size={14} />
                    </button>
                  </>
                )}
              </div>
              {idx < project.timelineTracks.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", paddingLeft: 6, paddingRight: 6 }}>
                  <TransitionChip
                    sceneId={project.timelineTracks[idx].sceneId}
                    transition={project.scenes.find((s) => s.id === project.timelineTracks[idx].sceneId)?.transition}
                    onSet={(sceneId, transition) => setSceneTransition(sceneId, transition)}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}

        <button
          onClick={addScene}
          style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 5, border: "1px dashed rgba(0,0,0,0.2)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#9ca3af" }}
          title="Add scene"
        >
          +
        </button>

        <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
          {formatSec(localTimeMs)} / {formatSec(sceneDurationMs)}
        </span>
      </div>

      {/* ── Track area (scrollable) ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "auto", position: "relative", cursor: "default" }}>
        <div style={{ minWidth: totalTrackW, position: "relative" }}>

          {/* Ruler */}
          <div
            style={{ height: RULER_H, position: "relative", background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.08)", cursor: "crosshair" }}
            onMouseDown={handleRulerMouseDown}
          >
            {/* Label spacer */}
            <div style={{ position: "absolute", left: 0, width: LABEL_W, top: 0, height: "100%", background: "#fff", zIndex: 1, borderRight: "1px solid rgba(0,0,0,0.08)" }} />
            {renderRuler()}
          </div>

          {/* ── Element tracks ── */}
          {regularElements.length === 0 ? (
            <div style={{ height: TRACK_H, display: "flex", alignItems: "center", paddingLeft: LABEL_W + 8, fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
              No elements in this scene.
            </div>
          ) : (
            regularElements.map((element) => renderTrackRow(element))
          )}

          {/* ── Subtitle layer ── */}
          <div style={{ display: "flex", alignItems: "center", height: 22, borderTop: "1.5px solid rgba(22,163,74,0.18)", borderBottom: "1px solid rgba(22,163,74,0.12)", background: "rgba(22,163,74,0.04)", flexShrink: 0 }}>
            {/* sticky label cell */}
            <div style={{ width: LABEL_W, flexShrink: 0, paddingLeft: 8, fontSize: 9, fontWeight: 700, color: "#16a34a", letterSpacing: "0.06em", textTransform: "uppercase", position: "sticky", left: 0, background: "rgba(22,163,74,0.04)", borderRight: "1px solid rgba(22,163,74,0.12)", height: "100%", display: "flex", alignItems: "center" }}>
              Subtitles
            </div>
            {/* Add subtitle button floats in track area */}
            <div style={{ flex: 1, paddingLeft: 8 }}>
              <button
                onClick={addSubtitle}
                style={{ fontSize: 9, color: "#16a34a", background: "none", border: "1px dashed rgba(22,163,74,0.6)", borderRadius: 3, padding: "1px 8px", cursor: "pointer", fontWeight: 700 }}
              >
                + Add
              </button>
            </div>
          </div>

          {subtitleElements.length === 0 ? (
            <div style={{ height: TRACK_H, display: "flex", alignItems: "center", paddingLeft: LABEL_W + 8, fontSize: 11, color: "#86efac", fontStyle: "italic" }}>
              No subtitles yet.
            </div>
          ) : (
            subtitleElements.map((element) => renderTrackRow(element, "rgba(22,163,74,0.03)"))
          )}

          {/* Playhead */}
          <div
            style={{ position: "absolute", top: 0, left: playheadX, width: 1.5, height: "100%", background: "#f97316", pointerEvents: "none", zIndex: 10 }}
          >
            <div style={{ position: "absolute", top: 0, left: -4, width: 9, height: 9, background: "#f97316", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
          </div>

        </div>
      </div>
    </div>
  );
}
