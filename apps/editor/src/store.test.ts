import { describe, expect, it, beforeEach } from "vitest";
import { useEditorStore } from "./store";

describe("useEditorStore", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("initializes with a blank starter scene", () => {
    const state = useEditorStore.getState();
    expect(state.project.scenes).toHaveLength(1);
    expect(state.timeline.durationMs).toBe(5000);
  });

  it("selects a scene and updates current time", () => {
    const { addScene, selectScene } = useEditorStore.getState();
    addScene(); // scene_1 (5000ms) + new scene (10000ms default)

    const secondSceneId = useEditorStore.getState().project.scenes[1].id;

    selectScene(secondSceneId);

    const state = useEditorStore.getState();
    expect(state.selectedSceneId).toBe(secondSceneId);
    expect(state.timeline.currentTimeMs).toBe(5000); // starts right after scene_1's 5s
  });

  it("dispatches patch_element operation", () => {
    const { addElement, dispatchOperation } = useEditorStore.getState();
    const sceneId = useEditorStore.getState().project.scenes[0].id;
    addElement(sceneId, "text");

    const firstElement = useEditorStore.getState().project.scenes[0].elements[0];

    dispatchOperation({
      operation: "patch_element",
      sceneId,
      elementId: firstElement.id,
      patch: { layout: { x: 999 } }
    });

    const state = useEditorStore.getState();
    const updatedElement = state.project.scenes[0].elements[0];
    expect(updatedElement.layout.x).toBe(999);
    expect(state.operationLog).toHaveLength(2); // add_element + patch_element
  });

  it("handles delete_scene and updates selection", () => {
    const { addScene, dispatchOperation, selectScene } = useEditorStore.getState();
    addScene();

    const scenes = useEditorStore.getState().project.scenes;
    const sceneToDeleteId = scenes[0].id;
    const nextSceneId = scenes[1].id;

    selectScene(sceneToDeleteId);
    dispatchOperation({
      operation: "delete_scene",
      sceneId: sceneToDeleteId
    });

    const state = useEditorStore.getState();
    expect(state.project.scenes).toHaveLength(1);
    expect(state.selectedSceneId).toBe(nextSceneId);
  });

  it("adds a new scene and selects it", () => {
    const { addScene } = useEditorStore.getState();

    addScene();

    const state = useEditorStore.getState();
    expect(state.project.scenes).toHaveLength(2);
    const lastScene = state.project.scenes[1];
    expect(state.selectedSceneId).toBe(lastScene.id);
  });

  it("adds an element and selects it", () => {
    const { addElement } = useEditorStore.getState();
    const sceneId = useEditorStore.getState().project.scenes[0].id;

    addElement(sceneId, "text");

    const state = useEditorStore.getState();
    const scene = state.project.scenes[0];
    const newElement = scene.elements[scene.elements.length - 1];

    expect(state.selectedElementIds).toContain(newElement.id);
  });

  it("toggles playback state", () => {
    const { togglePlayback } = useEditorStore.getState();

    expect(useEditorStore.getState().playback.isPlaying).toBe(false);
    togglePlayback();
    expect(useEditorStore.getState().playback.isPlaying).toBe(true);
  });

  it("sets current time within bounds", () => {
    const { setCurrentTime } = useEditorStore.getState();

    setCurrentTime(2000);
    expect(useEditorStore.getState().timeline.currentTimeMs).toBe(2000);

    setCurrentTime(99999); // Exceeds duration
    expect(useEditorStore.getState().timeline.currentTimeMs).toBe(5000);
  });
});
