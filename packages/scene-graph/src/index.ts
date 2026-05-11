import type {
  ElementContent,
  ElementNode,
  LayoutProps,
  ProjectDocument,
  Scene,
  StyleProps,
  TimelineTrack,
  Viewport
} from "@kwikk/shared-types";

export const DEFAULT_VIEWPORT: Viewport = {
  width: 1080,
  height: 1920
};

export const DEFAULT_LAYOUT: LayoutProps = {
  x: 0,
  y: 0,
  width: 240,
  height: 120,
  rotation: 0,
  scale: 1,
  opacity: 1,
  zIndex: 0
};

export const DEFAULT_STYLE: StyleProps = {
  fontFamily: "Inter",
  fontSize: 48,
  fontWeight: 600,
  fontStyle: "normal",
  color: "#0f172a",
  backgroundColor: "transparent"
};

export function createElementNode(input: {
  id: string;
  type: ElementNode["type"];
  semanticRole?: string;
  layout?: Partial<LayoutProps>;
  style?: StyleProps;
  animations?: ElementNode["animations"];
  overrides?: ElementNode["overrides"];
  content?: ElementContent;
}): ElementNode {
  return {
    id: input.id,
    type: input.type,
    semanticRole: input.semanticRole,
    layout: {
      ...DEFAULT_LAYOUT,
      ...input.layout
    },
    style: {
      ...DEFAULT_STYLE,
      ...input.style
    },
    animations: input.animations ?? [],
    overrides: input.overrides,
    content: input.content
  };
}

export function createScene(input: {
  id: string;
  name: string;
  durationMs?: number;
  backgroundColor?: string;
  elements?: ElementNode[];
}): Scene {
  return {
    id: input.id,
    name: input.name,
    durationMs: input.durationMs ?? 10000,
    elements: input.elements ?? [],
    backgroundColor: input.backgroundColor ?? "#ffffff"
  };
}

export function buildSequentialTimelineTracks(scenes: Scene[]): TimelineTrack[] {
  let currentStartMs = 0;

  return scenes.map((scene, index) => {
    const track: TimelineTrack = {
      id: `track_${scene.id}`,
      sceneId: scene.id,
      startMs: currentStartMs,
      durationMs: scene.durationMs,
      layer: index
    };

    currentStartMs += scene.durationMs;
    return track;
  });
}

export function createProjectDocument(input: {
  id: string;
  name: string;
  scenes: Scene[];
  viewport?: Viewport;
  timelineTracks?: TimelineTrack[];
}): ProjectDocument {
  return {
    id: input.id,
    name: input.name,
    scenes: input.scenes,
    viewport: input.viewport ?? DEFAULT_VIEWPORT,
    timelineTracks: input.timelineTracks ?? buildSequentialTimelineTracks(input.scenes)
  };
}

export function validateProjectDocument(project: ProjectDocument): string[] {
  const errors: string[] = [];
  const sceneIds = new Set<string>();
  const elementIds = new Set<string>();

  for (const scene of project.scenes) {
    if (sceneIds.has(scene.id)) {
      errors.push(`Duplicate scene id: ${scene.id}`);
    }
    sceneIds.add(scene.id);

    if (scene.durationMs <= 0) {
      errors.push(`Scene ${scene.id} must have a positive duration.`);
    }

    for (const element of scene.elements) {
      if (elementIds.has(element.id)) {
        errors.push(`Duplicate element id: ${element.id}`);
      }
      elementIds.add(element.id);
    }
  }

  for (const track of project.timelineTracks) {
    if (!sceneIds.has(track.sceneId)) {
      errors.push(`Timeline track ${track.id} references missing scene ${track.sceneId}.`);
    }
  }

  return errors;
}

export function updateSceneElement(
  project: ProjectDocument,
  sceneId: string,
  elementId: string,
  updater: (element: ElementNode) => ElementNode
): ProjectDocument {
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) {
        return scene;
      }

      return {
        ...scene,
        elements: scene.elements.map((element) => {
          if (element.id !== elementId) {
            return element;
          }

          return updater(element);
        })
      };
    })
  };
}

export function updateSceneDuration(
  project: ProjectDocument,
  sceneId: string,
  durationMs: number
): ProjectDocument {
  const scenes = project.scenes.map((scene) => {
    if (scene.id !== sceneId) {
      return scene;
    }

    return {
      ...scene,
      durationMs
    };
  });

  return {
    ...project,
    scenes,
    timelineTracks: buildSequentialTimelineTracks(scenes)
  };
}

export function createPrototypeProject(): ProjectDocument {
  const scenes = [
    createScene({
      id: "scene_hook",
      name: "Hook",
      durationMs: 5000,
      backgroundColor: "#0f172a",
      elements: [
        createElementNode({
          id: "hook_backdrop",
          type: "shape",
          semanticRole: "scene_backdrop",
          layout: {
            x: 40,
            y: 80,
            width: 1000,
            height: 1760,
            zIndex: 0
          },
          style: {
            backgroundColor: "#172554"
          },
          animations: [
            {
              id: "hook_backdrop_zoom",
              type: "zoomIn",
              startMs: 0,
              durationMs: 5000,
              easing: "easeOut"
            }
          ],
          content: {
            shape: "rectangle"
          }
        }),
        createElementNode({
          id: "hook_title",
          type: "text",
          semanticRole: "hook_title",
          layout: {
            x: 92,
            y: 180,
            width: 896,
            height: 280,
            zIndex: 2
          },
          style: {
            fontFamily: "Space Grotesk",
            fontSize: 84,
            fontWeight: 700,
            color: "#f8fafc"
          },
          animations: [
            {
              id: "hook_title_intro",
              type: "slideUp",
              startMs: 0,
              durationMs: 900,
              easing: "easeOut"
            },
            {
              id: "hook_title_fade",
              type: "fadeIn",
              startMs: 0,
              durationMs: 600,
              easing: "easeOut"
            },
            {
              id: "hook_title_out",
              type: "fadeOut",
              startMs: 4200,
              durationMs: 600,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Semantic edits stay editable."
          }
        }),
        createElementNode({
          id: "hook_support",
          type: "text",
          semanticRole: "supporting_caption",
          layout: {
            x: 92,
            y: 520,
            width: 860,
            height: 180,
            zIndex: 3
          },
          style: {
            fontFamily: "Inter",
            fontSize: 34,
            fontWeight: 500,
            color: "#bfdbfe"
          },
          animations: [
            {
              id: "hook_support_fade",
              type: "fadeIn",
              startMs: 250,
              durationMs: 700,
              easing: "easeOut"
            },
            {
              id: "hook_support_out",
              type: "fadeOut",
              startMs: 4300,
              durationMs: 500,
              easing: "easeIn"
            }
          ],
          content: {
            text: "A scene graph keeps identity, semantics, and manual overrides intact."
          }
        }),
        createElementNode({
          id: "hook_image",
          type: "image",
          semanticRole: "hero_image",
          layout: {
            x: 92,
            y: 820,
            width: 896,
            height: 760,
            zIndex: 1
          },
          style: {
            backgroundColor: "#1d4ed8"
          },
          animations: [
            {
              id: "hook_image_zoom",
              type: "zoomIn",
              startMs: 0,
              durationMs: 5000,
              easing: "easeOut"
            },
            {
              id: "hook_image_out",
              type: "fadeOut",
              startMs: 4350,
              durationMs: 450,
              easing: "easeIn"
            }
          ],
          content: {
            src: "placeholder://hook-visual",
            label: "Image placeholder"
          }
        })
      ]
    }),
    createScene({
      id: "scene_breakdown",
      name: "Breakdown",
      durationMs: 5000,
      backgroundColor: "#111827",
      elements: [
        createElementNode({
          id: "breakdown_card",
          type: "shape",
          semanticRole: "explanation_card",
          layout: {
            x: 72,
            y: 160,
            width: 936,
            height: 1480,
            zIndex: 0
          },
          style: {
            backgroundColor: "#1f2937"
          },
          animations: [
            {
              id: "breakdown_card_zoom",
              type: "zoomIn",
              startMs: 0,
              durationMs: 5000,
              easing: "easeOut"
            }
          ],
          content: {
            shape: "rectangle"
          }
        }),
        createElementNode({
          id: "breakdown_title",
          type: "text",
          semanticRole: "section_title",
          layout: {
            x: 120,
            y: 220,
            width: 840,
            height: 180,
            zIndex: 2
          },
          style: {
            fontFamily: "Space Grotesk",
            fontSize: 72,
            fontWeight: 700,
            color: "#f9fafb"
          },
          animations: [
            {
              id: "breakdown_title_slide",
              type: "slideDown",
              startMs: 0,
              durationMs: 850,
              easing: "easeOut"
            },
            {
              id: "breakdown_title_out",
              type: "fadeOut",
              startMs: 4200,
              durationMs: 600,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Graph -> Timeline -> Renderer"
          }
        }),
        createElementNode({
          id: "breakdown_copy",
          type: "text",
          semanticRole: "body_copy",
          layout: {
            x: 120,
            y: 470,
            width: 820,
            height: 460,
            zIndex: 3
          },
          style: {
            fontFamily: "Inter",
            fontSize: 36,
            fontWeight: 500,
            color: "#d1d5db"
          },
          animations: [
            {
              id: "breakdown_copy_fade",
              type: "fadeIn",
              startMs: 200,
              durationMs: 700,
              easing: "easeOut"
            },
            {
              id: "breakdown_copy_out",
              type: "fadeOut",
              startMs: 4300,
              durationMs: 500,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Every visible frame resolves from timeMs. That keeps preview, playback, and export using the same deterministic contract."
          }
        }),
        createElementNode({
          id: "breakdown_badge",
          type: "shape",
          semanticRole: "timeline_badge",
          layout: {
            x: 120,
            y: 1080,
            width: 360,
            height: 160,
            zIndex: 4
          },
          style: {
            backgroundColor: "#0f766e"
          },
          animations: [
            {
              id: "breakdown_badge_fade",
              type: "fadeIn",
              startMs: 300,
              durationMs: 500,
              easing: "easeOut"
            },
            {
              id: "breakdown_badge_out",
              type: "fadeOut",
              startMs: 4300,
              durationMs: 450,
              easing: "easeIn"
            }
          ],
          content: {
            shape: "rectangle"
          }
        }),
        createElementNode({
          id: "breakdown_badge_text",
          type: "text",
          semanticRole: "timeline_badge_label",
          layout: {
            x: 158,
            y: 1125,
            width: 280,
            height: 80,
            zIndex: 5
          },
          style: {
            fontFamily: "Inter",
            fontSize: 32,
            fontWeight: 700,
            color: "#ecfeff"
          },
          animations: [
            {
              id: "breakdown_badge_text_fade",
              type: "fadeIn",
              startMs: 450,
              durationMs: 450,
              easing: "easeOut"
            },
            {
              id: "breakdown_badge_text_out",
              type: "fadeOut",
              startMs: 4350,
              durationMs: 400,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Deterministic"
          }
        })
      ]
    }),
    createScene({
      id: "scene_cta",
      name: "CTA",
      durationMs: 5000,
      backgroundColor: "#1e1b4b",
      elements: [
        createElementNode({
          id: "cta_backdrop",
          type: "shape",
          semanticRole: "cta_backdrop",
          layout: {
            x: 60,
            y: 130,
            width: 960,
            height: 1660,
            zIndex: 0
          },
          style: {
            backgroundColor: "#312e81"
          },
          animations: [
            {
              id: "cta_backdrop_zoom",
              type: "zoomIn",
              startMs: 0,
              durationMs: 5000,
              easing: "easeOut"
            }
          ],
          content: {
            shape: "rectangle"
          }
        }),
        createElementNode({
          id: "cta_title",
          type: "text",
          semanticRole: "cta_title",
          layout: {
            x: 120,
            y: 250,
            width: 840,
            height: 220,
            zIndex: 2
          },
          style: {
            fontFamily: "Space Grotesk",
            fontSize: 78,
            fontWeight: 700,
            color: "#fef3c7"
          },
          animations: [
            {
              id: "cta_title_zoom",
              type: "zoomIn",
              startMs: 0,
              durationMs: 5000,
              easing: "easeOut"
            },
            {
              id: "cta_title_out",
              type: "fadeOut",
              startMs: 4200,
              durationMs: 600,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Prototype the reel, keep the graph."
          }
        }),
        createElementNode({
          id: "cta_button",
          type: "shape",
          semanticRole: "cta_button",
          layout: {
            x: 120,
            y: 1260,
            width: 520,
            height: 170,
            zIndex: 3
          },
          style: {
            backgroundColor: "#f59e0b"
          },
          animations: [
            {
              id: "cta_button_fade",
              type: "fadeIn",
              startMs: 400,
              durationMs: 450,
              easing: "easeOut"
            },
            {
              id: "cta_button_out",
              type: "fadeOut",
              startMs: 4300,
              durationMs: 450,
              easing: "easeIn"
            }
          ],
          content: {
            shape: "rectangle"
          }
        }),
        createElementNode({
          id: "cta_button_text",
          type: "text",
          semanticRole: "cta_label",
          layout: {
            x: 170,
            y: 1310,
            width: 420,
            height: 80,
            zIndex: 4
          },
          style: {
            fontFamily: "Inter",
            fontSize: 38,
            fontWeight: 700,
            color: "#111827"
          },
          animations: [
            {
              id: "cta_button_text_fade",
              type: "fadeIn",
              startMs: 500,
              durationMs: 400,
              easing: "easeOut"
            },
            {
              id: "cta_button_text_out",
              type: "fadeOut",
              startMs: 4350,
              durationMs: 400,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Ready for export"
          }
        }),
        createElementNode({
          id: "cta_note",
          type: "text",
          semanticRole: "supporting_caption",
          layout: {
            x: 120,
            y: 520,
            width: 780,
            height: 300,
            zIndex: 2
          },
          style: {
            fontFamily: "Inter",
            fontSize: 34,
            fontWeight: 500,
            color: "#ddd6fe"
          },
          animations: [
            {
              id: "cta_note_slide",
              type: "slideUp",
              startMs: 180,
              durationMs: 700,
              easing: "easeOut"
            },
            {
              id: "cta_note_out",
              type: "fadeOut",
              startMs: 4250,
              durationMs: 500,
              easing: "easeIn"
            }
          ],
          content: {
            text: "Phase 1 keeps playback reproducible today and leaves room for AI, export, transitions, and collaboration later."
          }
        })
      ]
    })
  ];

  return createProjectDocument({
    id: "semantic-video-engine-phase-1",
    name: "Semantic Video Engine Prototype",
    scenes
  });
}
