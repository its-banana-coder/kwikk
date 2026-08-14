# kwikk — AI-Native Semantic Motion Engine

A deterministic, scene-graph-based video composition engine where **every edit — human or AI — flows through the same typed operation pipeline.**

Built as an experiment in AI-native creative tooling. The core bet: if the scene graph is the single source of truth and every mutation is a typed, logged operation, then AI agents can edit video the same way humans do — no special pathways, no separate rendering flows.

## What it is

- **Scene graph as source of truth** — `ProjectDocument` is a serializable JSON structure. The entire project state is reconstructable from JSON alone.
- **Deterministic renderer** — `resolveRenderFrame(project, { timeMs })` always produces the same frame for the same inputs. No hidden state, no animation drift.
- **Typed AI operation pipeline** — every scene/element mutation is a typed `EditorOperation` applied via `applyOperation`. `apps/mcp` exposes this same pipeline as MCP tools, so any MCP client (Claude Desktop, Claude Code, etc.) can create/edit videos and contribute catalog content — see [Model Context Protocol server](#model-context-protocol-server) below.
- **Semantic elements** — every element has a `semanticRole` and `motionPreset` that survive all edits. AI can reason about "the headline" or "the product shot" rather than raw coordinates.
- **Motion presets** — composable, timeline-driven animation primitives. No scattered CSS animations.
- **Any canvas size** — `ProjectDocument.viewport` (`{width, height}`) isn't locked to reels. Presets for
  reels/story (1080x1920), square (1080x1080), landscape/YouTube (1920x1080), and portrait (1080x1350) are
  built in, plus any custom size from 200px to 4096px per side. Set it at creation (`create_project`'s
  `viewport`) or change it later (`set_viewport`) — the renderer, editor canvas, and export pipeline all read
  it dynamically, so nothing else needs updating.

## Architecture

```
packages/
  shared-types/        — All TypeScript types (ElementNode, ProjectDocument, AnimationType, …)
  scene-graph/         — EditorOperation, applyOperation, factories, validators
  animation-engine/    — resolveAnimatedLayout, MOTION_PRESETS
  render-core/         — resolveRenderFrame, PixiSceneRenderer
  timeline/            — TimelineEngine, playback math
  font-manager/        — Font catalog DB queries (Node-only)

apps/
  editor/              — React + Vite editor UI (control surface only — no business logic)
  api/                 — Hono API server (projects, assets, brand-kit, fonts, templates, export) on :8080
  renderer/            — Headless PixiJS renderer for export
  mcp/                 — MCP server exposing project editing + catalog tools to AI clients
```

See [ENGINE.md](ENGINE.md) for the full architectural principles and [CLAUDE.md](CLAUDE.md) for coding constraints.

## Quick start

**Prerequisites:** Node 20+, pnpm 10+, PostgreSQL 15+ with pgvector, ffmpeg

```bash
# Enable pgvector (once, as a Postgres superuser)
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Install dependencies
pnpm install

# Set up the API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL at minimum

# Start everything (schema auto-creates on first run)
pnpm dev:api        # API on :8080
pnpm dev:editor     # Editor UI on :5173
pnpm dev:renderer   # Headless renderer on :5174

# Recommended: populate the template/inspiration/background catalogs
# (animations and compositions are already seeded automatically — see below)
pnpm seed:basics
```

Open `http://localhost:5173` for the editor UI, or skip it entirely and drive
kwikk from an AI client via MCP (`create_project`, `add_scene`, `add_element`,
...) — see [Model Context Protocol server](#model-context-protocol-server)
below. `apps/renderer` (:5174) only needs to be running when you export a
video; it's not required to use the editor.

`LLM_API_KEY` / `LLM_BASE_URL` in `.env.example` are only needed for image auto-tagging on asset upload (`apps/api/src/vision.ts`) — the app runs fine without them, just without automatic image descriptions/tags.

### Catalog seeding

The animation and composition catalogs (backing `search_animations` and
`list_compositions`) seed themselves automatically from in-code data on every
API server start — nothing to run.

Everything else has to be seeded explicitly, or the app starts with those
catalogs empty. `pnpm seed:basics` (above) covers the three steps that need
nothing but a running Postgres — no API keys, no manual downloads:

```bash
pnpm seed:basics
# = pnpm seed:inspiration  (~90 curated typography/scene examples — powers search_inspiration)
# + pnpm seed:templates    (curated video templates — powers search_templates / fork_template)
# + pnpm seed:backgrounds  (generated CSS background patterns — powers search_backgrounds)
```

The rest need an API key or a manual download first, so they're left out of
`seed:basics`:

```bash
# Pixabay stock backgrounds — needs PIXABAY_API_KEY
pnpm --filter @kwikk/api exec tsx src/scripts/seed-backgrounds.ts

# Icon catalog — requires downloading Phosphor Icons SVGs yourself first (phosphoricons.com)
pnpm --filter @kwikk/api tsx src/scripts/seed-icons.ts

# SVG animation stickers / images / videos — drop files in svg_animations/, images/, videos/ at repo root, then:
pnpm seed:assets

# Fonts — no bundled dataset; register fonts pointing at externally-hosted files.
# One font at a time with full metadata — see the usage comment at the top of the file for all flags:
pnpm exec tsx scripts/add-font.ts --id ... --family ... --category ... --weights ...
# or scripts/bulk-import-fonts.ts / scripts/seed-disk-fonts.ts for local font files
```

## Model Context Protocol server

`apps/mcp` is a thin MCP server (stdio transport) that exposes kwikk to any
MCP client — Claude Desktop, Claude Code, etc. — as a set of tools instead of
kwikk holding its own LLM API key. It's a pure HTTP client to `apps/api`
(`KWIKK_API_URL`, default `http://localhost:8080`) with no DB access of its
own.

Tool groups:
- **Project read/create** — `list_projects`, `get_project`, `create_project`,
  `fork_template` (instantiate a project from a `search_templates` result)
- **Project edit** — named tools for the common operations (`add_scene`,
  `patch_element`, `add_animation`, `set_brand_theme`, `set_scene_transition`,
  `set_scene_camera`, `add_composition`, `add_audio_track`, `crop_image`,
  `set_video_trim`, `set_viewport` (change canvas/video dimensions — see
  below), etc.) — every `EditorOperation` variant has a matching named tool,
  plus `apply_operation` as a raw escape hatch for future ones.
  `set_custom_animation` covers genuinely bespoke motion (see below).
- **Discovery** — `search_icons`, `search_fonts`, `search_inspiration`,
  `search_animations` (the full ~175-entry animation library — broader than
  the hand-picked static list below), `search_templates`,
  `search_backgrounds`, `search_pixabay_images/videos/audio`, `list_assets`,
  and the static reference lists (core animation types, `list_compositions`
  — every composition type with its slot spec and image guidance, ideal
  before calling `add_composition` — transitions, camera presets, motion
  presets, typography pairs, coordinate system, visual effects, and the
  custom-CSS-animation contract)
- **Catalog contribution** — `add_asset` (images/video/audio/logos/svg
  stickers, by URL), `add_icon`, `add_font`, `add_template`,
  `add_inspiration_example`, `update_brand_kit` (brand colors, fonts, logo) —
  let an AI client contribute new content, not just edit existing projects
- **Narration** — `generate_narration` synthesizes spoken-word audio from text
  via the server's configured TTS provider (default: a local `tiny-tts` ONNX
  model, see `packages/tts-engine/README.md`) and stores it as an audio asset;
  pass the result into `add_audio_track` to place it on a project's timeline
- **Export** — `export_project`, `get_export_status`

79 tools total. Full list via `tools/list` on the running server, or read
`apps/mcp/src/tools/*.ts`.

**Discover, then use, then contribute back** is the intended loop for style
and motion work: call the `search_*`/`list_*` tools first to find an existing
animation, composition, template, background, font, or inspiration example
that fits — reuse beats reinvention, and reused catalog entries stay
consistent with the rest of the app. When you build something genuinely new
(a custom animation via `set_custom_animation`, a fresh template, a scene
worth saving as style reference), contribute it back with `add_template` /
`add_inspiration_example` / `add_font` / `add_icon` / `add_asset` so the next
AI client (or human) can discover and reuse it too — the catalog is meant to
compound.

Two of these catalogs need seeding before they're useful — a fresh clone
starts with an empty inspiration library and template catalog (everything
else, including the full animation and composition catalogs, is seeded
automatically on server startup). See **Optional catalog seeding** below.

### Setup

Make sure `apps/api` is running first (`pnpm dev:api`) — the MCP server is a
thin client to it and every tool call will fail without it.

**Using the Claude Code CLI:** one command builds the server and registers it
for the current repo:
```bash
pnpm mcp:install
```
This runs `pnpm build:mcp` then `claude mcp add kwikk -e KWIKK_API_URL=http://localhost:8080 -- node <repo>/apps/mcp/dist/index.js`,
using your actual checkout path automatically — no placeholders to edit.
Verify with `claude mcp list` / `claude mcp get kwikk`. Add `--scope user` to
the underlying `claude mcp add` call (edit the script, or run it manually) if
you want `kwikk` available outside this repo too.

**Any other MCP client** (Claude Desktop, Codex CLI, etc.): build manually,
then add the server to the client's config with an **absolute path
substituted for `/path/to/kwikk`** — that placeholder is not resolved for you
outside the `pnpm mcp:install` path above:
```bash
pnpm build:mcp
```

Claude Desktop (`claude_desktop_config.json`) and other JSON-config clients:
```json
{
  "mcpServers": {
    "kwikk": {
      "command": "node",
      "args": ["/path/to/kwikk/apps/mcp/dist/index.js"],
      "env": { "KWIKK_API_URL": "http://localhost:8080" }
    }
  }
}
```

**Antigravity (IDE/CLI):** same `mcpServers` JSON shape as above, in
`~/.gemini/config/mcp_config.json` (global) or `.agents/mcp_config.json`
(workspace-local) — editable via Settings → Customizations → Open MCP Config,
or the agent panel's "Manage MCP Servers" → "View raw config".

**Codex CLI:** add to `~/.codex/config.toml` (or run `codex mcp add kwikk -- node /path/to/kwikk/apps/mcp/dist/index.js` if your Codex version supports the `mcp add` subcommand):
```toml
[mcp_servers.kwikk]
command = "node"
args = ["/path/to/kwikk/apps/mcp/dist/index.js"]
env = { "KWIKK_API_URL" = "http://localhost:8080" }
```

The server itself is a stock `@modelcontextprotocol/sdk` stdio server with no
client-specific behavior, so any MCP-compliant client works identically —
these are just the two most common config formats.

**What's addable as data vs. what requires engine code:** fonts, images,
logos (just a tagged image), videos, audio, SVG "animation sticker" overlays,
icons, templates, and style examples are all real catalog rows — fully
addable via MCP (`add_asset`, `add_icon`, `add_font`, `add_template`,
`add_inspiration_example`). Applying an existing transition/camera move/shape
element to a scene is also fully supported (`set_scene_transition`,
`set_scene_camera`, `add_element` with `type: "shape"`).

**Genuinely custom animations** (e.g. "balloons flying," or motion translated
from a reference image/video) don't require an engine-code change either —
`element.style.customCSS` is a real, first-class renderer feature: raw CSS
(`@keyframes` + an `animation:` rule) scoped to one element and kept in sync
with the deterministic project timeline (paused + negative `animation-delay`,
so `timeMs` is still the only source of truth — even scrubbing/seeking stays
correct). The `set_custom_animation` MCP tool sets this (via `patch_element`)
with pre-flight validation against the renderer's actual parsing contract;
call `describe_custom_css_animation` first for the exact rules and worked
examples. The AI client does the creative work here (look at whatever
reference it was given, or just imagine the motion) — kwikk has no
server-side vision call in this path.

What's still **not** addable through MCP: brand-new `AnimationType` motion
presets, new transition *types*, new `ShapeKind` values, or new composition
*types* — these are closed TypeScript unions with real rendering
implementation in `animation-engine`/`render-core` (per `CLAUDE.md`'s "prefer
constrained systems" principle), not something a CSS string or data row can
create.

## Core constraints

Every mutation to `ProjectDocument` must go through `applyOperation`. The renderer must never write state. `timeMs` is the single source of truth for all animated values. See [CLAUDE.md](CLAUDE.md) for the full list.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup,
the PR process, and the architectural constraints PRs are expected to respect.
Please also read the [Code of Conduct](CODE_OF_CONDUCT.md). Found a security
issue? See [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

MIT — see [LICENSE](LICENSE).
