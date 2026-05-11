# Kwikk — Repository Knowledge Base

## What This Is

Kwikk is an AI-native semantic video engine. It produces deterministic, frame-exact video compositions from a declarative JSON data model. The core promise: given the same `timeMs`, the renderer always outputs the same frame. This makes it suitable for AI-driven editing and headless export via FFmpeg.

The product is a short-form vertical reel editor (1080×1920). Phase 1 is a prototype with 3 scenes (Hook, Breakdown, CTA), 30s total duration.

---

## Monorepo Structure

```
kwikk/
├── apps/
│   ├── editor/          # React editor UI (main product surface)
│   ├── renderer/        # Standalone PixiJS renderer (for headless export)
│   └── api/             # Go HTTP API (export planning, AI operations)
└── packages/
    ├── shared-types/    # All TypeScript domain types (no deps)
    ├── scene-graph/     # Scene factories, validators, mutators
    ├── timeline/        # Playback engine, time sequencing
    ├── animation-engine/# Animation sampling, easing functions
    └── render-core/     # PixiJS renderer bridge
```

Package manager: **pnpm 10** with workspaces. All packages are referenced as `@kwikk/<name>`.

---

## Data Model

The root data structure is `ProjectDocument` (defined in `shared-types`):

```typescript
ProjectDocument {
  id: string
  viewport: Viewport              // { width: 1080, height: 1920 }
  scenes: Scene[]
  timelineTracks: TimelineTrack[]
}

Scene {
  id: string
  name: string
  durationMs: number              // default 10000
  backgroundColor: string         // default "#ffffff"
  elements: ElementNode[]
}

TimelineTrack {
  id: string
  sceneId: string
  startMs: number                 // derived by buildSequentialTimelineTracks()
  layer: number
}

ElementNode {
  id: string
  type: "text" | "image" | "video" | "shape"
  semanticRole?: string           // e.g. "hook-headline", "cta-button"
  layout: LayoutProps             // x, y, width, height, scale, opacity, rotation, zIndex
  style: StyleProps               // color, fontSize, fontFamily, fontWeight, fontStyle, textAlign
  content?: ElementContent        // { text } | { src, label } | { shape, label }
  animations?: Animation[]
  overrides?: ManualOverrides     // editor-applied manual layout overrides
}

Animation {
  type: "fadeIn" | "fadeOut" | "slideUp" | "slideDown" | "zoomIn"
  durationMs: number
  delayMs?: number
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut"
}
```

**Key invariant**: `timelineTracks` is always derived from `scenes` via `buildSequentialTimelineTracks()`. Never edit tracks directly — call `updateSceneDuration()` which rebuilds tracks automatically.

---

## Data Flow Pipeline

```
ProjectDocument
    │
    ▼ timeline stage
getActiveSceneWindow(project, timeMs)
    → finds the scene active at timeMs
    → computes localTimeMs (time within that scene)
    │
    ▼ animation stage
resolveAnimatedLayout(element, localTimeMs)
    → samples all animations at local time
    → returns LayoutProps with computed opacity/position/scale
    │
    ▼ frame resolution
resolveRenderFrame(project, { timeMs })
    → combines timeline + animation for all elements
    → sorts by zIndex
    → returns ResolvedRenderFrame
    │
    ▼ pixi rendering
PixiSceneRenderer.renderFrame({ timeMs })
    → creates/updates PixiJS containers
    → applies transforms (position, rotation, alpha, scale)
    → draws to canvas
```

Every stage is **pure and deterministic** — no frame-to-frame state, no side effects.

---

## Package Responsibilities

### `shared-types`
Only type definitions. Zero runtime code, zero dependencies. Always import types from here rather than declaring locally.

### `scene-graph`
- **Factories**: `createElementNode()`, `createScene()`, `createProjectDocument()`
- **Defaults**: viewport 1080×1920, layout centered, 10s scene duration
- **Prototype**: `createPrototypeProject()` — 3-scene demo with animations (Hook/Breakdown/CTA)
- **Mutators**: `updateSceneElement()`, `updateSceneDuration()` — always return new ProjectDocument (immutable)
- **Validation**: `validateProjectDocument()` → `string[]` errors (duplicate IDs, broken refs)

### `timeline`
- **`TimelineEngine`**: Stateful playback class. `tick(deltaMs)` advances time, `seek(timeMs)` jumps, `play()`/`pause()` toggle.
- **`getActiveSceneWindow(project, timeMs)`**: Returns `{ track, scene, localTimeMs }` or null.
- **`getTimelineDurationMs(tracks)`**: Sum of all track durations.
- No animation knowledge — pure time math.

### `animation-engine`
- **`resolveElementNodeAtTime(element, timeMs)`**: Full element with animated layout applied.
- **`resolveAnimatedLayout(element, timeMs)`**: Just the LayoutProps.
- Animations are declarative (type + duration + delay). Easing: linear, easeIn, easeOut, easeInOut.
- `timeMs` here is **local scene time** (0-based within scene), not global project time.

### `render-core`
- **`resolveRenderFrame(project, { timeMs })`**: Stateless. Takes global timeMs, returns `ResolvedRenderFrame` with `elements[]`, `backgroundColor`, `viewport`, `sceneId`, `timeMs`.
- **`PixiSceneRenderer`**: Wraps a PixiJS Application. `mount(el)` is async. `renderFrame()` is sync after mount.
- Used by both the editor (PreviewCanvas) and the standalone renderer.

---

## Editor Architecture

**State** (`apps/editor/src/store.ts`) — Zustand store:
- `project: ProjectDocument` — single source of truth
- `selectedSceneId`, `selectedElementIds: string[]`
- `timeline: { currentTimeMs, durationMs }`
- `playback: { isPlaying }`

**Actions**:
- `updateElement(sceneId, elementId, patch)` — deep-merges layout/style/content/overrides
- `addElement(sceneId, type)` — creates via `createElementNode()`, auto-selects
- `updateSceneDuration(sceneId, durationMs)` — rebuilds timeline, clamps currentTime
- `selectScene(sceneId)` — also seeks timeline to scene start
- `syncSelectedScene(sceneId)` — used by playback loop to follow time position

**Components**:
- `App.tsx` — layout shell, playback RAF loop, panel visibility
- `PreviewCanvas.tsx` — mounts PixiSceneRenderer, handles pointer drag (element move), text overlay
- `styles.css` — 3-column CSS Grid layout (scenes | preview | properties)

**Panel layout** (CSS classes):
- `.workspace` — grid: `scene-panel | preview-panel | properties-panel`
- `.workspace.scenes-collapsed` — hides scene panel column
- `.workspace.no-properties` — hides properties panel column (when no element selected)

**Playback loop** in App.tsx uses `requestAnimationFrame` + `TimelineEngine.tick()`. The engine ref is in `useRef` so it survives renders.

---

## Renderer Architecture

`apps/renderer/src/main.ts` — standalone. Creates prototype project, mounts PixiSceneRenderer, runs RAF playback loop. Used for visual QA and as the basis for headless frame export.

---

## API Architecture

Go + Gin on `:8080`.

Endpoints:
- `GET /health`
- `GET /v1/architecture` — system description
- `POST /v1/exports/plan` — body: `{ projectId, outputPath, fps, width, height }` → FFmpeg command array

The export pipeline intent: renderer outputs PNG frames per timestamp → FFmpeg stitches to MP4.

---

## Dev Commands

```bash
# From workspace root
npm run dev:editor      # Editor at localhost:5173
npm run dev:renderer    # Renderer at localhost:5173
npm run build           # Build all packages and apps
npm run typecheck       # TypeScript check across workspace
npm run test            # Vitest for all packages

# API
cd apps/api && go run ./cmd/api    # Go server on :8080
cd apps/api && go test ./...        # Go tests
```

---

## Key Design Constraints

1. **Deterministic by design**: `resolveRenderFrame(project, { timeMs })` must always return the same output for the same inputs. No random, no Date.now(), no external state.
2. **Immutable mutations**: All scene-graph mutators return new objects. The Zustand store uses `set()` with spread — never mutate in place.
3. **Local time for animations**: Animations are sampled with `localTimeMs` (0 = scene start), not global project time.
4. **Timeline is derived**: `timelineTracks` is always rebuilt from scenes. `buildSequentialTimelineTracks()` lays scenes end-to-end sequentially.
5. **Semantic roles survive edits**: `element.semanticRole` identifies what an element represents (e.g. "hook-headline"). AI operations use this to target elements without fragile ID lookups.
6. **No DOM recording**: The preview is a live PixiJS render, not a screen capture. Frame export works by seeking and rendering, not recording.

---

## Test Coverage

Unit tests live in each package (`packages/*/src/*.test.ts`). Run with Vitest.

| Package | Tests | What's covered |
|---|---|---|
| scene-graph | 16 | Factories, validation, prototype project |
| timeline | 14 | Duration calc, active scene resolution |
| animation-engine | 16 | All easing types, all animatable properties |
| render-core | 13 | Frame building, zIndex sorting, null cases |
| api (Go) | 11 | FFmpeg plan structure, format, edge cases |

Untested areas (intentional — still evolving): media loading, headless export worker, persistence, AI operations, transitions.

---

## File Map

| Purpose | Path |
|---|---|
| Domain types | `packages/shared-types/src/index.ts` |
| Scene factories & mutators | `packages/scene-graph/src/index.ts` |
| Timeline engine | `packages/timeline/src/index.ts` |
| Animation sampling | `packages/animation-engine/src/index.ts` |
| PixiJS renderer bridge | `packages/render-core/src/index.ts` |
| Editor main UI | `apps/editor/src/App.tsx` |
| Editor state (Zustand) | `apps/editor/src/store.ts` |
| Interactive canvas | `apps/editor/src/PreviewCanvas.tsx` |
| Editor styles | `apps/editor/src/styles.css` |
| Standalone renderer | `apps/renderer/src/main.ts` |
| Go API entry | `apps/api/cmd/api/main.go` |
| HTTP routes | `apps/api/internal/http/router.go` |
| Export planning | `apps/api/internal/exporter/exporter.go` |
| Workspace config | `pnpm-workspace.yaml` |
| TS base config | `tsconfig.base.json` |
