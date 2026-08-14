# ROADMAP.md — kwikk

---

## System Overview

| App | Role | Stack | Status |
|---|---|---|---|
| `apps/api` | Backend — API server, orchestration, export pipeline | TypeScript, Hono, PostgreSQL/pgvector | Active |
| `apps/editor` | Power editor shell | React, CSS DOM renderer | Active |
| `apps/renderer` | Headless frame renderer | Node, PixiJS | Active (export only) |
| `packages/*` | Scene graph, animation engine, timeline, render core | TypeScript | Active |

---

## Phase 1 — Deterministic Rendering Engine

**Goal:** Deterministic Timeline Rendering → Frame Output

| Step | Description | Status |
|---|---|---|
| 1 | Timeline Engine (`play`, `pause`, `seek`, `tick`) | ✅ Done |
| 2 | `resolveRenderFrame(project, { timeMs })` — pure renderer function | ✅ Done |
| 3 | Scene graph rendering (text, image, video, shapes; x/y/scale/opacity/rotation/zIndex) | ✅ Done |
| 4 | Animation interpolation (`interpolate`, `resolveAnimatedLayout`, easing) | ✅ Done |
| 5 | PixiJS rendering pipeline (`PixiSceneRenderer`) | ✅ Done |
| 6 | Frame determinism — same inputs always produce same frame | ✅ Done |
| 7 | Frame capture — `seek(timeMs)` → `renderFrame()` → `canvas.toBlob()` per frame | ✅ Done |
| 8 | Export architecture prep — frame sequence pipeline for future FFmpeg encode | ✅ Done |
| 9 | Preview playback — play/pause/seek/loop in editor and renderer | ✅ Done |
| 10 | Motion primitives — `fade_in/out`, `zoom_in/out`, `slide_left/right`, `subtitle_pop` | ✅ Done |

**Phase 1 is complete.**

**Note on frame capture:** preview playback uses `requestAnimationFrame` + delta time. Frame extraction must use explicit `seek(timeMs)` → `renderFrame()` → `canvas.toBlob()` per frame — no rAF involvement.

---

## Phase 2 — Editor Polish

### Image Editing Subsystem (Phase 1 shipped, bugs outstanding)

| Item | Status | Notes |
|---|---|---|
| Lock / visibility toggles | ✅ Done | |
| Flip X / Y | ✅ Done | |
| Rotation & Z-index in inspector | ✅ Done | |
| Blend modes | ✅ Done | Moved from mainNode.blendMode → container.blendMode so the whole element composites correctly |
| Adjustable filters (blur, brightness, contrast, saturation, mono, HDR) | ✅ Done | Scale mapping correct; nodeKey now includes all filter params so changes force rebuild |
| Preset filters (vintage, cinematic, y2k, duotone, sharpen, vignette) | ✅ Done | Pixi v8 methods confirmed; nodeKey covers all preset flags; vignette draw order fixed (now above mainNode); sharpen uses ConvolutionFilter |
| Crop | ✅ Done | Element-space coordinates map to texture pixel space; sprite stretches crop to fill element (zoom mode) |
| Frame overlays (phone, laptop, polaroid, cinematic) | ✅ Done | Graphics-based overlays implemented for all 9 frame types |

---

## CSS DOM Renderer Migration

**Goal:** Replace PixiJS WebGL preview with a CSS DOM renderer — unlocking native CSS filters, text effects, WAAPI animations, and CodePen-style HTML elements in the scene.

PixiJS remains for: compositions (fireworks, book_flip, etc.) and the export pipeline.

### Renderer core

| Item | Status | Notes |
|---|---|---|
| `CSSSceneRenderer` class — scene root, layer management, RAF loop | ✅ Done | |
| Per-frame: `transform`, `opacity`, `filter` only (compositor-thread) | ✅ Done | No layout/paint per frame |
| `zoom` viewport scaling with corrected centering math | ✅ Done | `left: offsetX/scale` to compensate zoom affecting CSS coords |
| Text rendering — font, size, color, alignment, letter-spacing | ✅ Done | |
| Image rendering — `object-fit`, border-radius | ✅ Done | |
| Video rendering — `currentTime` seek each frame | ✅ Done | |
| Shape rendering via inline SVG | ✅ Done | All ShapeKind values |
| Char-level text animations — per-span WAAPI via `resolveCharAnimations` | ✅ Done | |
| Scene transitions — two layer divs, CSS transform/opacity per type | ✅ Done | fade, slide, zoom, blur |

### Animations — WAAPI

| Item | Status | Notes |
|---|---|---|
| `cssAnimations.ts` — `AnimationSpec` / `ManagedAnimation` types | ✅ Done | |
| Fades: `fadeIn`, `fadeOut` | ✅ Done | |
| Slides: `slideUp`, `slideDown`, `slideLeft`, `slideRight` | ✅ Done | |
| Zoom: `zoomIn`, `zoomOut` | ✅ Done | |
| Bounce: `bounceIn`, `bounceOut` | ✅ Done | |
| Rotate: `rotateIn`, `rotateOut` | ✅ Done | |
| Blur: `blur_in`, `blur_out`, `blur_transition` | ✅ Done | |
| Cinematic entries: `subtitle_pop`, `kinetic_slide`, `spring_in`, `slam_down`, `depth_charge`, `drift_in`, `stomp`, `tumble_in`, `glitch_in`, `spiral_in`, `flip_in_x`, `flip_out_x`, `swoop_in`, `stamp`, `pop_in`, `rubber_band`, `roll_in`, `zip_in` | ✅ Done | |
| Exits: `swoop_out`, `implode`, `whip_exit`, `whip_up` | ✅ Done | |
| Attention: `shake`, `vibrate`, `tada`, `jello`, `pulse`, `heartbeat`, `flicker` | ✅ Done | |
| Looping: `float`, `breathe`, `spin`, `sway`, `orbit`, `pendulum`, `bounce_floor`, `neon_flicker` | ✅ Done | `iterations: Infinity`, modulo scrub |
| `composite: 'add'` for transforms — stacks on static layout without conflict | ✅ Done | |
| Scrubbing: `animation.currentTime = elapsed` per frame | ✅ Done | |
| Fallback: char animations, filter effects still via animation-engine | ✅ Done | `typewriter`, `wave_text`, `brightness_flash`, etc. |

### Text effects → CSS

| Item | Status |
|---|---|
| `glow` → `text-shadow` layers | ✅ Done |
| `neon` → inner white + outer color shadow | ✅ Done |
| `outline` → `-webkit-text-stroke` | ✅ Done |
| `hollow` → stroke + transparent fill | ✅ Done |
| `echo` → stacked `text-shadow` offsets | ✅ Done |
| `glitch` → red/blue offset shadows | ✅ Done |
| `gold`, `chrome` → gradient `background-clip: text` | ✅ Done |
| `fire` → layered warm shadows + blur filter | ✅ Done |
| `matrix`, `frost` → color + shadow tints | ✅ Done |

### CSS image filters

| Item | Status | Notes |
|---|---|---|
| `blur`, `brightness`, `contrast`, `saturation` → `filter:` | ✅ Done | |
| `sepia`, `grayscale` (mono), `vintage`, `hdr` → `filter:` | ✅ Done | |
| `glow`, `dropShadow` → `drop-shadow()` | ✅ Done | |
| `vignette` → radial-gradient overlay | ✅ Done | |
| `film_grain` → SVG `feTurbulence` noise filter | ✅ Done | |
| `chromatic_aberration` → SVG `feColorMatrix` filter | ✅ Done | |
| `duotone` | ⬜ Pending | SVG `feColorMatrix` dual-tone map needed |
| `scanlines` | ⬜ Pending | Repeating linear-gradient overlay |
| `tilt_shift` | ⬜ Pending | `mask` + `blur` composite |
| `light_leak` | ⬜ Pending | Gradient overlay blend |
| `oil_paint` | ⬜ Pending | No CSS native — may need SVG or canvas fallback |
| `pencil_sketch` | ⬜ Pending | SVG edge-detection filter or canvas |
| `anamorphic_flare` | ⬜ Pending | Gradient overlay with lens-blue tint |
| `lens_flare` | ⬜ Pending | Positioned gradient element |
| `vhs_tracking` | ⬜ Pending | CSS clip + scanline + chromatic combo |

### Element-level effects

| Item | Status |
|---|---|
| `blendMode` → `mix-blend-mode` | ✅ Done |
| `customCSS` injection + `@keyframes` timeline sync | ✅ Done |
| FillPattern: `hollow`, `stripes`, `dots`, `grid`, `image` | ✅ Done |
| `motionBlur` | ⬜ Pending |
| `reflectionOpacity` | ⬜ Pending |
| `borderAnimation` (marching_ants, gradient_spin, dash_flow) | ⬜ Pending |
| `glowPulse` | ⬜ Pending |
| `clipShape` | ⬜ Pending |
| `zDepth` (perspective shadow) | ⬜ Pending |

### HTML element type

| Item | Status |
|---|---|
| `ElementType: "html"` added to shared-types | ⬜ Pending |
| `<iframe srcdoc>` rendering in CSSSceneRenderer | ⬜ Pending |
| `postMessage` bridge: `{ type: 'kwikk_time', timeMs, isPlaying }` each frame | ⬜ Pending |
| HTML element creation UI in editor | ⬜ Pending |

### Export — Puppeteer path

| Item | Status | Notes |
|---|---|---|
| `apps/api` — `POST /api/render/export` route (Hono) | ⬜ Pending | |
| Puppeteer browser pool (max 2 concurrent) | ⬜ Pending | |
| `?mode=render` path in editor — bare scene + `window.__kwikkSetTime` | ⬜ Pending | |
| Frame-by-frame PNG capture via `page.screenshot` | ⬜ Pending | |
| MP4 encode via `fluent-ffmpeg` | ⬜ Pending | |
| Audio mux from project audio tracks | ⬜ Pending | |

---

## Deferred render-core performance optimizations

All items shipped in the May 2026 perf pass.

| Item | Status |
|---|---|
| Char-animated text in-place update | ✅ Done — stable key + per-frame property updates, no graph rebuild |
| `cacheAsTexture` for static elements | ✅ Done — enabled when no active animation window, cleared when animation starts |
| `getTransitionWindow` result cache | ✅ Done — module-level cache keyed by project reference, invalidated on change |
| `elemLayer.sortableChildren` batching | ✅ Done — sort disabled during addChild loop, re-enabled once at end |
| Single-pass `resolveRenderFrame` | ⬜ Not done — still allocates intermediate arrays; defer until profiling confirms bottleneck |

---

## Phase 4 — AI Orchestration

> Scene planning intelligence, semantic AI operations, AI motion orchestration via `EditorOperation` pipeline.
> Not yet planned.

---

## Phase 5 — Agentic Distribution (Videofy + MCP)

**Core idea:** Any MCP-capable AI client (Claude Desktop, Claude Code, etc.) drives kwikk directly — the app exposes its `EditorOperation`/`tool-executor.ts` pipeline as MCP tools instead of kwikk holding its own LLM API key. This replaces the old in-app "chat → generate" flow (removed when the commercial dashboard was stripped for open-sourcing).

**Split of responsibility:**
- **Agent's job:** domain expertise, copy, storytelling, facts, script structure
- **kwikk's job:** motion, visual design, retention engineering, rendering

### 5A — `/v1/videofy` Endpoint

Accepts structured content from any agent. No topic interpretation, no scene planning on kwikk's side — agent already did that. kwikk maps content → `ProjectDocument` → video using premium motion templates.

```
POST /v1/videofy
{
  "scenes": [
    { "headline": "95% Stay Broke Forever", "body": "It's not your fault", "mood": "shocking" },
    { "headline": "Pay Yourself First",      "body": "20% before anything else", "mood": "authoritative" }
  ],
  "style": "luxury_dark",   // or "minimal_clean", "viral_bold", "cinematic_tech"
  "aspect_ratio": "9:16"
}
→ { "project_id": "...", "preview_url": "...", "edit_url": "..." }
```

| Step | Description | Status |
|---|---|---|
| 1 | Define `VideoifyRequest` type — scenes, style, aspect ratio | ⬜ Not started |
| 2 | Style → motion template mapping (luxury_dark, minimal_clean, viral_bold, cinematic_tech) | ⬜ Not started |
| 3 | Content → `ProjectDocument` builder (zero LLM, deterministic) | ⬜ Not started |
| 4 | `POST /v1/videofy` route in `apps/api/src/routes/` | ⬜ Not started |
| 5 | Return project ID + preview URL | ⬜ Not started |

### 5B — MCP Server (`apps/mcp/`) — ✅ Done

Thin translation layer — receives MCP tool calls from an MCP client (Claude Desktop, Claude Code, etc.), calls kwikk's API, returns results. Exposes tool signatures only; internals (scene graph, motion logic) stay server-side. `POST /v1/projects/:id/operations` (applies any `EditorOperation` via `@kwikk/scene-graph`'s `applyOperation`) and `POST /v1/tools/:name` (wraps `tool-executor.ts`'s `executeTool`) are the two API surfaces it calls — so AI and humans keep using the same system (see CLAUDE.md constraint #7).

**Tools exposed (79 total):** project read/create (`list_projects`, `get_project`, `create_project`, `fork_template`), a named tool for *every* `EditorOperation` variant (`add_scene`, `patch_element`, `add_animation`, `set_brand_theme`, `set_viewport`, `set_scene_transition`, `set_scene_camera`, `add_composition`, `add_audio_track`, `crop_image`, `set_video_trim`, etc.) plus `apply_operation` as a raw escape hatch, `set_custom_animation` for genuinely bespoke motion (raw `customCSS`, validated against the renderer's parsing contract — see `describe_custom_css_animation`), discovery/search tools (`search_icons`, `search_fonts`, `search_inspiration`, `search_animations`, `search_templates`, `search_backgrounds`, `search_pixabay_*`, `list_assets`, static reference lists including `list_visual_effects` and `list_compositions`), catalog contribution (`add_asset`, `add_icon`, `add_font`, `add_template`, `add_inspiration_example`, `update_brand_kit`), narration (`generate_narration` — pluggable TTS provider, see `packages/tts-engine/README.md`), and export (`export_project`, `get_export_status`). Full list and config snippet in root `README.md`.

**Discovery gap closed:** `search_animations`, `search_templates`, `search_backgrounds`, and `list_compositions` were added after finding that ~86 animate.css-equivalent `AnimationType` values, the 4 "premium ambient" types (`cinematic_breathe`, `momentum_carry`, `depth_drift`, `atmosphere_pulse`), the full composition catalog (slot specs, image guidance), and the templates/backgrounds catalogs were real, working, renderer-backed features with zero MCP discovery path — an AI client had no way to find them short of reading source. `apply_operation`'s tool description was also stale, listing several operations as "escape hatch only" that already had dedicated named tools in `tools/editing.ts`; fixed to describe current reality. Two catalogs (inspiration examples, templates) need a one-time seed script run on a fresh install to be non-empty — documented in root `README.md`'s "Optional catalog seeding" section, plus `tsx`/`pg`/`dotenv` added as root devDependencies since the root-level `scripts/*.ts` seeders weren't actually runnable (`pnpm exec tsx` failed with "Command not found") before that fix.

**Video dimensions were reels-only until now — fixed.** `ProjectDocument.viewport` already existed and the renderer/editor canvas/export pipeline already read it dynamically everywhere, but `validateProjectDocument` (`packages/scene-graph`) hard-rejected any viewport except exactly `{width:1080,height:1920}`, so nothing else mattered — every project was forced to reels regardless of what was passed in. Replaced the exact-match check with a bounds check (200–4096px per side), added `VIEWPORT_PRESETS` (reels 1080x1920, square 1080x1080, landscape 1920x1080, portrait 1080x1350) and a new `set_viewport` `EditorOperation`/MCP tool for changing an existing project's dimensions (does not rescale existing element layouts — by design, not a limitation to fix later). `describe_coordinate_system` now accepts optional `width`/`height` and returns a proportionally-scaled safe zone and layout anchors instead of hardcoded reels numbers, so an AI client working on a non-reels project gets correct guidance. Also fixed export presets silently downgrading a requested `"4k"` to 720p (`ExportPreset` never actually included `"4k"` as a valid value even though the MCP `export_project` tool advertised it) — added real 4K (2160p-height) support to both the ffmpeg (`export-runner.ts`) and WebCodecs (`webcodecExporter.ts`) resolution resolvers, and to the editor's export UI. Added a "Canvas" section to the editor's Brand Kit panel with one-click dimension presets.

Note: new `AnimationType` motion presets, transition *types*, `ShapeKind` values, and composition *types* are not addable this way — those require real code in `animation-engine`/`render-core`, not a data operation. Everything else (fonts, images, logos, videos, audio, SVG animation stickers, icons, templates, style examples, and fully custom per-element CSS animations) is fully addable via the tools above — `customCSS` covers arbitrary motion (e.g. "balloons flying," or something translated from a reference image/video) without needing a new `AnimationType`.

**Bug fixed alongside this:** the CSS renderer's `customCSS` scoping (`packages/render-core/src/cssRenderer.ts`) had two latent bugs that made it silently non-functional whenever it included `@keyframes` — a per-frame `style.animation = ""` reset that clobbered the customCSS-declared animation via inline-style precedence, and a selector-scoping regex that corrupted keyframe percentage selectors (`0%`, `50%`, ...) into invalid CSS. Both fixed; confirmed working end-to-end (browser-verified transform interpolation across a keyframe animation).

| Step | Description | Status |
|---|---|---|
| 1 | `apps/mcp/package.json` — `@modelcontextprotocol/sdk`, stdio transport | ✅ Done |
| 2 | `apps/mcp/src/index.ts` — MCP server wrapping the API's tool/operation endpoints | ✅ Done |
| 3 | Claude Desktop / Claude Code config snippet in docs | ✅ Done |

---

## Phase 6 — Cloud Rendering

> Scalable distributed render pipeline, CDN delivery, render queuing.
> Not yet planned.
