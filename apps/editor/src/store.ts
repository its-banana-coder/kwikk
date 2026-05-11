import { create } from "zustand";
import {
  createPrototypeProject,
  updateSceneDuration as updateProjectSceneDuration,
  updateSceneElement,
  createElementNode,
  createScene,
  buildSequentialTimelineTracks
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
  addElement: (sceneId: string, type: ElementNode["type"]) => void;
  deleteElement: (sceneId: string, elementId: string) => void;
  addScene: () => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  updateScene: (sceneId: string, patch: { name?: string; backgroundColor?: string }) => void;
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
  addElement: (sceneId, type) =>
    set((state) => {
      const targetScene = getScene(state.project, sceneId);
      if (!targetScene) return state;

      const id = `el_${Math.random().toString(36).slice(2, 9)}`;
      const newElement = createElementNode({
        id,
        type,
        content:
          type === "text"
            ? { text: "New text" }
            : type === "shape"
            ? { shape: "rectangle", label: "Rectangle" }
            : type === "image"
            ? { src: "placeholder://image", label: "Image placeholder" }
            : undefined
      });

      return {
        project: {
          ...state.project,
          scenes: state.project.scenes.map((scene) =>
            scene.id === sceneId ? { ...scene, elements: [...scene.elements, newElement] } : scene
          )
        },
        selectedSceneId: sceneId,
        selectedElementIds: [id]
      } as unknown as EditorState;
    }),
  deleteElement: (sceneId, elementId) =>
    set((state) => {
      const scenes = state.project.scenes.map((scene) =>
        scene.id !== sceneId
          ? scene
          : { ...scene, elements: scene.elements.filter((el) => el.id !== elementId) }
      );
      const updatedScene = scenes.find((s) => s.id === sceneId);
      const wasSelected = state.selectedElementIds.includes(elementId);
      return {
        project: { ...state.project, scenes },
        selectedElementIds: wasSelected
          ? updatedScene?.elements[0] ? [updatedScene.elements[0].id] : []
          : state.selectedElementIds
      };
    }),
  addScene: () =>
    set((state) => {
      const id = `scene_${Math.random().toString(36).slice(2, 9)}`;
      const newScene = createScene({ id, name: `Scene ${state.project.scenes.length + 1}`, backgroundColor: "#0f172a" });
      const scenes = [...state.project.scenes, newScene];
      const tracks = buildSequentialTimelineTracks(scenes);
      const duration = getTimelineDurationMs(tracks);
      return {
        project: { ...state.project, scenes, timelineTracks: tracks },
        selectedSceneId: id,
        selectedElementIds: [],
        timeline: { durationMs: duration, currentTimeMs: duration - newScene.durationMs }
      };
    }),
  deleteScene: (sceneId) =>
    set((state) => {
      if (state.project.scenes.length <= 1) return state;
      const deletedIndex = state.project.scenes.findIndex((s) => s.id === sceneId);
      const scenes = state.project.scenes.filter((s) => s.id !== sceneId);
      const tracks = buildSequentialTimelineTracks(scenes);
      const duration = getTimelineDurationMs(tracks);
      const nextScene = scenes[Math.min(deletedIndex, scenes.length - 1)];
      return {
        project: { ...state.project, scenes, timelineTracks: tracks },
        selectedSceneId: nextScene?.id ?? "",
        selectedElementIds: nextScene?.elements[0] ? [nextScene.elements[0].id] : [],
        timeline: {
          durationMs: duration,
          currentTimeMs: Math.min(state.timeline.currentTimeMs, duration)
        }
      };
    }),
  reorderScenes: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return state;
      const scenes = [...state.project.scenes];
      const [moved] = scenes.splice(fromIndex, 1);
      scenes.splice(toIndex, 0, moved);
      const tracks = buildSequentialTimelineTracks(scenes);
      const duration = getTimelineDurationMs(tracks);
      return {
        project: { ...state.project, scenes, timelineTracks: tracks },
        timeline: {
          ...state.timeline,
          durationMs: duration,
          currentTimeMs: Math.min(state.timeline.currentTimeMs, duration)
        }
      };
    }),
  updateScene: (sceneId, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id !== sceneId ? s : { ...s, ...patch }
        )
      }
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
