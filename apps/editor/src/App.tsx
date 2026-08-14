import { resolveRenderFrame, preloadProjectFonts } from "@kwikk/render-core";
import { apiFetch } from "./apiClient";
import { FontPicker } from "./components/FontPicker";
import { validateProjectDocument, applySpanFormat, spansFromPlainText, createNarrativeReelProject, createPrototypeProject, VIEWPORT_PRESETS } from "@kwikk/scene-graph";
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
  Menu,
  Modal,
  NumberInput,
  Popover,
  RangeSlider,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
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
  IconX,
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
  IconFrame,
  IconVideo,
  IconPlayerSkipForward,
  IconFileImport,
  IconMaximize,
  IconMinimize,
  IconBoxMultiple,
  IconArrowsRightLeft,
  IconDownload,
  IconFileExport,
  IconCopy,
  IconMusic,
  IconApps,
  IconPalette,
  IconLayoutGrid,
  IconVolume,
  IconArrowBarToUp,
  IconArrowBarToDown,
  IconArrowUp,
  IconArrowDown,
  IconBookmark,
} from "@tabler/icons-react";
import type { AnimationType, Asset, BrandTheme, CompositionNode, ElementNode, ImageFilters, Scene, SceneBackground, ImageFitMode, ShapeKind, SceneSfx, SceneTransition, TransitionType, TextSpan } from "@kwikk/shared-types";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { PreviewCanvas } from "./PreviewCanvas";
import type { EditorOperation, ElementPatch, Animation } from "./store";
import { useEditorStore, useSelectedElement, useSelectedScene } from "./store";
import { SceneTimeline } from "./components/SceneTimeline";
import { ExportModal } from "./components/ExportModal";
import { SaveAsExampleModal } from "./components/SaveAsExampleModal";
import { InspirationPanel } from "./components/InspirationPanel";
import { AssetManager } from "./components/AssetManager";
import { AudioPanel } from "./components/AudioPanel";
import { IconPanel } from "./components/IconPanel";
import { useAudioPlayer } from "./hooks/useAudioPlayer";

type SidebarTool = "elements" | "text" | "images" | "videos" | "assets" | "audio" | "icons" | "brand" | "compositions" | "inspirations" | null;

const ICON_RAIL_WIDTH = 52;
const EXPANSION_WIDTH = 220;

const ALL_SHAPE_KINDS: { kind: ShapeKind; label: string }[] = [
  { kind: "rectangle", label: "Rect" },
  { kind: "circle", label: "Circle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "star", label: "Star" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "arrow", label: "Arrow" },
  { kind: "line", label: "Line" },
];

const ALL_ANIMATION_TYPES: AnimationType[] = [
  // Basic
  "fadeIn", "fadeOut",
  "slideUp", "slideDown", "slideLeft", "slideRight",
  "zoomIn", "zoomOut",
  "bounceIn", "bounceOut",
  "rotateIn", "rotateOut",
  "shake", "pulse",
  // Element
  "flicker", "blur_in", "blur_out",
  "stomp", "tumble_in", "glitch_in",
  // Cinematic element
  "spring_in", "slam_down", "depth_charge", "drift_in", "whip_exit",
  // Looping / sustained
  "float", "breathe", "spin", "sway", "heartbeat",
  // Entry
  "spiral_in", "flip_in_x", "swoop_in", "stamp", "pop_in", "rubber_band",
  // Exit
  "swoop_out", "implode", "whip_up",
  // Attention / loop
  "tada", "jello", "vibrate",
  // Animated filter effects
  "brightness_flash", "chromatic_pulse", "grain_surge", "vignette_close", "vignette_open",
  // Scene-level presets
  "subtitle_pop", "kinetic_slide", "blur_transition",
  // Text word-level
  "typewriter", "typewriter_word",
  "word_slide_up", "word_fade_in", "char_scale_in", "wave_text",
  "ascend", "burst", "bounce_letters",
  // Text char-level
  "letter_drop", "letter_spin", "explode_in", "scramble", "stamp_in",
  "highlight_sweep", "count_up", "text_cycle",
  // Line draw
  "draw_in", "draw_out",
  // Phase 2: new motion animations
  "orbit", "pendulum", "bounce_floor", "flip_out_x", "roll_in", "zip_in",
  "neon_flicker", "glitch_split", "typewriter_delete", "count_down",
  // Phase 2: new char-level animations
  "char_rainbow", "char_wave_scale", "char_blur_in", "karaoke", "slot_machine",
  // Subtitle word-reveal
  "word_pop_reveal", "caption_drop", "word_zoom_blur",
  // Animate.css
  "backInDown", "backInLeft", "backInRight", "backInUp", "backOutDown", "backOutLeft",
  "backOutRight", "backOutUp", "bounce", "bounceInDown", "bounceInLeft", "bounceInRight",
  "bounceInUp", "bounceOutDown", "bounceOutLeft", "bounceOutRight", "bounceOutUp", "fadeInBottomLeft",
  "fadeInBottomRight", "fadeInDown", "fadeInDownBig", "fadeInLeft", "fadeInLeftBig", "fadeInRight",
  "fadeInRightBig", "fadeInTopLeft", "fadeInTopRight", "fadeInUp", "fadeInUpBig", "fadeOutBottomLeft",
  "fadeOutBottomRight", "fadeOutDown", "fadeOutDownBig", "fadeOutLeft", "fadeOutLeftBig", "fadeOutRight",
  "fadeOutRightBig", "fadeOutTopLeft", "fadeOutTopRight", "fadeOutUp", "fadeOutUpBig", "flash",
  "flip", "flipInX", "flipInY", "flipOutX", "flipOutY", "headShake",
  "heartBeat", "hinge", "jackInTheBox", "lightSpeedInLeft", "lightSpeedInRight", "lightSpeedOutLeft",
  "lightSpeedOutRight", "rollIn", "rollOut", "rotateInDownLeft", "rotateInDownRight", "rotateInUpLeft",
  "rotateInUpRight", "rotateOutDownLeft", "rotateOutDownRight", "rotateOutUpLeft", "rotateOutUpRight", "rubberBand",
  "shakeX", "shakeY", "slideInDown", "slideInLeft", "slideInRight", "slideInUp",
  "slideOutDown", "slideOutLeft", "slideOutRight", "slideOutUp", "swing", "wobble",
  "zoomInDown", "zoomInLeft", "zoomInRight", "zoomInUp", "zoomOutDown", "zoomOutLeft",
  "zoomOutRight", "zoomOutUp",

];

const EASING_OPTIONS = ["linear", "easeIn", "easeOut", "easeInOut", "bounceOut", "bounceIn", "elastic"];

function toNumber(v: string | number | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// ── Subtitle preset builders ────────────────────────────────────────────────

type SubtitlePresetKey = "tiktok_bold" | "news" | "neon_mix" | "viral_pop" | "clean_white" | "highlight_key" | "mixed_font" | "karaoke_style";

interface SubtitlePresetResult {
  richText: TextSpan[];
  animation: Animation;
}

function buildSubtitlePreset(text: string, preset: SubtitlePresetKey, sceneDurationMs: number): SubtitlePresetResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const dur = Math.min(sceneDurationMs * 0.8, words.length * 250 + 400);

  const buildSpans = (getStyle: (word: string, i: number) => TextSpan["style"]): TextSpan[] => {
    const tokens = text.match(/\S+|\n/g) || [];
    const richText: TextSpan[] = [];
    let wordIndex = 0;

    for (let idx = 0; idx < tokens.length; idx++) {
      const token = tokens[idx];
      if (token === "\n") {
        richText.push({
          text: "\n",
          style: {}
        });
      } else {
        const nextToken = tokens[idx + 1];
        const hasSpace = nextToken !== "\n" && idx < tokens.length - 1;
        const wordText = token + (hasSpace ? " " : "");
        const style = getStyle(token, wordIndex);
        richText.push({
          text: wordText,
          style
        });
        wordIndex++;
      }
    }
    return richText;
  };

  switch (preset) {
    case "tiktok_bold": {
      const richText = buildSpans((_word, i) => ({
        uppercase: true,
        fontWeight: 800,
        color: i % 4 === 1 ? "#FFE600" : "#FFFFFF",
        textStroke: { color: "#000000", width: 8 },
        ...(i % 5 === 3 ? { highlight: "#FF4500", highlightRadius: 5 } : {}),
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "word_pop_reveal" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "news": {
      const richText = buildSpans((_word, i) => ({
        fontWeight: i % 3 === 0 ? 700 : 400,
        color: i % 3 === 1 ? "#FFD700" : "#FFFFFF",
        textStroke: { color: "#000000", width: 5 },
        ...(i % 4 === 3 ? { highlight: "#1a1a1a", highlightRadius: 3, highlightPadding: 5 } : {}),
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "word_fade_in" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "neon_mix": {
      const neonColors = ["#00FFFF", "#FF00FF", "#00FF88", "#FF4400", "#FFFF00"];
      const richText = buildSpans((_word, i) => ({
        uppercase: i % 2 === 0,
        fontWeight: 700,
        color: neonColors[i % neonColors.length],
        textStroke: { color: "#000000", width: 6 },
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "word_pop_reveal" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "viral_pop": {
      const richText = buildSpans((_word, i) => {
        const isBig = i % 3 === 0;
        const isHighlighted = i % 5 === 2;
        return {
          uppercase: isBig,
          fontWeight: isBig ? 900 : 500,
          color: isHighlighted ? "#FFE600" : "#FFFFFF",
          textStroke: { color: "#000000", width: 7 },
          ...(isHighlighted ? { highlight: "#7B2FBE", highlightRadius: 6 } : {}),
        };
      });
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "caption_drop" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "clean_white": {
      const richText = buildSpans(() => ({
        fontWeight: 700,
        color: "#FFFFFF",
        textStroke: { color: "#000000", width: 6 },
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "word_zoom_blur" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "highlight_key": {
      const richText = buildSpans((_word, i) => ({
        fontWeight: i % 3 === 1 ? 800 : 500,
        color: "#FFFFFF",
        textStroke: { color: "#000000", width: 5 },
        ...(i % 3 === 1 ? { highlight: "#FFD600", highlightRadius: 6, highlightPadding: 8 } : {}),
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "word_pop_reveal" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "mixed_font": {
      const sansSerif = "Inter";
      const serif = "Georgia";
      const mono = "Courier New";
      const fonts = [sansSerif, serif, mono, sansSerif, sansSerif];
      const richText = buildSpans((_word, i) => ({
        fontFamily: fonts[i % fonts.length],
        fontWeight: i % 2 === 0 ? 700 : 400,
        color: i % 3 === 1 ? "#FFE600" : "#FFFFFF",
        textStroke: { color: "#000000", width: 5 },
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "word_fade_in" as AnimationType, startMs: 0, durationMs: dur } };
    }

    case "karaoke_style": {
      const richText = buildSpans(() => ({
        fontWeight: 700,
        color: "#CCCCCC",
        textStroke: { color: "#000000", width: 5 },
      }));
      return { richText, animation: { id: `sub_anim_${Date.now()}`, type: "karaoke" as AnimationType, startMs: 0, durationMs: sceneDurationMs * 0.9 } };
    }
  }
}

const SUBTITLE_PRESETS: { key: SubtitlePresetKey; label: string; description: string; emoji: string }[] = [
  { key: "tiktok_bold",  label: "TikTok Bold",    description: "ALL CAPS, yellow highlights, thick stroke", emoji: "📱" },
  { key: "highlight_key",label: "Highlight Keys",  description: "Key words get a yellow pill background",   emoji: "🟡" },
  { key: "viral_pop",    label: "Viral Pop",       description: "Mixed caps, purple highlights, drop in",   emoji: "🔥" },
  { key: "neon_mix",     label: "Neon Mix",        description: "Cycling neon colors per word",             emoji: "🌈" },
  { key: "mixed_font",   label: "Mixed Font",      description: "Different fonts per word, editorial look", emoji: "🔤" },
  { key: "news",         label: "News Style",      description: "Gold accents, dark pill, professional",    emoji: "📰" },
  { key: "karaoke_style",label: "Karaoke",         description: "Words light up left-to-right as played",  emoji: "🎤" },
  { key: "clean_white",  label: "Clean White",     description: "Bold white with stroke, zoom-blur reveal", emoji: "✨" },
];

function measureImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function measureVideoMeta(src: string): Promise<{ width: number; height: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationMs: Math.round(video.duration * 1000)
      });
    };
    video.onerror = () => reject(new Error("video metadata failed"));
    video.src = src;
  });
}

function measureAudioDurationMs(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const ms = Math.round(a.duration * 1000);
      resolve(Number.isFinite(ms) && ms > 0 ? ms : 1);
    };
    a.onerror = () => reject(new Error("audio metadata failed"));
    a.src = src;
  });
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

function SwatchPicker({ value, onChange, allowNone, testId }: { value: string; onChange: (v: string) => void; allowNone?: boolean; testId?: string }) {
  return (
    <Popover position="bottom-start" withinPortal>
      <Popover.Target>
        <Box
          data-testid={testId}
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

interface MotionPresetSummary {
  id: number;
  name: string;
  category: string;
  animations: Animation[];
}

function applyMotionPreset(
  dispatch: (op: EditorOperation) => void,
  preset: MotionPresetSummary,
  sceneId: string,
  elementId: string
) {
  dispatch({
    operation: "set_element_motion_preset",
    sceneId,
    elementId,
    motionPreset: preset.name,
    animations: preset.animations.map((a, i) => ({
      ...a,
      id: `${preset.id}_${i}_${crypto.randomUUID().slice(0, 8)}`
    }))
  });
}

export default function App() {
  const project = useEditorStore((s) => s.project);
  const selectedSceneId = useEditorStore((s) => s.selectedSceneId);
  const isLoadedRef = useRef(false);
  const timeline = useEditorStore((s) => s.timeline);
  const playback = useEditorStore((s) => s.playback);
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
  const copyToClipboard = useEditorStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useEditorStore((s) => s.pasteFromClipboard);
  const updateScene = useEditorStore((s) => s.updateScene);
  const selectedScene = useSelectedScene();
  const selectedElement = useSelectedElement();

  const leftSidebarCollapsed = useEditorLayoutStore((s) => s.leftSidebarCollapsed);
  const rightInspectorCollapsed = useEditorLayoutStore((s) => s.rightInspectorCollapsed);
  const bottomTimelineCollapsed = useEditorLayoutStore((s) => s.bottomTimelineCollapsed);
  const rightInspectorWidth = useEditorLayoutStore((s) => s.rightInspectorWidth);
  const bottomTimelineHeight = useEditorLayoutStore((s) => s.bottomTimelineHeight);
  const setBottomTimelineHeight = useEditorLayoutStore((s) => s.setBottomTimelineHeight);
  const toggleLeftSidebar = useEditorLayoutStore((s) => s.toggleLeftSidebar);
  const toggleRightInspector = useEditorLayoutStore((s) => s.toggleRightInspector);
  const toggleBottomTimeline = useEditorLayoutStore((s) => s.toggleBottomTimeline);

  const loadProject = useEditorStore((s) => s.loadProject);
  const addAsset = useEditorStore((s) => s.addAsset);
  const deleteAsset = useEditorStore((s) => s.deleteAsset);
  const setAssets = useEditorStore((s) => s.setAssets);
  const setSceneTransition = useEditorStore((s) => s.setSceneTransition);
  const setSceneSfx = useEditorStore((s) => s.setSceneSfx);
  const assets = useEditorStore((s) => s.project.assets ?? []);
  const audioTracks = useEditorStore((s) => s.project.audioTracks ?? []);
  const imageAssets = assets.filter((a) => a.type === "image");
  const videoAssets = assets.filter((a) => a.type === "video");

  useAudioPlayer({
    audioTracks,
    currentTimeMs: timeline.currentTimeMs,
    isPlaying: playback.isPlaying
  });

  const [activeTool, setActiveTool] = useState<SidebarTool>(null);
  const [inspectorTab, setInspectorTab] = useState<"element" | "scene">("element");
  const [selectedCompositionId, setSelectedCompositionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const currentTimeRef = useRef(timeline.currentTimeMs);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveExampleOpen, setSaveExampleOpen] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      const elId = selectedElement?.id;
      if ((e.key === "Delete" || e.key === "Backspace") && elId && selectedSceneId) {
        e.preventDefault();
        deleteElement(selectedSceneId, elId);
      }

      if (e.key.toLowerCase() === "d" && (e.ctrlKey || e.metaKey) && elId && selectedSceneId) {
        e.preventDefault();
        const scene = project.scenes.find((s) => s.id === selectedSceneId);
        const el = scene?.elements.find((x) => x.id === elId);
        if (el) {
          dispatchOperation({
            operation: "duplicate_element",
            sceneId: selectedSceneId,
            elementId: elId,
            newElementId: crypto.randomUUID()
          });
        }
      }

      if (e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey) && elId && selectedSceneId) {
        e.preventDefault();
        copyToClipboard(selectedSceneId, elId);
      }

      if (e.key.toLowerCase() === "v" && (e.ctrlKey || e.metaKey) && selectedSceneId) {
        e.preventDefault();
        pasteFromClipboard();
      }

      if (e.key === "Escape") {
        useEditorStore.setState({ selectedElementIds: [] });
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedSceneId, selectedElement, project, deleteElement, dispatchOperation, copyToClipboard, pasteFromClipboard]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      canvasContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault();
        togglePlayback();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePlayback]);

  async function handleImportApply() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportErrors(["Invalid JSON — could not parse."]);
      return;
    }
    const errs = validateProjectDocument(parsed as any);
    if (errs.length > 0) {
      setImportErrors(errs);
      return;
    }
    await resolveIconElements(parsed as any);
    loadProject(parsed as any);
    setImportOpen(false);
    setImportText("");
    setImportErrors([]);
  }

  async function resolveIconElements(project: any) {
    const scenes: any[] = project.scenes ?? [];
    const tasks: Promise<void>[] = [];
    for (const scene of scenes) {
      for (const el of scene.elements ?? []) {
        if (el.type === "image" && el.content?.iconName && !el.content?.src) {
          tasks.push(
            (async () => {
              try {
                const name = el.content.iconName as string;
                const style = (el.content.iconStyle as string) ?? "duotone";
                const color = ((el.content.iconColor as string) ?? "#000000").replace("#", "");
                const url = `/api/v1/icons/${encodeURIComponent(name)}/svg?color=${color}&style=${encodeURIComponent(style)}`;
                const res = await fetch(url);
                if (!res.ok) return;
                const svgText = await res.text();
                const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
                const size = Math.max(el.layout?.width ?? 256, el.layout?.height ?? 256) * 2;
                el.content.src = await new Promise<string>((resolve, reject) => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext("2d")!;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(img, 0, 0, size, size);
                    resolve(canvas.toDataURL("image/png"));
                  };
                  img.onerror = () => reject(new Error("icon raster failed"));
                  img.src = dataUrl;
                });
              } catch {
                // leave src unset — renderer will skip
              }
            })()
          );
        }
      }
    }
    await Promise.all(tasks);
  }

  // ── Timeline resize handle ────────────────────────────────────────────────
  const timelineResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  function handleTimelineResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    timelineResizeRef.current = { startY: e.clientY, startHeight: bottomTimelineHeight };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = timelineResizeRef.current;
      if (!drag) return;
      const delta = drag.startY - e.clientY; // drag up → larger timeline
      setBottomTimelineHeight(drag.startHeight + delta);
    }
    function onUp() { timelineResizeRef.current = null; }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [setBottomTimelineHeight]);

  const effectiveShowAll = showAllElements && !playback.isPlaying;
  // Memoized so resolveRenderFrame only runs when project/time/showAll actually change,
  // not on every panel open, inspector interaction, or unrelated state update.
  const frame = useMemo(
    () => resolveRenderFrame(project, { timeMs: timeline.currentTimeMs, showAllElements: effectiveShowAll }),
    [project, timeline.currentTimeMs, effectiveShowAll]
  );
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


  // Load project from API when ?projectId=<id> is in the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");
    if (!projectId) return;
    fetch(`/api/v1/projects/${projectId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status}${body ? `: ${body}` : ""}`);
        }
        return r.json() as Promise<{ meta?: unknown }>;
      })
      .then(async (proj) => {
        const doc = proj.meta;
        if (!doc || typeof doc !== "object") throw new Error("project has no meta");
        await resolveIconElements(doc as any);
        loadProject(doc as any);
        isLoadedRef.current = true;
        console.log("[editor] loaded project:", projectId);
      })
      .catch((e: Error) => {
        console.error("[editor] failed to load project:", e.message);
        alert(`Could not load project ${projectId}: ${e.message}`);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save project edits back to the API.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");
    if (!projectId || !isLoadedRef.current) return;

    const timeoutId = setTimeout(() => {
      console.log(`[editor] auto-saving project ${projectId}...`);
      fetch(`/api/v1/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.name,
          meta: project,
        }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP error ${r.status}`);
          return r.json();
        })
        .then((data) => {
          console.log(`[editor] auto-save successful for project ${projectId}`, data);
        })
        .catch((e) => {
          console.error(`[editor] auto-save failed:`, e);
        });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [project]);

  // Preload all fonts referenced by the current project whenever it changes.
  useEffect(() => {
    preloadProjectFonts(project);
  }, [project]);

  useEffect(() => {
    let frameId = 0;
    let prev = performance.now();
    let lastStateUpdate = 0;
    const step = (ts: number) => {
      const delta = ts - prev;
      prev = ts;
      if (playbackRef.current) {
        const next = timelineEngineRef.current.tick(delta);
        // Always write to the ref — PreviewCanvas reads this directly every RAF.
        currentTimeRef.current = next;
        // Throttle React state updates to ~50ms so the scrubber/timeline stay
        // in sync without triggering a full React re-render every frame.
        if (ts - lastStateUpdate >= 50 || !timelineEngineRef.current.isPlaying) {
          setCurrentTime(next);
          lastStateUpdate = ts;
        }
        if (!timelineEngineRef.current.isPlaying) setPlayback(false);
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [setCurrentTime, setPlayback]);

  // Maps a raw Go API asset record to the frontend Asset type.
  // The Go server serialises gorm.Model.ID as uppercase "ID".
  function mapApiAsset(raw: Record<string, unknown>): Asset {
    const normalizeType = (t: unknown) =>
      t === "video" ? "video" : t === "audio" ? "audio" : "image";
    return {
      id: String(raw.ID ?? raw.id ?? ""),
      name: String(raw.name ?? ""),
      type: normalizeType(raw.type),
      src: String(raw.url ?? raw.src ?? ""),
    };
  }

  // On mount: fetch the user's asset library from the API so assets survive page reload.
  useEffect(() => {
    apiFetch("/api/v1/assets")
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((list: unknown) => {
        if (!Array.isArray(list)) return;
        setAssets(list.map((r) => mapApiAsset(r as Record<string, unknown>)));
      })
      .catch(() => { /* API unavailable — start with empty library */ });
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list?.length) {
      e.target.value = "";
      return;
    }
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await apiFetch("/api/v1/assets/upload", { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        const raw = (await res.json()) as Record<string, unknown>;
        const base = mapApiAsset(raw);
        let asset: Asset = { ...base };
        if (asset.type === "image") {
          try {
            const wh = await measureImageSize(asset.src);
            asset = { ...asset, width: wh.width, height: wh.height };
          } catch {
            /* dimensions optional */
          }
        } else if (asset.type === "video") {
          try {
            const vm = await measureVideoMeta(asset.src);
            asset = { ...asset, width: vm.width, height: vm.height, durationMs: vm.durationMs };
          } catch {
            /* metadata optional */
          }
        } else if (asset.type === "audio") {
          try {
            const durationMs = await measureAudioDurationMs(asset.src);
            asset = { ...asset, durationMs };
          } catch {
            asset = { ...asset, durationMs: asset.durationMs ?? 1 };
          }
        }
        addAsset(asset);
      } catch (err) {
        console.error("Asset upload failed:", err);
      }
    }
    e.target.value = "";
  }

  function deleteAssetFromLibrary(assetId: string) {
    void (async () => {
      try {
        await apiFetch(`/api/v1/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
      } catch {
        /* ignore network errors */
      }
      deleteAsset(assetId);
    })();
  }

  function toggleAssetFavorite(assetId: string, current: boolean) {
    const next = !current;
    dispatchOperation({
      operation: "update_asset_metadata",
      assetId,
      patch: { favorite: next }
    });
    void apiFetch(`/api/v1/assets/${encodeURIComponent(assetId)}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next })
    }).catch(() => {});
  }

  function nextZIndex(): number {
    const scene = project.scenes.find((s) => s.id === selectedSceneId);
    if (!scene?.elements.length) return 1;
    return Math.max(...scene.elements.map((e) => e.layout.zIndex ?? 0)) + 1;
  }

  function addImageToCanvas(src: string, label = "Image") {
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
        content: { src, label },
        layout: { width, height, zIndex: nextZIndex() }
      });
    };
    img.src = src;
  }

  function addVideoToCanvas(video: { src: string; name: string; durationMs: number }) {
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      const naturalW = vid.videoWidth || 1080;
      const naturalH = vid.videoHeight || 1920;
      const maxW = Math.min(project.viewport.width, 800);
      const ratio = Math.min(maxW / naturalW, project.viewport.height / naturalH);
      const width = Math.round(naturalW * ratio);
      const height = Math.round(naturalH * ratio);
      const x = Math.round((project.viewport.width - width) / 2);
      const elementId = nextElId();

      dispatchOperation({
        operation: "add_element",
        sceneId: selectedSceneId,
        elementId,
        type: "video",
        semanticRole: "video_clip",
        content: {
          src: video.src,
          label: video.name,
          videoDurationMs: video.durationMs,
          trimStartMs: 0,
          trimEndMs: video.durationMs,
          playbackRate: 1
        },
        layout: { width, height, x, zIndex: nextZIndex() }
      });

      dispatchOperation({
        operation: "update_scene_duration",
        sceneId: selectedSceneId,
        durationMs: video.durationMs
      });
    };
    vid.src = video.src;
  }

  function addShape(kind: ShapeKind) {
    const elementId = nextElId();
    const isSquare = kind === "circle" || kind === "star" || kind === "hexagon";
    const isLine = kind === "line";
    dispatchOperation({
      operation: "add_element",
      sceneId: selectedSceneId,
      elementId,
      type: "shape",
      content: isLine
        ? { shape: kind, lineWidth: 6, lineColor: "#4f46e5", lineStyle: "solid", lineCap: "round", arrowStart: "none", arrowEnd: "arrow", arrowSize: 24 }
        : { shape: kind },
      style: isLine
        ? { backgroundColor: "#4f46e5" }
        : { backgroundColor: "#4f46e5", borderRadius: kind === "rectangle" ? 8 : 0 },
      layout: isSquare
        ? { width: 200, height: 200, zIndex: nextZIndex() }
        : isLine
        ? { width: 400, height: 40, zIndex: nextZIndex() }
        : { width: 240, height: 140, zIndex: nextZIndex() }
    });
  }

  function addAssetToCanvas(asset: Asset) {
    if (asset.type === "audio") return;
    if (asset.type === "image") addImageToCanvas(asset.src);
    else if (asset.type === "video") addVideoToCanvas({ src: asset.src, name: asset.name, durationMs: asset.durationMs ?? 0 });
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
          <Tooltip label={playback.isPlaying ? "Disabled during playback" : showAllElements ? "Show timed elements" : "Show all elements"} position="bottom" withArrow>
            <ActionIcon
              variant={showAllElements && !playback.isPlaying ? "filled" : "light"}
              color={showAllElements && !playback.isPlaying ? "violet" : "gray"}
              size="sm"
              disabled={playback.isPlaying}
              onClick={toggleShowAllElements}
            >
              {showAllElements && !playback.isPlaying ? <IconEyeOff size={13} /> : <IconEye size={13} />}
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
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <Tooltip label="Templates" position="bottom" withArrow>
                <ActionIcon variant="subtle" color="violet" size="sm">
                  <IconLayoutGrid size={14} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Start from template</Menu.Label>
              <Menu.Item
                leftSection={<IconSparkles size={14} />}
                onClick={() => loadProject(createPrototypeProject())}
              >
                Engine Prototype
              </Menu.Item>
              <Menu.Item
                leftSection={<IconVideo size={14} />}
                onClick={() => loadProject(createNarrativeReelProject())}
              >
                Narrative Beat Reel
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Tooltip label="Import AI project JSON" position="bottom" withArrow>
            <ActionIcon variant="subtle" color="orange" size="sm" onClick={() => { setImportErrors([]); setImportOpen(true); }}>
              <IconFileImport size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export JSON" position="bottom" withArrow>
            <ActionIcon variant="subtle" color="orange" size="sm" onClick={() => {
              const json = JSON.stringify(project, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.name ?? "project"}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <IconFileExport size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Save as inspiration example" position="bottom" withArrow>
            <ActionIcon variant="subtle" color="violet" size="sm" onClick={() => setSaveExampleOpen(true)}>
              <IconBookmark size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export video" position="bottom" withArrow>
            <ActionIcon variant="filled" color="orange" size="sm" onClick={() => setExportOpen(true)}>
              <IconDownload size={14} />
            </ActionIcon>
          </Tooltip>
          <Divider orientation="vertical" />
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
            <Box style={{ width: ICON_RAIL_WIDTH, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6, gap: 2 }}>
              <Tooltip label="Elements" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "elements" ? "filled" : "subtle"}
                  color={activeTool === "elements" ? "orange" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("elements")}
                >
                  <IconRectangle size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Text" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "text" ? "filled" : "subtle"}
                  color={activeTool === "text" ? "orange" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("text")}
                >
                  <IconTextSize size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Images" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "images" ? "filled" : "subtle"}
                  color={activeTool === "images" ? "orange" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("images")}
                >
                  <IconPhoto size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Videos" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "videos" ? "filled" : "subtle"}
                  color={activeTool === "videos" ? "orange" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("videos")}
                >
                  <IconVideo size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Audio" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "audio" ? "filled" : "subtle"}
                  color={activeTool === "audio" ? "teal" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("audio")}
                >
                  <IconMusic size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Icons" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "icons" ? "filled" : "subtle"}
                  color={activeTool === "icons" ? "violet" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("icons")}
                >
                  <IconApps size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Assets" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "assets" ? "filled" : "subtle"}
                  color={activeTool === "assets" ? "orange" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("assets")}
                >
                  <IconBoxMultiple size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Brand" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "brand" ? "filled" : "subtle"}
                  color={activeTool === "brand" ? "pink" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("brand")}
                >
                  <IconPalette size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Compositions" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "compositions" ? "filled" : "subtle"}
                  color={activeTool === "compositions" ? "indigo" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("compositions")}
                >
                  <IconLayoutGrid size={17} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Inspiration Examples" position="right" withArrow>
                <ActionIcon
                  variant={activeTool === "inspirations" ? "filled" : "subtle"}
                  color={activeTool === "inspirations" ? "violet" : "gray"}
                  size="lg"
                  radius="md"
                  onClick={() => toggleTool("inspirations")}
                >
                  <IconBookmark size={17} />
                </ActionIcon>
              </Tooltip>
            </Box>

            {/* Expansion panel — always rendered to keep player position stable */}
            <Box style={{ width: EXPANSION_WIDTH, display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", position: "relative" }}>
              {activeTool && (
                <Box style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
                  <Text fz="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">
                    {activeTool === "elements" ? "Shapes"
                      : activeTool === "text"   ? "Text"
                      : activeTool === "images" ? "Images"
                      : activeTool === "videos" ? "Videos"
                      : activeTool === "audio"  ? "Audio"
                      : activeTool === "icons"  ? "Icons"
                      : activeTool === "brand"  ? "Brand Kit"
                      : activeTool === "compositions" ? "Compositions"
                      : activeTool === "inspirations" ? "Inspiration Examples"
                      : "Assets"}
                  </Text>
                </Box>
              )}
              <ScrollArea style={{ flex: 1 }}>
                {activeTool === "elements" && (
                  <SimpleGrid cols={2} spacing={6} p={8}>
                    {ALL_SHAPE_KINDS.map(({ kind, label }) => (
                      <Box
                        key={kind}
                        onClick={() => addShape(kind)}
                        style={{ padding: "10px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.09)", background: "rgba(0,0,0,0.02)", cursor: "pointer", textAlign: "center" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.09)"; }}
                      >
                        <Text fz="xs" fw={600} c="gray.7">{label}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}

                {activeTool === "text" && (
                  <Stack gap={6} p={8}>
                    {(([
                      { label: "Heading", sub: "130px · Black", role: "heading", text: "Heading", fs: 130, fw: "900", color: "#0f172a", align: "center", h: 162, letterSpacing: -2 },
                      { label: "Title", sub: "98px · Bold", role: "section_title", text: "Title", fs: 98, fw: "700", color: "#000000", align: "center", h: 130 },
                      { label: "Subtitle", sub: "65px · Semibold", role: "subtitle", text: "Subtitle", fs: 65, fw: "600", color: "#334155", align: "left", h: 98 },
                      { label: "Body", sub: "70px · Regular", role: "body_copy", text: "Add your text here", fs: 70, fw: "400", color: "#ffffff", align: "left", h: 104 },
                      { label: "Kinetic", sub: "Animated word slide", role: "kinetic_text", text: "MAKE IT POP", fs: 108, fw: "900", color: "#ffffff", align: "center", h: 149, letterSpacing: -1, kinetic: true },
                    ] as Array<{ label: string; sub: string; role: string; text: string; fs: number; fw: string; color: string; align: string; h: number; letterSpacing?: number; kinetic?: boolean }>)).map(({ label, sub, role, text, fs, fw, color, align, h, letterSpacing, kinetic }) => (
                      <Box
                        key={label}
                        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer" }}
                        onClick={() => {
                          const elementId = nextElId();
                          const op: any = {
                            operation: "add_element",
                            sceneId: selectedSceneId,
                            elementId,
                            type: "text",
                            semanticRole: role,
                            content: { text },
                            style: { fontSize: fs, color, fontWeight: fw, textAlign: align, letterSpacing: letterSpacing ?? 0 },
                            layout: { x: 0, y: Math.round((project.viewport.height - h) / 2), width: project.viewport.width, height: h, zIndex: nextZIndex() },
                          };
                          dispatchOperation(op);
                          if (kinetic) {
                            dispatchOperation({
                              operation: "set_element_motion_preset",
                              sceneId: selectedSceneId,
                              elementId,
                              motionPreset: "kinetic",
                              animations: [
                                { id: `${elementId}_kinetic_0`, type: "kinetic_slide", startMs: 0, durationMs: 600 },
                                { id: `${elementId}_kinetic_1`, type: "fadeIn", startMs: 0, durationMs: 400 },
                              ],
                            });
                          }
                        }}
                      >
                        <Text fz={Math.min(fs * 0.22, 20)} fw={Number(fw)} c="dark.0" lh={1.2}>{label}</Text>
                        <Text fz={10} c="gray.5" mt={2}>{sub}</Text>
                      </Box>
                    ))}
                  </Stack>
                )}

                {activeTool === "images" && (
                  <Stack gap={8} p={8}>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />
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
                    {imageAssets.length === 0 ? (
                      <Text c="gray.5" fz="xs" ta="center" pt={4}>No image assets yet. Upload files (API must be running) or use the Assets library.</Text>
                    ) : (
                      <SimpleGrid cols={2} spacing={4}>
                        {imageAssets.map((asset) => (
                          <Box
                            key={asset.id}
                            style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(0,0,0,0.09)" }}
                            onClick={() => addAssetToCanvas(asset)}
                          >
                            <img src={asset.src} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                  </Stack>
                )}

                {activeTool === "audio" && (
                  <Stack gap={0} p={0}>
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    <AudioPanel
                      audioTracks={audioTracks}
                      audioAssets={assets.filter((a) => a.type === "audio")}
                      onAdd={(track) => dispatchOperation({ operation: "add_audio_track", track })}
                      onDelete={(id) => dispatchOperation({ operation: "delete_audio_track", trackId: id })}
                      onUpdate={(id, patch) => dispatchOperation({ operation: "update_audio_track", trackId: id, patch })}
                      onUpload={() => audioFileInputRef.current?.click()}
                    />
                  </Stack>
                )}

                {activeTool === "icons" && (
                  <IconPanel
                    onAddToCanvas={(src, name) => addImageToCanvas(src, name)}
                  />
                )}

                {activeTool === "assets" && (
                  <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />
                    <input ref={videoFileInputRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />
                    <input ref={audioFileInputRef} type="file" accept="audio/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />
                    <AssetManager
                      assets={assets}
                      audioTracks={audioTracks}
                      onAddToCanvas={addAssetToCanvas}
                      onAddImageUrl={(src, name) => addImageToCanvas(src, name)}
                      onDelete={deleteAssetFromLibrary}
                      onToggleFavorite={toggleAssetFavorite}
                      onUploadImages={() => fileInputRef.current?.click()}
                      onUploadVideos={() => videoFileInputRef.current?.click()}
                      onUploadAudio={() => audioFileInputRef.current?.click()}
                      onAddAudioTrack={(track) => dispatchOperation({ operation: "add_audio_track", track })}
                      onDeleteAudioTrack={(id) => dispatchOperation({ operation: "delete_audio_track", trackId: id })}
                      onUpdateAudioTrack={(id, patch) => dispatchOperation({ operation: "update_audio_track", trackId: id, patch })}
                      onSelectBackground={(background) => {
                        if (selectedSceneId) {
                          updateScene(selectedSceneId, {
                            backgroundColor: background.backgroundColor,
                            background: { imageSrc: background.url, imageFit: "cover", cssBackground: undefined, color2: undefined, gradientAngle: undefined, gradientAngleSpeed: undefined },
                          });
                        }
                      }}
                    />
                  </Box>
                )}

                {activeTool === "videos" && (
                  <Stack gap={8} p={8}>
                    <input ref={videoFileInputRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />
                    <Button
                      fullWidth
                      variant="light"
                      color="violet"
                      size="sm"
                      leftSection={<IconUpload size={14} />}
                      onClick={() => videoFileInputRef.current?.click()}
                    >
                      Upload Video
                    </Button>
                    {videoAssets.length === 0 ? (
                      <Text c="gray.5" fz="xs" ta="center" pt={4}>No video assets yet. Upload files (API must be running) or use the Assets library.</Text>
                    ) : (
                      <Stack gap={4}>
                        {videoAssets.map((asset) => (
                          <Box
                            key={asset.id}
                            onClick={() => addAssetToCanvas(asset)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 6,
                              border: "1px solid rgba(0,0,0,0.09)",
                              background: "rgba(124,58,237,0.04)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.1)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.04)"; }}
                          >
                            <IconVideo size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
                            <Box style={{ minWidth: 0 }}>
                              <Text fz="xs" fw={600} c="gray.8" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</Text>
                              <Text fz="xs" c="gray.5">{((asset.durationMs ?? 0) / 1000).toFixed(1)}s</Text>
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                )}
                {activeTool === "brand" && (() => {
                  const brand: BrandTheme = project.brandTheme ?? {};
                  const updateBrand = (patch: Partial<BrandTheme>) =>
                    dispatchOperation({ operation: "set_brand_theme", brandTheme: { ...brand, ...patch } });

                  return (
                    <Stack gap={0} p={0}>
                      {/* Canvas dimensions */}
                      <Box style={{ padding: "10px 12px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                        <Text fz="xs" fw={700} tt="uppercase" lts="0.06em" c="gray.5" mb={8}>Canvas</Text>
                        <Text fz="xs" c="gray.5" mb={8}>{project.viewport.width} × {project.viewport.height}px — changing this does not rescale existing elements.</Text>
                        <Group gap={6}>
                          {Object.entries(VIEWPORT_PRESETS).map(([key, preset]) => {
                            const active = project.viewport.width === preset.width && project.viewport.height === preset.height;
                            return (
                              <Button
                                key={key}
                                size="xs"
                                variant={active ? "filled" : "light"}
                                color="pink"
                                onClick={() => dispatchOperation({ operation: "set_viewport", viewport: { width: preset.width, height: preset.height } })}
                              >
                                {preset.label}
                              </Button>
                            );
                          })}
                        </Group>
                      </Box>
                      {/* Colors */}
                      <Box style={{ padding: "10px 12px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                        <Text fz="xs" fw={700} tt="uppercase" lts="0.06em" c="gray.5" mb={8}>Colors</Text>
                        <Stack gap={6}>
                          <InspectorField label="Primary" input={
                            <Group gap={6} align="center">
                              <SwatchPicker value={brand.primaryColor ?? "#4f46e5"} onChange={(c) => updateBrand({ primaryColor: c })} />
                              <Text fz="xs" c="gray.5">{brand.primaryColor ?? "—"}</Text>
                            </Group>
                          } />
                          <InspectorField label="Secondary" input={
                            <Group gap={6} align="center">
                              <SwatchPicker value={brand.secondaryColor ?? "#7c3aed"} onChange={(c) => updateBrand({ secondaryColor: c })} />
                              <Text fz="xs" c="gray.5">{brand.secondaryColor ?? "—"}</Text>
                            </Group>
                          } />
                          <InspectorField label="Accent" input={
                            <Group gap={6} align="center">
                              <SwatchPicker value={brand.accentColor ?? "#f97316"} onChange={(c) => updateBrand({ accentColor: c })} />
                              <Text fz="xs" c="gray.5">{brand.accentColor ?? "—"}</Text>
                            </Group>
                          } />
                          <InspectorField label="Background" input={
                            <Group gap={6} align="center">
                              <SwatchPicker value={brand.backgroundColor ?? "#000000"} onChange={(c) => updateBrand({ backgroundColor: c })} />
                              <Text fz="xs" c="gray.5">{brand.backgroundColor ?? "—"}</Text>
                            </Group>
                          } />
                        </Stack>
                      </Box>

                      {/* Typography */}
                      <Box style={{ padding: "10px 12px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                        <Text fz="xs" fw={700} tt="uppercase" lts="0.06em" c="gray.5" mb={8}>Typography</Text>
                        <Stack gap={6}>
                          <InspectorField label="Primary Font" input={
                            <FontPicker value={brand.primaryFont ?? ""} onChange={(f) => updateBrand({ primaryFont: f })} />
                          } />
                          <InspectorField label="Body Font" input={
                            <FontPicker value={brand.secondaryFont ?? ""} onChange={(f) => updateBrand({ secondaryFont: f })} />
                          } />
                          {brand.primaryFont && (
                            <Button size="xs" variant="light" color="pink" fullWidth
                              onClick={() => {
                                for (const scene of project.scenes) {
                                  for (const el of scene.elements) {
                                    if (el.type !== "text") continue;
                                    dispatchOperation({
                                      operation: "patch_element",
                                      sceneId: scene.id,
                                      elementId: el.id,
                                      patch: { style: { fontFamily: brand.primaryFont } },
                                    });
                                  }
                                }
                              }}>
                              Apply Font to All Text
                            </Button>
                          )}
                        </Stack>
                      </Box>

                      {/* Apply brand to selected element */}
                      {selectedElement && selectedSceneId && (
                        <Box style={{ padding: "10px 12px" }}>
                          <Text fz="xs" fw={700} tt="uppercase" lts="0.06em" c="gray.5" mb={8}>Apply to Selection</Text>
                          <Stack gap={6}>
                            {selectedElement.type === "text" && brand.primaryColor && (
                              <Button size="xs" variant="light" color="pink" fullWidth
                                onClick={() => updateElement(selectedSceneId, selectedElement.id, { style: { color: brand.primaryColor } })}>
                                Apply Primary Color
                              </Button>
                            )}
                            {selectedElement.type === "text" && brand.primaryFont && (
                              <Button size="xs" variant="light" color="pink" fullWidth
                                onClick={() => updateElement(selectedSceneId, selectedElement.id, { style: { fontFamily: brand.primaryFont } })}>
                                Apply Primary Font
                              </Button>
                            )}
                            {selectedElement.type === "text" && brand.secondaryFont && (
                              <Button size="xs" variant="light" color="grape" fullWidth
                                onClick={() => updateElement(selectedSceneId, selectedElement.id, { style: { fontFamily: brand.secondaryFont } })}>
                                Apply Body Font
                              </Button>
                            )}
                            {(selectedElement.type === "shape" || selectedElement.type === "image") && brand.primaryColor && (
                              <Button size="xs" variant="light" color="pink" fullWidth
                                onClick={() => updateElement(selectedSceneId, selectedElement.id, { style: { backgroundColor: brand.primaryColor } })}>
                                Apply Primary Color
                              </Button>
                            )}
                            {!brand.primaryColor && !brand.primaryFont && (
                              <Text c="gray.5" fz="xs">Set brand colors and fonts above, then apply them here.</Text>
                            )}
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  );
                })()}

                {activeTool === "compositions" && (() => {
                  const activeScene = project.scenes.find((s) => s.id === selectedSceneId);
                  const sceneCompositions = activeScene?.compositions ?? [];

                  const addBookFlip = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const leftSlotId = `slot_${Math.random().toString(36).slice(2, 9)}`;
                    const rightSlotId = `slot_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 480;
                    const compH = 600;
                    const x = Math.round((project.viewport.width - compW) / 2);
                    const y = Math.round((project.viewport.height - compH) / 3);
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "book_flip",
                        semanticRole: "composition",
                        layout: { x, y, width: compW, height: compH, rotation: 0, scale: 1, opacity: 1, zIndex: 10 },
                        slots: [
                          { id: leftSlotId, type: "image" as const },
                          { id: rightSlotId, type: "image" as const },
                        ],
                        params: { speed: 1, colorOverrides: { pageColor: "#f9f7f2", accentColor: "#1a1a2e" } },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addProductCart = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 420;
                    const compH = 540;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "product_cart",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: { speed: 1, colorOverrides: { pageColor: "#f9f7f2", accentColor: "#1a1a2e" } },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addChristmasTree = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 360;
                    const compH = 500;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "christmas_tree",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: { speed: 1 },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addFireworks = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 760;
                    const compH = 520;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "fireworks",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: { speed: 1 },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addIconParade = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 480;
                    const compH = 320;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "icon_parade",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: {
                          speed: 1,
                          direction: "left",
                          stopPoint: 0.45,
                          holdDuration: 1500,
                          exitDelay: 0,
                          entryEasing: "quick",
                          stagger: 140,
                          iconSize: 66,
                          stopStyle: "line",
                          colorOverrides: { pageColor: "#ffffff", accentColor: "#6366f1" },
                        },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addSpinningCarousel = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 580;
                    const compH = 380;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "spinning_carousel",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: { speed: 1, colorOverrides: { pageColor: "#fff3ed", accentColor: "#1a1a2e" } },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addChristmasPanel = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = project.viewport.width;
                    const compH = project.viewport.height;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "christmas_panel",
                        semanticRole: "composition",
                        layout: {
                          x: 0,
                          y: 0,
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: { speed: 1, bulbSize: 1 },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addWillemLoader = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 900;
                    const compH = 500;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "willem_loader",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width  - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: { speed: 1, colorOverrides: { accentColor: "#f5f0eb" }, displayText: "WILLEM" },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addGiftReveal = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 450;
                    const compH = 540;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "gift_reveal",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width  - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 3),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [],
                        params: {
                          speed: 1,
                          timerMs: 3000,
                          displayText: "HAPPY NEW YEAR!",
                          colorOverrides: {
                            accentColor: "#E9454F",
                            pageColor:   "#B8CDB7",
                            bgColor:     "#BFE2DC",
                            textColor:   "#1D1F3F",
                          },
                        },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  const addWordScroll = () => {
                    if (!selectedSceneId) return;
                    const id = `comp_${Math.random().toString(36).slice(2, 9)}`;
                    const compW = 680;
                    const compH = 360;
                    dispatchOperation({
                      operation: "add_composition",
                      sceneId: selectedSceneId,
                      composition: {
                        id,
                        compositionType: "word_scroll",
                        semanticRole: "composition",
                        layout: {
                          x: Math.round((project.viewport.width  - compW) / 2),
                          y: Math.round((project.viewport.height - compH) / 2),
                          width: compW, height: compH,
                          rotation: 0, scale: 1, opacity: 1, zIndex: 10,
                        },
                        slots: [
                          { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "text" as const, text: "products." },
                          { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "text" as const, text: "platforms." },
                          { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "text" as const, text: "experiences." },
                          { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "text" as const, text: "systems." },
                          { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "text" as const, text: "interfaces." },
                        ],
                        params: { speed: 1, prefix: "I build ", wordDurationMs: 1400 },
                      },
                    });
                    setSelectedCompositionId(id);
                  };

                  return (
                    <Stack gap={0}>
                      <Box style={{ padding: "10px 12px 8px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                        <Text fz="xs" c="gray.5" mb={8}>Add a composition, then click it to configure in the right panel.</Text>
                        <Stack gap={6}>
                          <Button fullWidth variant="light" color="indigo" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addBookFlip} disabled={!selectedSceneId}>
                            Book Flip
                          </Button>
                          <Button fullWidth variant="light" color="violet" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addProductCart} disabled={!selectedSceneId}>
                            Product Showcase
                          </Button>
                          <Button fullWidth variant="light" color="red" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addChristmasTree} disabled={!selectedSceneId}>
                            Christmas Tree
                          </Button>
                          <Button fullWidth variant="light" color="orange" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addFireworks} disabled={!selectedSceneId}>
                            Fireworks
                          </Button>
                          <Button fullWidth variant="light" color="pink" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addChristmasPanel} disabled={!selectedSceneId}>
                            Christmas Panel
                          </Button>
                          <Button fullWidth variant="light" color="cyan" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addIconParade} disabled={!selectedSceneId}>
                            Icon Parade
                          </Button>
                          <Button fullWidth variant="light" color="teal" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addSpinningCarousel} disabled={!selectedSceneId}>
                            Spinning Carousel
                          </Button>
                          <Button fullWidth variant="light" color="dark" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addWillemLoader} disabled={!selectedSceneId}>
                            Willem Loader
                          </Button>
                          <Button fullWidth variant="light" color="grape" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addWordScroll} disabled={!selectedSceneId}>
                            Word Scroll
                          </Button>
                          <Button fullWidth variant="light" color="green" size="sm" leftSection={<IconLayoutGrid size={14} />} onClick={addGiftReveal} disabled={!selectedSceneId}>
                            Gift Reveal
                          </Button>
                        </Stack>
                      </Box>

                      {sceneCompositions.map((comp) => (
                        <Box
                          key={comp.id}
                          style={{
                            padding: "10px 12px",
                            borderBottom: "1px solid rgba(0,0,0,0.07)",
                            background: selectedCompositionId === comp.id ? "rgba(99,102,241,0.08)" : "transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedCompositionId(comp.id)}
                        >
                          <Group justify="space-between">
                            <Stack gap={2}>
                              <Text fz="xs" fw={700} c="gray.7" tt="uppercase" lts="0.06em">{comp.compositionType.replace(/_/g, " ")}</Text>
                              <Text fz="10px" c="gray.4">
                                {comp.compositionType === "book_flip"
                                  ? `${comp.slots.length} pages · ${Math.max(1, Math.ceil(comp.slots.length / 2))} spread${Math.ceil(comp.slots.length / 2) !== 1 ? "s" : ""}`
                                  : comp.compositionType === "product_cart"
                                    ? `${comp.slots.length} product${comp.slots.length !== 1 ? "s" : ""}`
                                    : comp.compositionType === "spinning_carousel"
                                      ? `${comp.slots.length} card${comp.slots.length !== 1 ? "s" : ""}`
                                      : comp.compositionType === "icon_parade"
                                        ? `${comp.slots.length} icon${comp.slots.length !== 1 ? "s" : ""}`
                                        : "procedural effect"
                                } — click to edit
                              </Text>
                            </Stack>
                            <ActionIcon size="xs" color="red" variant="subtle" onClick={(e) => {
                              e.stopPropagation();
                              if (selectedCompositionId === comp.id) setSelectedCompositionId(null);
                              dispatchOperation({ operation: "delete_composition", sceneId: selectedSceneId!, compositionId: comp.id });
                            }}>
                              <IconTrash size={10} />
                            </ActionIcon>
                          </Group>
                        </Box>
                      ))}

                      {sceneCompositions.length === 0 && selectedSceneId && (
                        <Text c="gray.4" fz="xs" ta="center" pt={24} px={12}>No compositions yet. Add a Book Flip above.</Text>
                      )}
                    </Stack>
                  );
                })()}

              </ScrollArea>

              {activeTool === "inspirations" && (
                <Box style={{ position: "absolute", inset: 0, top: 42, background: "#fff", zIndex: 1, display: "flex", flexDirection: "column" }}>
                  <InspirationPanel
                    onLoadProject={(proj) => loadProject(proj as any)}
                    onLoadScene={(scene) => {
                      dispatchOperation({
                        operation: "add_scene",
                        scene: scene as any,
                      });
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Canvas */}
        <Box ref={canvasContainerRef} style={{ flex: 1, overflow: "hidden", position: "relative", background: isFullscreen ? "#000" : undefined }}>
          <Box className="editor-canvas-frame" style={{ height: "100%", borderRadius: 0, border: "none" }}>
            <PreviewCanvas
              project={project}
              timeMs={timeline.currentTimeMs}
              currentTimeRef={currentTimeRef}
              showAllElements={effectiveShowAll}
              isPlaying={playback.isPlaying}
              selectedElementId={selectedElement?.id}
              selectedCompositionId={selectedCompositionId}
              onUpdateElement={(id, updates) => {
                const activeSceneId = frame.sceneId ?? selectedScene?.id;
                if (activeSceneId) updateElement(activeSceneId, id, updates);
              }}
              onUpdateComposition={(id, updates) => {
                const activeSceneId = frame.sceneId ?? selectedScene?.id;
                if (activeSceneId) {
                  dispatchOperation({ operation: "update_composition", sceneId: activeSceneId, compositionId: id, patch: updates });
                }
              }}
              onSelectElement={(id) => {
                // Use the active scene at current playback time, not the stale selectedScene.
                const activeSceneId = frame.sceneId ?? selectedScene?.id;
                setSelectedCompositionId(null);
                if (activeSceneId) selectElement(activeSceneId, id || "");
              }}
              onSelectComposition={(id) => {
                const activeSceneId = frame.sceneId ?? selectedScene?.id;
                setSelectedCompositionId(id);
                if (activeSceneId) selectElement(activeSceneId, "");
              }}
              onPatchTextSpans={(elementId, spans) => {
                const activeSceneId = frame.sceneId ?? selectedScene?.id;
                if (activeSceneId) {
                  dispatchOperation({ operation: "patch_text_spans", sceneId: activeSceneId, elementId, spans });
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
          {isFullscreen && (
            <Group
              gap={6}
              style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30, background: "rgba(0,0,0,0.55)", borderRadius: 10, padding: "6px 10px", backdropFilter: "blur(6px)" }}
            >
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { if (!playback.isPlaying) togglePlayback(); }}>
                <IconPlayerPlayFilled size={14} color={playback.isPlaying ? "#f97316" : "#fff"} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { if (playback.isPlaying) togglePlayback(); }}>
                <IconPlayerPauseFilled size={14} color={!playback.isPlaying ? "#f97316" : "#fff"} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { if (playback.isPlaying) togglePlayback(); setCurrentTime(0); }}>
                <IconPlayerStopFilled size={14} color="#fff" />
              </ActionIcon>
            </Group>
          )}
          <Tooltip label={isFullscreen ? "Exit fullscreen" : "Fullscreen preview"} position="left" withArrow>
            <ActionIcon
              variant="filled"
              color="dark"
              size="sm"
              radius="md"
              onClick={toggleFullscreen}
              style={{ position: "absolute", bottom: 10, right: 10, zIndex: 30, opacity: 0.7 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
            >
              {isFullscreen ? <IconMinimize size={13} /> : <IconMaximize size={13} />}
            </ActionIcon>
          </Tooltip>
        </Box>

        {/* Right inspector */}
        {!rightInspectorCollapsed && (() => {
          const activeScene = project.scenes.find((s) => s.id === selectedSceneId);
          const selectedComposition = (activeScene?.compositions ?? []).find((c) => c.id === selectedCompositionId) ?? null;
          return (
            <Box style={{ width: inspectorWidth, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.07)", background: "#ffffff", display: "flex", flexDirection: "column" }}>
              <Box style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
                <Group justify="space-between">
                  <Group gap={6}>
                    <IconAdjustmentsHorizontal size={14} color="#c9520a" />
                    <Text fz="xs" fw={700} tt="uppercase" lts="0.08em" c="gray.5">
                      {selectedComposition ? "Composition" : "Inspector"}
                    </Text>
                  </Group>
                  {selectedComposition ? (
                    <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSelectedCompositionId(null)} title="Close composition editor">
                      ✕
                    </ActionIcon>
                  ) : (
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
                  )}
                </Group>
              </Box>
              <ScrollArea style={{ flex: 1 }} p="sm">
                {selectedComposition && selectedSceneId ? (
                  <CompositionInspector
                    comp={selectedComposition}
                    sceneId={selectedSceneId}
                    imageAssets={imageAssets}
                    onDispatch={dispatchOperation}
                    onDelete={() => {
                      dispatchOperation({ operation: "delete_composition", sceneId: selectedSceneId, compositionId: selectedComposition.id });
                      setSelectedCompositionId(null);
                    }}
                  />
                ) : inspectorTab === "scene" && selectedScene ? (
                  <SceneInspector
                    scene={selectedScene}
                    onUpdateScene={updateScene}
                    onSetTransition={setSceneTransition}
                    onSetSceneSfx={setSceneSfx}
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
          );
        })()}
      </Box>

      {/* ── Import JSON modal ── */}
      <Modal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import AI Project JSON"
        size="lg"
        centered
      >
        <Stack gap="sm">
          <Text fz="xs" c="gray.6">
            Paste a <code>ProjectDocument</code> JSON generated from <code>AI_PROJECT_SPEC.md</code>. The current project will be replaced.
          </Text>
          <Textarea
            autosize
            minRows={12}
            maxRows={20}
            placeholder='{ "id": "...", "name": "...", "scenes": [...], "timelineTracks": [...], "viewport": { "width": 1080, "height": 1920 } }'
            value={importText}
            onChange={(e) => { setImportText(e.currentTarget.value); setImportErrors([]); }}
            styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
          />
          {importErrors.length > 0 && (
            <Stack gap={2}>
              {importErrors.map((err, i) => (
                <Text key={i} fz="xs" c="red.6">{err}</Text>
              ))}
            </Stack>
          )}
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" color="gray" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button color="orange" size="sm" onClick={handleImportApply} disabled={!importText.trim()}>
              Import
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Export modal ── */}
      <ExportModal
        opened={exportOpen}
        onClose={() => setExportOpen(false)}
        project={project}
      />

      {/* ── Save as Inspiration Example modal ── */}
      <SaveAsExampleModal
        opened={saveExampleOpen}
        onClose={() => setSaveExampleOpen(false)}
        project={project}
        selectedScene={selectedScene ?? null}
      />

      {/* ── Timeline resize handle + Timeline ── */}
      {!bottomTimelineCollapsed && (
        <>
          <Box
            onMouseDown={handleTimelineResizeStart}
            style={{
              height: 6,
              flexShrink: 0,
              cursor: "ns-resize",
              background: "transparent",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none"
            }}
          >
            <Box style={{ width: 36, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.12)" }} />
          </Box>
          <Box style={{ height: timelineHeight, flexShrink: 0, overflow: "hidden" }}>
            <SceneTimeline />
          </Box>
        </>
      )}
    </Box>
  );
}

// ── Composition inspector ─────────────────────────────────────────────────────
interface CompositionInspectorProps {
  comp: CompositionNode;
  sceneId: string;
  imageAssets: Asset[];
  onDispatch: (op: EditorOperation) => void;
  onDelete: () => void;
}

function CompositionInspector({ comp, sceneId, imageAssets, onDispatch, onDelete }: CompositionInspectorProps) {
  type CompPatch = {
    slots?: CompositionNode["slots"];
    params?: CompositionNode["params"];
    layout?: Partial<CompositionNode["layout"]>;
    startMs?: number;
    endMs?: number;
  };
  const updateComp = (patch: CompPatch) =>
    onDispatch({ operation: "update_composition", sceneId, compositionId: comp.id, patch });

  const setSlotSrc = (slotId: string, src: string) =>
    updateComp({ slots: comp.slots.map((s) => s.id === slotId ? { ...s, src } : s) });

  const removeSlot = (slotId: string) =>
    updateComp({ slots: comp.slots.filter((s) => s.id !== slotId) });

  const isBookFlip = comp.compositionType === "book_flip";
  const isIconParade = comp.compositionType === "icon_parade";
  const isSpinningCarousel = comp.compositionType === "spinning_carousel";
  const isWordScroll = comp.compositionType === "word_scroll";
  const isDecorative = comp.compositionType === "christmas_tree" || comp.compositionType === "fireworks" || comp.compositionType === "christmas_panel";
  const isWillemLoader = comp.compositionType === "willem_loader";
  const isGiftReveal = comp.compositionType === "gift_reveal";

  const addSpread = () => {
    const leftId = `slot_${Math.random().toString(36).slice(2, 9)}`;
    const rightId = `slot_${Math.random().toString(36).slice(2, 9)}`;
    updateComp({ slots: [...comp.slots, { id: leftId, type: "image" as const }, { id: rightId, type: "image" as const }] });
  };

  const addSlot = () => {
    if (isWordScroll) {
      updateComp({ slots: [...comp.slots, { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "text" as const, text: "word." }] });
    } else {
      updateComp({ slots: [...comp.slots, { id: `slot_${Math.random().toString(36).slice(2, 9)}`, type: "image" as const }] });
    }
  };

  const setSlotText = (slotId: string, text: string) =>
    updateComp({ slots: comp.slots.map((s) => s.id === slotId ? { ...s, text } : s) });

  const slotLabel = (idx: number): string => {
    if (isBookFlip) return `Page ${idx + 1} · ${idx % 2 === 0 ? "Left" : "Right"} · Spread ${Math.floor(idx / 2) + 1}`;
    if (isIconParade) return `Icon ${idx + 1}`;
    if (isSpinningCarousel) return `Card ${idx + 1}`;
    if (isWordScroll) return `Word ${idx + 1}`;
    if (isWillemLoader) return `Frame ${idx + 1}`;
    return `Product ${idx + 1}`;
  };

  const pageColorDefault = isIconParade ? "#ffffff" : isSpinningCarousel ? "#fff3ed" : "#f9f7f2";
  const accentColorDefault = isIconParade ? "#6366f1" : "#1a1a2e";
  const pageColor = comp.params?.colorOverrides?.pageColor ?? pageColorDefault;
  const accentColor = comp.params?.colorOverrides?.accentColor ?? accentColorDefault;

  return (
    <Stack gap="sm">
      {/* Type + delete */}
      <Group justify="space-between">
        <Text fz="sm" fw={700} tt="capitalize">{comp.compositionType.replace(/_/g, " ")}</Text>
        <ActionIcon size="sm" color="red" variant="subtle" onClick={onDelete} title="Delete composition">
          <IconTrash size={13} />
        </ActionIcon>
      </Group>

      <Divider label="Size & Position" labelPosition="left" />

      <SimpleGrid cols={2} spacing="xs">
        <InspectorField label="W" input={
          <NumberInput size="xs" min={80} value={comp.layout.width}
            onChange={(v) => updateComp({ layout: { ...comp.layout, width: toNumber(v, comp.layout.width) } })} />
        } />
        <InspectorField label="H" input={
          <NumberInput size="xs" min={80} value={comp.layout.height}
            onChange={(v) => updateComp({ layout: { ...comp.layout, height: toNumber(v, comp.layout.height) } })} />
        } />
        <InspectorField label="X" input={
          <NumberInput size="xs" value={comp.layout.x}
            onChange={(v) => updateComp({ layout: { ...comp.layout, x: toNumber(v, comp.layout.x) } })} />
        } />
        <InspectorField label="Y" input={
          <NumberInput size="xs" value={comp.layout.y}
            onChange={(v) => updateComp({ layout: { ...comp.layout, y: toNumber(v, comp.layout.y) } })} />
        } />
      </SimpleGrid>

      <Divider label="Style" labelPosition="left" />

      <InspectorField label="Speed" input={
        <Slider size="xs" min={0.25} max={4} step={0.25} value={comp.params?.speed ?? 1}
          onChange={(v) => updateComp({ params: { ...comp.params, speed: v } })} />
      } />

      {comp.compositionType === "christmas_panel" && (
        <InspectorField label="Bulb Size" input={
          <Slider size="xs" min={0.1} max={2} step={0.05} value={comp.params?.bulbSize ?? 1}
            onChange={(v) => updateComp({ params: { ...comp.params, bulbSize: v } })} />
        } />
      )}


      {isWillemLoader && (
        <>
          <Divider label="Text" labelPosition="left" />

          <TextInput size="xs" label="Display word"
            description="The large word split by the image box."
            value={comp.params?.displayText ?? "WILLEM"}
            onChange={(e) => updateComp({ params: { ...comp.params, displayText: e.currentTarget.value } })}
          />

          <InspectorField label="Split at" input={
            <Slider size="xs" min={1} max={Math.max(1, (comp.params?.displayText ?? "WILLEM").length - 1)} step={1}
              value={comp.params?.splitPoint ?? Math.floor((comp.params?.displayText ?? "WILLEM").length / 2)}
              onChange={(v) => updateComp({ params: { ...comp.params, splitPoint: v } })}
              label={(v) => {
                const w = comp.params?.displayText ?? "WILLEM";
                return `${w.slice(0, v)} | ${w.slice(v)}`;
              }}
            />
          } />

          <TextInput size="xs" label="Bottom title"
            description="Large text shown bottom-left after the reveal."
            value={comp.params?.bottomTitle ?? `${comp.params?.displayText ?? "WILLEM"} ©`}
            onChange={(e) => updateComp({ params: { ...comp.params, bottomTitle: e.currentTarget.value } })}
          />

          <TextInput size="xs" label="Nav — left"
            description="Brand name shown top-left."
            value={comp.params?.navLeftText ?? "Brand ©"}
            onChange={(e) => updateComp({ params: { ...comp.params, navLeftText: e.currentTarget.value } })}
          />

          <TextInput size="xs" label="Nav — right"
            description="Links shown top-right."
            value={comp.params?.navRightText ?? "Projects,  Services,  About"}
            onChange={(e) => updateComp({ params: { ...comp.params, navRightText: e.currentTarget.value } })}
          />

          <Divider label="Style" labelPosition="left" />

          <InspectorField label="Text color" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.accentColor ?? "#f5f0eb"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, accentColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.accentColor ?? "#f5f0eb"}</Text>
            </Group>
          } />

          <Divider label="Frames" labelPosition="left" />

          {comp.slots.length === 0 && (
            <Text fz="xs" c="gray.5" ta="center" py={8}>No frames yet — add images below. 3–4 images works best.</Text>
          )}

          {comp.slots.map((slot, idx) => (
            <Box key={slot.id} style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <Group justify="space-between" style={{ padding: "6px 10px", background: "rgba(0,0,0,0.03)" }}>
                <Text fz="xs" fw={600} c="gray.6">Frame {idx + 1}</Text>
                <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeSlot(slot.id)}>
                  <IconTrash size={10} />
                </ActionIcon>
              </Group>
              {slot.src ? (
                <Box style={{ position: "relative", height: 100, cursor: "pointer" }} onClick={() => setSlotSrc(slot.id, "")}>
                  <img src={slot.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <Box style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.45)"; (e.currentTarget.firstElementChild as HTMLElement | null)!.style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)"; (e.currentTarget.firstElementChild as HTMLElement | null)!.style.opacity = "0"; }}>
                    <Text fz="xs" c="white" fw={700} style={{ opacity: 0, transition: "opacity 0.15s" }}>Click to remove</Text>
                  </Box>
                </Box>
              ) : (
                <Box style={{ padding: 8 }}>
                  {imageAssets.length === 0 ? (
                    <Text fz="xs" c="gray.4" ta="center" py={8}>Upload images via the Assets tab first.</Text>
                  ) : (
                    <>
                      <Text fz="10px" c="gray.4" mb={6}>Click an image to assign it to this frame:</Text>
                      <SimpleGrid cols={3} spacing={4}>
                        {imageAssets.map((asset) => (
                          <Box key={asset.id} style={{ aspectRatio: "1", borderRadius: 4, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(0,0,0,0.1)" }}
                            onClick={() => setSlotSrc(slot.id, asset.src)}>
                            <img src={asset.thumbnailSrc ?? asset.src} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </Box>
                        ))}
                      </SimpleGrid>
                    </>
                  )}
                </Box>
              )}
            </Box>
          ))}

          <Button size="xs" variant="light" color="blue" fullWidth onClick={addSlot} leftSection={<IconPlus size={12} />}>
            Add Frame
          </Button>
        </>
      )}
      {isWordScroll && (
        <>
          <Divider label="Text" labelPosition="left" />

          <TextInput
            size="sm"
            label="Prefix text"
            description='The static text shown before each cycling word, e.g. "I build "'
            value={comp.params?.prefix ?? "I build "}
            onChange={(e) => updateComp({ params: { ...comp.params, prefix: e.currentTarget.value } })}
          />

          <InspectorField label="Word time" input={
            <Slider size="xs" min={400} max={4000} step={100}
              value={comp.params?.wordDurationMs ?? 1400}
              onChange={(v) => updateComp({ params: { ...comp.params, wordDurationMs: v } })}
              label={(v) => `${v}ms`}
            />
          } />

          <InspectorField label="Prefix color" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.textColor ?? "#ffffff"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, textColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.textColor ?? "#ffffff"}</Text>
            </Group>
          } />

          <InspectorField label="Word color" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.accentColor ?? "#ffffff"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, accentColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.accentColor ?? "hue cycle"}</Text>
              {comp.params?.colorOverrides?.accentColor && (
                <ActionIcon size="xs" variant="subtle" color="gray" title="Clear — restore rainbow hue cycle"
                  onClick={() => {
                    const { accentColor: _removed, ...rest } = comp.params?.colorOverrides ?? {};
                    updateComp({ params: { ...comp.params, colorOverrides: Object.keys(rest).length ? rest : undefined } });
                  }}>
                  <IconX size={10} />
                </ActionIcon>
              )}
            </Group>
          } />

          <InspectorField label="Background" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.bgColor ?? "#000000"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, bgColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.bgColor ?? "transparent"}</Text>
              {comp.params?.colorOverrides?.bgColor && (
                <ActionIcon size="xs" variant="subtle" color="gray" title="Clear background (transparent)"
                  onClick={() => {
                    const { bgColor: _removed, ...rest } = comp.params?.colorOverrides ?? {};
                    updateComp({ params: { ...comp.params, colorOverrides: Object.keys(rest).length ? rest : undefined } });
                  }}>
                  <IconX size={10} />
                </ActionIcon>
              )}
            </Group>
          } />

          <Divider label="Words" labelPosition="left" />

          {comp.slots.length === 0 && (
            <Text fz="xs" c="gray.5" ta="center" py={8}>No words yet — add words below.</Text>
          )}

          {comp.slots.map((slot, idx) => (
            <Box key={slot.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Text fz="xs" c="gray.5" style={{ minWidth: 52 }}>Word {idx + 1}</Text>
              <TextInput
                size="xs"
                style={{ flex: 1 }}
                value={slot.text ?? ""}
                onChange={(e) => setSlotText(slot.id, e.currentTarget.value)}
                placeholder="word."
              />
              <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeSlot(slot.id)}>
                <IconTrash size={10} />
              </ActionIcon>
            </Box>
          ))}

          <Button size="xs" variant="light" color="grape" fullWidth onClick={addSlot} leftSection={<IconPlus size={12} />}>
            Add Word
          </Button>
        </>
      )}

      {isGiftReveal && (
        <>
          <Divider label="Message" labelPosition="left" />

          <TextInput size="xs" label="Inside text"
            description="The message shown after the gift opens."
            value={comp.params?.displayText ?? "HAPPY NEW YEAR!"}
            onChange={(e) => updateComp({ params: { ...comp.params, displayText: e.currentTarget.value } })}
          />

          <InspectorField label="Open after" input={
            <Slider size="xs" min={500} max={10000} step={500}
              value={comp.params?.timerMs ?? 3000}
              onChange={(v) => updateComp({ params: { ...comp.params, timerMs: v } })}
              label={(v) => `${(v / 1000).toFixed(1)}s`}
            />
          } />

          <Divider label="Colors" labelPosition="left" />

          <InspectorField label="Ribbon" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.accentColor ?? "#E9454F"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, accentColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.accentColor ?? "#E9454F"}</Text>
            </Group>
          } />

          <InspectorField label="Box" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.pageColor ?? "#B8CDB7"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, pageColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.pageColor ?? "#B8CDB7"}</Text>
            </Group>
          } />

          <InspectorField label="Scene BG" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.bgColor ?? "#BFE2DC"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, bgColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.bgColor ?? "#BFE2DC"}</Text>
            </Group>
          } />

          <InspectorField label="Text" input={
            <Group gap={6}>
              <SwatchPicker
                value={comp.params?.colorOverrides?.textColor ?? "#1D1F3F"}
                onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, textColor: c } } })}
              />
              <Text fz="xs" c="gray.5">{comp.params?.colorOverrides?.textColor ?? "#1D1F3F"}</Text>
            </Group>
          } />
        </>
      )}

      {!isDecorative && !isWordScroll && !isWillemLoader && !isGiftReveal && (
        <>
          <InspectorField label="Page Color" input={
            <Group gap={6}>
              <SwatchPicker value={pageColor} onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, pageColor: c } } })} />
              <Text fz="xs" c="gray.5">{pageColor}</Text>
            </Group>
          } />

          <InspectorField label="Accent" input={
            <Group gap={6}>
              <SwatchPicker value={accentColor} onChange={(c) => updateComp({ params: { ...comp.params, colorOverrides: { ...comp.params?.colorOverrides, accentColor: c } } })} />
              <Text fz="xs" c="gray.5">{accentColor}</Text>
            </Group>
          } />

          {isIconParade && (
            <>
              <Divider label="Motion" labelPosition="left" />

              <InspectorField label="Direction" input={
                <SegmentedControl size="xs" fullWidth
                  value={comp.params?.direction ?? "left"}
                  onChange={(v) => updateComp({ params: { ...comp.params, direction: v as "left" | "right" } })}
                  data={[{ label: "← Left", value: "left" }, { label: "Right →", value: "right" }]}
                />
              } />

              <InspectorField label="Stop at" input={
                <Slider size="xs" min={0.1} max={0.9} step={0.05}
                  value={comp.params?.stopPoint ?? 0.45}
                  onChange={(v) => updateComp({ params: { ...comp.params, stopPoint: v } })}
                  label={(v) => `${Math.round(v * 100)}%`}
                />
              } />

              <InspectorField label="Hold (ms)" input={
                <Slider size="xs" min={300} max={5000} step={100}
                  value={comp.params?.holdDuration ?? 1500}
                  onChange={(v) => updateComp({ params: { ...comp.params, holdDuration: v } })}
                  label={(v) => `${v}ms`}
                />
              } />

              <InspectorField label="Exit delay" input={
                <Slider size="xs" min={0} max={2000} step={100}
                  value={comp.params?.exitDelay ?? 0}
                  onChange={(v) => updateComp({ params: { ...comp.params, exitDelay: v } })}
                  label={(v) => `${v}ms`}
                />
              } />

              <InspectorField label="Entry" input={
                <SegmentedControl size="xs" fullWidth
                  value={comp.params?.entryEasing ?? "quick"}
                  onChange={(v) => updateComp({ params: { ...comp.params, entryEasing: v as "quick" | "slow" | "wavy" } })}
                  data={[{ label: "Quick", value: "quick" }, { label: "Slow", value: "slow" }, { label: "Wavy", value: "wavy" }]}
                />
              } />

              <InspectorField label="Stagger" input={
                <Slider size="xs" min={40} max={400} step={20}
                  value={comp.params?.stagger ?? 140}
                  onChange={(v) => updateComp({ params: { ...comp.params, stagger: v } })}
                  label={(v) => `${v}ms`}
                />
              } />

              <InspectorField label="Icon size" input={
                <Slider size="xs" min={32} max={120} step={4}
                  value={(comp.params?.iconSize as any) ?? 66}
                  onChange={(v) => updateComp({ params: { ...comp.params, iconSize: v } })}
                  label={(v) => `${v}px`}
                />
              } />

              <InspectorField label="Stop layout" input={
                <SegmentedControl size="xs" fullWidth
                  value={(comp.params?.stopStyle as any) ?? "line"}
                  onChange={(v) => updateComp({ params: { ...comp.params, stopStyle: v as "line" | "staggered" } })}
                  data={[{ label: "Line", value: "line" }, { label: "Staggered", value: "staggered" }]}
                />
              } />
            </>
          )}

          <Divider label={isBookFlip ? "Pages" : isIconParade ? "Icons" : isSpinningCarousel ? "Cards" : "Products"} labelPosition="left" />

          {comp.slots.length === 0 && (
            <Text fz="xs" c="gray.5" ta="center" py={8}>
              {isBookFlip
                ? "No pages yet — add a spread below (left + right page per spread)."
                : isIconParade
                  ? "No icons yet — add icon slots below, then assign images."
                  : isSpinningCarousel
                    ? "No cards yet — add cards below. 4–12 cards works best for the carousel ring."
                    : "No products yet — add a product slot below, then assign an image."}
            </Text>
          )}
        </>
      )}

      {!isDecorative && !isWordScroll && !isWillemLoader && comp.slots.map((slot, idx) => (
        <Box key={slot.id} style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Group justify="space-between" style={{ padding: "6px 10px", background: "rgba(0,0,0,0.03)" }}>
            <Text fz="xs" fw={600} c="gray.6">{slotLabel(idx)}</Text>
            <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeSlot(slot.id)}>
              <IconTrash size={10} />
            </ActionIcon>
          </Group>

          {slot.src ? (
            <Box style={{ position: "relative", height: 100, cursor: "pointer" }} onClick={() => setSlotSrc(slot.id, "")}>
              <img src={slot.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <Box style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.45)"; (e.currentTarget.firstElementChild as HTMLElement | null)!.style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)"; (e.currentTarget.firstElementChild as HTMLElement | null)!.style.opacity = "0"; }}>
                <Text fz="xs" c="white" fw={700} style={{ opacity: 0, transition: "opacity 0.15s" }}>Click to remove</Text>
              </Box>
            </Box>
          ) : (
            <Box style={{ padding: 8 }}>
              {imageAssets.length === 0 ? (
                <Text fz="xs" c="gray.4" ta="center" py={8}>Upload images via the Assets tab first.</Text>
              ) : (
                <>
                  <Text fz="10px" c="gray.4" mb={6}>Click an image to assign it to this {isBookFlip ? "page" : "product"}:</Text>
                  <SimpleGrid cols={3} spacing={4}>
                    {imageAssets.map((asset) => (
                      <Box key={asset.id} style={{ aspectRatio: "1", borderRadius: 4, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(0,0,0,0.1)" }}
                        onClick={() => setSlotSrc(slot.id, asset.src)}>
                        <img src={asset.thumbnailSrc ?? asset.src} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </Box>
                    ))}
                  </SimpleGrid>
                </>
              )}
            </Box>
          )}
        </Box>
      ))}

      {!isDecorative && !isWordScroll && !isWillemLoader && (
        <Button size="xs" variant="light" color="indigo" fullWidth
          onClick={isBookFlip ? addSpread : addSlot}
          leftSection={<IconPlus size={12} />}>
          {isBookFlip ? "Add Spread" : isIconParade ? "Add Icon" : isSpinningCarousel ? "Add Card" : "Add Product"}
        </Button>
      )}
    </Stack>
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

export function ElementInspector({ selectedSceneId, selectedElement, project, onUpdateElement, onDispatchOperation, onDelete, textSelectionRange }: ElementInspectorProps) {
  const [showDimensions, setShowDimensions] = useState(false);
  const [motionPresets, setMotionPresets] = useState<MotionPresetSummary[]>([]);
  const [newPresetName, setNewPresetName] = useState("");

  const loadMotionPresets = useCallback(() => {
    apiFetch("/api/v1/motion-presets")
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((list: unknown) => { if (Array.isArray(list)) setMotionPresets(list as MotionPresetSummary[]); })
      .catch(() => { /* API unavailable — motion preset picker stays empty */ });
  }, []);

  useEffect(() => { loadMotionPresets(); }, [loadMotionPresets]);

  async function saveCurrentAnimationsAsPreset() {
    const name = newPresetName.trim();
    if (!name || selectedElement.animations.length === 0) return;
    const res = await apiFetch("/api/v1/motion-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, animations: selectedElement.animations }),
    });
    if (res.ok) {
      setNewPresetName("");
      loadMotionPresets();
    }
  }
  const hasGeneratedTextAnimation = selectedElement.type === "text" && (selectedElement.animations ?? []).some(
    (a) => a.type === "count_up" || a.type === "count_down" || a.type === "text_cycle"
  );

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
    // color goes to element.style always so the Pixi base-fill stays current,
    // PLUS to spans when there is a selection so per-span overrides work too.
    const SPAN_ONLY = ["fontWeight", "fontStyle", "textStroke", "textGradient"] as const;
    const ELEM_ONLY = ["fontFamily", "fontSize", "letterSpacing", "lineHeight", "textTransform",
                       "textShadow", "textStroke", "textGradient", "color"] as const;

    const isSpanOnly = SPAN_ONLY.some((k) => k in styleOverride);
    const isElemProp = ELEM_ONLY.some((k) => k in styleOverride)
      || "fontFamily" in styleOverride || "fontSize" in styleOverride;

    if (isElemProp) {
      let patch: ElementPatch = { style: styleOverride };
      if ("fontSize" in styleOverride && typeof styleOverride.fontSize === "number" && !selectedElement.layout.locked) {
        const oldSize = selectedElement.style.fontSize ?? 70;
        const scale = styleOverride.fontSize / oldSize;
        if (scale !== 1) {
          patch = {
            ...patch,
            layout: {
              height: Math.round(selectedElement.layout.height * scale),
            }
          };
        }
      }
      onUpdateElement(selectedSceneId, selectedElement.id, patch);
    }
    if (isSpanOnly && (hasSelection || lastSelectionRef.current)) {
      applySpanStyle(styleOverride);
    } else if (isSpanOnly && !isElemProp) {
      onUpdateElement(selectedSceneId, selectedElement.id, { style: styleOverride });
    }
  }

  function updateStyle(patch: Partial<import("@kwikk/shared-types").StyleProps>) {
    onUpdateElement(selectedSceneId, selectedElement.id, { style: patch });
  }

  return (
    <Stack gap="md" pt={4}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Badge variant="light" color="orange" size="sm" style={{ flexShrink: 0 }}>{selectedElement.type}</Badge>
          <input
            data-testid="text-label"
            value={selectedElement.content?.label ?? selectedElement.semanticRole ?? ""}
            placeholder={selectedElement.semanticRole ?? selectedElement.type}
            onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, label: e.target.value || undefined } })}
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#374151", overflow: "hidden", textOverflow: "ellipsis" }}
          />
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

          {/* ── Content ── */}
          <InspectorField
            label="Text"
            input={
              <Textarea
                data-testid="text-content"
                autosize
                minRows={2}
                value={selectedElement.content?.text ?? ""}
                disabled={hasGeneratedTextAnimation}
                description={hasGeneratedTextAnimation ? "This text is generated by its animation." : undefined}
                placeholder={hasGeneratedTextAnimation ? "Managed by animation" : undefined}
                onChange={(e) => {
                  const text = e.currentTarget.value;
                  onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, text, richText: undefined } });
                }}
              />
            }
          />

          {/* ── Subtitle Effects ── */}
          <Divider color="rgba(0,0,0,0.08)" />
          <Stack gap={6}>
            <Group gap={6}>
              <IconSparkles size={14} color="#7c3aed" />
              <Text fz="xs" fw={700} c="violet.6" tt="uppercase" lts="0.06em">Subtitle Styles</Text>
            </Group>
            <Text fz={10} c="gray.5" lh={1.4}>Apply a word-reveal style. Replaces existing animations on this element.</Text>
            <SimpleGrid cols={2} spacing={4}>
              {SUBTITLE_PRESETS.map((preset) => (
                <Tooltip key={preset.key} label={preset.description} position="top" withArrow fz={10} multiline w={180}>
                  <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    justify="left"
                    fullWidth
                    style={{ height: "auto", padding: "6px 8px", whiteSpace: "normal" }}
                    onClick={() => {
                      const text = selectedElement.content?.text ?? "";
                      if (!text.trim()) return;
                      const selectedScene = project.scenes.find((s) => s.id === selectedSceneId);
                      const { richText, animation } = buildSubtitlePreset(text, preset.key, selectedScene?.durationMs ?? 5000);
                      onDispatchOperation({
                        operation: "patch_element",
                        sceneId: selectedSceneId,
                        elementId: selectedElement.id,
                        patch: {
                          content: { ...selectedElement.content, richText },
                          animations: [animation],
                        },
                      });
                    }}
                  >
                    <Stack gap={1} align="flex-start">
                      <Text fz="xs" fw={600}>{preset.emoji} {preset.label}</Text>
                    </Stack>
                  </Button>
                </Tooltip>
              ))}
            </SimpleGrid>
            {selectedElement.content?.richText && selectedElement.content.richText.length > 0 && (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => onDispatchOperation({
                  operation: "patch_element",
                  sceneId: selectedSceneId,
                  elementId: selectedElement.id,
                  patch: { content: { ...selectedElement.content, richText: undefined } },
                })}
              >
                Clear subtitle styling
              </Button>
            )}
          </Stack>

          {/* ── Font ── */}
          <InspectorField
            label="Font"
            input={
              <FontPicker
                value={selectedElement.style.fontFamily ?? "Inter"}
                onChange={(v) => applyTextStyle({ fontFamily: v })}
                previewText={selectedElement.content?.text?.slice(0, 12) || "Aa 123"}
              />
            }
          />
          <InspectorField
            label="Size"
            input={
              <NumberInput
                data-testid="text-font-size"
                min={70}
                max={400}
                value={selectedElement.style.fontSize ?? 70}
                onChange={(v) => applyTextStyle({ fontSize: toNumber(v, selectedElement.style.fontSize ?? 70) })}
              />
            }
          />

          {/* ── Weight / style / transform ── */}
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Weight"
              input={
                <Select
                  data={[
                    { value: "300", label: "Light" },
                    { value: "400", label: "Regular" },
                    { value: "500", label: "Medium" },
                    { value: "600", label: "Semibold" },
                    { value: "700", label: "Bold" },
                    { value: "800", label: "Extrabold" },
                    { value: "900", label: "Black" },
                  ]}
                  value={String(selectedElement.style.fontWeight ?? 400)}
                  onChange={(v) => applyTextStyle({ fontWeight: Number(v ?? 400) })}
                />
              }
            />
            <InspectorField
              label="Transform"
              input={
                <Select
                  data={[
                    { value: "none", label: "None" },
                    { value: "uppercase", label: "UPPER" },
                    { value: "lowercase", label: "lower" },
                    { value: "capitalize", label: "Capitalize" },
                  ]}
                  data-testid="text-transform"
                  value={selectedElement.style.textTransform ?? "none"}
                  onChange={(v) => updateStyle({ textTransform: (v ?? "none") as any })}
                />
              }
            />
          </SimpleGrid>

          {/* ── Color / BG ── */}
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Color"
              input={
                <SwatchPicker
                  testId="text-color"
                  value={selectedElement.style.color ?? "#f8fafc"}
                  onChange={(v) => applyTextStyle({ color: v })}
                />
              }
            />
            <InspectorField
              label="BG"
              input={
                <SwatchPicker
                  testId="text-bg"
                  allowNone
                  value={selectedElement.style.backgroundColor ?? ""}
                  onChange={(v) => updateStyle({ backgroundColor: v })}
                />
              }
            />
          </SimpleGrid>

          {/* ── Align ── */}
          <InspectorField
            label="Align"
            input={
              <SegmentedControl
                data={[
                  { value: "left", label: <IconAlignLeft size={16} /> },
                  { value: "center", label: <IconAlignCenter size={16} /> },
                  { value: "right", label: <IconAlignRight size={16} /> },
                  { value: "justify", label: <IconAlignJustified size={16} /> },
                ]}
                value={selectedElement.style.textAlign || "left"}
                onChange={(value) => updateStyle({ textAlign: value })}
              />
            }
          />

          {/* ── Spacing ── */}
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField
              label="Letter Spc"
              input={
                <NumberInput
                  min={-10}
                  max={60}
                  step={0.5}
                  decimalScale={1}
                  value={selectedElement.style.letterSpacing ?? 0}
                  onChange={(v) => updateStyle({ letterSpacing: toNumber(v, 0) })}
                />
              }
            />
            <InspectorField
              label="Line Height"
              input={
                <NumberInput
                  min={0.5}
                  max={3}
                  step={0.05}
                  decimalScale={2}
                  value={selectedElement.style.lineHeight ?? 1}
                  onChange={(v) => updateStyle({ lineHeight: toNumber(v, 1) })}
                />
              }
            />
          </SimpleGrid>

          {/* ── Italic ── */}
          <Switch
              data-testid="text-italic"
            size="xs"
            checked={(selectedElement.style.fontStyle ?? "normal") === "italic"}
            onChange={(e) => applyTextStyle({ fontStyle: e.currentTarget.checked ? "italic" : "normal" })}
          />

          <Divider color="rgba(0,0,0,0.08)" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Effects</Text>

          {/* ── Shadow ── */}
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Shadow</Text>
              <Switch
                data-testid="text-shadow-toggle"
                size="xs"
                checked={!!selectedElement.style.textShadow}
                onChange={(e) =>
                  updateStyle({
                    textShadow: e.currentTarget.checked
                      ? { offsetX: 2, offsetY: 4, blur: 12, color: "#000000", alpha: 0.45 }
                      : undefined
                  })
                }
              />
            </Group>
            {selectedElement.style.textShadow && (
              <SimpleGrid cols={2} spacing={4}>
                <InspectorField
                  label="Color"
                  input={
                    <SwatchPicker
                      testId="text-shadow-color"
                      value={selectedElement.style.textShadow.color}
                      onChange={(v) => updateStyle({ textShadow: { ...selectedElement.style.textShadow!, color: v } })}
                    />
                  }
                />
                <InspectorField
                  label="Blur"
                  input={
                    <NumberInput
                      data-testid="text-shadow-blur"
                      min={0}
                      max={60}
                      value={selectedElement.style.textShadow.blur}
                      onChange={(v) => updateStyle({ textShadow: { ...selectedElement.style.textShadow!, blur: toNumber(v, 8) } })}
                    />
                  }
                />
                <InspectorField
                  label="Offset X"
                  input={
                    <NumberInput
                      min={-40}
                      max={40}
                      value={selectedElement.style.textShadow.offsetX}
                      onChange={(v) => updateStyle({ textShadow: { ...selectedElement.style.textShadow!, offsetX: toNumber(v, 0) } })}
                    />
                  }
                />
                <InspectorField
                  label="Offset Y"
                  input={
                    <NumberInput
                      min={-40}
                      max={40}
                      value={selectedElement.style.textShadow.offsetY}
                      onChange={(v) => updateStyle({ textShadow: { ...selectedElement.style.textShadow!, offsetY: toNumber(v, 4) } })}
                    />
                  }
                />
              </SimpleGrid>
            )}
          </Stack>

          {/* ── Stroke ── */}
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Stroke</Text>
              <Switch
                data-testid="text-stroke-toggle"
                size="xs"
                checked={!!selectedElement.style.textStroke}
                onChange={(e) =>
                  updateStyle({
                    textStroke: e.currentTarget.checked
                      ? { color: "#ffffff", width: 2 }
                      : undefined
                  })
                }
              />
            </Group>
            {selectedElement.style.textStroke && (
              <SimpleGrid cols={2} spacing={4}>
                <InspectorField
                  label="Color"
                  input={
                    <SwatchPicker
                      value={selectedElement.style.textStroke.color}
                      onChange={(v) => updateStyle({ textStroke: { ...selectedElement.style.textStroke!, color: v } })}
                    />
                  }
                />
                <InspectorField
                  label="Width"
                  input={
                    <NumberInput
                      data-testid="text-stroke-width"
                      min={1}
                      max={24}
                      value={selectedElement.style.textStroke.width}
                      onChange={(v) => updateStyle({ textStroke: { ...selectedElement.style.textStroke!, width: toNumber(v, 2) } })}
                    />
                  }
                />
              </SimpleGrid>
            )}
          </Stack>

          {/* ── Gradient ── */}
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Gradient Fill</Text>
              <Switch
                data-testid="text-gradient-toggle"
                size="xs"
                checked={!!selectedElement.style.textGradient}
                onChange={(e) =>
                  updateStyle({
                    textGradient: e.currentTarget.checked
                      ? {
                          type: "linear",
                          angle: 90,
                          stops: [
                            { offset: 0, color: "#f97316" },
                            { offset: 1, color: "#6366f1" },
                          ],
                        }
                      : undefined
                  })
                }
              />
            </Group>
            {selectedElement.style.textGradient && (
              <SimpleGrid cols={2} spacing={4}>
                <InspectorField
                  label="From"
                  input={
                    <SwatchPicker
                      value={selectedElement.style.textGradient.stops[0]?.color ?? "#f97316"}
                      onChange={(v) =>
                        updateStyle({
                          textGradient: {
                            ...selectedElement.style.textGradient!,
                            stops: [
                              { offset: 0, color: v },
                              selectedElement.style.textGradient!.stops[1] ?? { offset: 1, color: "#6366f1" },
                            ],
                          },
                        })
                      }
                    />
                  }
                />
                <InspectorField
                  label="To"
                  input={
                    <SwatchPicker
                      value={selectedElement.style.textGradient.stops[1]?.color ?? "#6366f1"}
                      onChange={(v) =>
                        updateStyle({
                          textGradient: {
                            ...selectedElement.style.textGradient!,
                            stops: [
                              selectedElement.style.textGradient!.stops[0] ?? { offset: 0, color: "#f97316" },
                              { offset: 1, color: v },
                            ],
                          },
                        })
                      }
                    />
                  }
                />
                <InspectorField
                  label="Angle"
                  input={
                    <NumberInput
                      data-testid="text-gradient-angle"
                      min={0}
                      max={360}
                      value={selectedElement.style.textGradient.angle}
                      onChange={(v) => updateStyle({ textGradient: { ...selectedElement.style.textGradient!, angle: toNumber(v, 90) } })}
                    />
                  }
                />
              </SimpleGrid>
            )}
          </Stack>
        </>
      )}

      {selectedElement.type === "text" && (
        <>
          <Divider color="rgba(0,0,0,0.08)" />
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Curve</Text>
              <Switch
                data-testid="text-curve-toggle"
                size="xs"
                checked={!!selectedElement.content?.textCurve}
                onChange={(e) => onDispatchOperation({
                  operation: "patch_element",
                  sceneId: selectedSceneId,
                  elementId: selectedElement.id,
                  patch: { content: { ...selectedElement.content, textCurve: e.currentTarget.checked ? { type: "arc", radius: 300 } : undefined } }
                })}
              />
            </Group>
            {selectedElement.content?.textCurve && (
              <Stack gap={4}>
                <InspectorField
                  label="Type"
                  input={
                    <Select size="xs"
                      data-testid="text-curve-type"
                      value={selectedElement.content.textCurve.type}
                      data={[{ value: "arc", label: "Arc" }, { value: "wave", label: "Wave" }]}
                      onChange={(v) => onDispatchOperation({ operation: "patch_element", sceneId: selectedSceneId, elementId: selectedElement.id, patch: { content: { ...selectedElement.content, textCurve: { ...selectedElement.content!.textCurve!, type: (v ?? "arc") as "arc" | "wave" } } } })}
                    />
                  }
                />
                {selectedElement.content.textCurve.type === "arc" && (
                  <SimpleGrid cols={2} spacing={4}>
                    <InspectorField label="Radius" input={<NumberInput data-testid="text-curve-radius" size="xs" min={50} max={2000} step={25} value={selectedElement.content.textCurve.radius ?? 300} onChange={(v) => onDispatchOperation({ operation: "patch_element", sceneId: selectedSceneId, elementId: selectedElement.id, patch: { content: { ...selectedElement.content, textCurve: { ...selectedElement.content!.textCurve!, radius: toNumber(v, 300) } } } })} />} />
                    <InspectorField label="Reversed" input={<Switch size="xs" checked={!!selectedElement.content.textCurve.reversed} onChange={(e) => onDispatchOperation({ operation: "patch_element", sceneId: selectedSceneId, elementId: selectedElement.id, patch: { content: { ...selectedElement.content, textCurve: { ...selectedElement.content!.textCurve!, reversed: e.currentTarget.checked } } } })} />} />
                  </SimpleGrid>
                )}
                {selectedElement.content.textCurve.type === "wave" && (
                  <SimpleGrid cols={2} spacing={4}>
                    <InspectorField label="Amplitude" input={<NumberInput size="xs" min={0} max={200} step={5} value={selectedElement.content.textCurve.amplitude ?? 20} onChange={(v) => onDispatchOperation({ operation: "patch_element", sceneId: selectedSceneId, elementId: selectedElement.id, patch: { content: { ...selectedElement.content, textCurve: { ...selectedElement.content!.textCurve!, amplitude: toNumber(v, 20) } } } })} />} />
                    <InspectorField label="Frequency" input={<NumberInput size="xs" min={0.5} max={10} step={0.5} decimalScale={1} value={selectedElement.content.textCurve.frequency ?? 1} onChange={(v) => onDispatchOperation({ operation: "patch_element", sceneId: selectedSceneId, elementId: selectedElement.id, patch: { content: { ...selectedElement.content, textCurve: { ...selectedElement.content!.textCurve!, frequency: toNumber(v, 1) } } } })} />} />
                  </SimpleGrid>
                )}
              </Stack>
            )}
          </Stack>
        </>
      )}

      {selectedElement.type === "text" && (
        <>
          <Divider color="rgba(0,0,0,0.08)" />
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Text Effect</Text>
              <Switch
                data-testid="text-effect-toggle"
                size="xs"
                checked={!!selectedElement.style.textEffect}
                onChange={(e) => updateStyle({ textEffect: e.currentTarget.checked ? "glow" : undefined })}
              />
            </Group>
            {selectedElement.style.textEffect && (
              <Stack gap={4}>
                <InspectorField
                  label="Style"
                  input={
                    <Select
                      data-testid="text-effect-style"
                      size="xs"
                      value={selectedElement.style.textEffect}
                      data={[
                        { value: "glow",    label: "Glow" },
                        { value: "neon",    label: "Neon" },
                        { value: "hollow",  label: "Hollow" },
                        { value: "echo",    label: "Echo" },
                        { value: "outline", label: "Outline" },
                        { value: "retro",   label: "Retro" },
                        { value: "scifi",   label: "Sci-Fi" },
                        { value: "western", label: "Western" },
                        { value: "arcade",  label: "Arcade" },
                        { value: "pixel",   label: "Pixel" },
                        { value: "cosmic",  label: "Cosmic" },
                      ]}
                      onChange={(v) => v && updateStyle({ textEffect: v as any })}
                    />
                  }
                />
                <SimpleGrid cols={2} spacing={4}>
                  <InspectorField
                    label="Color"
                    input={
                      <SwatchPicker
                        value={selectedElement.style.textEffectColor ?? "#ffffff"}
                        onChange={(v) => updateStyle({ textEffectColor: v })}
                      />
                    }
                  />
                  <InspectorField
                    label="Intensity"
                    input={
                      <Slider
                        data-testid="text-effect-intensity"
                        min={0} max={1} step={0.05}
                        value={selectedElement.style.textEffectIntensity ?? 0.7}
                        onChange={(v) => updateStyle({ textEffectIntensity: v })}
                        size="xs"
                        color="violet"
                      />
                    }
                  />
                </SimpleGrid>
              </Stack>
            )}
          </Stack>
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

      {selectedElement.type === "video" && (
        <VideoInspector
          selectedSceneId={selectedSceneId}
          selectedElement={selectedElement}
          onDispatchOperation={onDispatchOperation}
        />
      )}

      {selectedElement.type === "shape" && selectedElement.content?.shape === "line" && (
        <>
          <Divider color="rgba(0,0,0,0.08)" />
          <Stack gap="xs">
            <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Line</Text>
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="Color"
                input={
                  <SwatchPicker
                    value={selectedElement.content?.lineColor ?? selectedElement.style.backgroundColor ?? "#4f46e5"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, lineColor: v }, style: { backgroundColor: v } })}
                  />
                }
              />
              <InspectorField
                label="Width"
                input={
                  <NumberInput
                    min={1}
                    max={80}
                    value={selectedElement.content?.lineWidth ?? 6}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, lineWidth: toNumber(v, 6) } })}
                  />
                }
              />
            </SimpleGrid>
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="Style"
                input={
                  <Select
                    data={[
                      { value: "solid",  label: "Solid"  },
                      { value: "dashed", label: "Dashed" },
                      { value: "dotted", label: "Dotted" },
                      { value: "double", label: "Double" },
                      { value: "zigzag", label: "Zigzag" },
                      { value: "wavy",   label: "Wavy"   },
                    ]}
                    value={selectedElement.content?.lineStyle ?? "solid"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, lineStyle: (v ?? "solid") as any } })}
                  />
                }
              />
              <InspectorField
                label="Cap"
                input={
                  <Select
                    data={[
                      { value: "round",  label: "Round"  },
                      { value: "square", label: "Square" },
                      { value: "butt",   label: "Butt"   },
                    ]}
                    value={selectedElement.content?.lineCap ?? "round"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, lineCap: (v ?? "round") as any } })}
                  />
                }
              />
            </SimpleGrid>
            <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em" mt={4}>Arrow heads</Text>
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="Start"
                input={
                  <Select
                    data={[
                      { value: "none",       label: "None"       },
                      { value: "arrow",      label: "Arrow"      },
                      { value: "open_arrow", label: "Open arrow" },
                      { value: "circle",     label: "Circle"     },
                      { value: "square",     label: "Square"     },
                      { value: "diamond",    label: "Diamond"    },
                    ]}
                    value={selectedElement.content?.arrowStart ?? "none"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, arrowStart: (v ?? "none") as any } })}
                  />
                }
              />
              <InspectorField
                label="End"
                input={
                  <Select
                    data={[
                      { value: "none",       label: "None"       },
                      { value: "arrow",      label: "Arrow"      },
                      { value: "open_arrow", label: "Open arrow" },
                      { value: "circle",     label: "Circle"     },
                      { value: "square",     label: "Square"     },
                      { value: "diamond",    label: "Diamond"    },
                    ]}
                    value={selectedElement.content?.arrowEnd ?? "none"}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, arrowEnd: (v ?? "none") as any } })}
                  />
                }
              />
            </SimpleGrid>
            {(selectedElement.content?.arrowStart !== "none" || selectedElement.content?.arrowEnd !== "none") && (
              <InspectorField
                label="Head size"
                input={
                  <NumberInput
                    min={6}
                    max={80}
                    value={selectedElement.content?.arrowSize ?? 24}
                    onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { content: { ...selectedElement.content, arrowSize: toNumber(v, 24) } })}
                  />
                }
              />
            )}
          </Stack>
        </>
      )}

      {selectedElement.type === "shape" && selectedElement.content?.shape !== "line" && (
        <>
          <Divider color="rgba(0,0,0,0.08)" />
          <Stack gap="xs">
            <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Appearance</Text>
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="Fill"
                input={
                  <SwatchPicker
                    allowNone
                    value={selectedElement.style.backgroundColor ?? ""}
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
                      { value: "hollow", label: "Hollow" },
                      { value: "gradient", label: "Gradient" },
                      { value: "stripes", label: "Stripes" },
                      { value: "dots", label: "Dots" },
                      { value: "grid", label: "Grid" },
                      { value: "image", label: "Image" },
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
            {selectedElement.style.fillPattern === "image" && (
              <InspectorField
                label="Image URL"
                input={
                  <TextInput
                    size="xs"
                    placeholder="https://..."
                    value={selectedElement.content?.fillImageSrc ?? ""}
                    onChange={(e) => onDispatchOperation({
                      operation: "patch_element",
                      sceneId: selectedSceneId,
                      elementId: selectedElement.id,
                      patch: { content: { ...selectedElement.content, fillImageSrc: e.currentTarget.value || undefined } }
                    })}
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

            {/* Shape Glow */}
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Glow</Text>
              <Switch
                size="xs"
                checked={!!selectedElement.style.filters?.glow}
                onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, {
                  style: {
                    filters: {
                      ...selectedElement.style.filters,
                      glow: e.currentTarget.checked
                        ? { color: "#ffffff", blur: 12, strength: 1 }
                        : undefined
                    }
                  }
                })}
              />
            </Group>
            {selectedElement.style.filters?.glow && (
              <SimpleGrid cols={3} spacing={4}>
                <InspectorField
                  label="Color"
                  input={
                    <SwatchPicker
                      value={selectedElement.style.filters.glow.color}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, glow: { ...selectedElement.style.filters!.glow!, color: v } } }
                      })}
                    />
                  }
                />
                <InspectorField
                  label="Blur"
                  input={
                    <NumberInput size="xs" min={1} max={60} step={1}
                      value={selectedElement.style.filters.glow.blur}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, glow: { ...selectedElement.style.filters!.glow!, blur: toNumber(v, 12) } } }
                      })}
                    />
                  }
                />
                <InspectorField
                  label="Strength"
                  input={
                    <NumberInput size="xs" min={0.1} max={5} step={0.1} decimalScale={1}
                      value={selectedElement.style.filters.glow.strength}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, glow: { ...selectedElement.style.filters!.glow!, strength: toNumber(v, 1) } } }
                      })}
                    />
                  }
                />
              </SimpleGrid>
            )}

            {/* Shape Drop Shadow */}
            <Group justify="space-between">
              <Text fz="xs" c="gray.6" fw={500}>Shadow</Text>
              <Switch
                size="xs"
                checked={!!selectedElement.style.filters?.dropShadow}
                onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, {
                  style: {
                    filters: {
                      ...selectedElement.style.filters,
                      dropShadow: e.currentTarget.checked
                        ? { color: "#000000", blur: 8, alpha: 0.5, offsetX: 4, offsetY: 4 }
                        : undefined
                    }
                  }
                })}
              />
            </Group>
            {selectedElement.style.filters?.dropShadow && (
              <SimpleGrid cols={2} spacing={4}>
                <InspectorField
                  label="Color"
                  input={
                    <SwatchPicker
                      value={selectedElement.style.filters.dropShadow.color}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, dropShadow: { ...selectedElement.style.filters!.dropShadow!, color: v } } }
                      })}
                    />
                  }
                />
                <InspectorField
                  label="Alpha"
                  input={
                    <Slider min={0} max={1} step={0.05} size="xs"
                      value={selectedElement.style.filters.dropShadow.alpha}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, dropShadow: { ...selectedElement.style.filters!.dropShadow!, alpha: v } } }
                      })}
                    />
                  }
                />
                <InspectorField
                  label="Blur"
                  input={
                    <NumberInput size="xs" min={0} max={40} step={1}
                      value={selectedElement.style.filters.dropShadow.blur}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, dropShadow: { ...selectedElement.style.filters!.dropShadow!, blur: toNumber(v, 8) } } }
                      })}
                    />
                  }
                />
                <InspectorField
                  label="Offset X"
                  input={
                    <NumberInput size="xs" min={-40} max={40} step={1}
                      value={selectedElement.style.filters.dropShadow.offsetX}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, dropShadow: { ...selectedElement.style.filters!.dropShadow!, offsetX: toNumber(v, 4) } } }
                      })}
                    />
                  }
                />
                <InspectorField
                  label="Offset Y"
                  input={
                    <NumberInput size="xs" min={-40} max={40} step={1}
                      value={selectedElement.style.filters.dropShadow.offsetY}
                      onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, {
                        style: { filters: { ...selectedElement.style.filters, dropShadow: { ...selectedElement.style.filters!.dropShadow!, offsetY: toNumber(v, 4) } } }
                      })}
                    />
                  }
                />
              </SimpleGrid>
            )}
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
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              title="Duplicate"
              onClick={() =>
                onDispatchOperation({
                  operation: "duplicate_element",
                  sceneId: selectedSceneId,
                  elementId: selectedElement.id,
                  newElementId: crypto.randomUUID()
                })
              }
            >
              <IconCopy size={12} />
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
        <InspectorField label="Layer order" input={
          <Group gap={4}>
            {(() => {
              const scene = project.scenes.find((s) => s.id === selectedSceneId);
              const allEls = [...(scene?.elements ?? [])].sort((a, b) => (a.layout.zIndex ?? 0) - (b.layout.zIndex ?? 0));
              const idx = allEls.findIndex((e) => e.id === selectedElement.id);
              const isTop = idx >= allEls.length - 1;
              const isBottom = idx <= 0;

              function bringToFront() {
                const maxZ = Math.max(...allEls.map((e) => e.layout.zIndex ?? 0));
                onUpdateElement(selectedSceneId, selectedElement.id, { layout: { zIndex: maxZ + 1 } });
              }
              function bringForward() {
                if (isTop) return;
                const thisZ = selectedElement.layout.zIndex ?? 0;
                const nextEl = allEls[idx + 1];
                const nextZ = nextEl.layout.zIndex ?? 0;
                if (thisZ === nextZ) {
                  onUpdateElement(selectedSceneId, selectedElement.id, { layout: { zIndex: thisZ + 1 } });
                } else {
                  onUpdateElement(selectedSceneId, selectedElement.id, { layout: { zIndex: nextZ } });
                  onUpdateElement(selectedSceneId, nextEl.id, { layout: { zIndex: thisZ } });
                }
              }
              function sendBackward() {
                if (isBottom) return;
                const thisZ = selectedElement.layout.zIndex ?? 0;
                const prevEl = allEls[idx - 1];
                const prevZ = prevEl.layout.zIndex ?? 0;
                if (thisZ === prevZ) {
                  onUpdateElement(selectedSceneId, prevEl.id, { layout: { zIndex: prevZ + 1 } });
                } else {
                  onUpdateElement(selectedSceneId, selectedElement.id, { layout: { zIndex: prevZ } });
                  onUpdateElement(selectedSceneId, prevEl.id, { layout: { zIndex: thisZ } });
                }
              }
              function sendToBack() {
                const minZ = Math.min(...allEls.map((e) => e.layout.zIndex ?? 0));
                onUpdateElement(selectedSceneId, selectedElement.id, { layout: { zIndex: minZ - 1 } });
              }

              return (<>
                <Tooltip label="Send to back"><ActionIcon size="sm" variant="default" disabled={isBottom || selectedElement.layout.locked} onClick={sendToBack}><IconArrowBarToDown size={13} /></ActionIcon></Tooltip>
                <Tooltip label="Send backward"><ActionIcon size="sm" variant="default" disabled={isBottom || selectedElement.layout.locked} onClick={sendBackward}><IconArrowDown size={13} /></ActionIcon></Tooltip>
                <Tooltip label="Bring forward"><ActionIcon size="sm" variant="default" disabled={isTop || selectedElement.layout.locked} onClick={bringForward}><IconArrowUp size={13} /></ActionIcon></Tooltip>
                <Tooltip label="Bring to front"><ActionIcon size="sm" variant="default" disabled={isTop || selectedElement.layout.locked} onClick={bringToFront}><IconArrowBarToUp size={13} /></ActionIcon></Tooltip>
              </>);
            })()}
          </Group>
        } />
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
        <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Custom CSS</Text>
        <Textarea
          data-testid="element-custom-css"
          size="xs"
          placeholder={`.my-el {\n  animation: spin 2s linear infinite;\n}\n@keyframes spin { to { transform: rotate(360deg); } }`}
          autosize
          minRows={3}
          maxRows={10}
          styles={{ input: { fontFamily: "monospace", fontSize: 11 } }}
          value={selectedElement.style.customCSS ?? ""}
          onChange={(e) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { customCSS: e.currentTarget.value || undefined } })}
        />
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      <Stack gap="xs">
        <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Motion Preset</Text>
        <InspectorField
          label="Preset"
          input={
            <Select
              data-testid="motion-preset"
              data={motionPresets.map((p) => ({ value: String(p.id), label: p.name }))}
              value={String(motionPresets.find((p) => p.name === selectedElement.motionPreset)?.id ?? "") || null}
              placeholder={motionPresets.length ? "Choose preset" : "No saved presets yet"}
              onChange={(v) => {
                const preset = motionPresets.find((p) => String(p.id) === v);
                if (preset) applyMotionPreset(onDispatchOperation, preset, selectedSceneId, selectedElement.id);
              }}
            />
          }
        />
        <Group gap={6} wrap="nowrap">
          <input
            data-testid="motion-preset-name"
            placeholder="Save current animations as…"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.currentTarget.value)}
            style={{ flex: 1, fontSize: 11, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)" }}
            disabled={selectedElement.animations.length === 0}
          />
          <Button
            data-testid="save-motion-preset"
            size="xs"
            variant="light"
            disabled={!newPresetName.trim() || selectedElement.animations.length === 0}
            onClick={saveCurrentAnimationsAsPreset}
          >
            Save
          </Button>
        </Group>
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      <Stack gap="xs">
        <Group justify="space-between">
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Animations</Text>
          <Button
            variant="light"
            color="teal"
            size="compact-xs"
            leftSection={<IconPlus size={11} />}
            onClick={() => {
              const anims = selectedElement.animations ?? [];
              const lastEnd = anims.reduce((max, a) => Math.max(max, a.startMs + a.durationMs), 0);
              const startMs = anims.length > 0 ? lastEnd : 0;
              onDispatchOperation({
                operation: "add_animation",
                sceneId: selectedSceneId,
                elementId: selectedElement.id,
                animation: { id: `anim_${Math.random().toString(36).slice(2, 9)}`, type: "fadeIn", startMs, durationMs: 500, easing: "easeOut" }
              });
            }}
          >
            Add
          </Button>
        </Group>
        {selectedElement.type === "text" && (
          <SimpleGrid cols={2} spacing={6}>
            <Button
              size="compact-xs"
              variant="subtle"
              color="teal"
              onClick={() =>
                {
                  onDispatchOperation({
                    operation: "patch_element",
                    sceneId: selectedSceneId,
                    elementId: selectedElement.id,
                    patch: { content: { ...selectedElement.content, text: "", richText: undefined } }
                  });
                  onDispatchOperation({
                    operation: "add_animation",
                    sceneId: selectedSceneId,
                    elementId: selectedElement.id,
                    animation: {
                      id: `anim_${Math.random().toString(36).slice(2, 9)}`,
                      type: "count_up",
                      startMs: 0,
                      durationMs: 1500,
                      easing: "easeOut",
                      fromValue: 1,
                      toValue: 100,
                    }
                  });
                }
              }
            >
              Counter 1→100
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              color="violet"
              onClick={() =>
                {
                  onDispatchOperation({
                    operation: "patch_element",
                    sceneId: selectedSceneId,
                    elementId: selectedElement.id,
                    patch: { content: { ...selectedElement.content, text: "", richText: undefined } }
                  });
                  onDispatchOperation({
                    operation: "add_animation",
                    sceneId: selectedSceneId,
                    elementId: selectedElement.id,
                    animation: {
                      id: `anim_${Math.random().toString(36).slice(2, 9)}`,
                      type: "text_cycle",
                      startMs: 0,
                      durationMs: 2000,
                      easing: "easeInOut",
                      textItems: ["Queued", "Processing", "Reviewing", "Done"],
                    }
                  });
                }
              }
            >
              Status Cycle
            </Button>
          </SimpleGrid>
        )}
        <Stack gap={4}>
          {(selectedElement.animations ?? []).map((a, i) => (
            <AnimationRow
              key={a.id}
              animation={a}
              index={i}
              totalAnimations={(selectedElement.animations ?? []).length}
              elementType={selectedElement.type}
              sceneId={selectedSceneId}
              elementId={selectedElement.id}
              onDispatch={onDispatchOperation}
            />
          ))}
          {(selectedElement.animations ?? []).length === 0 && (
            <Text c="gray.6" fz="xs">No animations yet. Click Add to create one.</Text>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

interface AnimationRowProps {
  animation: Animation;
  index: number;
  totalAnimations: number;
  elementType: ElementNode["type"];
  sceneId: string;
  elementId: string;
  onDispatch: (op: EditorOperation) => void;
}

function AnimationRow({ animation, index, elementType, sceneId, elementId, onDispatch }: AnimationRowProps) {
  const textItemsValue = (animation.textItems ?? []).join("\n");
  const endMs = animation.startMs + animation.durationMs;
  const [gapMs, setGapMs] = useState(0);

  function addAfter() {
    onDispatch({
      operation: "add_animation",
      sceneId,
      elementId,
      animation: {
        id: `anim_${Math.random().toString(36).slice(2, 9)}`,
        type: "fadeIn",
        startMs: endMs + gapMs,
        durationMs: 500,
        easing: "easeOut",
      },
    });
  }

  return (
    <Stack gap={4} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}>
      <Group gap={4} wrap="nowrap">
        <Text fz={10} c="gray.5" fw={600} style={{ minWidth: 16 }}>#{index + 1}</Text>
        <Select
          size="xs"
          style={{ flex: 1 }}
          value={animation.type}
          data={ALL_ANIMATION_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(v) => v && onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { type: v as AnimationType } })}
        />
        <ActionIcon
          size="xs"
          color="red"
          variant="subtle"
          onClick={() => onDispatch({ operation: "delete_animation", sceneId, elementId, animationId: animation.id })}
        >
          <IconTrash size={11} />
        </ActionIcon>
      </Group>
      <SimpleGrid cols={2} spacing={4}>
        <InspectorField
          label="Start ms"
          input={
            <NumberInput size="xs" min={0} step={100} value={animation.startMs}
              onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { startMs: toNumber(v, 0) } })}
            />
          }
        />
        <InspectorField
          label="Duration ms"
          input={
            <NumberInput size="xs" min={50} step={100} value={animation.durationMs}
              onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { durationMs: toNumber(v, 500) } })}
            />
          }
        />
      </SimpleGrid>
      <InspectorField
        label="Easing"
        input={
          <Select
            size="xs"
            value={animation.easing ?? "linear"}
            data={EASING_OPTIONS}
            onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { easing: v ?? undefined } })}
          />
        }
      />
      {(animation.type === "bounceIn" || animation.type === "bounceOut" || animation.type === "bounce_letters" || animation.type === "burst" || animation.type === "stomp") && (
        <InspectorField
          label="Amplitude"
          input={
            <Slider min={0.05} max={0.95} step={0.05} value={animation.amplitude ?? 0.3}
              onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { amplitude: v } })}
              size="xs" color="orange"
            />
          }
        />
      )}
      {(animation.type === "blur_in" || animation.type === "blur_out") && (
        <InspectorField
          label="Max Blur px"
          input={
            <NumberInput size="xs" min={1} max={40} step={1} value={animation.amplitude ?? 12}
              onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { amplitude: toNumber(v, 12) } })}
            />
          }
        />
      )}
      {(animation.type === "slideUp" || animation.type === "slideDown" || animation.type === "slideLeft" || animation.type === "slideRight") && (
        <SimpleGrid cols={2} spacing={4}>
          <InspectorField
            label="From px"
            input={
              <NumberInput size="xs" step={10} value={typeof animation.fromOffset === "number" ? animation.fromOffset : (animation.type === "slideDown" || animation.type === "slideRight" ? -60 : 60)}
                onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { fromOffset: toNumber(v, 60) } })}
              />
            }
          />
          <InspectorField
            label="To px"
            input={
              <NumberInput size="xs" step={10} value={typeof animation.toOffset === "number" ? animation.toOffset : 0}
                onChange={(v) => onDispatch({ operation: "update_animation", sceneId, elementId, animationId: animation.id, patch: { toOffset: toNumber(v, 0) } })}
              />
            }
          />
        </SimpleGrid>
      )}
      {elementType === "text" && (animation.type === "count_up" || animation.type === "count_down") && (
        <SimpleGrid cols={2} spacing={4}>
          <InspectorField
            label="From"
            input={
              <NumberInput
                size="xs"
                step={1}
                value={animation.fromValue ?? (animation.type === "count_up" ? 0 : animation.toValue ?? 100)}
                onChange={(v) => onDispatch({
                  operation: "update_animation",
                  sceneId,
                  elementId,
                  animationId: animation.id,
                  patch: { fromValue: toNumber(v, animation.type === "count_up" ? 0 : 100) }
                })}
              />
            }
          />
          <InspectorField
            label="To"
            input={
              <NumberInput
                size="xs"
                step={1}
                value={animation.toValue ?? (animation.type === "count_up" ? 100 : 0)}
                onChange={(v) => onDispatch({
                  operation: "update_animation",
                  sceneId,
                  elementId,
                  animationId: animation.id,
                  patch: { toValue: toNumber(v, animation.type === "count_up" ? 100 : 0) }
                })}
              />
            }
          />
        </SimpleGrid>
      )}
      {elementType === "text" && animation.type === "text_cycle" && (
        <InspectorField
          label="Statuses"
          input={
            <Textarea
              size="xs"
              minRows={4}
              autosize
              value={textItemsValue}
              placeholder={"Queued\nProcessing\nReviewing\nDone"}
              onChange={(e) => onDispatch({
                operation: "update_animation",
                sceneId,
                elementId,
                animationId: animation.id,
                patch: {
                  textItems: e.currentTarget.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean)
                }
              })}
            />
          }
        />
      )}
      <Group gap={4} align="center" pt={2}>
        <Text fz={10} c="gray.5" style={{ whiteSpace: "nowrap" }}>ends {endMs}ms</Text>
        <Text fz={10} c="gray.5">gap:</Text>
        <NumberInput
          size="xs"
          min={0}
          step={100}
          value={gapMs}
          onChange={(v) => setGapMs(typeof v === "number" ? v : 0)}
          style={{ width: 72 }}
          suffix="ms"
        />
        <Button
          size="compact-xs"
          variant="light"
          color="teal"
          leftSection={<IconPlus size={10} />}
          onClick={addAfter}
          title="Add another animation after this one"
        >
          Add after
        </Button>
      </Group>
    </Stack>
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

// ── Video inspector ───────────────────────────────────────────────────────────

interface VideoInspectorProps {
  selectedSceneId: string;
  selectedElement: ElementNode;
  onDispatchOperation: (op: EditorOperation) => void;
}

export function VideoInspector({ selectedSceneId, selectedElement, onDispatchOperation }: VideoInspectorProps) {
  const durationMs = selectedElement.content?.videoDurationMs ?? 0;
  const trimStartMs = selectedElement.content?.trimStartMs ?? 0;
  const trimEndMs = selectedElement.content?.trimEndMs ?? durationMs;
  const playbackRate = selectedElement.content?.playbackRate ?? 1;

  const effectiveDurationS = durationMs > 0 ? ((trimEndMs - trimStartMs) / playbackRate / 1000).toFixed(2) : "—";

  return (
    <Stack gap="md">
      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Trim ── */}
      <Stack gap="xs">
        <Group gap={6}>
          <IconPlayerSkipForward size={14} color="gray" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Trim</Text>
        </Group>

        {durationMs > 0 ? (
          <>
            <RangeSlider
              data-testid="video-trim-slider"
              min={0}
              max={durationMs}
              step={100}
              value={[trimStartMs, trimEndMs]}
              onChange={([s, e]) =>
                onDispatchOperation({ operation: "set_video_trim", sceneId: selectedSceneId, elementId: selectedElement.id, trimStartMs: s, trimEndMs: e })
              }
              label={(v) => `${(v / 1000).toFixed(1)}s`}
              size="xs"
              color="violet"
              minRange={100}
            />
            <SimpleGrid cols={2} spacing="xs">
              <InspectorField
                label="In (s)"
                input={
                  <NumberInput
                    data-testid="video-trim-start"
                    size="xs"
                    min={0}
                    max={(trimEndMs - 100) / 1000}
                    step={0.1}
                    decimalScale={1}
                    value={trimStartMs / 1000}
                    onChange={(v) =>
                      onDispatchOperation({ operation: "set_video_trim", sceneId: selectedSceneId, elementId: selectedElement.id, trimStartMs: Math.round(toNumber(v, 0) * 1000), trimEndMs })
                    }
                  />
                }
              />
              <InspectorField
                label="Out (s)"
                input={
                  <NumberInput
                    data-testid="video-trim-end"
                    size="xs"
                    min={(trimStartMs + 100) / 1000}
                    max={durationMs / 1000}
                    step={0.1}
                    decimalScale={1}
                    value={trimEndMs / 1000}
                    onChange={(v) =>
                      onDispatchOperation({ operation: "set_video_trim", sceneId: selectedSceneId, elementId: selectedElement.id, trimStartMs, trimEndMs: Math.round(toNumber(v, durationMs / 1000) * 1000) })
                    }
                  />
                }
              />
            </SimpleGrid>
            <Text c="gray.5" fz="xs">Effective duration: {effectiveDurationS}s (source: {(durationMs / 1000).toFixed(1)}s)</Text>
          </>
        ) : (
          <Text c="gray.5" fz="xs">Duration unavailable</Text>
        )}
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Speed ── */}
      <Stack gap="xs">
        <Group gap={6} justify="space-between">
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Speed</Text>
          <Text c="violet.6" fz="xs" fw={700}>{playbackRate}×</Text>
        </Group>
        <Slider
          data-testid="video-playback-rate"
          min={0.25}
          max={4}
          step={0.25}
          value={playbackRate}
          onChange={(v) =>
            onDispatchOperation({ operation: "set_video_playback_rate", sceneId: selectedSceneId, elementId: selectedElement.id, playbackRate: v })
          }
          label={(v) => `${v}×`}
          size="xs"
          color="violet"
          marks={[
            { value: 0.5, label: "0.5×" },
            { value: 1, label: "1×" },
            { value: 2, label: "2×" },
          ]}
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
          data-testid="video-crop-toggle" label="Enable Crop"
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
              onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: undefined });
            }
          }}
        />

        {selectedElement.content?.crop && (
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField label="CX" input={<NumberInput data-testid="video-crop-x" size="xs" value={selectedElement.content.crop.x} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, x: toNumber(v, 0) } })} />} />
            <InspectorField label="CY" input={<NumberInput data-testid="video-crop-y" size="xs" value={selectedElement.content.crop.y} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, y: toNumber(v, 0) } })} />} />
            <InspectorField label="CW" input={<NumberInput data-testid="video-crop-width" size="xs" min={1} value={selectedElement.content.crop.width} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, width: toNumber(v, 1) } })} />} />
            <InspectorField label="CH" input={<NumberInput data-testid="video-crop-height" size="xs" min={1} value={selectedElement.content.crop.height} onChange={(v) => onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: { ...selectedElement.content!.crop!, height: toNumber(v, 1) } })} />} />
          </SimpleGrid>
        )}
      </Stack>

      {/* ── Filters (roadmap) ── */}
      <Divider color="rgba(0,0,0,0.08)" />
      <Stack gap="xs">
        <Group gap={6} justify="space-between">
          <Group gap={6}>
            <IconFilter size={14} color="gray" />
            <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Effects & Filters</Text>
          </Group>
          <Badge variant="outline" color="gray" size="xs">Soon</Badge>
        </Group>
        <Text c="gray.4" fz="xs">Brightness, contrast, saturation, blur and more — planned for a future release.</Text>
      </Stack>
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

export function ImageInspector({ selectedSceneId, selectedElement, onUpdateElement, onDispatchOperation }: ImageInspectorProps) {
  const filters = selectedElement.style?.filters ?? {};

  const updateFilter = (patch: Partial<ImageFilters>) => {
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
          data-testid="image-frame"
          size="xs"
          placeholder="No frame"
          data={[
            { value: "", label: "None" },
            { value: "phone", label: "Phone" },
            { value: "laptop", label: "Laptop" },
            { value: "tablet", label: "Tablet" },
            { value: "browser", label: "Browser" },
            { value: "tv", label: "TV" },
            { value: "polaroid", label: "Polaroid" },
            { value: "cinematic", label: "Cinematic" },
            { value: "circle", label: "Circle Crop" },
            { value: "shadow", label: "Shadow" },
          ]}
          value={selectedElement.content?.frame ?? ""}
          onChange={(v) => onDispatchOperation({ operation: "set_image_frame", sceneId: selectedSceneId, elementId: selectedElement.id, frame: (v || undefined) as any })}
        />
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Effects & Filters ── */}
      <Stack gap="xs">
        <Group gap={6}>
          <IconFilter size={14} color="gray" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Effects & Filters</Text>
        </Group>

        <InspectorField label="Blur" input={<Slider data-testid="image-blur" min={0} max={20} step={1} value={filters.blur ?? 0} onChange={(v) => updateFilter({ blur: v })} size="xs" color="orange" />} />
        <InspectorField label="Brightness" input={<Slider data-testid="image-brightness" min={0} max={2} step={0.1} value={filters.brightness ?? 1} onChange={(v) => updateFilter({ brightness: v })} size="xs" color="orange" />} />
        <InspectorField label="Contrast" input={<Slider data-testid="image-contrast" min={0} max={2} step={0.1} value={filters.contrast ?? 1} onChange={(v) => updateFilter({ contrast: v })} size="xs" color="orange" />} />
        <InspectorField label="Saturation" input={<Slider data-testid="image-saturation" min={0} max={2} step={0.1} value={filters.saturation ?? 1} onChange={(v) => updateFilter({ saturation: v })} size="xs" color="orange" />} />
        <InspectorField label="Sharpen" input={<Slider data-testid="image-sharpen" min={0} max={2} step={0.1} value={filters.sharpen ?? 0} onChange={(v) => updateFilter({ sharpen: v })} size="xs" color="orange" />} />
        <InspectorField label="Vignette" input={<Slider data-testid="image-vignette" min={0} max={1} step={0.05} value={filters.vignette ?? 0} onChange={(v) => updateFilter({ vignette: v })} size="xs" color="orange" />} />

        <SimpleGrid cols={2} spacing="xs">
          <Switch data-testid="image-mono" label="Mono" size="xs" checked={!!filters.monochrome} onChange={(e) => updateFilter({ monochrome: e.currentTarget.checked })} />
          <Switch data-testid="image-hdr" label="HDR" size="xs" checked={!!filters.hdr} onChange={(e) => updateFilter({ hdr: e.currentTarget.checked })} />
          <Switch data-testid="image-vintage" label="Vintage" size="xs" checked={!!filters.vintage} onChange={(e) => updateFilter({ vintage: e.currentTarget.checked })} />
          <Switch data-testid="image-cinematic" label="Cinematic" size="xs" checked={!!filters.cinematic} onChange={(e) => updateFilter({ cinematic: e.currentTarget.checked })} />
          <Switch data-testid="image-y2k" label="Y2K" size="xs" checked={!!filters.y2k} onChange={(e) => updateFilter({ y2k: e.currentTarget.checked })} />
        </SimpleGrid>

        <InspectorField
          label="Blend"
          input={
            <Select
              data-testid="image-blend"
              size="xs"
              data={["normal", "multiply", "screen", "overlay", "darken", "lighten"]}
              value={selectedElement.style?.blendMode ?? "normal"}
              onChange={(v) => onUpdateElement(selectedSceneId, selectedElement.id, { style: { blendMode: (v ?? "normal") as any } })}
            />
          }
        />

        <InspectorField
          label="Duotone"
          input={
            <Group gap={4}>
              <SwatchPicker testId="image-duotone-color1" value={filters.duotone?.color1 ?? "#000000"} onChange={(c) => updateFilter({ duotone: { color1: c, color2: filters.duotone?.color2 ?? "#ffffff" } })} />
              <Switch data-testid="image-duotone-toggle" size="xs" checked={!!filters.duotone} onChange={(e) => updateFilter({ duotone: e.currentTarget.checked ? { color1: "#000000", color2: "#ffffff" } : undefined })} />
            </Group>
          }
        />

        {/* Glow */}
        <InspectorField
          label="Glow"
          input={
            <Group gap={4}>
              <SwatchPicker testId="image-glow-color" value={filters.glow?.color ?? "#ffffff"} onChange={(c) => updateFilter({ glow: { color: c, blur: filters.glow?.blur ?? 12, strength: filters.glow?.strength ?? 2 } })} />
              <Switch data-testid="image-glow-toggle" size="xs" checked={!!filters.glow} onChange={(e) => updateFilter({ glow: e.currentTarget.checked ? { color: "#ffffff", blur: 12, strength: 2 } : undefined })} />
            </Group>
          }
        />
        {filters.glow && (
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField label="G.Blur" input={<Slider data-testid="image-glow-blur" min={0} max={40} step={1} value={filters.glow.blur} onChange={(v) => updateFilter({ glow: { ...filters.glow!, blur: v } })} size="xs" color="orange" />} />
            <InspectorField label="G.Strength" input={<Slider data-testid="image-glow-strength" min={0} max={10} step={0.5} value={filters.glow.strength} onChange={(v) => updateFilter({ glow: { ...filters.glow!, strength: v } })} size="xs" color="orange" />} />
          </SimpleGrid>
        )}

        {/* Drop Shadow */}
        <InspectorField
          label="Shadow"
          input={
            <Group gap={4}>
              <SwatchPicker testId="image-shadow-color" value={filters.dropShadow?.color ?? "#000000"} onChange={(c) => updateFilter({ dropShadow: { color: c, blur: filters.dropShadow?.blur ?? 8, alpha: filters.dropShadow?.alpha ?? 0.5, offsetX: filters.dropShadow?.offsetX ?? 4, offsetY: filters.dropShadow?.offsetY ?? 4 } })} />
              <Switch data-testid="image-shadow-toggle" size="xs" checked={!!filters.dropShadow} onChange={(e) => updateFilter({ dropShadow: e.currentTarget.checked ? { color: "#000000", blur: 8, alpha: 0.5, offsetX: 4, offsetY: 4 } : undefined })} />
            </Group>
          }
        />
        {filters.dropShadow && (
          <SimpleGrid cols={2} spacing="xs">
            <InspectorField label="S.Blur" input={<Slider data-testid="image-shadow-blur" min={0} max={30} step={1} value={filters.dropShadow.blur} onChange={(v) => updateFilter({ dropShadow: { ...filters.dropShadow!, blur: v } })} size="xs" color="orange" />} />
            <InspectorField label="S.Alpha" input={<Slider data-testid="image-shadow-alpha" min={0} max={1} step={0.05} value={filters.dropShadow.alpha} onChange={(v) => updateFilter({ dropShadow: { ...filters.dropShadow!, alpha: v } })} size="xs" color="orange" />} />
            <InspectorField label="S.X" input={<NumberInput data-testid="image-shadow-x" size="xs" value={filters.dropShadow.offsetX} onChange={(v) => updateFilter({ dropShadow: { ...filters.dropShadow!, offsetX: toNumber(v, 4) } })} />} />
            <InspectorField label="S.Y" input={<NumberInput data-testid="image-shadow-y" size="xs" value={filters.dropShadow.offsetY} onChange={(v) => updateFilter({ dropShadow: { ...filters.dropShadow!, offsetY: toNumber(v, 4) } })} />} />
          </SimpleGrid>
        )}
      </Stack>

      <Divider color="rgba(0,0,0,0.08)" />

      {/* ── Crop ── */}
      <Stack gap="xs">
        <Group gap={6}>
          <IconCrop size={14} color="gray" />
          <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Crop</Text>
        </Group>

        <Switch
          data-testid="image-crop-toggle" label="Enable Crop"
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
              onDispatchOperation({ operation: "crop_image", sceneId: selectedSceneId, elementId: selectedElement.id, crop: undefined });
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

const GRADIENT_PRESETS = [
  {
    name: "Dark & Dramatic",
    gradients: [
      { name: "Deep Space", color: "#0B1120", color2: "#1A237E", gradientAngle: 160 },
      { name: "Matrix Dark", color: "#050A0F", color2: "#0D2137", gradientAngle: 150 },
      { name: "Luxury Dark", color: "#111111", color2: "#1c1c1c", gradientAngle: 90 },
      { name: "Premium Dark", color: "#1A1A1A", color2: "#2D1F3D", gradientAngle: 150 },
      { name: "Royale Purple", color: "#4A148C", color2: "#880E4F", gradientAngle: 145 },
      { name: "Deep Blue", color: "#0c1445", color2: "#1a237e", gradientAngle: 135 },
    ]
  },
  {
    name: "Vibrant & Warm",
    gradients: [
      { name: "Fiesta Burst", color: "#FF6F00", color2: "#E91E63", gradientAngle: 135 },
      { name: "Spicy Warm", color: "#E65100", color2: "#BF360C", gradientAngle: 135 },
      { name: "Golden Hour", color: "#E65100", color2: "#E91E63", gradientAngle: 135 },
      { name: "Sunset Orange", color: "#c94a0a", color2: "#7c1a00", gradientAngle: 120 },
      { name: "Sunrise Glow", color: "#FFF8E1", color2: "#F3E5F5", gradientAngle: 135 },
      { name: "Golden Kitchen", color: "#FFF8E1", color2: "#FFF3E0", gradientAngle: 120 },
    ]
  },
  {
    name: "Pastel & Playful",
    gradients: [
      { name: "Cotton Candy", color: "#FFF0F5", color2: "#E0F7FA", gradientAngle: 135 },
      { name: "Sunny Pastels", color: "#FFFDE7", color2: "#FCE4EC", gradientAngle: 120 },
      { name: "Dreamland Purple-Gold", color: "#EDE9FE", color2: "#FDE68A", gradientAngle: 150 },
      { name: "Mint Meadow", color: "#ECFDF5", color2: "#D1FAE5", gradientAngle: 135 },
    ]
  },
  {
    name: "Fresh & Natural",
    gradients: [
      { name: "Emerald Forest", color: "#1B5E20", color2: "#2E7D32", gradientAngle: 145 },
      { name: "Ocean Horizon", color: "#0277BD", color2: "#00ACC1", gradientAngle: 140 },
      { name: "Morning Grass", color: "#E8F5E9", color2: "#C8E6C9", gradientAngle: 120 },
      { name: "Horizon Blue", color: "#01579B", color2: "#006064", gradientAngle: 140 },
      { name: "Emerald Mint", color: "#004d40", color2: "#00251a", gradientAngle: 140 },
      { name: "Sweet Rose", color: "#c2185b", color2: "#880e4f", gradientAngle: 135 },
    ]
  },
  {
    name: "Modern & Clean",
    gradients: [
      { name: "Pure Light", color: "#F9FAFB", color2: "#EFF6FF", gradientAngle: 135 },
      { name: "Lavender Calm", color: "#F3E5F5", color2: "#E8EAF6", gradientAngle: 130 },
      { name: "Clean Light", color: "#f8f9fa", color2: "#e8eaf6", gradientAngle: 135 },
      { name: "Cinematic Tech", color: "#0B1020", color2: "#0d2137", gradientAngle: 160 },
    ]
  }
];

// ── Scene inspector ───────────────────────────────────────────────────────────

interface SceneInspectorProps {
  scene: Scene;
  onUpdateScene: (sceneId: string, patch: { name?: string; backgroundColor?: string; background?: Partial<SceneBackground> }) => void;
  onSetTransition: (sceneId: string, transition: SceneTransition | undefined) => void;
  onSetSceneSfx: (sceneId: string, sfx: SceneSfx | undefined) => void;
}

function SceneInspector({ scene, onUpdateScene, onSetTransition, onSetSceneSfx }: SceneInspectorProps) {
  const bgFileRef = useRef<HTMLInputElement>(null);
  const sfxFileRef = useRef<HTMLInputElement>(null);
  const bg = scene.background ?? {};
  const hasGradient = !!bg.color2;
  const hasImage = !!bg.imageSrc;

  function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) onUpdateScene(scene.id, { background: { imageSrc: src, cssBackground: undefined, color2: undefined, gradientAngle: undefined, gradientAngleSpeed: undefined } });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSfxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) onSetSceneSfx(scene.id, { src, volume: scene.sfx?.volume ?? 1 });
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
          
          <Box mt="xs" mb="xs">
            <Text c="gray.6" fz={10} fw={700} tt="uppercase" lts="0.04em" mb={6}>Preset Gradients</Text>
            <Box style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
              {GRADIENT_PRESETS.map((category) => (
                <Box key={category.name}>
                  <Text fz={9} fw={600} c="gray.5" mb={4}>{category.name}</Text>
                  <SimpleGrid cols={3} spacing={6}>
                    {category.gradients.map((preset, idx) => (
                      <Tooltip label={preset.name} key={idx} fz="2xs" withinPortal>
                        <Box
                          onClick={() => {
                            onUpdateScene(scene.id, {
                              backgroundColor: preset.color,
                              background: {
                                color2: preset.color2,
                                gradientAngle: preset.gradientAngle
                              }
                            });
                          }}
                          style={{
                            aspectRatio: "1.6/1",
                            borderRadius: 4,
                            cursor: "pointer",
                            background: `linear-gradient(${preset.gradientAngle}deg, ${preset.color}, ${preset.color2})`,
                            border: `1.5px solid ${scene.backgroundColor === preset.color && bg.color2 === preset.color2 ? "#4f46e5" : "rgba(0,0,0,0.12)"}`,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "transform 0.15s, border-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.06)";
                            e.currentTarget.style.borderColor = "#4f46e5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            if (!(scene.backgroundColor === preset.color && bg.color2 === preset.color2)) {
                              e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
                            }
                          }}
                        />
                      </Tooltip>
                    ))}
                  </SimpleGrid>
                </Box>
              ))}
            </Box>
          </Box>
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

      {/* ── Transition In ── */}
      <Divider color="rgba(0,0,0,0.08)" />
      <Group gap={6}>
        <IconArrowsRightLeft size={14} color="gray" />
        <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Transition In</Text>
      </Group>
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
        value={scene.transition?.type ?? null}
        onChange={(v) => {
          if (v === null) {
            onSetTransition(scene.id, undefined);
          } else {
            onSetTransition(scene.id, { type: v as TransitionType, durationMs: scene.transition?.durationMs ?? 500 });
          }
        }}
      />
      {scene.transition && (
        <InspectorField
          label="Duration"
          input={
            <NumberInput
              size="xs"
              min={100}
              max={2000}
              step={100}
              value={scene.transition.durationMs}
              suffix=" ms"
              onChange={(v) => onSetTransition(scene.id, { ...scene.transition!, durationMs: toNumber(v, 500) })}
            />
          }
        />
      )}

      {/* ── Sound Effect ── */}
      <Divider color="rgba(0,0,0,0.08)" />
      <Group gap={6}>
        <IconMusic size={14} color="gray" />
        <Text c="gray.5" fz="xs" fw={700} tt="uppercase" lts="0.06em">Sound Effect</Text>
      </Group>
      <input ref={sfxFileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleSfxUpload} />
      {scene.sfx ? (
        <Stack gap={6}>
          <Group gap={6} wrap="nowrap">
            <IconVolume size={13} color="#6366f1" style={{ flexShrink: 0 }} />
            <Text fz="xs" c="gray.7" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              SFX loaded
            </Text>
          </Group>
          <InspectorField
            label="Volume"
            input={
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={scene.sfx.volume ?? 1}
                onChange={(v) => onSetSceneSfx(scene.id, { ...scene.sfx!, volume: v })}
                label={(v) => `${Math.round(v * 100)}%`}
                size="xs"
                color="indigo"
              />
            }
          />
          <InspectorField
            label="Offset"
            input={
              <NumberInput
                size="xs"
                min={0}
                max={scene.durationMs - 1}
                step={100}
                value={scene.sfx.offsetMs ?? 0}
                suffix=" ms"
                onChange={(v) => onSetSceneSfx(scene.id, { ...scene.sfx!, offsetMs: typeof v === "number" ? v : 0 })}
              />
            }
          />
          <Group grow gap={4}>
            <Button
              variant="light"
              color="indigo"
              size="xs"
              leftSection={<IconUpload size={12} />}
              onClick={() => sfxFileRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="light"
              color="red"
              size="xs"
              leftSection={<IconTrash size={12} />}
              onClick={() => onSetSceneSfx(scene.id, undefined)}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button
          fullWidth
          variant="light"
          color="indigo"
          size="sm"
          leftSection={<IconUpload size={14} />}
          onClick={() => sfxFileRef.current?.click()}
        >
          Upload SFX
        </Button>
      )}
    </Stack>
  );
}
