# Agent Instructions — Kwikk

Read `knowledge.md` first for full architecture context. This file is about *how to work* in this repo.

---

## Orientation

- **Source of truth**: `ProjectDocument` in the Zustand store. All mutations go through store actions.
- **Rendering**: PixiJS via `PixiSceneRenderer`. Never manipulate the DOM or canvas directly — always update `project` and let the renderer react.
- **Types**: All domain types live in `packages/shared-types`. Import from there; do not redeclare locally.
- **Immutability**: All scene-graph mutators return new objects. Use the provided helpers (`updateSceneElement`, `updateSceneDuration`) rather than spreading manually across the nested structure.

---

## When Modifying the Editor

### Adding a new store action
1. Add the method signature to `EditorState` interface in `store.ts`
2. Implement it in the `create()` call using `set(state => ...)`
3. Use scene-graph helpers for mutations that touch `project`; always return a new state object
4. Expose via `useEditorStore(state => state.actionName)` in the component

### Adding a new UI control
- Properties panel lives in the `{isPropertiesOpen && <section>}` block in `App.tsx`
- Element-type-specific controls go inside `{selectedElement.type === "text" && ...}` guards
- Layout controls use `updateElement(sceneId, elementId, { layout: { ... } })`
- Style controls use `updateElement(sceneId, elementId, { style: { ... } })`

### Adding a new element type
1. Add the type to `ElementType` in `shared-types`
2. Add a factory branch in `createElementNode()` in `scene-graph`
3. Add a render branch in `render-core` (`PixiSceneRenderer`)
4. Add an inspector block in the properties panel in `App.tsx`
5. Add a button in the "add element" row in `App.tsx`

---

## When Modifying Packages

### shared-types
- No runtime code. Types only.
- Adding a field: add it as optional (`?`) unless you update all call sites and the prototype project.

### scene-graph
- Factories must set sensible defaults so callers don't need to supply everything.
- `updateSceneDuration()` must always call `buildSequentialTimelineTracks()` to keep tracks in sync.
- `validateProjectDocument()` should catch structural invariant violations; keep it exhaustive.

### timeline
- `TimelineEngine` is stateful but isolated. Keep it free of React/DOM dependencies.
- `getActiveSceneWindow()` must handle gaps between scenes (return null).

### animation-engine
- `timeMs` passed in is **local scene time** (0-based). Don't pass global project time.
- Animations must not mutate the input `ElementNode`. Return new objects.
- New animation types: add to `AnimationType` in shared-types, then add a branch in `resolveAnimatedLayout()`.

### render-core
- `resolveRenderFrame()` must remain pure and stateless.
- `PixiSceneRenderer` holds all PixiJS state. Only one instance per canvas.
- When adding new element rendering: add a `createXxxDisplay()` function and call it from `renderFrame()`.

---

## Rules

**Never break determinism.** `resolveRenderFrame(project, { timeMs })` must be a pure function. No `Math.random()`, no `Date.now()`, no external calls inside the render pipeline.

**Never mutate project state directly.** Always use `set()` in the Zustand store and return a new state object. Spread nested objects — never assign to them.

**Never edit `timelineTracks` manually.** Always call `updateSceneDuration()` or `buildSequentialTimelineTracks()` so tracks stay in sync with scenes.

**Keep package boundaries clean.** `animation-engine` must not import from `timeline`. `render-core` uses both but `timeline` does not use `render-core`. Dependency order: `shared-types` → `scene-graph` → `timeline` / `animation-engine` → `render-core`.

**Semantic roles are sacred.** Do not strip `element.semanticRole` during mutations. They are the stable handle for AI operations.

---

## Testing

- Unit tests for packages: `npm run test` from root (Vitest)
- Type check: `npm run typecheck`
- No test runner for the editor UI — use the manual QA checklist in `MANUAL_QA_CHECKLIST.md`
- For new package functions: add tests alongside the function in the same package

When adding a new core function (factory, mutator, resolver), add a test file or extend the existing one in that package. Cover: happy path, edge cases (empty arrays, zero durations, missing refs), and immutability (original object unchanged).

---

## Common Tasks

### Delete an element
```typescript
// store action
deleteElement: (sceneId, elementId) =>
  set((state) => ({
    project: updateSceneElement ... // or filter from scene.elements
  }))
```
Filter from `scene.elements` directly — there is no scene-graph helper for deletion yet.

### Add a new scene
Use `createScene()` from scene-graph, push to `project.scenes`, then call `buildSequentialTimelineTracks(project.scenes)` to rebuild tracks.

### Edit scene background color
`updateElement` is for elements. For scene-level fields, mutate `project.scenes` directly in the store action: `scenes.map(s => s.id === sceneId ? { ...s, backgroundColor } : s)`, then rebuild tracks.

### Add an animation to an element
Push to `element.animations[]`. The animation-engine reads this array at render time. Format:
```typescript
{ type: "fadeIn", durationMs: 800, delayMs: 0, easing: "easeOut" }
```

### Resize handles on canvas
Pointer events are in `PreviewCanvas.tsx`. `handlePointerDown` detects the clicked element. Add resize handle hit areas around the selected element's bounding box and translate pointer delta to `layout.width`/`layout.height` changes via `onUpdateElement`.

---

## What Is Not Implemented Yet (as of Phase 1)

- Delete element / delete scene
- Add scene from UI
- Scene reordering
- Undo / redo
- Scene background color editor
- Rotation control in inspector
- Resize handles on canvas
- Animation keyframe editor
- Keyboard shortcuts (Delete, Space, arrow nudge)
- Persistence (no save/load — state resets on refresh)
- Media loading (images render as labeled placeholders)
- Headless frame export worker
- AI operation layer
