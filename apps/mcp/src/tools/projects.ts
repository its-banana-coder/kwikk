import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiPost, applyOperation, callTool, toResult, opTool, jsonValue } from "../client.js";

export function registerProjectTools(server: McpServer) {
  server.tool(
    "list_projects",
    "List all kwikk video projects (id, title, status, timestamps).",
    {},
    async () => toResult(() => apiGet("/v1/projects"))
  );

  server.tool(
    "get_project",
    "Get a project's full ProjectDocument (scenes, elements, timeline, brandTheme) by id.",
    { projectId: z.union([z.string(), z.number()]) },
    async ({ projectId }: { projectId: number | string }) => toResult(() => apiGet(`/v1/projects/${projectId}`))
  );

  server.tool(
    "create_project",
    "Create a new project from a complete ProjectDocument (id, name, scenes[], timelineTracks, viewport?, " +
      "brandTheme?). Validates and normalizes the document server-side (fills layout/animation defaults, infers " +
      "semanticRole, generates timelineTracks if omitted) before saving. Use this to bootstrap a whole video in " +
      "one call; use the per-scene/per-element tools afterwards to iterate. " +
      "`viewport: {width,height}` sets the canvas/video dimensions — defaults to 1080x1920 (reels/story) if " +
      "omitted. Common presets: reels/story 1080x1920 (9:16), square 1080x1080 (1:1), landscape/YouTube " +
      "1920x1080 (16:9), portrait 1080x1350 (4:5) — or any custom size from 200px to 4096px per side. " +
      "Use set_viewport to change an existing project's dimensions later.",
    { title: z.string(), document: jsonValue },
    async ({ title, document }: { title: string; document: Record<string, unknown> }) =>
      toResult(() => callTool("create_project", { title, document }))
  );

  server.tool(
    "fork_template",
    "Create a new project by forking a template from search_templates (copies its ProjectDocument as-is). " +
      "Use the per-scene/per-element tools afterwards to customize it.",
    { templateId: z.union([z.string(), z.number()]) },
    async ({ templateId }: { templateId: number | string }) =>
      toResult(() => apiPost(`/v1/templates/${templateId}/fork`, {}))
  );

  opTool(
    server, "add_scene",
    "Add a new Scene (with its elements) to the project's scene list.",
    { scene: jsonValue.describe("Full Scene object: { id, name, durationMs, elements: [], background?, ... }") },
    (a) => ({ operation: "add_scene", scene: a.scene })
  );

  opTool(
    server, "delete_scene",
    "Delete a scene by id.",
    { sceneId: z.string() },
    (a) => ({ operation: "delete_scene", sceneId: a.sceneId })
  );

  opTool(
    server, "reorder_scenes",
    "Move a scene from one index to another in the scene order.",
    { fromIndex: z.number().int(), toIndex: z.number().int() },
    (a) => ({ operation: "reorder_scenes", fromIndex: a.fromIndex, toIndex: a.toIndex })
  );

  opTool(
    server, "update_scene",
    "Patch a scene's name, backgroundColor, or background config.",
    {
      sceneId: z.string(),
      patch: jsonValue.describe("{ name?, backgroundColor?, background? }"),
    },
    (a) => ({ operation: "update_scene", sceneId: a.sceneId, patch: a.patch })
  );

  opTool(
    server, "update_scene_duration",
    "Set a scene's duration in milliseconds.",
    { sceneId: z.string(), durationMs: z.number().int().positive() },
    (a) => ({ operation: "update_scene_duration", sceneId: a.sceneId, durationMs: a.durationMs })
  );

  opTool(
    server, "add_element",
    "Add a new element (text/image/video/shape) to a scene.",
    {
      sceneId: z.string(),
      elementId: z.string(),
      type: z.enum(["text", "image", "video", "shape"]),
      content: jsonValue.optional().describe("{ text? } or { src? } depending on type"),
      semanticRole: z.string().optional(),
      layout: jsonValue.optional().describe("Partial<LayoutProps> — x, y, width, height, scale, rotation, opacity, zIndex"),
      style: jsonValue.optional().describe("Partial<StyleProps> — fontFamily, fontSize, color, fill, etc."),
    },
    (a) => ({
      operation: "add_element", sceneId: a.sceneId, elementId: a.elementId, type: a.type,
      content: a.content, semanticRole: a.semanticRole, layout: a.layout, style: a.style,
    })
  );

  opTool(
    server, "patch_element",
    "Patch an existing element's content/layout/style/animations (partial merge, only supplied fields change).",
    { sceneId: z.string(), elementId: z.string(), patch: jsonValue.describe("ElementPatch — any subset of element fields") },
    (a) => ({ operation: "patch_element", sceneId: a.sceneId, elementId: a.elementId, patch: a.patch })
  );

  opTool(
    server, "delete_element",
    "Delete an element from a scene.",
    { sceneId: z.string(), elementId: z.string() },
    (a) => ({ operation: "delete_element", sceneId: a.sceneId, elementId: a.elementId })
  );

  opTool(
    server, "add_animation",
    "Add an animation to an element. See list_animation_types for valid AnimationType values.",
    { sceneId: z.string(), elementId: z.string(), animation: jsonValue.describe("Animation — { id, type, startMs, durationMs, easing?, ... }") },
    (a) => ({ operation: "add_animation", sceneId: a.sceneId, elementId: a.elementId, animation: a.animation })
  );

  opTool(
    server, "update_animation",
    "Patch an existing animation on an element by animation id.",
    { sceneId: z.string(), elementId: z.string(), animationId: z.string(), patch: jsonValue },
    (a) => ({ operation: "update_animation", sceneId: a.sceneId, elementId: a.elementId, animationId: a.animationId, patch: a.patch })
  );

  opTool(
    server, "delete_animation",
    "Remove an animation from an element by animation id.",
    { sceneId: z.string(), elementId: z.string(), animationId: z.string() },
    (a) => ({ operation: "delete_animation", sceneId: a.sceneId, elementId: a.elementId, animationId: a.animationId })
  );

  opTool(
    server, "set_element_motion_preset",
    "Replace an element's animations with a saved, user-created motion preset — call list_motion_presets first " +
      "to find a motionPresetId. The server resolves the preset's stored animations onto the element (with " +
      "fresh animation ids). For one-off/ad-hoc animation bundles that aren't a saved preset, use " +
      "add_animation/update_animation/delete_animation directly instead.",
    { sceneId: z.string(), elementId: z.string(), motionPresetId: z.union([z.string(), z.number()]) },
    (a) => ({ operation: "set_element_motion_preset", sceneId: a.sceneId, elementId: a.elementId, motionPresetId: a.motionPresetId })
  );

  opTool(
    server, "set_brand_theme",
    "Set (or clear) the project's brandTheme — colors, fonts, motion style used across scenes.",
    { brandTheme: jsonValue.optional() },
    (a) => ({ operation: "set_brand_theme", brandTheme: a.brandTheme })
  );

  opTool(
    server, "set_viewport",
    "Set the project's canvas/video dimensions (width x height in px, 200-4096 per side). Common presets: " +
      "reels/story 1080x1920 (9:16), square 1080x1080 (1:1), landscape/YouTube 1920x1080 (16:9), portrait " +
      "1080x1350 (4:5). Does NOT rescale existing element layouts — best called before adding content, or " +
      "follow up with patch_element layout patches on existing elements.",
    { width: z.number().int(), height: z.number().int() },
    (a) => ({ operation: "set_viewport", viewport: { width: a.width, height: a.height } })
  );

  server.tool(
    "apply_operation",
    "Advanced escape hatch: apply any EditorOperation directly by its raw shape. Every current EditorOperation " +
      "variant already has a dedicated, better-typed named tool (in this file or tools/editing.ts) — prefer those. " +
      "Use this only for a variant added to the EditorOperation union in packages/scene-graph/src/index.ts that " +
      "doesn't have a named tool yet. The object must include an `operation` field matching one of that union's " +
      "variants.",
    { projectId: z.union([z.string(), z.number()]), operation: jsonValue },
    async ({ projectId, operation }: { projectId: number | string; operation: Record<string, unknown> }) =>
      toResult(() => applyOperation(projectId, operation))
  );
}
