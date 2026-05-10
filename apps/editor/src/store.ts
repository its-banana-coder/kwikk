import { create } from "zustand";
import {
  createPrototypeProject,
  updateSceneDuration as updateProjectSceneDuration,
  updateSceneElement
} from "@kwikk/scene-graph";
import type {
  ElementContent,
  ElementNode,
  LayoutProps,
  ManualOverrides,
  ProjectDocument,
  Scene,
  StyleProps
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
  selectScene: (sceneId: string) => void;
  syncSelectedScene: (sceneId: string) => void;
  selectElement: (sceneId: string, elementId: string) => void;
  setCurrentTime: (timeMs: number) => void;
  setPlayback: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  updateElement: (sceneId: string, elementId: string, patch: ElementPatch) => void;
  updateSceneDuration: (sceneId: string, durationMs: number) => void;
}

type ElementPatch = Partial<Omit<ElementNode, "layout" | "style" | "content" | "overrides">> & {
  layout?: Partial<LayoutProps>;
  style?: Partial<StyleProps>;
  content?: Partial<ElementContent>;
  overrides?: ManualOverrides;
};

function mergeElementPatch(element: ElementNode, patch: ElementPatch): ElementNode {
  return {
    ...element,
    ...patch,
    layout: patch.layout
      ? {
          ...element.layout,
          ...patch.layout
        }
      : element.layout,
    style: patch.style
      ? {
          ...element.style,
          ...patch.style
        }
      : element.style,
    content: patch.content
      ? {
          ...element.content,
          ...patch.content
        }
      : element.content,
    overrides: patch.overrides
      ? {
          ...element.overrides,
          ...patch.overrides
        }
      : element.overrides
  };
}

function getScene(project: ProjectDocument, sceneId: string): Scene | undefined {
  return project.scenes.find((scene) => scene.id === sceneId);
}

const initialProject = createPrototypeProject();

export const useEditorStore = create<EditorState>((set) => ({
  project: initialProject,
  selectedSceneId: initialProject.scenes[0]?.id ?? "",
  selectedElementIds: initialProject.scenes[0]?.elements[0]
    ? [initialProject.scenes[0].elements[0].id]
    : [],
  timeline: {
    currentTimeMs: 0,
    durationMs: getTimelineDurationMs(initialProject.timelineTracks)
  },
  playback: {
    isPlaying: false
  },
  selectScene: (sceneId) =>
    set((state) => {
      const scene = getScene(state.project, sceneId);
      const track = state.project.timelineTracks.find((item) => item.sceneId === sceneId);

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
    set({
      selectedSceneId: sceneId,
      selectedElementIds: [elementId]
    }),
  setCurrentTime: (timeMs) =>
    set((state) => ({
      timeline: {
        ...state.timeline,
        currentTimeMs: Math.max(0, Math.min(timeMs, state.timeline.durationMs))
      }
    })),
  setPlayback: (isPlaying) =>
    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying
      }
    })),
  togglePlayback: () =>
    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying: !state.playback.isPlaying
      }
    })),
  updateElement: (sceneId, elementId, patch) =>
    set((state) => ({
      project: updateSceneElement(state.project, sceneId, elementId, (element) =>
        mergeElementPatch(element, patch)
      )
    })),
  updateSceneDuration: (sceneId, durationMs) =>
    set((state) => {
      const project = updateProjectSceneDuration(state.project, sceneId, Math.max(1000, durationMs));
      const duration = getTimelineDurationMs(project.timelineTracks);

      return {
        project,
        timeline: {
          currentTimeMs: Math.min(state.timeline.currentTimeMs, duration),
          durationMs: duration
        }
      };
    })
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
