import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiPost, apiPut, jsonValue, toResult, uploadFile } from "../client.js";

const stringArray = z.array(z.string());

// Search formatting (apps/api/src/tool-executor.ts, search_inspiration) does
// `.join(", ")`/`.map()` on meta.tags/meta.mood and each annotations.* field, so these MUST be
// string arrays, not bare strings — e.g. mood: ["editorial"], not mood: "editorial". A single
// bad row crashes search_inspiration for every caller, not just the one that wrote it, so this
// is typed here instead of left in the generic jsonValue passthrough.
const inspirationMeta = z.object({
  palette: stringArray.optional().describe("array of hex colors or color-name strings"),
  mood: stringArray.optional().describe("array of mood words, e.g. [\"editorial\", \"confident\"] — always an array, even for one word"),
  visualLanguage: z.string().optional(),
  motionAxis: z.string().optional(),
  tags: stringArray.optional(),
  contentNiches: stringArray.optional().describe("e.g. [\"fitness\", \"finance\"] — omit or use [\"general\"] if not niche-specific"),
  scenePosition: z.string().optional(),
}).catchall(z.any());

const inspirationAnnotations = z.object({
  whatMakesItGood: stringArray.optional().describe("array of short bullet points, always an array even for one point"),
  keyDecisions: stringArray.optional().describe("array of short bullet points, always an array even for one point"),
  remixHints: stringArray.optional().describe("array of short bullet points, always an array even for one point"),
}).catchall(z.any());

export function registerCatalogTools(server: McpServer) {
  server.tool(
    "add_asset",
    "Add an image/video/audio/svg_animation asset (including logos — just an image tagged 'logo') to the global " +
      "catalog by URL — the server fetches and stores it. Supply description/tags if you already know them (e.g. " +
      "from a Pixabay search result or something you generated) to skip the server's auto-tagging pass. Set " +
      "system:true for shared/system-owned content (appears in the public system-assets catalog and the dedicated " +
      "backgrounds browser when source is 'stock'/'css') instead of the local user's personal asset library. " +
      "Use `type` to force classification, e.g. 'svg_animation' for a decorative animated-sticker SVG.",
    {
      url: z.string().url(),
      name: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      system: z.boolean().optional(),
      type: z.enum(["image", "video", "audio", "svg_animation"]).optional().describe("overrides auto-detection from the URL/content-type"),
      category: z.string().optional().describe("e.g. 'nature', 'abstract', 'logo' — used by the asset/background browsers"),
      source: z.enum(["upload", "stock", "css"]).optional().describe("'stock' or 'css' makes it show up in GET /v1/backgrounds"),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/assets/from-url", args))
  );

  server.tool(
    "upload_asset_file",
    "Like add_asset, but for a file that only exists on THIS machine's local disk (e.g. a " +
      "screenshot, an export the user handed you a path to) instead of something reachable by URL. " +
      "Give it an absolute filePath — this MCP server reads the bytes itself and multipart-uploads " +
      "them to the API, so no URL, auth token, or base64-in-the-tool-call is ever needed. Same result " +
      "shape and same optional fields (description/tags/system/type/category/source) as add_asset. " +
      "Use add_asset instead when the content already has a URL (Pixabay, a generated image's hosted " +
      "URL, etc.) — this tool is only for local-filesystem files.",
    {
      filePath: z.string().describe("Absolute path to the file on this MCP server's local filesystem"),
      name: z.string().optional().describe("Defaults to the file's basename"),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      system: z.boolean().optional(),
      type: z.enum(["image", "video", "audio", "svg_animation"]).optional().describe("overrides auto-detection from the file extension"),
      category: z.string().optional().describe("e.g. 'nature', 'abstract', 'logo' — used by the asset/background browsers"),
      source: z.enum(["upload", "stock", "css"]).optional().describe("'stock' or 'css' makes it show up in GET /v1/backgrounds"),
    },
    async (args: Record<string, unknown>) =>
      toResult(() =>
        uploadFile(
          "/v1/assets/upload",
          args.filePath as string,
          {
            description: args.description as string | undefined,
            tags: Array.isArray(args.tags) ? (args.tags as string[]).join(",") : undefined,
            system: args.system !== undefined ? String(args.system) : undefined,
            type: args.type as string | undefined,
            category: args.category as string | undefined,
            source: args.source as string | undefined,
          },
          args.name as string | undefined
        )
      )
  );

  server.tool(
    "generate_narration",
    "Generate spoken-word narration audio from text via the server's configured TTS provider " +
      "(default: tiny-tts, a local ONNX model — see packages/tts-engine/README.md for how the server " +
      "operator can swap in a different provider, e.g. OpenAI). Stores the result as an audio asset " +
      "(same storage path as add_asset) and returns it with a durationMs field — pass the returned " +
      "url and durationMs into add_audio_track to place the narration on a project's timeline.\n\n" +
      "Also returns `subtitles`: an array of { text, startMs, endMs } caption cues covering the " +
      "same text, with startMs/endMs measured from the start of the audio clip (0-based). No TTS " +
      "provider here reports true word-level timing, so these are word-count-proportional estimates " +
      "over the clip's real duration, not forced alignment — good enough for steady narration, less " +
      "accurate on clips with long pauses. To place them, call add_subtitle once per cue against the " +
      "scene the audio lands in, offsetting each cue's startMs/endMs by wherever the narration begins " +
      "in that scene's local timeline (e.g. if the audio track starts 2000ms into the scene, add 2000 " +
      "to every cue's startMs/endMs). Pass subtitles:false to skip the computation.",
    {
      text: z.string().describe("Text to synthesize"),
      speaker: z.string().optional().describe("Provider-specific voice id — the default tiny-tts provider ships one voice, 'MALE'"),
      speed: z.number().optional().describe("1.0 = normal, >1 faster, <1 slower — best-effort, provider-dependent"),
      name: z.string().optional().describe("Base filename for the stored asset (default 'narration')"),
      subtitles: z.boolean().optional().describe("Set false to skip subtitle cue estimation (default true)"),
      maxWordsPerCue: z.number().int().optional().describe("Max words per caption cue before splitting further (default 10)"),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/tts/narrate", args))
  );

  server.tool(
    "add_icon",
    "Add a new icon to the icon catalog (searchable via search_icons), by raw SVG markup or a URL to fetch.",
    {
      name: z.string(),
      style: z.string().describe("e.g. duotone, bold, regular, fill, thin — the icon set/style bucket"),
      svg: z.string().optional().describe("raw <svg>...</svg> markup"),
      url: z.string().url().optional().describe("URL to fetch SVG content from, if svg isn't supplied directly"),
      tags: z.array(z.string()).optional(),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/icons", args))
  );

  server.tool(
    "update_brand_kit",
    "Update the account-level brand kit — brand name, colors, font family, motion style, subtitle style, and " +
      "logo (logo_url — use add_asset first to host the logo image, then pass its URL here). This is distinct " +
      "from set_brand_theme, which overrides branding on a single project only.",
    {
      brand_name: z.string().optional(),
      category: z.string().optional(),
      audience: z.string().optional(),
      primary_color: z.string().optional(),
      secondary_color: z.string().optional(),
      accent_color: z.string().optional(),
      font_family: z.string().optional(),
      motion_style: z.string().optional(),
      subtitle_style: z.string().optional(),
      logo_url: z.string().optional(),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPut("/v1/brand-kit", args))
  );

  server.tool(
    "get_inspiration_example",
    "Fetch one saved inspiration example by id, as raw JSON (id, kind, label, description, meta, " +
      "annotations, fontPair, and the full data payload under `elements`/`scene`/`project` depending " +
      "on kind). Use this before editing one with add_inspiration_example — that tool upserts by id, " +
      "resending only the fields you supply would drop the rest, so fetch the full object first, " +
      "change what you need, and resend the whole thing.",
    { id: z.string() },
    async ({ id }: { id: string }) => toResult(() => apiGet(`/v1/examples/${id}`))
  );

  server.tool(
    "add_inspiration_example",
    "Save a reusable style/typography/scene example to the inspiration library — a curated reference other " +
      "generations can be styled after (palette, mood, motion philosophy, key decisions). Calling this again " +
      "with an id that already exists updates that example in place (full replace, not a merge) — use " +
      "get_inspiration_example first to fetch the current JSON if you're editing rather than creating.",
    {
      id: z.string(),
      kind: z.enum(["typography", "scene", "video"]),
      subcategory: z.string().optional(),
      label: z.string(),
      description: z.string().optional(),
      meta: inspirationMeta.describe("{ palette?, mood?, visualLanguage?, motionAxis?, tags?, contentNiches?, scenePosition?, ... } — mood/tags/palette/contentNiches are always string arrays, never a bare string"),
      fontPair: jsonValue.optional().describe("{ headline, body, tone }"),
      data: jsonValue.describe("The actual typography/scene/video data being saved"),
      annotations: inspirationAnnotations.describe("{ whatMakesItGood?, keyDecisions?, remixHints? } — each is always a string array of short bullet points, never a bare string"),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/examples", args))
  );

  server.tool(
    "add_template",
    "Add a new reusable video template — a complete ProjectDocument other projects can fork from " +
      "(POST /v1/templates/:id/fork).",
    {
      title: z.string(),
      document: jsonValue.describe("A complete, valid ProjectDocument"),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      difficulty: z.string().optional().describe("default 'Beginner'"),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/templates", args))
  );

  server.tool(
    "add_motion_preset",
    "Save a named, reusable motion preset to the global catalog — a bundle of one or more Animation layers " +
      "(built from AnimationType values, see list_animation_types/search_animations) that set_element_motion_preset " +
      "can later apply to any element by id. Use this to turn a bespoke animation combo you've composed (via " +
      "add_animation) into something reusable instead of re-describing it every time.",
    {
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      animations: z.array(jsonValue).describe("Animation[] — each { type, startMs, durationMs, easing?, ... }, no id required (fresh ids are stamped on apply)"),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/motion-presets", args))
  );

  server.tool(
    "add_font",
    "Register a new font in the font catalog, pointing at externally-hosted font files (no upload/parsing — " +
      "supply a cdnUrl per weight). NOTE: this only registers font metadata; it cannot create a brand-new " +
      "AnimationType motion preset — those require actual engine code, not a data operation.",
    {
      family: z.string(),
      label: z.string(),
      category: z.string().describe("e.g. sans-serif, serif, display, monospace"),
      subcategory: z.string().optional(),
      weights: z.array(z.object({
        weight: z.number().int(),
        style: z.enum(["normal", "italic"]).optional(),
        cdnUrl: z.string().url().optional(),
      })).min(1),
      tags: z.array(z.string()).optional(),
      industryScores: z.record(z.string(), z.number()).optional(),
      semanticRoles: z.record(z.string(), z.number()).optional(),
    },
    async (args: Record<string, unknown>) => toResult(() => apiPost("/v1/fonts", args))
  );
}
