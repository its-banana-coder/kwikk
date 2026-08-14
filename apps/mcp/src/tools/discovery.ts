import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callTool, toResult } from "../client.js";

/** Registers a read-only discovery tool that's a thin passthrough to POST /v1/tools/:name. */
function passthroughTool(
  server: McpServer,
  name: string,
  description: string,
  shape: Record<string, z.ZodTypeAny>
) {
  server.tool(name, description, shape, async (args: Record<string, unknown>) => toResult(() => callTool(name, args)));
}

export function registerDiscoveryTools(server: McpServer) {
  passthroughTool(server, "search_icons",
    "Search the icon catalog by keyword and style.",
    { query: z.string(), style: z.string().optional().describe("default 'duotone'"), limit: z.number().int().optional() });

  passthroughTool(server, "search_fonts",
    "Search the font catalog by keyword, semantic role, industry, or pairing category/role.",
    {
      query: z.string().optional(),
      semantic_role: z.string().optional(),
      industry: z.string().optional(),
      pair_category: z.string().optional(),
      pair_role: z.string().optional(),
    });

  passthroughTool(server, "search_inspiration",
    "Search saved style/typography/scene/video inspiration examples by kind, tags, or content niche.",
    { kind: z.enum(["typography", "scene", "video"]).optional(), tags: z.array(z.string()).optional(), content_niche: z.string().optional() });

  passthroughTool(server, "get_brand_theme",
    "Get the current brand kit (colors, fonts, motion style) resolved to real font names.",
    {});

  passthroughTool(server, "search_pixabay_images",
    "Search Pixabay for stock images (requires PIXABAY_API_KEY configured on the server).",
    { query: z.string(), image_type: z.string().optional(), orientation: z.string().optional() });

  passthroughTool(server, "search_pixabay_videos",
    "Search Pixabay for stock videos (requires PIXABAY_API_KEY configured on the server).",
    { query: z.string(), orientation: z.string().optional() });

  passthroughTool(server, "search_pixabay_audio",
    "Search Pixabay for stock audio/music (requires PIXABAY_API_KEY configured on the server).",
    { query: z.string(), genre: z.string().optional() });

  passthroughTool(server, "list_assets",
    "List uploaded/registered assets, optionally filtered by type (image/video/audio/svg_animation).",
    { type: z.string().optional() });

  passthroughTool(server, "list_animation_types",
    "List all valid AnimationType values with duration ranges and params.", {});

  passthroughTool(server, "list_transitions",
    "List scene transition types and recommended durationMs ranges.", {});

  passthroughTool(server, "list_motion_presets",
    "List user-created motion presets (named, reusable Animation[] bundles) from the global catalog — pass a " +
      "preset's id to set_element_motion_preset to apply it. Optionally filter with query/category. Empty by " +
      "default until presets are created with add_motion_preset.",
    { query: z.string().optional(), category: z.string().optional() });

  passthroughTool(server, "list_typography_pairs",
    "List curated font pair presets keyed by industry/tone.", {});

  passthroughTool(server, "describe_coordinate_system",
    "Get canvas dimensions, safe zone, z-index guide, and common layout anchors. Defaults to reels (1080x1920) " +
      "— pass width/height (the project's actual viewport, e.g. from get_project or what you're about to pass to " +
      "create_project's viewport/set_viewport) to get proportionally scaled safe zone and layout anchors for " +
      "non-reels dimensions (square, landscape, etc).",
    { width: z.number().int().optional(), height: z.number().int().optional() });

  passthroughTool(server, "list_visual_effects",
    "List available image/shape filters, text effects, gradients, frame overlays, and fill patterns.", {});

  passthroughTool(server, "list_compositions",
    "List every available composition type (sealed multi-asset animations like product cards, book flips, " +
      "fireworks bursts) with its slot spec, ideal image dimensions, per-slot image guidance, typical use cases, " +
      "and color params. Call this before add_composition — the composition `type` must be one of these.", {});

  passthroughTool(server, "search_animations",
    "Search the full animation catalog by keyword/category/mood — covers both the core hand-picked types from " +
      "list_animation_types AND the ~85-strong animate.css-equivalent library (bounceInLeft, fadeInDown, " +
      "rotateInUpLeft, zoomOutUp, hinge, jackInTheBox, wobble, etc.) that list_animation_types doesn't enumerate. " +
      "Use this to discover animation patterns by feel (e.g. query:'playful bounce' or category:'entrance') " +
      "rather than guessing exact type names.",
    { query: z.string().optional(), category: z.string().optional().describe("entrance | exit | loop | text | filter | shape") });

  passthroughTool(server, "search_templates",
    "Search the reusable video template catalog (full ProjectDocuments other projects can start from) by " +
      "keyword or category. Returns lightweight metadata (id, name, description, category, tags, thumbnail) — " +
      "use fork_template on a result's id to actually create a new project from it.",
    { query: z.string().optional(), category: z.string().optional() });

  passthroughTool(server, "search_backgrounds",
    "Search the background catalog (stock photos/videos and generated CSS patterns) by keyword or asset type. " +
      "Returns a ready-to-use url for each hit (CSS patterns come pre-rendered as an SVG data URL).",
    { query: z.string().optional(), type: z.string().optional().describe("image | video | css") });

  passthroughTool(server, "describe_custom_css_animation",
    "Read this before calling set_custom_animation. Explains the customCSS contract (scoping, required ms " +
      "duration, deterministic timeline sync) with worked examples — for motion/effects not covered by " +
      "list_animation_types, list_motion_presets, or list_visual_effects (e.g. a bespoke 'balloon floating " +
      "upward while swaying' animation, or something built from a reference image/video description).",
    {});
}
