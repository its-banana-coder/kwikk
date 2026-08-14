import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { opTool, jsonValue, applyOperation, toResult } from "../client.js";

/**
 * Mirrors the exact regex the renderer uses to sync a custom-CSS animation to
 * the deterministic timeline (packages/render-core/src/cssRenderer.ts,
 * _syncCustomAnimation). If this doesn't match, the renderer silently
 * defaults to a 1000ms duration instead of erroring — so we validate here and
 * give a clear message rather than let it fail silently downstream.
 */
const ANIMATION_MS_RE = /animation(?:-duration)?\s*:\s*[\w,\s]*?([\d.]+)\s*ms/;

function validateCustomCSS(css: string): string | null {
  if (!css.includes("@keyframes")) return "customCSS must include an @keyframes block. Call describe_custom_css_animation for the exact contract and worked examples.";
  if (!ANIMATION_MS_RE.test(css)) return "customCSS must include an \"animation:\" (or \"animation-duration:\") declaration with an explicit ms duration, e.g. \"animation: myAnim 3000ms ease-in-out infinite;\" — seconds (\"3s\") or unitless values won't sync to the timeline correctly. Call describe_custom_css_animation for details.";
  return null;
}

/**
 * Named tools for the remaining EditorOperation variants not covered by the
 * core set in tools/projects.ts (add_scene, patch_element, etc). Every
 * EditorOperation in packages/scene-graph/src/index.ts now has a matching
 * named tool here or in projects.ts — apply_operation (projects.ts) remains
 * as a fallback for any future variant added to the union before a named
 * tool exists for it.
 */
export function registerEditingTools(server: McpServer) {
  opTool(server, "duplicate_element",
    "Duplicate an element within a scene under a new element id.",
    { sceneId: z.string(), elementId: z.string(), newElementId: z.string() },
    (a) => ({ operation: "duplicate_element", sceneId: a.sceneId, elementId: a.elementId, newElementId: a.newElementId }));

  opTool(server, "duplicate_scene",
    "Duplicate a whole scene under a new scene id, remapping element ids via newElementIds ({ oldElementId: newElementId }).",
    { sceneId: z.string(), newSceneId: z.string(), newElementIds: z.record(z.string(), z.string()) },
    (a) => ({ operation: "duplicate_scene", sceneId: a.sceneId, newSceneId: a.newSceneId, newElementIds: a.newElementIds }));

  opTool(server, "clear_scene_elements",
    "Remove all elements from a scene, leaving the scene itself (background, duration) intact.",
    { sceneId: z.string() },
    (a) => ({ operation: "clear_scene_elements", sceneId: a.sceneId }));

  opTool(server, "patch_text_spans",
    "Replace a text element's rich-text spans (per-span color/weight/style overrides within one text block).",
    { sceneId: z.string(), elementId: z.string(), spans: z.array(jsonValue).describe("TextSpan[] — [{ text, color?, fontWeight?, ... }]") },
    (a) => ({ operation: "patch_text_spans", sceneId: a.sceneId, elementId: a.elementId, spans: a.spans }));

  opTool(server, "crop_image",
    "Set (or clear, if crop is omitted) an image element's crop rectangle in element-space coordinates.",
    { sceneId: z.string(), elementId: z.string(), crop: jsonValue.optional().describe("{ x, y, width, height } in element-space, or omit to clear crop") },
    (a) => ({ operation: "crop_image", sceneId: a.sceneId, elementId: a.elementId, crop: a.crop }));

  opTool(server, "set_image_frame",
    "Set (or clear) a decorative frame overlay on an image element (phone, laptop, polaroid, cinematic, etc).",
    { sceneId: z.string(), elementId: z.string(), frame: jsonValue.optional() },
    (a) => ({ operation: "set_image_frame", sceneId: a.sceneId, elementId: a.elementId, frame: a.frame }));

  opTool(server, "toggle_element_lock",
    "Lock or unlock an element (locked elements ignore layout patches from drag/resize, but content can still change).",
    { sceneId: z.string(), elementId: z.string(), locked: z.boolean() },
    (a) => ({ operation: "toggle_element_lock", sceneId: a.sceneId, elementId: a.elementId, locked: a.locked }));

  opTool(server, "toggle_element_visibility",
    "Show or hide an element without deleting it.",
    { sceneId: z.string(), elementId: z.string(), visible: z.boolean() },
    (a) => ({ operation: "toggle_element_visibility", sceneId: a.sceneId, elementId: a.elementId, visible: a.visible }));

  opTool(server, "set_element_timing",
    "Set the millisecond range (relative to the scene) an element is visible for.",
    { sceneId: z.string(), elementId: z.string(), startMs: z.number().int(), endMs: z.number().int() },
    (a) => ({ operation: "set_element_timing", sceneId: a.sceneId, elementId: a.elementId, startMs: a.startMs, endMs: a.endMs }));

  opTool(server, "add_subtitle",
    "Add a timed subtitle element to a scene (startMs/endMs relative to the scene, plus the caption text).",
    { sceneId: z.string(), elementId: z.string(), startMs: z.number().int(), endMs: z.number().int(), text: z.string() },
    (a) => ({ operation: "add_subtitle", sceneId: a.sceneId, elementId: a.elementId, startMs: a.startMs, endMs: a.endMs, text: a.text }));

  opTool(server, "set_video_trim",
    "Set a video element's in/out trim points (milliseconds within the source file).",
    { sceneId: z.string(), elementId: z.string(), trimStartMs: z.number().int(), trimEndMs: z.number().int() },
    (a) => ({ operation: "set_video_trim", sceneId: a.sceneId, elementId: a.elementId, trimStartMs: a.trimStartMs, trimEndMs: a.trimEndMs }));

  opTool(server, "set_video_playback_rate",
    "Set a video element's playback speed multiplier (1 = normal, 0.5 = half speed, 2 = double speed).",
    { sceneId: z.string(), elementId: z.string(), playbackRate: z.number().positive() },
    (a) => ({ operation: "set_video_playback_rate", sceneId: a.sceneId, elementId: a.elementId, playbackRate: a.playbackRate }));

  opTool(server, "set_scene_transition",
    "Set (or clear) the transition this scene uses to enter. See list_transitions for valid types and durationMs ranges.",
    { sceneId: z.string(), transition: jsonValue.optional().describe("{ type, durationMs } — omit to clear") },
    (a) => ({ operation: "set_scene_transition", sceneId: a.sceneId, transition: a.transition }));

  opTool(server, "set_scene_sfx",
    "Set (or clear) a scene's one-shot sound effect (e.g. whoosh on a hard cut).",
    { sceneId: z.string(), sfx: jsonValue.optional() },
    (a) => ({ operation: "set_scene_sfx", sceneId: a.sceneId, sfx: a.sfx }));

  opTool(server, "add_project_asset",
    "Add a media reference to THIS PROJECT's local asset library (used by the editor's asset-manager panel and " +
      "AI scene-compatibility reasoning) — richer metadata than the global catalog: vibe, energyLevel, " +
      "sceneCompatibility, motionCompatibility. NOTE: this is different from the `add_asset` tool, which uploads " +
      "a file into the global, cross-project asset catalog. Use add_asset first to get a hosted URL, then this " +
      "tool to reference it from the project (or pass an existing catalog asset's URL directly).",
    { asset: jsonValue.describe("Asset — { id, name, type, src, thumbnailSrc?, width?, height?, durationMs?, tags?, vibe?, energyLevel?, sceneCompatibility?, motionCompatibility? }") },
    (a) => ({ operation: "add_asset", asset: a.asset }));

  opTool(server, "delete_project_asset",
    "Remove a media reference from this project's local asset library (does not delete it from the global catalog).",
    { assetId: z.string() },
    (a) => ({ operation: "delete_asset", assetId: a.assetId }));

  opTool(server, "update_project_asset_metadata",
    "Patch a project-local asset reference's metadata (name, tags, vibe, energyLevel, sceneCompatibility, motionCompatibility, favorite, etc).",
    { assetId: z.string(), patch: jsonValue },
    (a) => ({ operation: "update_asset_metadata", assetId: a.assetId, patch: a.patch }));

  opTool(server, "add_audio_track",
    "Add a timeline audio track (music/VO/SFX) to the project, synced to timelineTracks time.",
    { track: jsonValue.describe("AudioTrack — { id, name, src, volume, startMs, trimStartMs, trimEndMs?, durationMs, fadeInMs, fadeOutMs, loop }") },
    (a) => ({ operation: "add_audio_track", track: a.track }));

  opTool(server, "delete_audio_track",
    "Remove a timeline audio track by id.",
    { trackId: z.string() },
    (a) => ({ operation: "delete_audio_track", trackId: a.trackId }));

  opTool(server, "update_audio_track",
    "Patch a timeline audio track's volume/timing/fades/loop (not its id, src, or durationMs).",
    { trackId: z.string(), patch: jsonValue },
    (a) => ({ operation: "update_audio_track", trackId: a.trackId, patch: a.patch }));

  opTool(server, "set_text_curve",
    "Set (or clear) a text element's curved-text layout (arc or wave).",
    { sceneId: z.string(), elementId: z.string(), curve: jsonValue.optional().describe("{ type: 'arc'|'wave', radius?, amplitude?, reversed? } — omit to clear") },
    (a) => ({ operation: "set_text_curve", sceneId: a.sceneId, elementId: a.elementId, curve: a.curve }));

  opTool(server, "apply_scene_motion_preset",
    "Apply a full motion preset bundle to a scene in one call: transition and per-element animations " +
      "(replaces each listed element's existing animations). See list_motion_presets for preset ideas.",
    {
      sceneId: z.string(),
      transition: jsonValue.nullable().describe("SceneTransition or null to leave unset"),
      elementAnimations: z.record(z.string(), z.array(jsonValue)).describe("{ elementId: Animation[] }"),
    },
    (a) => ({ operation: "apply_scene_motion_preset", sceneId: a.sceneId, transition: a.transition, elementAnimations: a.elementAnimations }));

  opTool(server, "add_composition",
    "Add a composition instance (a sealed, multi-asset animation like a product card, book flip, or fireworks " +
      "burst) to a scene. The composition `type` must be one of the existing catalog entries — new composition " +
      "types require engine code, not this tool.",
    { sceneId: z.string(), composition: jsonValue.describe("CompositionNode — { id, compositionType, slots, params?, startMs, endMs, layout? }") },
    (a) => ({ operation: "add_composition", sceneId: a.sceneId, composition: a.composition }));

  opTool(server, "delete_composition",
    "Remove a composition instance from a scene.",
    { sceneId: z.string(), compositionId: z.string() },
    (a) => ({ operation: "delete_composition", sceneId: a.sceneId, compositionId: a.compositionId }));

  opTool(server, "update_composition",
    "Patch a composition instance's slots, params, layout, or timing.",
    { sceneId: z.string(), compositionId: z.string(), patch: jsonValue.describe("{ slots?, params?, layout?, startMs?, endMs? }") },
    (a) => ({ operation: "update_composition", sceneId: a.sceneId, compositionId: a.compositionId, patch: a.patch }));

  opTool(server, "apply_temporal_design",
    "Assign cinematic temporal zones (hook/reveal/emphasis/payoff) to a scene's elements, adjusting their " +
      "startMs/staggerDelayMs to match that pacing structure.",
    { sceneId: z.string(), zones: z.record(z.string(), z.string()).describe("{ elementId: 'hook'|'reveal'|'emphasis'|'payoff' }") },
    (a) => ({ operation: "apply_temporal_design", sceneId: a.sceneId, zones: a.zones }));

  opTool(server, "apply_cinematic_palette",
    "Apply one of the built-in cinematic color palettes to the project's brandTheme.",
    { paletteKey: z.string(), overrides: jsonValue.optional().describe("Partial<BrandTheme> layered on top of the palette") },
    (a) => ({ operation: "apply_cinematic_palette", paletteKey: a.paletteKey, overrides: a.overrides }));

  opTool(server, "apply_font_system",
    "Apply one of the built-in premium font-pair systems to all text elements in a scene, by semantic role.",
    { sceneId: z.string(), fontSystemKey: z.string() },
    (a) => ({ operation: "apply_font_system", sceneId: a.sceneId, fontSystemKey: a.fontSystemKey }));

  opTool(server, "set_scene_rhythm",
    "Set a scene's rhythm pattern and/or its dominant focal element (which element the pacing centers on).",
    { sceneId: z.string(), rhythmPattern: z.string().optional(), dominantFocalId: z.string().optional() },
    (a) => ({ operation: "set_scene_rhythm", sceneId: a.sceneId, rhythmPattern: a.rhythmPattern, dominantFocalId: a.dominantFocalId }));

  server.tool(
    "set_custom_animation",
    "Author a genuinely custom animation or visual effect on one element — for anything list_animation_types, " +
      "list_motion_presets, and list_visual_effects don't already cover (e.g. 'balloons flying', a motion " +
      "translated from a reference image/video you were shown). CALL describe_custom_css_animation FIRST — it " +
      "explains the exact contract (scoping, required ms duration, deterministic timeline sync) with worked " +
      "examples. This sets element.style.customCSS via patch_element; it does not add new visual layers — for a " +
      "multi-part illustration (e.g. balloon + string), give each part its own element.",
    {
      projectId: z.union([z.string(), z.number()]),
      sceneId: z.string(),
      elementId: z.string(),
      css: z.string().describe("Raw CSS: an @keyframes block plus an animation: declaration with an explicit ms duration"),
    },
    async ({ projectId, sceneId, elementId, css }: { projectId: number | string; sceneId: string; elementId: string; css: string }) => {
      const validationError = validateCustomCSS(css);
      if (validationError) return { content: [{ type: "text" as const, text: validationError }], isError: true };
      return toResult(() => applyOperation(projectId, {
        operation: "patch_element", sceneId, elementId, patch: { style: { customCSS: css } },
      }));
    }
  );
}
