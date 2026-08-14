# CLAUDE.md — kwikk project

This file is loaded automatically by Claude Code at the start of every session.
All code generation, refactoring, and feature work in this repo MUST comply with the rules below.
These are non-negotiable architectural constraints, not suggestions.

---

## What this system is

AI-native semantic motion storytelling infrastructure.

NOT a Canva clone. NOT a timeline toy. NOT a generic graphics editor.

---

## Absolute constraints (ENGINE.md enforced)

### 1. Scene graph is the source of truth
All state lives in `ProjectDocument` (scenes, elements, timeline tracks, viewport).
No hidden mutable state. No renderer-owned truth. No DOM-owned truth. No singleton editor state.
The entire project must be reconstructable from JSON alone.

### 2. Every edit must go through `EditorOperation`
Every mutation to `ProjectDocument` MUST be dispatched as a typed `EditorOperation` through `applyOperation`.
Direct mutations to project state are forbidden.
The `operationLog` must record every operation for future undo/redo, AI, and MCP use.

Reference operations already defined in `packages/scene-graph/src/index.ts`:
- `patch_element`, `add_element`, `delete_element`
- `add_animation`, `update_animation`, `delete_animation`
- `set_element_motion_preset`
- `add_scene`, `delete_scene`, `reorder_scenes`, `update_scene`, `update_scene_duration`
- `set_brand_theme`

When adding new mutation types, extend `EditorOperation` and `applyOperation`. Never bypass them.

### 3. Renderer must be pure
`resolveRenderFrame(project, { timeMs })` is the only rendering contract.
The renderer reads the scene graph and renders. It MUST NOT mutate scene graph, timeline, or editor state.
Same `project + timeMs` must always produce the same frame — guaranteed.

### 4. Timeline `timeMs` is the single source of truth
All animated values (transforms, opacity, blur, subtitles, transitions) derive from `timeMs`.
No frame accumulation drift. No animation-local timers. No hidden playback state.

### 5. Semantic structure must survive all edits
Every `ElementNode` must keep its `id`, `semanticRole`, and `motionPreset` intact through:
- dragging, resizing, animation changes, manual overrides
Objects must never degrade to generic blobs without semantics.

### 6. Stable IDs everywhere
Scenes, elements, animations, tracks, transitions — all require stable IDs.
Required for AI editing, timeline references, serialization, and future multiplayer/undo.

### 7. AI and humans use the same system
No special AI pathways, no hidden AI-only state, no separate AI rendering flows.
AI must use the same `EditorOperation` pipeline as the human editor.

### 8. Motion is first-class
Motion primitives are core engine concepts, not afterthoughts.
`AnimationType` (defined in `packages/shared-types/src/index.ts`) has ~178 values — a
core hand-picked set (fadeIn, slideUp, zoomIn, bounceIn, spring_in, etc. — see
`buildAnimationSection()` in `packages/llm-context/src/index.ts`) plus a ~86-entry
animate.css-equivalent library (backInDown, bounceInLeft, fadeInBottomLeft, flipInX,
rotateInDownLeft, slideInUp, zoomOutUp, hinge, jackInTheBox, wobble, etc. — full
Back/Bounce/Fade/Flip/LightSpeed/Rotate/Slide/Zoom in/out families). Don't hand-maintain
this list here — it drifts. The MCP `search_animations` tool (backed by the `animations`
DB table, seeded from `apps/api/src/animation-catalog.ts`) is the source of truth for
discovery; `apps/shared-types/src/index.ts`'s `AnimationType` union is the source of
truth for validity.

Element-level motion presets are **user-created**, not hardcoded — there is no static
`MOTION_PRESETS` map. Presets live in the `motion_presets` Postgres table
(`apps/api/src/routes/motion-presets.ts`) as named, reusable bundles of `Animation`
entries built from the `AnimationType` vocabulary above. They're created via the MCP
`add_motion_preset` tool (or the editor's "save current animations as preset" control),
discovered via `list_motion_presets`, and applied via `set_element_motion_preset`, which
takes a `motionPresetId` and resolves the saved `animations` onto the element server-side
(fresh animation ids stamped per application). The catalog starts empty by design — this
keeps the constrained-system principle (#12) while moving authorship to users instead of
a hand-maintained list.

New motion features must be composable, deterministic, and timeline-driven.
Never implement scattered CSS animations or renderer-local animation hacks.
**Whenever a new `AnimationType` is added, it must be added to `animation-catalog.ts`
(or `buildAnimationSection()` in `packages/llm-context/src/index.ts`) in the same
change** — an animation the renderer can play but no discovery tool can find is
effectively dead code to every AI client.

### 9. Semantics and presentation are separate
`semanticRole` describes what an element IS.
`motionPreset` describes how it MOVES.
`brandTheme` (on `ProjectDocument`) describes the visual system.
These must remain decoupled — enabling re-theming, AI style transforms, and reusable motion grammar.

### 10. Renderer backend must stay replaceable
Business logic must not couple to PixiJS, DOM, or React components.
PixiJS is only the current rendering backend — it lives in `packages/render-core`.
Scene semantics must be expressible without any renderer.

### 11. UI is not the engine
React UI is a control surface only.
Business logic lives in:
- `packages/scene-graph` — mutations and validation
- `packages/animation-engine` — animation resolution
- `packages/render-core` — rendering
- `packages/timeline` — playback engine
Not inside React components or `apps/editor`.

### 12. Prefer constrained systems
Reusable motion presets > arbitrary keyframe graphs.
Structured transitions > freeform compositing.
Constraint improves usability, AI controllability, and maintainability.

### 13. Never sacrifice core architecture for short-term speed
Shortcuts that break determinism, semantics, structured operations, or renderer purity
will be extremely expensive to fix later. Protect the engine foundations.

---

## Package map

| Package | Role |
|---|---|
| `packages/shared-types` | All shared TypeScript types (`ElementNode`, `ProjectDocument`, `AnimationType`, etc.) |
| `packages/scene-graph` | Scene graph factories, validators, `EditorOperation`, `applyOperation`, `mergeElementPatch` |
| `packages/animation-engine` | `resolveAnimatedLayout`, `SCENE_MOTION_PRESETS` (scene-level; element-level presets are user-created, stored in the `motion_presets` DB table) |
| `packages/render-core` | `resolveRenderFrame`, `PixiSceneRenderer` (pure consumer of scene graph) |
| `packages/timeline` | `TimelineEngine`, `getActiveSceneWindow`, timeline math |
| `packages/font-manager` | Font metadata DB (merged into Postgres) — types, db queries, file storage. Node-only, never import from browser packages. |
| `packages/tts-engine` | Narration/text-to-speech — `TtsProvider` interface + pluggable providers (default: local `tiny-tts` ONNX model), selected via `TTS_PROVIDER` env var. See `packages/tts-engine/README.md` for the interface and how to swap in a hosted provider (e.g. OpenAI). Node-only, never import from browser packages. |
| `apps/editor` | React editor shell — UI only, all logic delegated to packages |
| `apps/api` | **TypeScript/Hono API server on :8080** — auth, projects, assets, brand-kit, font catalog, AI generation. All new routes go in `apps/api/src/routes/` and are registered in `apps/api/src/index.ts`. Database is PostgreSQL with pgvector. |
| `apps/renderer` | Headless renderer |

---

## Checklist before any code change

- [ ] Does the change mutate `ProjectDocument` directly? → Route through `EditorOperation` + `applyOperation` instead.
- [ ] Does the change put business logic inside a React component? → Move to the appropriate package.
- [ ] Does the change couple the renderer to the scene graph? → Renderer must only read, never write.
- [ ] Does the change introduce non-determinism (random IDs at render time, timer drift, etc.)? → Fix it.
- [ ] Does the change remove or ignore `semanticRole` / `id` / `motionPreset`? → Preserve them.
- [ ] Is the change adding a new mutation type? → Extend `EditorOperation` and `applyOperation` in scene-graph.
- [ ] Is the change adding a new animation behaviour? → Extend `AnimationType` in shared-types and handle it in `resolveAnimatedLayout` in animation-engine.
