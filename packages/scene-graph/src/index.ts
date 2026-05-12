import type {
  Animation,
  ElementContent,
  ElementNode,
  ElementType,
  LayoutProps,
  ManualOverrides,
  ProjectDocument,
  Scene,
  SceneBackground,
  StyleProps,
  TextSpan,
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
  backgroundColor: "transparent",
  textAlign: "left"
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
  function updateRecursive(elements: ElementNode[]): ElementNode[] {
    return elements.map((el) => {
      if (el.id === elementId) {
        return updater(el);
      }
      if (el.children && el.children.length > 0) {
        return { ...el, children: updateRecursive(el.children) };
      }
      return el;
    });
  }

  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) {
        return scene;
      }

      return {
        ...scene,
        elements: updateRecursive(scene.elements)
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

// ─── Element patch helpers ────────────────────────────────────────────────────

export type ElementPatch = Partial<Omit<ElementNode, "layout" | "style" | "content" | "overrides">> & {
  layout?: Partial<LayoutProps>;
  style?: Partial<StyleProps>;
  content?: Partial<ElementContent>;
  overrides?: ManualOverrides;
};

export function mergeElementPatch(element: ElementNode, patch: ElementPatch): ElementNode {
  return {
    ...element,
    ...patch,
    layout: patch.layout ? { ...element.layout, ...patch.layout } : element.layout,
    style: patch.style
      ? {
          ...element.style,
          ...patch.style,
          filters: patch.style.filters ? { ...element.style.filters, ...patch.style.filters } : element.style.filters
        }
      : element.style,
    content: patch.content ? { ...element.content, ...patch.content } : element.content,
    overrides: patch.overrides ? { ...element.overrides, ...patch.overrides } : element.overrides
  };
}

// ─── Structured operation types (Principle 6) ────────────────────────────────

export type EditorOperation =
  | { operation: "patch_element"; sceneId: string; elementId: string; patch: ElementPatch }
  | { operation: "add_element"; sceneId: string; elementId: string; type: ElementType; content?: ElementContent; semanticRole?: string; layout?: Partial<LayoutProps>; style?: Partial<StyleProps> }
  | { operation: "delete_element"; sceneId: string; elementId: string }
  | { operation: "add_animation"; sceneId: string; elementId: string; animation: Animation }
  | { operation: "update_animation"; sceneId: string; elementId: string; animationId: string; patch: Partial<Omit<Animation, "id">> }
  | { operation: "delete_animation"; sceneId: string; elementId: string; animationId: string }
  | { operation: "set_element_motion_preset"; sceneId: string; elementId: string; motionPreset: string | undefined; animations: Animation[] }
  | { operation: "patch_text_spans"; sceneId: string; elementId: string; spans: TextSpan[] }
  | { operation: "add_scene"; scene: Scene }
  | { operation: "delete_scene"; sceneId: string }
  | { operation: "reorder_scenes"; fromIndex: number; toIndex: number }
  | { operation: "update_scene"; sceneId: string; patch: { name?: string; backgroundColor?: string; background?: Partial<SceneBackground> } }
  | { operation: "update_scene_duration"; sceneId: string; durationMs: number }
  | { operation: "set_brand_theme"; brandTheme: string | undefined }
  | { operation: "crop_image"; sceneId: string; elementId: string; crop: { x: number; y: number; width: number; height: number } }
  | { operation: "set_image_frame"; sceneId: string; elementId: string; frame: string | undefined }
  | { operation: "toggle_element_lock"; sceneId: string; elementId: string; locked: boolean }
  | { operation: "toggle_element_visibility"; sceneId: string; elementId: string; visible: boolean };

export function applyOperation(project: ProjectDocument, op: EditorOperation): ProjectDocument {
  switch (op.operation) {
    case "patch_element":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) =>
        mergeElementPatch(el, op.patch)
      );

    case "add_element": {
      const element = createElementNode({
        id: op.elementId,
        type: op.type,
        semanticRole: op.semanticRole,
        layout: op.layout,
        style: op.style,
        content: op.content
      });
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, elements: [...s.elements, element] }
        )
      };
    }

    case "delete_element":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, elements: s.elements.filter((el) => el.id !== op.elementId) }
        )
      };

    case "add_animation":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        animations: [...el.animations, op.animation]
      }));

    case "update_animation":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        animations: el.animations.map((a) =>
          a.id !== op.animationId ? a : { ...a, ...op.patch }
        )
      }));

    case "delete_animation":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        animations: el.animations.filter((a) => a.id !== op.animationId)
      }));

    case "set_element_motion_preset":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        motionPreset: op.motionPreset,
        animations: op.animations
      }));

    case "patch_text_spans":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        content: {
          ...el.content,
          richText: op.spans,
          text: op.spans.map((s) => s.text).join("")
        }
      }));

    case "add_scene": {
      const scenes = [...project.scenes, op.scene];
      return { ...project, scenes, timelineTracks: buildSequentialTimelineTracks(scenes) };
    }

    case "delete_scene": {
      const scenes = project.scenes.filter((s) => s.id !== op.sceneId);
      return { ...project, scenes, timelineTracks: buildSequentialTimelineTracks(scenes) };
    }

    case "reorder_scenes": {
      const scenes = [...project.scenes];
      const [moved] = scenes.splice(op.fromIndex, 1);
      scenes.splice(op.toIndex, 0, moved);
      return { ...project, scenes, timelineTracks: buildSequentialTimelineTracks(scenes) };
    }

    case "update_scene":
      return {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== op.sceneId) return s;
          const { background: bgPatch, ...rest } = op.patch;
          const merged = { ...s, ...rest };
          if (bgPatch) {
            merged.background = { ...s.background, ...bgPatch };
          }
          return merged;
        })
      };

    case "update_scene_duration":
      return updateSceneDuration(project, op.sceneId, Math.max(1000, op.durationMs));

    case "set_brand_theme":
      return { ...project, brandTheme: op.brandTheme };

    case "crop_image":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        content: { ...el.content, crop: op.crop }
      }));

    case "set_image_frame":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        content: { ...el.content, frame: op.frame }
      }));

    case "toggle_element_lock":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        layout: { ...el.layout, locked: op.locked }
      }));

    case "toggle_element_visibility":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        layout: { ...el.layout, visible: op.visible }
      }));
  }
}

// ─── Rich text span utilities ─────────────────────────────────────────────────

export function spansFromPlainText(text: string): TextSpan[] {
  return [{ text }];
}

function spanStyleKey(style: TextSpan["style"]): string {
  if (!style) return "";
  return [
    style.fontWeight ?? "",
    style.fontStyle ?? "",
    style.color ?? "",
    style.fontSize ?? "",
    style.fontFamily ?? ""
  ].join("|");
}

export function applySpanFormat(
  spans: TextSpan[],
  start: number,
  end: number,
  styleOverride: TextSpan["style"]
): TextSpan[] {
  // Flatten to characters
  const chars: Array<{ char: string; style: TextSpan["style"] }> = [];
  for (const span of spans) {
    for (const char of span.text) {
      chars.push({ char, style: span.style });
    }
  }

  // Apply override to the selected range
  for (let i = start; i < end && i < chars.length; i++) {
    chars[i] = { char: chars[i].char, style: { ...chars[i].style, ...styleOverride } };
  }

  // Re-group adjacent characters with identical styles into spans
  const result: TextSpan[] = [];
  let i = 0;
  while (i < chars.length) {
    const { style } = chars[i];
    const key = spanStyleKey(style);
    let text = chars[i].char;
    let j = i + 1;
    while (j < chars.length && spanStyleKey(chars[j].style) === key) {
      text += chars[j].char;
      j++;
    }
    result.push(style && Object.keys(style).length > 0 ? { text, style } : { text });
    i = j;
  }

  return result;
}

export function createPrototypeProject(): ProjectDocument {
  const scenes = [
    createScene({
      id: "scene_hook",
      name: "Hook",
      durationMs: 5000,
      backgroundColor: "#ffffff",
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
      backgroundColor: "#ffffff",
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
      backgroundColor: "#ffffff",
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
