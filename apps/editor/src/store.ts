import { create } from "zustand";
import {
  createPrototypeProject,
  createScene,
  applyOperation,
  type EditorOperation,
  type ElementPatch
} from "@kwikk/scene-graph";
import type {
  Animation,
  ElementNode,
  ProjectDocument,
  Scene
} from "@kwikk/shared-types";
import { getTimelineDurationMs } from "@kwikk/timeline";

interface TimelineState {
  currentTimeMs: number;
  durationMs: number;
}

interface PlaybackState {
  isPlaying: boolean;
}

interface EditorState {
  project: ProjectDocument;
  selectedSceneId: string;
  selectedElementIds: string[];
  timeline: TimelineState;
  playback: PlaybackState;
  operationLog: EditorOperation[];

  dispatchOperation: (op: EditorOperation) => void;

  selectScene: (sceneId: string) => void;
  syncSelectedScene: (sceneId: string) => void;
  selectElement: (sceneId: string, elementId: string) => void;
  setCurrentTime: (timeMs: number) => void;
  setPlayback: (isPlaying: boolean) => void;
  togglePlayback: () => void;

  updateElement: (sceneId: string, elementId: string, patch: ElementPatch) => void;
  addElement: (sceneId: string, type: ElementNode["type"]) => void;
  deleteElement: (sceneId: string, elementId: string) => void;
  addScene: () => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  updateScene: (sceneId: string, patch: { name?: string; backgroundColor?: string }) => void;
  updateSceneDuration: (sceneId: string, durationMs: number) => void;
}

function getScene(project: ProjectDocument, sceneId: string): Scene | undefined {
  return project.scenes.find((scene) => scene.id === sceneId);
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const initialProject = createPrototypeProject();

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  selectedSceneId: initialProject.scenes[0]?.id ?? "",
  selectedElementIds: initialProject.scenes[0]?.elements[0]
    ? [initialProject.scenes[0].elements[0].id]
    : [],
  timeline: {
    currentTimeMs: 0,
    durationMs: getTimelineDurationMs(initialProject.timelineTracks)
  },
  playback: { isPlaying: false },
  operationLog: [],

  dispatchOperation: (op) =>
    set((state) => {
      const nextProject = applyOperation(state.project, op);
      const duration = getTimelineDurationMs(nextProject.timelineTracks);

      const base = {
        project: nextProject,
        operationLog: [...state.operationLog, op],
        timeline: {
          ...state.timeline,
          durationMs: duration,
          currentTimeMs: Math.min(state.timeline.currentTimeMs, duration)
        }
      };

      switch (op.operation) {
        case "add_element":
          return { ...base, selectedSceneId: op.sceneId, selectedElementIds: [op.elementId] };

        case "delete_element": {
          const updatedScene = nextProject.scenes.find((s) => s.id === op.sceneId);
          const wasSelected = state.selectedElementIds.includes(op.elementId);
          return {
            ...base,
            selectedElementIds: wasSelected
              ? updatedScene?.elements[0] ? [updatedScene.elements[0].id] : []
              : state.selectedElementIds
          };
        }

        case "add_scene":
          return {
            ...base,
            selectedSceneId: op.scene.id,
            selectedElementIds: [],
            timeline: { durationMs: duration, currentTimeMs: duration - op.scene.durationMs }
          };

        case "delete_scene": {
          if (state.selectedSceneId !== op.sceneId) return base;
          const deletedIndex = state.project.scenes.findIndex((s) => s.id === op.sceneId);
          const nextScene = nextProject.scenes[Math.min(deletedIndex, nextProject.scenes.length - 1)];
          return {
            ...base,
            selectedSceneId: nextScene?.id ?? "",
            selectedElementIds: nextScene?.elements[0] ? [nextScene.elements[0].id] : [],
            timeline: {
              durationMs: duration,
              currentTimeMs: Math.min(state.timeline.currentTimeMs, duration)
            }
          };
        }

        default:
          return base;
      }
    }),

  // ─── Selection (pure editor state, no project mutation) ────────────────────

  selectScene: (sceneId) =>
    set((state) => {
      const scene = getScene(state.project, sceneId);
      const track = state.project.timelineTracks.find((t) => t.sceneId === sceneId);
      return {
        selectedSceneId: sceneId,
        selectedElementIds: scene?.elements[0] ? [scene.elements[0].id] : [],
        timeline: {
          ...state.timeline,
          currentTimeMs: track?.startMs ?? state.timeline.currentTimeMs
        }
      };
    }),

  syncSelectedScene: (sceneId) =>
    set((state) => {
      if (state.selectedSceneId === sceneId) return state;
      const scene = getScene(state.project, sceneId);
      return {
        selectedSceneId: sceneId,
        selectedElementIds: scene?.elements[0] ? [scene.elements[0].id] : []
      };
    }),

  selectElement: (sceneId, elementId) =>
    set({ selectedSceneId: sceneId, selectedElementIds: [elementId] }),

  setCurrentTime: (timeMs) =>
    set((state) => ({
      timeline: {
        ...state.timeline,
        currentTimeMs: Math.max(0, Math.min(timeMs, state.timeline.durationMs))
      }
    })),

  setPlayback: (isPlaying) =>
    set((state) => ({ playback: { ...state.playback, isPlaying } })),

  togglePlayback: () =>
    set((state) => ({ playback: { ...state.playback, isPlaying: !state.playback.isPlaying } })),

  // ─── Convenience wrappers — all route through dispatchOperation ─────────────

  updateElement: (sceneId, elementId, patch) =>
    get().dispatchOperation({ operation: "patch_element", sceneId, elementId, patch }),

  addElement: (sceneId, type) => {
    const elementId = nextId("el");
    const content =
      type === "text" ? { text: "New text" }
      : type === "shape" ? { shape: "rectangle" as const, label: "Rectangle" }
      : type === "image" ? { src: "placeholder://image", label: "Image placeholder" }
      : undefined;
    get().dispatchOperation({ operation: "add_element", sceneId, elementId, type, content });
  },

  deleteElement: (sceneId, elementId) =>
    get().dispatchOperation({ operation: "delete_element", sceneId, elementId }),

  addScene: () => {
    const state = get();
    const id = nextId("scene");
    const scene = createScene({
      id,
      name: `Scene ${state.project.scenes.length + 1}`,
      backgroundColor: "#0f172a"
    });
    get().dispatchOperation({ operation: "add_scene", scene });
  },

  deleteScene: (sceneId) => {
    if (get().project.scenes.length <= 1) return;
    get().dispatchOperation({ operation: "delete_scene", sceneId });
  },

  reorderScenes: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    get().dispatchOperation({ operation: "reorder_scenes", fromIndex, toIndex });
  },

  updateScene: (sceneId, patch) =>
    get().dispatchOperation({ operation: "update_scene", sceneId, patch }),

  updateSceneDuration: (sceneId, durationMs) =>
    get().dispatchOperation({ operation: "update_scene_duration", sceneId, durationMs })
}));

export function useSelectedScene(): Scene | undefined {
  return useEditorStore((state) => getScene(state.project, state.selectedSceneId));
}

export function useSelectedElement(): ElementNode | undefined {
  return useEditorStore((state) => {
    const scene = getScene(state.project, state.selectedSceneId);
    const elementId = state.selectedElementIds[0];
    return scene?.elements.find((element) => element.id === elementId);
  });
}

export type { EditorOperation, ElementPatch };
export type { Animation };
