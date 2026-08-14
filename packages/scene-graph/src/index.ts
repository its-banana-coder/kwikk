import type {
  Animation,
  Asset,
  AudioTrack,
  BrandTheme,
  CompositionNode,
  CompositionParams,
  CropProps,
  ElementContent,
  ElementNode,
  ElementType,
  LayoutProps,
  ManualOverrides,
  ProjectDocument,
  Scene,
  SceneBackground,
  SceneRhythmPattern,
  SceneSfx,
  SceneTransition,
  StyleProps,
  TemporalZone,
  TextCurveConfig,
  TextSpan,
  TimelineTrack,
  Viewport
} from "@kwikk/shared-types";

export const DEFAULT_VIEWPORT: Viewport = {
  width: 1080,
  height: 1920
};

/**
 * Named dimension presets. Not the only valid viewports — validateProjectDocument
 * accepts any positive integer width/height within MIN/MAX_VIEWPORT_DIMENSION — but
 * these cover the common cases and are what create_project/set_viewport document as
 * recommended starting points.
 */
export const VIEWPORT_PRESETS: Record<string, Viewport & { label: string }> = {
  reels:        { label: "Reels / TikTok / Story (9:16)", width: 1080, height: 1920 },
  square:       { label: "Square (1:1)",                   width: 1080, height: 1080 },
  landscape:    { label: "YouTube / Landscape (16:9)",      width: 1920, height: 1080 },
  portrait_4_5: { label: "Instagram Portrait (4:5)",        width: 1080, height: 1350 },
};

export const MIN_VIEWPORT_DIMENSION = 200;
export const MAX_VIEWPORT_DIMENSION = 4096;

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
  // DEFAULT_STYLE.backgroundColor: "transparent" is a text-box default. For
  // "shape" elements it isn't just a no-op default — cssRenderer's
  // buildShapeContent() treats an explicit "transparent" as a real fill
  // value (vs. `undefined`, which resolves to the default gray fill), so
  // merging it in here made every shape created via add_element invisible
  // unless the caller also passed a fill. Shapes must keep backgroundColor
  // unset unless the caller explicitly provides one.
  const { backgroundColor: _unusedDefaultBg, ...defaultStyleWithoutBg } = DEFAULT_STYLE;
  const baseStyle = input.type === "shape" ? defaultStyleWithoutBg : DEFAULT_STYLE;

  return {
    id: input.id,
    type: input.type,
    semanticRole: input.semanticRole,
    layout: {
      ...DEFAULT_LAYOUT,
      ...input.layout
    },
    style: {
      ...baseStyle,
      ...input.style
    },
    animations: input.animations ?? [],
    overrides: input.overrides,
    content: input.content
  };
}

/**
 * Backfills the required-but-easy-to-drop fields (`style`, `animations`) on every element
 * in a document, recursing into `children`. Elements normally get these defaults from
 * createElementNode(), but documents can also enter storage as a full overwrite (editor
 * autosave's PUT /v1/projects/:id) that bypasses that factory entirely — this is the
 * backstop that keeps the ElementNode contract (style: StyleProps, animations: Animation[],
 * both non-optional) true regardless of entry point.
 */
export function ensureElementDefaults(element: ElementNode): ElementNode {
  const needsStyle = element.style == null;
  const needsAnimations = element.animations == null;
  const children = element.children?.map(ensureElementDefaults);
  const childrenChanged = children && children.some((c, i) => c !== element.children![i]);
  if (!needsStyle && !needsAnimations && !childrenChanged) return element;
  return {
    ...element,
    style: needsStyle ? {} : element.style,
    animations: needsAnimations ? [] : element.animations,
    ...(children ? { children } : {})
  };
}

export function ensureProjectDocumentDefaults(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      elements: scene.elements.map(ensureElementDefaults)
    }))
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
    // Animations that play during the incoming crossfade should not restart
    // when the scene becomes the active track. startOffsetMs records how far
    // into the scene the animation clock was at the transition boundary so
    // localTimeMs can be offset accordingly.
    const prevTransitionDuration = index > 0 ? (scenes[index - 1]?.transition?.durationMs ?? 0) : 0;

    const track: TimelineTrack = {
      id: `track_${scene.id}`,
      sceneId: scene.id,
      startMs: currentStartMs,
      durationMs: scene.durationMs,
      layer: index,
      ...(prevTransitionDuration > 0 ? { startOffsetMs: prevTransitionDuration } : {}),
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

const VALID_ELEMENT_TYPES = new Set(["text", "image", "video", "shape", "animated_stat", "graph"]);

export function validateProjectDocument(project: ProjectDocument): string[] {
  const errors: string[] = [];

  // Top-level required fields
  if (!project.id) errors.push("project.id is required");
  if (!project.name) errors.push("project.name is required");
  if (!project.viewport) {
    errors.push("project.viewport is required — e.g. {width:1080,height:1920} for reels, {width:1920,height:1080} for landscape");
  } else {
    const { width, height } = project.viewport;
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width < MIN_VIEWPORT_DIMENSION || width > MAX_VIEWPORT_DIMENSION ||
        height < MIN_VIEWPORT_DIMENSION || height > MAX_VIEWPORT_DIMENSION) {
      errors.push(
        `viewport width/height must be integers between ${MIN_VIEWPORT_DIMENSION} and ${MAX_VIEWPORT_DIMENSION}px, got ${JSON.stringify(project.viewport)}`
      );
    }
  }
  if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
    errors.push("scenes array must not be empty");
    return errors; // can't iterate scenes safely
  }
  if (!Array.isArray(project.timelineTracks)) {
    errors.push("timelineTracks array is required");
  }

  const sceneIds = new Set<string>();
  const elementIds = new Set<string>();

  for (const scene of project.scenes) {
    if (!scene.id) { errors.push("A scene is missing its id"); continue; }
    if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    sceneIds.add(scene.id);

    if (!scene.durationMs || scene.durationMs <= 0) {
      errors.push(`Scene ${scene.id}: durationMs must be a positive number`);
    }
    if (!Array.isArray(scene.elements) || scene.elements.length === 0) {
      errors.push(`Scene ${scene.id}: elements array must not be empty`);
    }

    for (const el of scene.elements ?? []) {
      if (!el.id) { errors.push(`Scene ${scene.id}: an element is missing its id`); continue; }
      if (elementIds.has(el.id)) errors.push(`Duplicate element id: ${el.id}`);
      elementIds.add(el.id);

      if (!VALID_ELEMENT_TYPES.has(el.type)) {
        errors.push(`Element ${el.id}: invalid type "${el.type}" — must be text|image|video|shape`);
      }
      if (!el.semanticRole) {
        errors.push(`Element ${el.id}: semanticRole is required`);
      }
      if (!el.layout) {
        errors.push(`Element ${el.id}: layout is required`);
      } else {
        if (typeof el.layout.x !== "number") errors.push(`Element ${el.id}: layout.x must be a number`);
        if (typeof el.layout.y !== "number") errors.push(`Element ${el.id}: layout.y must be a number`);
        if (!el.layout.width || el.layout.width <= 0) errors.push(`Element ${el.id}: layout.width must be positive`);
        if (!el.layout.height || el.layout.height <= 0) errors.push(`Element ${el.id}: layout.height must be positive`);
      }
    }
  }

  for (const track of project.timelineTracks ?? []) {
    if (!sceneIds.has(track.sceneId)) {
      errors.push(`Timeline track ${track.id} references missing scene ${track.sceneId}`);
    }
  }

  const audioIds = new Set<string>();
  for (const t of project.audioTracks ?? []) {
    if (audioIds.has(t.id)) errors.push(`Duplicate audio track id: ${t.id}`);
    audioIds.add(t.id);
    if (t.durationMs <= 0) errors.push(`Audio track ${t.id}: durationMs must be positive`);
    const trimEnd = t.trimEndMs ?? t.durationMs;
    if (t.trimStartMs < 0 || t.trimStartMs > trimEnd) errors.push(`Audio track ${t.id}: invalid trimStartMs`);
    if (t.trimEndMs !== undefined && (t.trimEndMs < t.trimStartMs || t.trimEndMs > t.durationMs)) {
      errors.push(`Audio track ${t.id}: invalid trimEndMs`);
    }
  }

  const compositionIds = new Set<string>();
  for (const scene of project.scenes) {
    for (const comp of scene.compositions ?? []) {
      if (!comp.id) { errors.push(`Scene ${scene.id}: a composition is missing its id`); continue; }
      if (compositionIds.has(comp.id)) errors.push(`Duplicate composition id: ${comp.id}`);
      compositionIds.add(comp.id);
      if (!comp.compositionType) errors.push(`Composition ${comp.id}: compositionType is required`);
      if (!comp.layout) errors.push(`Composition ${comp.id}: layout is required`);
      if (!Array.isArray(comp.slots)) {
        errors.push(`Composition ${comp.id}: slots must be an array`);
      }
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

function cloneElementDuplicate(root: ElementNode, newRootId: string): ElementNode {
  function walk(node: ElementNode, newId: string, isRoot: boolean): ElementNode {
    return {
      ...node,
      id: newId,
      layout: isRoot
        ? { ...node.layout, x: node.layout.x + 20, y: node.layout.y + 20 }
        : { ...node.layout },
      animations: node.animations.map((a) => ({ ...a, id: `${newId}_anim_${a.id}` })),
      children: node.children?.map((child) => walk(child, `${newId}_sub_${child.id}`, false))
    };
  }
  return walk(root, newRootId, true);
}

function findElementNodeInList(elements: ElementNode[], elementId: string): ElementNode | undefined {
  for (const el of elements) {
    if (el.id === elementId) return el;
    if (el.children?.length) {
      const nested = findElementNodeInList(el.children, elementId);
      if (nested) return nested;
    }
  }
  return undefined;
}

function insertDuplicatedElement(
  elements: ElementNode[],
  elementId: string,
  clone: ElementNode
): ElementNode[] | null {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.id === elementId) {
      const next = [...elements];
      next.splice(i + 1, 0, clone);
      return next;
    }
    if (el.children?.length) {
      const childList = insertDuplicatedElement(el.children, elementId, clone);
      if (childList) {
        const next = [...elements];
        next[i] = { ...el, children: childList };
        return next;
      }
    }
  }
  return null;
}

function remapElementsForSceneDuplicate(elements: ElementNode[], newElementIds: Record<string, string>): ElementNode[] {
  return elements.map((el) => remapElementForSceneDuplicate(el, newElementIds));
}

function remapElementForSceneDuplicate(el: ElementNode, newElementIds: Record<string, string>): ElementNode {
  const newId = newElementIds[el.id];
  if (!newId) {
    return el;
  }
  return {
    ...el,
    id: newId,
    animations: el.animations.map((a) => ({ ...a, id: `${newId}_anim_${a.id}` })),
    children: el.children?.map((ch) => remapElementForSceneDuplicate(ch, newElementIds))
  };
}

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
  | { operation: "duplicate_element"; sceneId: string; elementId: string; newElementId: string }
  | { operation: "duplicate_scene"; sceneId: string; newSceneId: string; newElementIds: Record<string, string> }
  | { operation: "add_animation"; sceneId: string; elementId: string; animation: Animation }
  | { operation: "update_animation"; sceneId: string; elementId: string; animationId: string; patch: Partial<Omit<Animation, "id">> }
  | { operation: "delete_animation"; sceneId: string; elementId: string; animationId: string }
  | { operation: "set_element_motion_preset"; sceneId: string; elementId: string; motionPreset: string | undefined; animations: Animation[] }
  | { operation: "patch_text_spans"; sceneId: string; elementId: string; spans: TextSpan[] }
  | { operation: "add_scene"; scene: Scene }
  | { operation: "delete_scene"; sceneId: string }
  | { operation: "clear_scene_elements"; sceneId: string }
  | { operation: "reorder_scenes"; fromIndex: number; toIndex: number }
  | { operation: "update_scene"; sceneId: string; patch: { name?: string; backgroundColor?: string; background?: Partial<SceneBackground> } }
  | { operation: "update_scene_duration"; sceneId: string; durationMs: number }
  | { operation: "set_brand_theme"; brandTheme: BrandTheme | undefined }
  | { operation: "set_viewport"; viewport: Viewport }
  | { operation: "crop_image"; sceneId: string; elementId: string; crop: CropProps | undefined }
  | { operation: "set_image_frame"; sceneId: string; elementId: string; frame: ElementContent["frame"] }
  | { operation: "toggle_element_lock"; sceneId: string; elementId: string; locked: boolean }
  | { operation: "toggle_element_visibility"; sceneId: string; elementId: string; visible: boolean }
  | { operation: "set_element_timing"; sceneId: string; elementId: string; startMs: number; endMs: number }
  | { operation: "add_subtitle"; sceneId: string; elementId: string; startMs: number; endMs: number; text: string }
  | { operation: "set_video_trim"; sceneId: string; elementId: string; trimStartMs: number; trimEndMs: number }
  | { operation: "set_video_playback_rate"; sceneId: string; elementId: string; playbackRate: number }
  | { operation: "set_scene_transition"; sceneId: string; transition: SceneTransition | undefined }
  | { operation: "set_scene_sfx"; sceneId: string; sfx: SceneSfx | undefined }
  | { operation: "add_asset"; asset: Asset }
  | { operation: "delete_asset"; assetId: string }
  | {
      operation: "update_asset_metadata";
      assetId: string;
      patch: Partial<
        Pick<
          Asset,
          | "name"
          | "tags"
          | "vibe"
          | "energyLevel"
          | "sceneCompatibility"
          | "motionCompatibility"
          | "favorite"
          | "thumbnailSrc"
          | "width"
          | "height"
          | "durationMs"
        >
      >;
    }
  | { operation: "add_audio_track"; track: AudioTrack }
  | { operation: "delete_audio_track"; trackId: string }
  | {
      operation: "update_audio_track";
      trackId: string;
      patch: Partial<Omit<AudioTrack, "id" | "src" | "durationMs">>;
    }
  | { operation: "set_text_curve"; sceneId: string; elementId: string; curve: TextCurveConfig | undefined }
  | {
      operation: "apply_scene_motion_preset";
      sceneId: string;
      /** Transition to set (if not null). */
      transition: import("@kwikk/shared-types").SceneTransition | null;
      /** Map from elementId → animations to replace all existing animations. */
      elementAnimations: Record<string, import("@kwikk/shared-types").Animation[]>;
    }
  | { operation: "add_composition"; sceneId: string; composition: CompositionNode }
  | { operation: "delete_composition"; sceneId: string; compositionId: string }
  | {
      operation: "update_composition";
      sceneId: string;
      compositionId: string;
      patch: {
        slots?: CompositionNode["slots"];
        params?: CompositionParams;
        layout?: Partial<LayoutProps>;
        startMs?: number;
        endMs?: number;
      };
    }
  // ── v2 Premium Motion Intelligence operations ────────────────────────────────
  /**
   * Assigns temporal zones to elements — hook (0–500ms), reveal (500–1400ms),
   * emphasis (1400–2500ms), payoff (2500ms+) — and adjusts their startMs/staggerDelayMs
   * to honour the cinematic temporal design structure.
   */
  | {
      operation: "apply_temporal_design";
      sceneId: string;
      /** Map from elementId → temporal zone to assign. */
      zones: Record<string, TemporalZone>;
    }
  /**
   * Applies one of the 3 cinematic palettes to the project brandTheme.
   * paletteKey must be a key of CINEMATIC_PALETTES.
   */
  | {
      operation: "apply_cinematic_palette";
      paletteKey: string;
      /** Optional extra overrides layered on top of the palette. */
      overrides?: Partial<BrandTheme>;
    }
  /**
   * Applies one of the 5 premium font systems to all text elements by semantic role.
   * Headline font → hook_title, hero_phrase, section_title, cta_button.
   * Body font → hook_subtitle, body_copy, supporting_caption, cta_label.
   */
  | {
      operation: "apply_font_system";
      sceneId: string;
      fontSystemKey: string;
    }
  /**
   * Sets the scene's rhythm pattern and dominant focal element.
   */
  | {
      operation: "set_scene_rhythm";
      sceneId: string;
      rhythmPattern?: SceneRhythmPattern;
      dominantFocalId?: string;
    };

/**
 * Aliases loose/legacy style field names AI clients sometimes send to the canonical
 * fields the renderer actually reads:
 *   - style.fillColor / style.background / style.fill → style.backgroundColor
 *     (StyleProps has no `fill` — CSSSceneRenderer's buildShapeContent only reads
 *     backgroundColor, so an unaliased `fill` silently falls back to the renderer's
 *     default shape color instead of the color the caller intended)
 *   - style.opacity (not a real StyleProps field) → layout.opacity
 *     (LayoutProps.opacity is the only field CSSSceneRenderer applies as alpha)
 * Applied inside applyOperation — not just at the create_project API boundary — so
 * every mutation path (editor, MCP add_element/patch_element, direct callers) gets
 * this for free, per CLAUDE.md's single structured-operation pipeline. Never drops
 * the original keys; only fills in the canonical field when it's still unset.
 */
function normalizeStyleAndLayout(
  style: Partial<StyleProps> | undefined,
  layout: Partial<LayoutProps> | undefined
): { style: Partial<StyleProps> | undefined; layout: Partial<LayoutProps> | undefined } {
  if (!style) return { style, layout };
  const raw = style as Record<string, unknown>;
  let nextStyle = style;
  let nextLayout = layout;

  const fillAlias = raw.fillColor ?? raw.background ?? raw.fill;
  if (fillAlias !== undefined && style.backgroundColor === undefined) {
    nextStyle = { ...nextStyle, backgroundColor: fillAlias as string };
  }

  if (typeof raw.opacity === "number" && layout?.opacity === undefined) {
    nextLayout = { ...(nextLayout ?? {}), opacity: raw.opacity };
  }

  return { style: nextStyle, layout: nextLayout };
}

export function applyOperation(project: ProjectDocument, op: EditorOperation): ProjectDocument {
  switch (op.operation) {
    case "patch_element":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => {
        const { style, layout } = normalizeStyleAndLayout(op.patch.style, op.patch.layout);
        const normalizedPatch = { ...op.patch, style, layout };
        const patch = el.layout.locked && normalizedPatch.layout
          ? { ...normalizedPatch, layout: undefined }
          : normalizedPatch;
        return mergeElementPatch(el, patch);
      });

    case "add_element": {
      const { style, layout } = normalizeStyleAndLayout(op.style, op.layout);
      const element = createElementNode({
        id: op.elementId,
        type: op.type,
        semanticRole: op.semanticRole,
        layout,
        style,
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

    case "duplicate_element": {
      const scene = project.scenes.find((s) => s.id === op.sceneId);
      const el = scene ? findElementNodeInList(scene.elements, op.elementId) : undefined;
      if (!el || !scene) return project;
      const clone = cloneElementDuplicate(el, op.newElementId);
      const nextElements = insertDuplicatedElement(scene.elements, op.elementId, clone);
      if (!nextElements) return project;
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, elements: nextElements }
        )
      };
    }

    case "duplicate_scene": {
      const scene = project.scenes.find((s) => s.id === op.sceneId);
      if (!scene) return project;
      const clone: Scene = {
        ...scene,
        id: op.newSceneId,
        name: `${scene.name} (copy)`,
        elements: remapElementsForSceneDuplicate(scene.elements, op.newElementIds)
      };
      const idx = project.scenes.indexOf(scene);
      const scenes = [...project.scenes.slice(0, idx + 1), clone, ...project.scenes.slice(idx + 1)];
      return { ...project, scenes, timelineTracks: buildSequentialTimelineTracks(scenes) };
    }

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

    case "clear_scene_elements":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, elements: [], compositions: [] }
        ),
      };

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

    case "set_viewport":
      // Updates canvas dimensions only — existing element layouts are NOT
      // rescaled. Best applied before adding content, or followed up with
      // layout patches on existing elements.
      return { ...project, viewport: op.viewport };

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

    case "set_element_timing":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        startMs: op.startMs,
        endMs: op.endMs
      }));

    case "add_subtitle": {
      const vh = project.viewport.height;
      const vw = project.viewport.width;
      const element: ElementNode = {
        id: op.elementId,
        type: "text",
        semanticRole: "subtitle",
        layout: {
          x: 40,
          y: vh - 280,
          width: vw - 80,
          height: 180,
          rotation: 0,
          scale: 1,
          opacity: 1,
          zIndex: 10
        },
        style: {
          ...DEFAULT_STYLE,
          fontSize: 52,
          fontWeight: "700",
          color: "#ffffff",
          textAlign: "center",
          backgroundColor: "transparent"
        },
        animations: [],
        content: { text: op.text },
        startMs: op.startMs,
        endMs: op.endMs
      };
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, elements: [...s.elements, element] }
        )
      };
    }

    case "set_video_trim":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        content: { ...el.content, trimStartMs: op.trimStartMs, trimEndMs: op.trimEndMs }
      }));

    case "set_video_playback_rate":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        content: { ...el.content, playbackRate: op.playbackRate }
      }));

    case "set_scene_transition":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, transition: op.transition }
        )
      };

    case "add_asset":
      return {
        ...project,
        assets: [...(project.assets ?? []), op.asset]
      };

    case "delete_asset":
      return {
        ...project,
        assets: (project.assets ?? []).filter((a) => a.id !== op.assetId)
      };

    case "update_asset_metadata":
      return {
        ...project,
        assets: (project.assets ?? []).map((a) => (a.id !== op.assetId ? a : { ...a, ...op.patch }))
      };

    case "add_audio_track":
      return {
        ...project,
        audioTracks: [...(project.audioTracks ?? []), op.track]
      };

    case "delete_audio_track":
      return {
        ...project,
        audioTracks: (project.audioTracks ?? []).filter((t) => t.id !== op.trackId)
      };

    case "update_audio_track":
      return {
        ...project,
        audioTracks: (project.audioTracks ?? []).map((t) =>
          t.id !== op.trackId ? t : { ...t, ...op.patch }
        )
      };

    case "set_text_curve":
      return updateSceneElement(project, op.sceneId, op.elementId, (el) => ({
        ...el,
        content: { ...el.content, textCurve: op.curve }
      }));

    case "set_scene_sfx":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, sfx: op.sfx }
        )
      };

    case "apply_scene_motion_preset":
      return {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== op.sceneId) return s;
          const updatedScene = {
            ...s,
            ...(op.transition !== null ? { transition: op.transition } : {}),
            elements: s.elements.map((el) => {
              const anims = op.elementAnimations[el.id];
              return anims !== undefined ? { ...el, animations: anims } : el;
            }),
          };
          return updatedScene;
        }),
      };

    case "add_composition":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, compositions: [...(s.compositions ?? []), op.composition] }
        ),
      };

    case "delete_composition":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId ? s : { ...s, compositions: (s.compositions ?? []).filter((c) => c.id !== op.compositionId) }
        ),
      };

    case "update_composition":
      return {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== op.sceneId) return s;
          return {
            ...s,
            compositions: (s.compositions ?? []).map((c) => {
              if (c.id !== op.compositionId) return c;
              const { layout, ...rest } = op.patch;
              return {
                ...c,
                ...rest,
                layout: layout ? { ...c.layout, ...layout } : c.layout,
              };
            }),
          };
        }),
      };

    case "apply_temporal_design": {
      // Zone → staggerDelayMs offsets following the temporal design spec
      const ZONE_OFFSETS: Record<TemporalZone, number> = {
        hook:     0,
        reveal:   500,
        emphasis: 1400,
        payoff:   2500,
      };
      return {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== op.sceneId) return s;
          return {
            ...s,
            elements: s.elements.map((el) => {
              const zone = op.zones[el.id];
              if (!zone) return el;
              return {
                ...el,
                temporalZone: zone,
                staggerDelayMs: ZONE_OFFSETS[zone],
              };
            }),
          };
        }),
      };
    }

    case "apply_cinematic_palette": {
      // Lazy import keeps the scene-graph free of shared-types runtime constants
      // but we inline the palette data here for zero-dep handling
      const PALETTES: Record<string, { bg: string; surface: string; primary: string; accent: string }> = {
        cinematic_tech:     { bg: "#0B1020", surface: "#111827", primary: "#60A5FA", accent: "#A78BFA" },
        apple_minimal:      { bg: "#F5F5F7", surface: "#FFFFFF", primary: "#111111", accent: "#0071E3" },
        luxury_editorial:   { bg: "#111111", surface: "#1C1C1C", primary: "#E7D3B1", accent: "#C4A882" },
      };
      const palette = PALETTES[op.paletteKey];
      if (!palette) return project;
      const theme: BrandTheme = {
        ...project.brandTheme,
        backgroundColor: palette.bg,
        primaryColor: palette.primary,
        accentColor: palette.accent,
        secondaryColor: palette.surface,
        ...op.overrides,
      };
      return { ...project, brandTheme: theme };
    }

    case "apply_font_system": {
      const HEADLINE_ROLES = new Set(["hook_title", "hero_phrase", "section_title", "cta_button"]);
      const BODY_ROLES = new Set(["hook_subtitle", "body_copy", "supporting_caption", "cta_label", "subtitle"]);
      const FONT_SYSTEMS: Record<string, { headline: string; body: string }> = {
        tech:        { headline: "Satoshi",          body: "Inter" },
        documentary: { headline: "Neue Montreal",    body: "IBM Plex Sans" },
        viral:       { headline: "Anton",            body: "General Sans" },
        luxury:      { headline: "Canela",           body: "Suisse Intl" },
        apple_style: { headline: "SF Pro Display",   body: "SF Pro Text" },
      };
      const fs = FONT_SYSTEMS[op.fontSystemKey];
      if (!fs) return project;
      return {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== op.sceneId) return s;
          return {
            ...s,
            elements: s.elements.map((el) => {
              if (el.type !== "text") return el;
              const role = el.semanticRole ?? "";
              const fontFamily = HEADLINE_ROLES.has(role)
                ? fs.headline
                : BODY_ROLES.has(role)
                  ? fs.body
                  : undefined;
              if (!fontFamily) return el;
              return {
                ...el,
                style: { ...el.style, fontFamily },
              };
            }),
          };
        }),
      };
    }

    case "set_scene_rhythm":
      return {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id !== op.sceneId
            ? s
            : {
                ...s,
                ...(op.rhythmPattern !== undefined ? { rhythmPattern: op.rhythmPattern } : {}),
                ...(op.dominantFocalId !== undefined ? { dominantFocalId: op.dominantFocalId } : {}),
              }
        ),
      };

    default:
      return project;
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

// ─── Narrative Beat Reel template ────────────────────────────────────────────
// 3 scenes: hook question → tension → payoff. Each has a centered hero_phrase,
// full-bleed background image slot, cinematic transition, and SFX slot.

export function createNarrativeReelProject(): ProjectDocument {
  function beatScene(opts: {
    id: string;
    name: string;
    durationMs: number;
    bgColor: string;
    bgColor2?: string;
    phrase: string;
    phraseColor: string;
    inAnim: import("@kwikk/shared-types").AnimationType;
    outAnim: import("@kwikk/shared-types").AnimationType;
    transition?: import("@kwikk/shared-types").SceneTransition;
  }): import("@kwikk/shared-types").Scene {
    const phraseId = `${opts.id}_phrase`;
    const backdropId = `${opts.id}_backdrop`;
    const outStartMs = opts.durationMs - 500;

    const base = createScene({
      id: opts.id,
      name: opts.name,
      durationMs: opts.durationMs,
      backgroundColor: opts.bgColor,
      elements: [
        createElementNode({
          id: backdropId,
          type: "image",
          semanticRole: "scene_backdrop",
          layout: { x: 0, y: 0, width: 1080, height: 1920, zIndex: 0, opacity: 0.55 },
          style: {},
          content: { src: "placeholder://cinematic background", label: "Background" }
        }),
        createElementNode({
          id: phraseId,
          type: "text",
          semanticRole: "hero_phrase",
          layout: { x: 60, y: 760, width: 960, height: 400, zIndex: 5, opacity: 1 },
          style: {
            fontSize: 120,
            fontWeight: 900,
            color: opts.phraseColor,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: -2,
            textShadow: { offsetX: 0, offsetY: 4, blur: 24, color: "#000000", alpha: 0.45 }
          },
          animations: [
            { id: `${phraseId}_in`, type: opts.inAnim, startMs: 0, durationMs: 400, easing: "easeOut" },
            { id: `${phraseId}_out`, type: opts.outAnim, startMs: outStartMs, durationMs: 400, easing: "easeIn" }
          ],
          content: { text: opts.phrase }
        })
      ]
    });
    return {
      ...base,
      background: opts.bgColor2
        ? { color: opts.bgColor, color2: opts.bgColor2, gradientAngle: 160 }
        : { color: opts.bgColor },
      ...(opts.transition ? { transition: opts.transition } : {})
    };
  }

  const scenes = [
    beatScene({
      id: "beat_hook",
      name: "Hook",
      durationMs: 2500,
      bgColor: "#0a0a0a",
      bgColor2: "#1e1b4b",
      phrase: "Are you?",
      phraseColor: "#ffffff",
      inAnim: "slam_down",
      outAnim: "whip_exit",
      transition: { type: "whip_pan_right", durationMs: 300 }
    }),
    beatScene({
      id: "beat_tension",
      name: "Tension",
      durationMs: 2000,
      bgColor: "#0f172a",
      bgColor2: "#7c2d12",
      phrase: "Ready?",
      phraseColor: "#f97316",
      inAnim: "spring_in",
      outAnim: "whip_exit",
      transition: { type: "flash_cut", durationMs: 200 }
    }),
    beatScene({
      id: "beat_payoff",
      name: "Payoff",
      durationMs: 4000,
      bgColor: "#000000",
      phrase: "Just Drop It.",
      phraseColor: "#ffffff",
      inAnim: "depth_charge",
      outAnim: "fadeOut",
      transition: { type: "spin_in", durationMs: 400 }
    })
  ];

  return createProjectDocument({
    id: "narrative-beat-reel",
    name: "Narrative Beat Reel",
    scenes
  });
}
