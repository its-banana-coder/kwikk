# ENGINE_PRINCIPLES.md

# AI-Native Semantic Motion Engine — Core Principles

This document defines the non-negotiable architectural principles for the engine.

ALL code generation, refactoring, and feature implementation MUST follow these principles.

The system is intended to become:

* AI-native
* MCP-compatible
* deterministic
* semantically editable
* human editable
* motion-first
* timeline driven

The goal is NOT to build a Canva clone.

The goal is to build:
Semantic Motion Storytelling Infrastructure.

---

# 1. CORE PHILOSOPHY

The engine is:

* scene-centric
* semantic-first
* motion-first
* deterministic
* operation-driven
* renderer-agnostic

The engine must support:

* human editing
* AI editing
* future MCP exposure

without architectural rewrites.

---

# 2. SEMANTIC STRUCTURE IS SACRED

Every object MUST preserve:

* identity
* semantic role
* editable structure

even after:

* dragging
* resizing
* animation changes
* manual overrides

Example:

GOOD:

```json
{
  "id": "title_1",
  "semanticRole": "hook_title"
}
```

BAD:

```json
{
  "pixiInternalObject": {}
}
```

Semantics must survive edits.

---

# 3. ALL STATE MUST BE SERIALIZABLE

The entire project must be reconstructable from JSON.

Do NOT introduce:

* hidden mutable state
* renderer-owned truth
* DOM-owned truth
* singleton editor state

Everything important must exist in explicit serializable structures.

---

# 4. RENDERER MUST BE PURE

Renderer responsibilities:

* consume scene graph
* render frame
* output visuals

Renderer MUST NOT:

* mutate scene graph
* mutate timeline
* mutate editor state

Good:

```ts
renderFrame(sceneGraph, timeMs)
```

Bad:

```ts
renderer.incrementAnimation()
```

Rendering must be deterministic.

---

# 5. TIMELINE TIME IS SINGLE SOURCE OF TRUTH

Everything derives from:

```ts
timeMs
```

Examples:

* transforms
* opacity
* blur
* subtitle timing
* transitions
* motion effects

Avoid:

* frame accumulation drift
* hidden playback state
* animation-local timers

---

# 6. ALL EDITS MUST BE OPERATION-BASED

Every modification should internally become a structured operation.

Example:

```json
{
  "operation": "move_object",
  "objectId": "title_1"
}
```

Avoid:

* arbitrary deep mutations
* direct renderer manipulation
* untracked state changes

This is critical for:

* undo/redo
* AI edits
* MCP compatibility
* collaboration
* version history

---

# 7. AI AND HUMANS USE SAME SYSTEM

AI must use:

* same operations
* same mutation pipeline
* same engine APIs

Do NOT create:

* special AI pathways
* hidden AI-only state
* separate AI rendering flows

The engine should not care whether edits come from:

* humans
* AI
* MCP tools

---

# 8. MOTION IS FIRST-CLASS

Motion is NOT an afterthought.

Motion primitives are core engine concepts.

Examples:

* zoom
* pan
* subtitle_pop
* blur_transition
* camera_move
* kinetic_slide
* parallax

Avoid:

* scattered CSS animations
* renderer-local animation hacks

Motion must be:

* composable
* deterministic
* timeline driven

---

# 9. SCENE GRAPH IS THE CORE ENGINE

The scene graph is the source of truth.

Renderer, editor UI, AI, exports, and MCP all operate on the scene graph.

Do NOT tightly couple business logic to:

* PixiJS
* DOM
* React components

PixiJS is only a rendering backend.

---

# 10. SEPARATE SEMANTICS FROM PRESENTATION

Semantics:

```json
{
  "semanticRole": "hook"
}
```

Presentation:

```json
{
  "motionPreset": "aggressive_zoom"
}
```

These must remain separate.

This enables:

* re-theming
* brand systems
* AI style transformations
* reusable motion grammar

---

# 11. MANUAL EDITS MUST NOT DESTROY STRUCTURE

Example:

* user drags title
* user changes font
* user changes animation

The object must still remain:

```json
{
  "semanticRole": "hook_title"
}
```

Do NOT degrade semantic objects into generic canvas objects.

---

# 12. EVERYTHING SHOULD HAVE STABLE IDS

Objects, scenes, animations, tracks, transitions:
all require stable IDs.

Stable IDs are required for:

* AI editing
* timeline references
* serialization
* multiplayer
* undo/redo

---

# 13. CONSTRAINED SYSTEMS FIRST

Prefer:

* reusable motion presets
* structured transitions
* composable primitives

Avoid prematurely building:

* arbitrary keyframe graphs
* unrestricted node systems
* fully freeform compositing

Constraint improves:

* usability
* AI controllability
* maintainability

---

# 14. DETERMINISTIC EXPORT IS REQUIRED

Same:

```ts
sceneGraph + timeMs
```

must ALWAYS produce:

```ts
same frame
```

This is mandatory for:

* exports
* cloud rendering
* batching
* AI workflows

Avoid:

* screen recording based rendering
* nondeterministic playback capture

---

# 15. BRAND SYSTEMS MUST BE INHERITABLE

Avoid:

* duplicated styles
* hardcoded typography
* repeated colors

Instead:

```json
{
  "brandTheme": "urban_streetwear"
}
```

Styles should inherit from:

* theme
* motion pack
* typography pack
* subtitle system

---

# 16. RENDERING BACKEND MUST BE REPLACEABLE

The engine must not depend architecturally on PixiJS.

Theoretically, renderer could later be:

* PixiJS
* Canvas2D
* WebGL
* WebGPU
* native renderer

without rewriting scene semantics.

---

# 17. UI IS NOT THE ENGINE

React UI is only:

* control surface
* editor shell
* orchestration layer

Business logic must live in:

* scene graph
* operations
* timeline engine
* motion system

NOT inside React components.

---

# 18. MCP IS AN ARCHITECTURAL PROPERTY

The engine should naturally support MCP because:

* operations are structured
* state is explicit
* tools are deterministic
* actions are inspectable

Do NOT build "MCP hacks."

Build clean architecture.

MCP compatibility should emerge naturally.

---

# 19. PRIORITIZE MOTION QUALITY OVER FEATURE COUNT

For short-form content:

* pacing
* motion
* subtitle rhythm
* transitions
* emphasis

matter more than:

* large feature lists

Do NOT sacrifice motion feel for rapid feature expansion.

---

# 20. NEVER SACRIFICE CORE ARCHITECTURE FOR SHORT-TERM SPEED

Shortcuts that break:

* determinism
* semantics
* structured operations
* renderer purity

will become extremely expensive later.

Protect the engine foundations aggressively.

---

# FINAL PRINCIPLE

The system is NOT:

* a timeline toy
* a Canva clone
* a generic graphics editor

The system IS:
AI-native semantic motion storytelling infrastructure.
