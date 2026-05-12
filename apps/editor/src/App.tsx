import { resolveRenderFrame } from "@kwikk/render-core";
import { validateProjectDocument, applySpanFormat, spansFromPlainText } from "@kwikk/scene-graph";
import { MOTION_PRESETS, buildPresetAnimations, type MotionPresetKey } from "@kwikk/animation-engine";
import { TimelineEngine } from "@kwikk/timeline";
import { InspectorField, tokens, useEditorLayoutStore } from "@kwikk/ui-kit";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  ColorSwatch,
  Divider,
  Group,
  NumberInput,
  Popover,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  Tooltip
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconEye,
  IconEyeOff,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconPhoto,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconPlus,
  IconRectangle,
  IconSparkles,
  IconTextSize,
  IconTimeline,
  IconTrash,
  IconUpload,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconFlipHorizontal,
  IconFlipVertical,
  IconLock,
  IconLockOpen,
  IconCrop,
  IconFilter,
  IconFrame
} from "@tabler/icons-react";
import type { AnimationType, ElementNode, Scene, SceneBackground, ImageFitMode } from "@kwikk/shared-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { PreviewCanvas } from "./PreviewCanvas";
import type { EditorOperation, ElementPatch } from "./store";
import { useEditorStore, useSelectedElement, useSelectedScene } from "./store";

type SidebarTool = "elements" | "text" | "images" | null;

const ICON_RAIL_WIDTH = 52;
const EXPANSION_WIDTH = 220;
const motionPresetKeys = Object.keys(MOTION_PRESETS) as MotionPresetKey[];

function toNumber(v: string | number | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function formatMs(v: number): string {
  return `${Math.round(v)} ms`;
}

function humanizePreset(v: string): string {
  return v.replace(/_/g, " ");
}

function nextElId(): string {
  return `el_${Math.random().toString(36).slice(2, 9)}`;
}

const PALETTE = [
  "#ffffff", "#f1f5f9", "#94a3b8", "#475569", "#1e293b", "#0f172a",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
  "#8b5cf6", "#ec4899", "#f43f5e", "#10b981", "#6366f1", "#4f46e5",
  "#7c3aed", "#db2777", "#0369a1", "#15803d", "#b45309", "#9f1239"
];

function SwatchPicker({ value, onChange, allowNone }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  return (
    <Popover position="bottom-start" withinPortal>
      <Popover.Target>
        <Box
          style={{
            width: "100%",
            height: 30,
            borderRadius: 6,
            background: value || "transparent",
            border: "1.5px solid rgba(0,0,0,0.15)",
            cursor: "pointer",
            position: "relative"
          }}
        >
          {!value && (
            <Box style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Text fz="xs" c="gray.5">None</Text>
            </Box>
          )}
        </Box>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <SimpleGrid cols={6} spacing={4}>
          {allowNone && (
            <Box
              style={{
                width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                border: "1.5px solid rgba(0,0,0,0.2)",
                background: "repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, transparent 0, transparent 50%) 0/8px 8px"
              }}
              title="None"
              onClick={() => onChange("")}
            />
          )}
          {PALETTE.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              size={22}
              style={{ cursor: "pointer", outline: value === c ? "2px solid #3b82f6" : "none", outlineOffset: 1, borderRadius: 4 }}
              onClick={() => onChange(c)}
            />
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}

function applyMotionPreset(
  dispatch: (op: EditorOperation) => void,
  project: ReturnType<typeof useEditorStore.getState>["project"],
  sceneId: string,
  elementId: string,
  key: MotionPresetKey
) {
  const track = project.timelineTracks.find((t) => t.sceneId === sceneId);
  dispatch({
    operation: "set_element_motion_preset",
    sceneId,
    elementId,
    motionPreset: key,
    animations: buildPresetAnimations(key, track?.durationMs)
  });
}

export default function App() {
  const project = useEditorStore((s) => s.project);
  const selectedSceneId = useEditorStore((s) => s.selectedSceneId);
  const timeline = useEditorStore((s) => s.timeline);
  const playback = useEditorStore((s) => s.playback);
  const selectScene = useEditorStore((s) => s.selectScene);
  const syncSelectedScene = useEditorStore((s) => s.syncSelectedScene);
  const selectElement = useEditorStore((s) => s.selectElement);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setPlayback = useEditorStore((s) => s.setPlayback);
  const togglePlayback = useEditorStore((s) => s.togglePlayback);
  const showAllElements = useEditorStore((s) => s.showAllElements);
  const toggleShowAllElements = useEditorStore((s) => s.toggleShowAllElements);
  const dispatchOperation = useEditorStore((s) => s.dispatchOperation);
  const textSelectionRange = useEditorStore((s) => s.textSelectionRange);
  const setTextSelectionRange = useEditorStore((s) => s.setTextSelectionRange);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const addScene = useEditorStore((s) => s.addScene);
  const updateScene = useEditorStore((s) => s.updateScene);
  const selectedScene = useSelectedScene();
  const selectedElement = useSelectedElement();

  const leftSidebarCollapsed = useEditorLayoutStore((s) => s.leftSidebarCollapsed);
  const rightInspectorCollapsed = useEditorLayoutStore((s) => s.rightInspectorCollapsed);
  const bottomTimelineCollapsed = useEditorLayoutStore((s) => s.bottomTimelineCollapsed);
  const rightInspectorWidth = useEditorLayoutStore((s) => s.rightInspectorWidth);
  const bottomTimelineHeight = useEditorLayoutStore((s) => s.bottomTimelineHeight);
  const toggleLeftSidebar = useEditorLayoutStore((s) => s.toggleLeftSidebar);
  const toggleRightInspector = useEditorLayoutStore((s) => s.toggleRightInspector);
  const toggleBottomTimeline = useEditorLayoutStore((s) => s.toggleBottomTimeline);

  const [activeTool, setActiveTool] = useState<SidebarTool>(null);
  const [inspectorTab, setInspectorTab] = useState<"element" | "scene">("element");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const frame = resolveRenderFrame(project, { timeMs: timeline.currentTimeMs, showAllElements });
  const errors = validateProjectDocument(project);

  const timelineEngineRef = useRef(
    new TimelineEngine({ durationMs: timeline.durationMs, currentTimeMs: timeline.currentTimeMs, loop: false })
  );
  const playbackRef = useRef(playback.isPlaying);
  playbackRef.current = playback.isPlaying;

  useEffect(() => { timelineEngineRef.current.setDuration(timeline.durationMs); }, [timeline.durationMs]);

  useEffect(() => {
    if (Math.abs(timelineEngineRef.current.currentTimeMs - timeline.currentTimeMs) > 1) {
      timelineEngineRef.current.seek(timeline.currentTimeMs);
    }
  }, [timeline.currentTimeMs]);

  useEffect(() => {
    if (playback.isPlaying) timelineEngineRef.current.play();
    else timelineEngineRef.current.pause();
  }, [playback.isPlaying]);

  useEffect(() => {
    if (frame.sceneId && frame.sceneId !== selectedSceneId) syncSelectedScene(frame.sceneId);
  }, [frame.sceneId, selectedSceneId, syncSelectedScene]);

  useEffect(() => {
    let frameId = 0;
    let prev = performance.now();
    const step = (ts: number) => {
      const delta = ts - prev;
      prev = ts;
      if (playbackRef.current) {
        const next = timelineEngineRef.current.tick(delta);
        setCurrentTime(next);
        if (!timelineEngineRef.current.isPlaying) setPlayback(false);
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [setCurrentTime, setPlayback]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        if (src) setUploadedImages((prev) => [src, ...prev]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function addImageToCanvas(src: string) {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 400;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const elementId = nextElId();
      dispatchOperation({
        operation: "add_element",
        sceneId: selectedSceneId,
        elementId,
        type: "image",
        content: { src, label: "Image" },
        layout: { width, height }
      });
    };
    img.src = src;
  }

  function addShape(variant: "rectangle" | "square") {
    const elementId = nextElId();
    const isSquare = variant === "square";
    dispatchOperation({
      operation: "add_element",
      sceneId: selectedSceneId,
      elementId,
      type: "shape",
      content: { shape: "rectangle" },
      style: { backgroundColor: "#4f46e5", borderRadius: 8 },
      layout: isSquare ? { width: 200, height: 200 } : { width: 240, height: 120 }
    });
  }

  function toggleTool(tool: SidebarTool) {
    setActiveTool((prev) => (prev === tool ? null : tool));
  }

  // ── Computed sidebar width ────────────────────────────────────────────────
  const sidebarWidth = leftSidebarCollapsed ? 0 : ICON_RAIL_WIDTH + EXPANSION_WIDTH;
  const inspectorWidth = rightInspectorCollapsed ? 0 : rightInspectorWidth;
  const timelineHeight = bottomTimelineCollapsed ? 0 : bottomTimelineHeight;

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#edf0f5" }}>
      {/* ── Toolbar ── */}
      <Box style={{ height: tokens.panelSizes.toolbar, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#ffffff" }}>
        <Group gap={8} wrap="nowrap">
          <Box p={6} style={{ borderRadius: 8, background: "linear-gradient(135deg,rgba(255,173,92,0.18),rgba(255,120,84,0.09))", color: "#c9520a", flexShrink: 0 }}>
            <IconSparkles size={15} />
          </Box>
          <Text c="gray.9" fw={700} fz="sm">{project.name}</Text>
          <Badge color={errors.length > 0 ? "red" : "teal"} variant="light" size="xs">
            {errors.length > 0 ? `${errors.length} issue${errors.length === 1 ? "" : "s"}` : "healthy"}
          </Badge>
        </Group>

        <Group gap={6}>
          <Tooltip label={showAllElements ? "Show timed elements" : "Show all elements"} position="bottom" withArrow>
            <ActionIcon
              variant={showAllElements ? "filled" : "light"}
              color={showAllElements ? "violet" : "gray"}
              size="sm"
              onClick={toggleShowAllElements}
            >
              {showAllElements ? <IconEyeOff size={13} /> : <IconEye size={13} />}
            </ActionIcon>
          </Tooltip>
          <Divider orientation="vertical" />
          <ActionIcon
            variant={playback.isPlaying ? "filled" : "light"}
            color={playback.isPlaying ? "orange" : "gray"}
            size="sm"
            onClick={() => { if (!playback.isPlaying) togglePlayback(); }}
          >
            <IconPlayerPlayFilled size={13} />
          </ActionIcon>
          <ActionIcon
            variant={!playback.isPlaying ? "filled" : "light"}
            color="gray"
            size="sm"
            onClick={() => { if (playback.isPlaying) togglePlayback(); }}
          >
            <IconPlayerPauseFilled size={13} />
          </ActionIcon>
          <ActionIcon variant="light" color="gray" size="sm" onClick={() => { if (playback.isPlaying) togglePlayback(); setCurrentTime(0); }}>
            <IconPlayerStopFilled size={13} />
          </ActionIcon>
        </Group>

        <Group gap={4}>
          <ActionIcon variant={leftSidebarCollapsed ? "filled" : "subtle"} color="gray" size="sm" onClick={toggleLeftSidebar} title="Toggle sidebar">
            <IconLayoutSidebarLeftCollapse size={14} />
          </ActionIcon>
          <ActionIcon variant={bottomTimelineCollapsed ? "filled" : "subtle"} color="gray" size="sm" onClick={toggleBottomTimeline} title="Toggle timeline">
            <IconTimeline size={14} />
          </ActionIcon>
          <ActionIcon variant={rightInspectorCollapsed ? "filled" : "subtle"} color="gray" size="sm" onClick={toggleRightInspector} title="Toggle inspector">
            <IconLayoutSidebarRightCollapse size={14} />
          </ActionIcon>
        </Group>
      </Box>

      {/* ── Middle row: sidebar + canvas + inspector ── */}
      <Box style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sidebar */}
        {!leftSidebarCollapsed && (
          <Box style={{ width: sidebarWidth, flexShrink: 0, display: "flex", borderRight: "1px solid rgba(0,0,0,0.07)", background: "#ffffff", overflow: "hidden" }}>
            {/* Icon rail */}
            <Box style={{ width: ICON_RAIL_WIDTH, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 4 }}>
              <Tooltip label="Elements" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "elements" ? "filled" : "subtle"}
                  color={activeTool === "elements" ? "orange" : "gray"}
                  size="xl"
                  radius="md"
                  onClick={() => toggleTool("elements")}
                >
                  <IconRectangle size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Text" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "text" ? "filled" : "subtle"}
                  color={activeTool === "text" ? "orange" : "gray"}
                  size="xl"
                  radius="md"
                  onClick={() => toggleTool("text")}
                >
                  <IconTextSize size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Images" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "images" ? "filled" : "subtle"}
                  color={activeTool === "images" ? "orange" : "gray"}
                  size="xl"
                  radius="md"
                  onClick={() => toggleTool("images")}
                >
                  <IconPhoto size={20} />
                </ActionIcon>
              </Tooltip>
            </Box>

            {/* Expansion panel — always rendered to keep player position stable */}
            <Box style={{ width: EXPANSION_WIDTH, display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
              {activeTool && (
                <Box style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
                  <Text fz="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">
                    {activeTool === "elements" ? "Elements" : activeTool === "text" ? "Text" : "Images"}
                  </Text>
                </Box>
              )}
              <ScrollArea style={{ flex: 1 }}>
                {activeTool === "elements" && (
                  <Stack gap={6} p={8}>
                    <ShapeCard label="Rectangle" onClick={() => addShape("rectangle")} preview={{ w: 48, h: 32 }} />
                    <ShapeCard label="Square" onClick={() => addShape("square")} preview={{ w: 32, h: 32 }} />
                  </Stack>
                )}

                {activeTool === "text" && (
                  <Stack gap={6} p={8}>
                    <Box
                      style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer" }}
                      onClick={() => {
                        const elementId = nextElId();
                        dispatchOperation({
                          operation: "add_element",
                          sceneId: selectedSceneId,
                          elementId,
                          type: "text",
                          semanticRole: "section_title",
                          content: { text: "Title" },
                          style: { fontSize: 80, color: "#000000", fontWeight: "700", textAlign: "center" },
                          layout: { x: 0, width: project.viewport.width, height: 100 },
                        });
                      }}
                    >
                      <Text fz={22} fw={700} c="dark.0" lh={1.2}>Add a Title</Text>
                      <Text fz="xs" c="gray.5" mt={4}>80px · Bold · Black</Text>
                    </Box>

                    <Box
                      style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer" }}
                      onClick={() => {
                        const elementId = nextElId();
                        dispatchOperation({
                          operation: "add_element",
                          sceneId: selectedSceneId,
                          elementId,
                          type: "text",
                          semanticRole: "body_copy",
                          content: { text: "Add your text" },
                          style: { fontSize: 40, color: "#ffffff", fontWeight: "400" },
                          layout: { width: 500, height: 60 },
                        });
                      }}
                    >
                      <Text fz={14} fw={400} c="gray.3" lh={1.2}>Add a Text</Text>
                      <Text fz="xs" c="gray.5" mt={4}>40px · Regular · White</Text>
                    </Box>
                  </Stack>
                )}

                {activeTool === "images" && (
                  <Stack gap={8} p={8}>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />
                    <Button
                      fullWidth
                      variant="light"
                      color="orange"
                      size="sm"
                      leftSection={<IconUpload size={14} />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Image
                    </Button>
                    {uploadedImages.length === 0 ? (
                      <Text c="gray.5" fz="xs" ta="center" pt={4}>No images uploaded yet.</Text>
                    ) : (
                      <SimpleGrid cols={2} spacing={4}>
                        {uploadedImages.map((src, i) => (
                          <Box
                            key={i}
                            style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(0,0,0,0.09)" }}
                            onClick={() => addImageToCanvas(src)}
                          >
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                  </Stack>
                )}
              </ScrollArea>
            </Box>
          </Box>
        )}

        {/* Canvas */}
        <Box style={{ flex: 1, overflow: "hidden" }}>
          <Box className="editor-canvas-frame" style={{ height: "100%", borderRadius: 0, border: "none" }}>
            <PreviewCanvas
              project={project}
              timeMs={timeline.currentTimeMs}
              showAllElements={showAllElements}
              isPlaying={playback.isPlaying}
              selectedElementId={selectedElement?.id}
              onUpdateElement={(id, updates) => {
                if (selectedScene) updateElement(selectedScene.id, id, updates);
              }}
              onSelectElement={(id) => {
                if (selectedScene) selectElement(selectedScene.id, id || "");
              }}
              onPatchTextSpans={(elementId, spans) => {
                if (selectedScene) {
                  dispatchOperation({ operation: "patch_text_spans", sceneId: selectedScene.id, elementId, spans });
                }
              }}
              onTextSelectionChange={(range) => {
                if (selectedElement && range) {
                  setTextSelectionRange({ elementId: selectedElement.id, start: range.start, end: range.end });
                } else {
                  setTextSelectionRange(null);
                }
              }}
            />
          </Box>
        </Box>

        {/* Right inspector */}
        {!rightInspectorCollapsed && (
          <Box style={{ width: inspectorWidth, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.07)", background: "#ffffff", display: "flex", flexDirection: "column" }}>
            <Box style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
              <Group justify="space-between">
                <Group gap={6}>
                  <IconAdjustmentsHorizontal size={14} color="#c9520a" />
                  <Text fz="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">Inspector</Text>
                </Group>
                <SegmentedControl
                  size="xs"
                  data={[
                    { label: 'Element', value: 'element' },
                    { label: 'Scene', value: 'scene' }
                  ]}
                  value={inspectorTab}
                  onChange={(val) => setInspectorTab(val as "element" | "scene")}
                  styles={{ root: { backgroundColor: 'transparent' } }}
                />
              </Group>
            </Box>
            <ScrollArea style={{ flex: 1 }} p="sm">
              {inspectorTab === "scene" && selectedScene ? (
                <SceneInspector
                  scene={selectedScene}
                  onUpdateScene={updateScene}
                />
              ) : selectedScene && selectedElement ? (
                <ElementInspector
                  selectedSceneId={selectedScene.id}
                  selectedElement={selectedElement}
                  project={project}
                  onUpdateElement={updateElement}
                  onDispatchOperation={dispatchOperation}
                  onDelete={() => deleteElement(selectedScene.id, selectedElement.id)}
                  textSelectionRange={textSelectionRange?.elementId === selectedElement.id ? textSelectionRange : null}
                />
              ) : (
                <Box style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", paddingTop: 48 }}>
                  <IconAdjustmentsHorizontal size={28} color="rgba(0,0,0,0.15)" />
                  <Text c="gray.6" fz="xs" ta="center" mt={8}>
                    {inspectorTab === "element" ? "Click an element on the canvas to edit its properties." : "No scene selected."}
                  </Text>
                </Box>
              )}
            </ScrollArea>
          </Box>
        )}
      </Box>

      {/* ── Timeline ── */}
      {!bottomTimelineCollapsed && (
        <Box style={{ height: timelineHeight, flexShrink: 0, borderTop: "1px solid rgba(0,0,0,0.07)", background: "#f5f7fb", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", gap: 6 }}>
          {/* Scenes strip */}
          <Box style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {project.timelineTracks.map((track) => {
              const scene = project.scenes.find((s) => s.id === track.sceneId);
              const active = track.sceneId === selectedSceneId;
              const isRenaming = renamingSceneId === track.sceneId;
              return (
                <Box
                  key={track.id}
                  onClick={() => selectScene(track.sceneId)}
                  onDoubleClick={() => {
                    setRenamingSceneId(track.sceneId);
                    setRenameValue(scene?.name ?? track.sceneId);
                  }}
                  style={{
                    flexShrink: 0,
                    minWidth: 72,
                    height: 32,
                    borderRadius: 6,
                    border: `1px solid ${active ? "rgba(255,173,92,0.45)" : "rgba(0,0,0,0.09)"}`,
                    background: active ? "rgba(255,173,92,0.12)" : "rgba(0,0,0,0.02)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: "0 6px",
                    transition: "border-color 0.12s, background 0.12s"
                  }}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        if (renameValue.trim()) updateScene(track.sceneId, { name: renameValue.trim() });
                        setRenamingSceneId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (renameValue.trim()) updateScene(track.sceneId, { name: renameValue.trim() });
                          setRenamingSceneId(null);
                        } else if (e.key === "Escape") {
                          setRenamingSceneId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        color: active ? "#c2410c" : "#374151",
                        textAlign: "center",
                        padding: 0
                      }}
                    />
                  ) : (
                    <Text fz="xs" fw={600} c={active ? "orange.7" : "gray.7"} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                      {scene?.name ?? track.sceneId}
                    </Text>
                  )}
                </Box>
              );
            })}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius={6}
              style={{ flexShrink: 0, border: "1px dashed rgba(0,0,0,0.12)", width: 32, height: 32 }}
              onClick={addScene}
              title="Add scene"
            >
              <IconPlus size={12} />
            </ActionIcon>
          </Box>

          {/* Scrubber */}
          <Group gap={8} wrap="nowrap">
            <Text c="gray.6" fz="xs" style={{ flexShrink: 0, minWidth: 52 }}>
              {formatMs(timeline.currentTimeMs)}
            </Text>
            <Slider
              style={{ flex: 1 }}
              color="orange"
              min={0}
              max={timeline.durationMs}
              step={50}
              value={timeline.currentTimeMs}
              onChange={setCurrentTime}
              label={null}
              size="xs"
            />
            <Text c="gray.6" fz="xs" style={{ flexShrink: 0 }}>
              {Math.round(timeline.durationMs / 1000)}s
            </Text>
          </Group>
        </Box>
      )}
    </Box>
  );
}

// ── Shape card for elements panel ────────────────────────────────────────────
function ShapeCard({ label, onClick, preview }: {
  label: string;
  onClick: () => void;
  preview: { w: number; h: number };
}) {
  return (
    <Box
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.02)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "background 0.1s, border-color 0.1s"
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,140,50,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,90,10,0.3)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)"; }}
    >
      <Box style={{ width: preview.w, height: preview.h, borderRadius: 3, border: "2px solid rgba(255,173,92,0.45)", background: "rgba(255,173,92,0.08)", flexShrink: 0 }} />
      <Text fz="sm" fw={500} c="gray.8">{label}</Text>
    </Box>
  );
}

// ── Element inspector ─────────────────────────────────────────────────────────
interface ElementInspectorProps {
  selectedSceneId: string;
  selectedElement: ElementNode;
  project: ReturnType<typeof useEditorStore.getState>["project"];
  onUpdateElement: (sceneId: string, elementId: string, patch: ElementPatch) => void;
  onDispatchOperation: (op: EditorOperation) => void;
  onDelete: () => void;
  textSelectionRange: { elementId: string; start: number; end: number } | null;
}

function ElementInspector({ selectedSceneId, selectedElement, project, onUpdateElement, onDispatchOperation, onDelete, textSelectionRange }: ElementInspectorProps) {
  const [showDimensions, setShowDimensions] = useState(false);

  // Preserve the last non-null selection so inspector clicks (which fire selectionchange
  // before onChange, clearing the range) still apply formatting to the intended chars.
  const lastSelectionRef = useRef(textSelectionRange);
  useEffect(() => {
    if (textSelectionRange !== null) lastSelectionRef.current = textSelectionRange;
  }, [textSelectionRange]);
  useEffect(() => { lastSelectionRef.current = null; }, [selectedElement.id]);

  const hasSelection = !!textSelectionRange;

  function applySpanStyle(styleOverride: Parameters<typeof applySpanFormat>[3]) {
    const range = textSelectionRange ?? lastSelectionRef.current;
    if (!range) return;
    const currentSpans = selectedElement.content?.richText ?? spansFromPlainText(selectedElement.content?.text ?? "");
    const newSpans = applySpanFormat(currentSpans, range.start, range.end, styleOverride);
    onDispatchOperation({ operation: "patch_text_spans", sceneId: selectedSceneId, elementId: selectedElement.id, spans: newSpans });
  }

  function applyTextStyle(styleOverride: Parameters<typeof applySpanFormat>[3] & Partial<import("@kwikk/shared-types").StyleProps>) {
    const isSpanOnlyProp = "color" in styleOverride || "fontWeight" in styleOverride || "fontStyle" in styleOverride;
    const hasElementProp = "fontFamily" in styleOverride || "fontSize" in styleOverride;

    if (hasElementProp) {
      // Font family and size always update the element-level style so Pixi's
      // baseStyle (used for both plain text and HTMLText fallback) stays correct.
      onUpdateElement(selectedSceneId, selectedElement.id, { style: styleOverride });
    }

    if (isSpanOnlyProp && (hasSelection || lastSelectionRef.current)) {
      // Bold / italic / color: apply as per-character span formatting when
      // there is an active (or recently cleared) text selection.
      applySpanStyle(styleOverride);
    } else if (isSpanOnlyProp) {
      onUpdateElement(selectedSceneId, selectedElement.id, { style: styleOverride });
    }
  }

  return (
    <Stack gap="md" pt={4}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Badge variant="light" color="orange" size="sm">{selectedElement.type}</Badge>
          <Text c="gray.7" fz="xs" fw={600} tt="uppercase" lts="0.06em" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedElement.semanticRole ?? selectedElement.type}
          </Text>
        </Group>
        <ActionIcon variant="subtle" color="red" size="sm" onClick={onDelete} title="Delete element">
          <IconTrash size={13} />
        </ActionIcon>
      </Group>

      {selectedElement.type === "text" && (
        <>
          {hasSelection && (
            <Text fz="xs" c="orange.6" fw={600} ta="center" style={{ background: "rgba(255,140,50,0.07)", borderRadius: 6, padding: "4px 8px" }}>
              Formatting applies to selected text
            </Text>
          )}
          <InspectorField
            label="Text"
            input={
              <Textarea
                autosize
                minRows={2}
                value={selectedElement.content?.text ?? ""}
                onChange={(e) => {
                  const text = e.currentTarget.value;
                  // Clear richText so the plain text value is what Pixi renders during playback
                  onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, text, richText: undefined } });
                }}
              />
            }
          />
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Font"
              input={
                <Select
                  data={["Inter", "DM Sans", "Space Grotesk", "IBM Plex Sans", "Manrope"]}
                  value={selectedElement.style.fontFamily ?? "Inter"}
                  onChange={(v) => applyTextStyle({ fontFamily: v ?? "Inter" })}
                />
              }
            />
            <InspectorField
              label="Size"
              input={
                <NumberInput
                  min={8}
                  value={selectedElement.style.fontSize ?? 48}
                  onChange={(v) => applyTextStyle({ fontSize: toNumber(v, selectedElement.style.fontSize ?? 48) })}
                />
              }
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Color"
              input={
                <SwatchPicker
                  value={selectedElement.style.color ?? "#f8fafc"}
                  onChange={(v) => applyTextStyle({ color: v })}
                />
              }
            />
            <InspectorField
              label="BG"
              input={
                <SwatchPicker
                  value={selectedElement.style.backgroundColor ?? "#000000"}
                  onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { backgroundColor: v } })}
                />
              }
            />
          </SimpleGrid>
          <InspectorField
            label="Align"
            input={
              <SegmentedControl
                data={[
                  { value: 'left', label: <IconAlignLeft size={16} /> },
                  { value: 'center', label: <IconAlignCenter size={16} /> },
                  { value: 'right', label: <IconAlignRight size={16} /> },
                  { value: 'justify', label: <IconAlignJustified size={16} /> },
                ]}
                value={selectedElement.style.textAlign || 'left'}
                onChange={(value) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { textAlign: value } })}
              />
            }
          />
          <Group grow>
            <Switch
              label="Bold"
              size="xs"
              checked={Number(selectedElement.style.fontWeight ?? 600) >= 700}
              onChange={(e) => applyTextStyle({ fontWeight: e.currentTarget.checked ? 700 : 400 })}
            />
            <Switch
              label="Italic"
              size="xs"
              checked={(selectedElement.style.fontStyle ?? "normal") === "italic"}
              onChange={(e) => applyTextStyle({ fontStyle: e.currentTarget.checked ? "italic" : "normal" })}
            />
          </Group>
        </>
      )}

      {selectedElement.type === "image" && (
        <ImageInspector
          selectedSceneId={selectedSceneId}
          selectedElement={selectedElement}
          onUpdateElement={onUpdateElement}
          onDispatchOperation={onDispatchOperation}
        />
      )}

      {selectedElement.type === "shape" && (
        <>
          <Divider color="rgba(0,0,0,0.08)" />
          <Stack gap="xs">
            <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Appearance</Text>
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="Fill"
                input={
                  <SwatchPicker
                    value={selectedElement.style.backgroundColor ?? "#334155"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { backgroundColor: v } })}
                  />
                }
              />
              <InspectorField
                label="Pattern"
                input={
                  <Select
                    data={[
                      { value: "solid", label: "Solid" },
                      { value: "gradient", label: "Gradient" },
                      { value: "stripes", label: "Stripes" },
                      { value: "dots", label: "Dots" },
                      { value: "grid", label: "Grid" }
                    ]}
                    value={selectedElement.style.fillPattern ?? "solid"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { fillPattern: (v ?? "solid") as any } })}
                  />
                }
              />
            </SimpleGrid>
            {(selectedElement.style.fillPattern === "gradient" ||
              selectedElement.style.fillPattern === "stripes" ||
              selectedElement.style.fillPattern === "dots" ||
              selectedElement.style.fillPattern === "grid") && (
              <InspectorField
                label={selectedElement.style.fillPattern === "gradient" ? "End color" : "Pattern color"}
                input={
                  <SwatchPicker
                    value={selectedElement.style.fillColor2 ?? "#64748b"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { fillColor2: v } })}
                  />
                }
              />
            )}
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="Border"
                input={
                  <SwatchPicker
                    allowNone
                    value={selectedElement.style.borderColor ?? ""}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { borderColor: v || undefined } })}
                  />
                }
              />
              <InspectorField
                label="B. Width"
                input={
                  <NumberInput
                    min={0}
                    max={32}
                    value={selectedElement.style.borderWidth ?? 0}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { borderWidth: toNumber(v, 0) } })}
                  />
                }
              />
            </SimpleGrid>
            <InspectorField
              label="Radius"
              input={
                <NumberInput
                  min={0}
                  max={200}
                  value={selectedElement.style.borderRadius ?? 8}
                  onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { borderRadius: toNumber(v, 8) } })}
                />
              }
            />
          </Stack>
        </>
      )}

      <Divider color="rgba(0,0,0,0.08)" />

      <Stack gap="xs">
        <Group justify="space-between">
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Layout</Text>
          <Group gap={4}>
            <ActionIcon
              variant="subtle"
              color={selectedElement.layout.locked ? "red" : "gray"}
              size="xs"
              onClick={() => onDispatchOperation({ operation: "toggle_element_lock", sceneId: selectedSceneId, elementId: selectedElement.id, locked: !selectedElement.layout.locked })}
            >
              {selectedElement.layout.locked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color={selectedElement.layout.visible === false ? "red" : "gray"}
              size="xs"
              onClick={() => onDispatchOperation({ operation: "toggle_element_visibility", sceneId: selectedSceneId, elementId: selectedElement.id, visible: selectedElement.layout.visible === false })}
            >
              {selectedElement.layout.visible === false ? <IconEyeOff size={12} /> : <IconEye size={12} />}
            </ActionIcon>
            {selectedElement.type !== "shape" && (
              <Button variant="subtle" color="gray" size="compact-xs" onClick={() => setShowDimensions((v) => !v)}>
                {showDimensions ? "Hide" : "Dimensions"}
              </Button>
            )}
          </Group>
        </Group>
        {(showDimensions || selectedElement.type === "shape") && (
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField label="X" input={<NumberInput disabled={selectedElement.layout.locked} value={selectedElement.layout.x} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { x: toNumber(v, selectedElement.layout.x) } })} />} />
            <InspectorField label="Y" input={<NumberInput disabled={selectedElement.layout.locked} value={selectedElement.layout.y} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { y: toNumber(v, selectedElement.layout.y) } })} />} />
            <InspectorField label="W" input={<NumberInput disabled={selectedElement.layout.locked} min={1} value={selectedElement.layout.width} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { width: toNumber(v, selectedElement.layout.width) } })} />} />
            <InspectorField label="H" input={<NumberInput disabled={selectedElement.layout.locked} min={1} value={selectedElement.layout.height} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { height: toNumber(v, selectedElement.layout.height) } })} />} />
          </SimpleGrid>
        )}
        <SimpleGrid cols={2} spacing="xs">
          <InspectorField label="Scale" input={<NumberInput disabled={selectedElement.layout.locked} min={0.1} step={0.05} value={selectedElement.layout.scale} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { scale: toNumber(v, selectedElement.layout.scale) } })} />} />
          <InspectorField label="Opacity" input={<NumberInput disabled={selectedElement.layout.locked} min={0} max={1} step={0.05} value={selectedElement.layout.opacity} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { opacity: toNumber(v, selectedElement.layout.opacity) } })} />} />
        </SimpleGrid>
        <SimpleGrid cols={2} spacing="xs">
          <InspectorField label="Rotation" input={<NumberInput disabled={selectedElement.layout.locked} value={selectedElement.layout.rotation} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { rotation: toNumber(v, selectedElement.layout.rotation) } })} />} />
          <InspectorField label="Z-Index" input={<NumberInput disabled={selectedElement.layout.locked} value={selectedElement.layout.zIndex} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { zIndex: toNumber(v, selectedElement.layout.zIndex) } })} />} />
        </SimpleGrid>
        <Group grow>
          <Button
            variant={selectedElement.layout.flipX ? "filled" : "light"}
            size="xs"
            color="gray"
            leftSection={<IconFlipHorizontal size={14} />}
            onClick={() => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { flipX: !selectedElement.layout.flipX } })}
          >
            Flip X
          </Button>
          <Button
            variant={selectedElement.layout.flipY ? "filled" : "light"}
            size="xs"
            color="gray"
            leftSection={<IconFlipVertical size={14} />}
            onClick={() => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { flipY: !selectedElement.layout.flipY } })}
          >
            Flip Y
          </Button>
        </Group>
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      <Stack gap="xs">
        <Group justify="space-between">
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Motion</Text>
          <Button
            variant="light"
            color="teal"
            size="compact-xs"
            leftSection={<IconPlus size={11} />}
            onClick={() =>
              onDispatchOperation({
                operation: "add_animation",
                sceneId: selectedSceneId,
                elementId: selectedElement.id,
                animation: { id: `anim_${Math.random().toString(36).slice(2, 9)}`, type: "fadeIn", startMs: 0, durationMs: 500, easing: "easeOut" }
              })
            }
          >
            Add
          </Button>
        </Group>
        <InspectorField
          label="Preset"
          input={
            <Select
              data={motionPresetKeys.map((k) => ({ value: k, label: humanizePreset(k) }))}
              value={selectedElement.motionPreset ?? null}
              placeholder="Choose preset"
              onChange={(v) => { if (v) applyMotionPreset(onDispatchOperation, project, selectedSceneId, selectedElement.id, v as MotionPresetKey); }}
            />
          }
        />
        <Stack gap={4}>
          {selectedElement.animations.map((a) => (
            <AnimationRow key={a.id} animation={a} />
          ))}
          {selectedElement.animations.length === 0 && (
            <Text c="gray.6" fz="xs">No animations yet.</Text>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

function AnimationRow({ animation }: { animation: { type: AnimationType; startMs: number; durationMs: number } }) {
  return (
    <Group
      justify="space-between"
      style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}
    >
      <div>
        <Text fw={600} fz="xs">{animation.type}</Text>
        <Text c="gray.5" fz="xs">@{animation.startMs}ms</Text>
      </div>
      <Badge variant="light" color="teal" size="xs">{Math.round(animation.durationMs / 1000)}s</Badge>
    </Group>
  );
}

// ── Background image drag positioner ──────────────────────────────────────────

interface BgImagePositionerProps {
  imageSrc: string;
  imageScale: number;
  offsetX: number;
  offsetY: number;
  viewportWidth: number;
  viewportHeight: number;
  onOffsetChange: (x: number, y: number) => void;
}

function BgImagePositioner({ imageSrc, imageScale, offsetX, offsetY, viewportWidth, viewportHeight, onOffsetChange }: BgImagePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const PREVIEW_WIDTH = 200;
  const previewScale = PREVIEW_WIDTH / viewportWidth;
  const previewHeight = viewportHeight * previewScale;

  const imgW = imgNatural ? imgNatural.w * imageScale * previewScale : 0;
  const imgH = imgNatural ? imgNatural.h * imageScale * previewScale : 0;
  const imgX = offsetX * previewScale;
  const imgY = offsetY * previewScale;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offsetX, oy: offsetY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = (e.clientX - dragStart.current.mx) / previewScale;
    const dy = (e.clientY - dragStart.current.my) / previewScale;
    onOffsetChange(
      Math.round(dragStart.current.ox + dx),
      Math.round(dragStart.current.oy + dy)
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    dragStart.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <Stack gap={4}>
      <Text c="gray.5" fz="xs">Drag to reposition</Text>
      <Box
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: PREVIEW_WIDTH,
          height: previewHeight,
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#0f172a",
          overflow: "hidden",
          position: "relative",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none"
        }}
      >
        <img
          src={imageSrc}
          alt=""
          onLoad={handleImgLoad}
          draggable={false}
          style={{
            position: "absolute",
            left: imgX,
            top: imgY,
            width: imgW || "auto",
            height: imgH || "auto",
            pointerEvents: "none"
          }}
        />
        {/* Viewport border indicator */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            border: "2px dashed rgba(255,140,50,0.5)",
            borderRadius: 4,
            pointerEvents: "none"
          }}
        />
      </Box>
      <SimpleGrid cols={2} spacing={4}>
        <InspectorField
          label="X"
          input={
            <NumberInput
              size="xs"
              value={offsetX}
              onChange={(v) => onOffsetChange(toNumber(v, offsetX), offsetY)}
            />
          }
        />
        <InspectorField
          label="Y"
          input={
            <NumberInput
              size="xs"
              value={offsetY}
              onChange={(v) => onOffsetChange(offsetX, toNumber(v, offsetY))}
            />
          }
        />
      </SimpleGrid>
    </Stack>
  );
}

// ── Image inspector ───────────────────────────────────────────────────────────

interface ImageInspectorProps {
  selectedSceneId: string;
  selectedElement: ElementNode;
  onUpdateElement: (sceneId: string, elementId: string, patch: ElementPatch) => void;
  onDispatchOperation: (op: EditorOperation) => void;
}

function ImageInspector({ selectedSceneId, selectedElement, onUpdateElement, onDispatchOperation }: ImageInspectorProps) {
  const filters = selectedElement.style.filters ?? {};

  const updateFilter = (patch: Partial<import("@kwikk/shared-types").ImageFilters>) => {
    onUpdateElement(selectedSceneId, selectedElement.id, {
      style: {
        filters: { ...filters, ...patch }
      }
    });
  };

  return (
    <Stack gap="md">
      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Frame ── */}
      <Stack gap="xs">
        <Group gap={6}>
          <IconFrame size={14} color="gray" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Frame</Text>
        </Group>
        <Select
          size="xs"
          placeholder="No frame"
          data={[
            { value: "", label: "None" },
            { value: "phone", label: "Phone" },
            { value: "laptop", label: "Laptop" },
            { value: "polaroid", label: "Polaroid" },
            { value: "cinematic", label: "Cinematic" }
          ]}
          value={selectedElement.content?.frame ?? ""}
          onChange={(v) => onDispatchOperation({ operation: "set_image_frame", sceneId: selectedSceneId, elementId: selectedElement.id, frame: v || undefined })}
        />
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Effects & Filters ── */}
      <Stack gap="xs">
        <Group gap={6}>
          <IconFilter size={14} color="gray" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Effects & Filters</Text>
        </Group>

        <InspectorField label="Blur" input={<Slider min={0} max={20} step={1} value={filters.blur ?? 0} onChange={(v) => updateFilter({ blur: v })} size="xs" color="orange" />} />
        <InspectorField label="Brightness" input={<Slider min={0} max={2} step={0.1} value={filters.brightness ?? 1} onChange={(v) => updateFilter({ brightness: v })} size="xs" color="orange" />} />
        <InspectorField label="Contrast" input={<Slider min={0} max={2} step={0.1} value={filters.contrast ?? 1} onChange={(v) => updateFilter({ contrast: v })} size="xs" color="orange" />} />
        <InspectorField label="Saturation" input={<Slider min={0} max={2} step={0.1} value={filters.saturation ?? 1} onChange={(v) => updateFilter({ saturation: v })} size="xs" color="orange" />} />
        <InspectorField label="Sharpen" input={<Slider min={0} max={2} step={0.1} value={filters.sharpen ?? 0} onChange={(v) => updateFilter({ sharpen: v })} size="xs" color="orange" />} />
        <InspectorField label="Vignette" input={<Slider min={0} max={1} step={0.05} value={filters.vignette ?? 0} onChange={(v) => updateFilter({ vignette: v })} size="xs" color="orange" />} />

        <SimpleGrid cols={2} spacing="xs">
          <Switch label="Mono" size="xs" checked={!!filters.monochrome} onChange={(e) => updateFilter({ monochrome: e.currentTarget.checked })} />
          <Switch label="HDR" size="xs" checked={!!filters.hdr} onChange={(e) => updateFilter({ hdr: e.currentTarget.checked })} />
          <Switch label="Vintage" size="xs" checked={!!filters.vintage} onChange={(e) => updateFilter({ vintage: e.currentTarget.checked })} />
          <Switch label="Cinematic" size="xs" checked={!!filters.cinematic} onChange={(e) => updateFilter({ cinematic: e.currentTarget.checked })} />
          <Switch label="Y2K" size="xs" checked={!!filters.y2k} onChange={(e) => updateFilter({ y2k: e.currentTarget.checked })} />
        </SimpleGrid>

        <InspectorField
          label="Blend"
          input={
            <Select
              size="xs"
              data={["normal", "multiply", "screen", "overlay", "darken", "lighten"]}
              value={selectedElement.style.blendMode ?? "normal"}
              onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { blendMode: v ?? "normal" } })}
            />
          }
        />

        <InspectorField
          label="Duotone"
          input={
            <Group gap={4}>
              <SwatchPicker value={filters.duotone?.color1 ?? "#000000"} onChange={(c) => updateFilter({ duotone: { color1: c, color2: filters.duotone?.color2 ?? "#ffffff" } })} />
              <Switch size="xs" checked={!!filters.duotone} onChange={(e) => updateFilter({ duotone: e.currentTarget.checked ? { color1: "#000000", color2: "#ffffff" } : undefined })} />
            </Group>
          }
        />
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Crop ── */}
      <Stack gap="xs">
        <Group gap={6}>
          <IconCrop size={14} color="gray" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Crop</Text>
        </Group>

        <Switch
          label="Enable Crop"
          size="xs"
          checked={!!selectedElement.content?.crop}
          onChange={(e) => {
            if (e.currentTarget.checked) {
              onDispatchOperation({
                operation: "crop_image",
                sceneId: selectedSceneId,
                elementId: selectedElement.id,
                crop: { x: 0, y: 0, width: selectedElement.layout.width, height: selectedElement.layout.height }
              });
            } else {
              onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: undefined as any });
            }
          }}
        />

        {selectedElement.content?.crop && (
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField label="CX" input={<NumberInput size="xs" value={selectedElement.content.crop.x} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, x: toNumber(v, 0) } })} />} />
            <InspectorField label="CY" input={<NumberInput size="xs" value={selectedElement.content.crop.y} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, y: toNumber(v, 0) } })} />} />
            <InspectorField label="CW" input={<NumberInput size="xs" min={1} value={selectedElement.content.crop.width} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, width: toNumber(v, 1) } })} />} />
            <InspectorField label="CH" input={<NumberInput size="xs" min={1} value={selectedElement.content.crop.height} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, height: toNumber(v, 1) } })} />} />
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
}

// ── Scene inspector ───────────────────────────────────────────────────────────

interface SceneInspectorProps {
  scene: Scene;
  onUpdateScene: (sceneId: string, patch: { name?: string; backgroundColor?: string; background?: Partial<SceneBackground> }) => void;
}

function SceneInspector({ scene, onUpdateScene }: SceneInspectorProps) {
  const bgFileRef = useRef<HTMLInputElement>(null);
  const bg = scene.background ?? {};
  const hasGradient = !!bg.color2;
  const hasImage = !!bg.imageSrc;

  function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) onUpdateScene(scene.id, { background: { imageSrc: src } });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <Stack gap="md" pt={4}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Badge variant="light" color="indigo" size="sm">Scene</Badge>
          <Text c="gray.7" fz="xs" fw={600} tt="uppercase" lts="0.06em" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scene.name}
          </Text>
        </Group>
      </Group>

      {/* ── Background Color ── */}
      <Divider color="rgba(0,0,0,0.08)" />
      <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Background</Text>

      <InspectorField
        label="Color"
        input={
          <SwatchPicker
            value={scene.backgroundColor ?? "#ffffff"}
            onChange={(v) => onUpdateScene(scene.id, { backgroundColor: v })}
          />
        }
      />

      {/* ── Gradient ── */}
      <Switch
        label="Gradient"
        size="xs"
        checked={hasGradient}
        onChange={(e) => {
          if (e.currentTarget.checked) {
            onUpdateScene(scene.id, { background: { color2: "#000000", gradientAngle: 180 } });
          } else {
            onUpdateScene(scene.id, { background: { color2: undefined, gradientAngle: undefined } });
          }
        }}
      />

      {hasGradient && (
        <>
          <InspectorField
            label="Color 2"
            input={
              <SwatchPicker
                value={bg.color2 ?? "#000000"}
                onChange={(v) => onUpdateScene(scene.id, { background: { color2: v } })}
              />
            }
          />
          <InspectorField
            label="Angle"
            input={
              <Slider
                min={0}
                max={360}
                step={1}
                value={bg.gradientAngle ?? 180}
                onChange={(v) => onUpdateScene(scene.id, { background: { gradientAngle: v } })}
                label={(v) => `${v}\u00b0`}
                size="xs"
                color="orange"
              />
            }
          />
        </>
      )}

      {/* ── Background Image ── */}
      <Divider color="rgba(0,0,0,0.08)" />
      <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Background Image</Text>

      <input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgImageUpload} />
      {hasImage ? (
        <Stack gap={6}>
          <Box
            style={{
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.09)",
              position: "relative"
            }}
          >
            <img
              src={bg.imageSrc}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </Box>

          {/* Fit mode selector */}
          <InspectorField
            label="Fit"
            input={
              <SegmentedControl
                size="xs"
                data={[
                  { value: "stretch", label: "Stretch" },
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                  { value: "custom", label: "Custom" }
                ]}
                value={bg.imageFit ?? "stretch"}
                onChange={(v) => onUpdateScene(scene.id, { background: { imageFit: v as ImageFitMode } })}
              />
            }
          />

          {/* Custom mode controls */}
          {(bg.imageFit === "custom") && (
            <>
              <InspectorField
                label="Scale"
                input={
                  <Slider
                    min={0.1}
                    max={5}
                    step={0.01}
                    value={bg.imageScale ?? 1}
                    onChange={(v) => onUpdateScene(scene.id, { background: { imageScale: v } })}
                    label={(v) => `${Math.round(v * 100)}%`}
                    size="xs"
                    color="orange"
                  />
                }
              />
              <BgImagePositioner
                imageSrc={bg.imageSrc!}
                imageScale={bg.imageScale ?? 1}
                offsetX={bg.imageOffsetX ?? 0}
                offsetY={bg.imageOffsetY ?? 0}
                viewportWidth={1080}
                viewportHeight={1920}
                onOffsetChange={(x, y) => onUpdateScene(scene.id, { background: { imageOffsetX: x, imageOffsetY: y } })}
              />
            </>
          )}

          <Group grow gap={4}>
            <Button
              variant="light"
              color="orange"
              size="xs"
              leftSection={<IconUpload size={12} />}
              onClick={() => bgFileRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconTrash size={12} />}
              onClick={() => onUpdateScene(scene.id, { background: { imageSrc: undefined, imageFit: undefined, imageOffsetX: undefined, imageOffsetY: undefined, imageScale: undefined } })}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button
          fullWidth
          variant="light"
          color="orange"
          size="sm"
          leftSection={<IconUpload size={14} />}
          onClick={() => bgFileRef.current?.click()}
        >
          Upload Background
        </Button>
      )}

      {/* ── Opacity ── */}
      <Divider color="rgba(0,0,0,0.08)" />
      <InspectorField
        label="Opacity"
        input={
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={bg.opacity ?? 1}
            onChange={(v) => onUpdateScene(scene.id, { background: { opacity: v } })}
            label={(v) => `${Math.round(v * 100)}%`}
            size="xs"
            color="orange"
          />
        }
      />
    </Stack>
  );
}
