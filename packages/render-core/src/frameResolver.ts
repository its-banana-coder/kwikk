import { resolveElementNodeAtTime } from "@kwikk/animation-engine";
import type { CompositionNode, ElementNode, ProjectDocument, SceneBackground, Viewport } from "@kwikk/shared-types";
import { getActiveSceneWindow } from "@kwikk/timeline";

export interface RenderFrameInput {
  timeMs: number;
  showAllElements?: boolean;
  excludeElementId?: string;
  forceIncludeElementId?: string;
}

export interface ResolvedRenderFrame {
  timeMs: number;
  localTimeMs: number;
  sceneDurationMs: number;
  sceneId: string | null;
  viewport: Viewport;
  backgroundColor: string;
  background?: SceneBackground;
  elements: ElementNode[];
  compositions: CompositionNode[];
  overlay?: import("@kwikk/shared-types").SceneOverlay;
  showAllElements?: boolean;
}

export function resolveRenderFrame(
  project: ProjectDocument,
  input: RenderFrameInput
): ResolvedRenderFrame {
  const active = getActiveSceneWindow(project, input.timeMs);
  if (!active) {
    return {
      timeMs: input.timeMs,
      localTimeMs: 0,
      sceneDurationMs: 0,
      sceneId: null,
      viewport: project?.viewport ?? { width: 1080, height: 1920 },
      backgroundColor: "#ffffff",
      elements: [],
      compositions: [],
    };
  }

  const elements: ElementNode[] = [];
  const sceneElements = active.scene.elements;
  const numElements = sceneElements.length;
  for (let i = 0; i < numElements; i++) {
    const element = sceneElements[i];
    let keep = false;
    if (input.showAllElements) {
      keep = true;
    } else if (input.forceIncludeElementId && element.id === input.forceIncludeElementId) {
      keep = true;
    } else {
      const s = element.startMs ?? 0;
      const e = element.endMs ?? active.scene.durationMs;
      if (active.localTimeMs >= s && active.localTimeMs <= e) {
        keep = true;
      }
    }

    if (!keep) continue;

    const resolved = resolveElementNodeAtTime(element, active.localTimeMs, input.showAllElements);
    if (resolved.id === input.excludeElementId) continue;

    elements.push(resolved);
  }

  // Sort in place
  elements.sort((left, right) => {
    const zOf = (el: ElementNode) =>
      el.layout.zIndex ?? (el.type === "text" ? 5 : el.type === "image" || el.type === "video" ? 2 : 1);
    return zOf(left) - zOf(right);
  });

  const compositions: CompositionNode[] = [];
  const sceneComps = active.scene.compositions;
  if (sceneComps) {
    const numComps = sceneComps.length;
    for (let i = 0; i < numComps; i++) {
      const comp = sceneComps[i];
      let keep = false;
      if (input.showAllElements) {
        keep = true;
      } else {
        const s = comp.startMs ?? 0;
        const e = comp.endMs ?? active.scene.durationMs;
        if (active.localTimeMs >= s && active.localTimeMs <= e) {
          keep = true;
        }
      }
      if (keep) {
        compositions.push(comp);
      }
    }
  }

  return {
    timeMs: input.timeMs,
    localTimeMs: active.localTimeMs,
    sceneDurationMs: active.scene.durationMs,
    sceneId: active.scene.id,
    viewport: project?.viewport ?? { width: 1080, height: 1920 },
    backgroundColor: active.scene.backgroundColor ?? active.scene.background?.color ?? "#ffffff",
    background: active.scene.background,
    overlay: active.scene.overlay,
    showAllElements: input.showAllElements,
    elements,
    compositions,
  };
}
