import { resolveRenderFrame } from "@kwikk/render-core";
import { validateProjectDocument } from "@kwikk/scene-graph";
import { MOTION_PRESETS, buildPresetAnimations, type MotionPresetKey } from "@kwikk/animation-engine";
import { TimelineEngine } from "@kwikk/timeline";
import { InspectorField, tokens, useEditorLayoutStore } from "@kwikk/ui-kit";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  ColorInput,
  Divider,
  Group,
  NumberInput,
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
  IconUpload
} from "@tabler/icons-react";
import type { AnimationType, ElementNode, Scene } from "@kwikk/shared-types";
import { useEffect, useRef, useState } from "react";
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
    const elementId = nextElId();
    dispatchOperation({ operation: "add_element", sceneId: selectedSceneId, elementId, type: "image", content: { src, label: "Image" } });
  }

  function addShape(variant: "rectangle" | "square") {
    const elementId = nextElId();
    dispatchOperation({
      operation: "add_element",
      sceneId: selectedSceneId,
      elementId,
      type: "shape",
      content: { shape: "rectangle", label: variant === "square" ? "Square" : "Rectangle" }
    });
    if (variant === "square") {
      dispatchOperation({ operation: "patch_element", sceneId: selectedSceneId, elementId, patch: { layout: { width: 200, height: 200 } } });
    }
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
                          style: { fontSize: 80, color: "#000000", fontWeight: "700" },
                          layout: { width: 600, height: 100 },
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
              selectedElementId={selectedElement?.id}
              onUpdateElement={(id, updates) => {
                if (selectedScene) updateElement(selectedScene.id, id, updates);
              }}
              onSelectElement={(id) => {
                if (selectedScene) selectElement(selectedScene.id, id || "");
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
              return (
                <Box
                  key={track.id}
                  onClick={() => selectScene(track.sceneId)}
                  style={{
                    flexShrink: 0,
                    width: 72,
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
                  <Text fz="xs" fw={600} c={active ? "orange.7" : "gray.7"} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                    {scene?.name ?? track.sceneId}
                  </Text>
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
}

function ElementInspector({ selectedSceneId, selectedElement, project, onUpdateElement, onDispatchOperation, onDelete }: ElementInspectorProps) {
  const [showDimensions, setShowDimensions] = useState(false);

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
          <InspectorField
            label="Text"
            input={
              <Textarea
                autosize
                minRows={2}
                value={selectedElement.content?.text ?? ""}
                onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, text: e.currentTarget.value } })}
              />
            }
          />
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Font"
              input={
                <Select
                  data={["DM Sans", "Space Grotesk", "IBM Plex Sans", "Manrope"]}
                  value={selectedElement.style.fontFamily ?? "DM Sans"}
                  onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { fontFamily: v ?? "DM Sans" } })}
                />
              }
            />
            <InspectorField
              label="Size"
              input={
                <NumberInput
                  min={8}
                  value={selectedElement.style.fontSize ?? 48}
                  onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { fontSize: toNumber(v, selectedElement.style.fontSize ?? 48) } })}
                />
              }
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Color"
              input={
                <ColorInput
                  format="hex"
                  value={selectedElement.style.color ?? "#f8fafc"}
                  onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { color: v } })}
                />
              }
            />
            <InspectorField
              label="BG"
              input={
                <ColorInput
                  format="hex"
                  value={selectedElement.style.backgroundColor ?? "#000000"}
                  onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { backgroundColor: v } })}
                />
              }
            />
          </SimpleGrid>
          <Group grow>
            <Switch
              label="Bold"
              size="xs"
              checked={Number(selectedElement.style.fontWeight ?? 600) >= 700}
              onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { fontWeight: e.currentTarget.checked ? 700 : 400 } })}
            />
            <Switch
              label="Italic"
              size="xs"
              checked={(selectedElement.style.fontStyle ?? "normal") === "italic"}
              onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { fontStyle: e.currentTarget.checked ? "italic" : "normal" } })}
            />
          </Group>
        </>
      )}

      <Divider color="rgba(0,0,0,0.08)" />

      <Stack gap="xs">
        <Group justify="space-between">
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Layout</Text>
          <Button variant="subtle" color="gray" size="compact-xs" onClick={() => setShowDimensions((v) => !v)}>
            {showDimensions ? "Hide" : "Dimensions"}
          </Button>
        </Group>
        {showDimensions && (
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField label="X" input={<NumberInput value={selectedElement.layout.x} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { x: toNumber(v, selectedElement.layout.x) } })} />} />
            <InspectorField label="Y" input={<NumberInput value={selectedElement.layout.y} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { y: toNumber(v, selectedElement.layout.y) } })} />} />
            <InspectorField label="W" input={<NumberInput min={1} value={selectedElement.layout.width} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { width: toNumber(v, selectedElement.layout.width) } })} />} />
            <InspectorField label="H" input={<NumberInput min={1} value={selectedElement.layout.height} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { height: toNumber(v, selectedElement.layout.height) } })} />} />
          </SimpleGrid>
        )}
        <SimpleGrid cols={2} spacing="xs">
          <InspectorField label="Scale" input={<NumberInput min={0.1} step={0.05} value={selectedElement.layout.scale} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { scale: toNumber(v, selectedElement.layout.scale) } })} />} />
          <InspectorField label="Opacity" input={<NumberInput min={0} max={1} step={0.05} value={selectedElement.layout.opacity} onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { layout: { opacity: toNumber(v, selectedElement.layout.opacity) } })} />} />
        </SimpleGrid>
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

// ── Scene inspector ───────────────────────────────────────────────────────────

interface SceneInspectorProps {
  scene: Scene;
  onUpdateScene: (sceneId: string, patch: { name?: string; backgroundColor?: string }) => void;
}

function SceneInspector({ scene, onUpdateScene }: SceneInspectorProps) {
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

      <InspectorField
        label="BG Color"
        input={
          <ColorInput
            format="hex"
            value={scene.backgroundColor ?? "#ffffff"}
            onChange={(v) => onUpdateScene(scene.id, { backgroundColor: v })}
          />
        }
      />
    </Stack>
  );
}
