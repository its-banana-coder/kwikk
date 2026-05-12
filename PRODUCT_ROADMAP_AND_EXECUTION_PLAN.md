# PRODUCT_ROADMAP_AND_EXECUTION_PLAN.md

We are now transitioning from:
prototype engine exploration

to:
structured product execution.

The current engine can already generate basic usable reels.

The next goal is:
evolve this into a scalable AI-native semantic motion storytelling platform.

IMPORTANT:
We are NOT building:

* a Canva clone
* a generic graphics editor
* a full Adobe replacement

We ARE building:
AI-native motion storytelling infrastructure for branded short-form content.

---

# CURRENT STATUS

Current working capabilities:

* basic reel generation
* deterministic rendering
* timeline playback
* PixiJS rendering
* structured scene graph
* subtitles/text
* basic motion
* preview system

The foundation exists.

Now we must evolve the system carefully without breaking:

* semantic structure
* determinism
* operation architecture
* future MCP compatibility

---

# CORE PRODUCT DIRECTION

The product should become:

Prompt
↓
Semantic Scene Planning
↓
Motion Composition
↓
Brand-Aware Styling
↓
Editable Timeline
↓
Deterministic Rendering
↓
Export

The system must support:

* AI-first workflows
* lightweight human overrides
* future advanced editing
* scalable motion systems

---

# PRIMARY PRODUCT USE CASE

Businesses and creators upload:

* product images
* human photos
* logos
* videos
* brand assets

The system transforms them into:
dynamic branded motion reels.

Motion quality and pacing matter more than static design complexity.

---

# HIGH-LEVEL PRODUCT PHASES

# PHASE 1 — Core Reel Engine

(Current phase)

Focus:

* timeline stability
* motion system
* captions/subtitles
* assets
* transitions
* typography
* export consistency

Goal:
Create production-quality reels reliably.

---

# PHASE 2 — Brand Storytelling Layer

Focus:

* brand profiles
* reusable themes
* typography packs
* motion packs
* subtitle styles
* asset systems

Goal:
Brand-aware reusable storytelling.

---

# PHASE 3 — Semantic AI Orchestration

Focus:

* scene planning
* pacing intelligence
* semantic operations
* AI motion orchestration
* reusable narrative systems

Goal:
Prompt-driven reel generation with semantic control.

---

# PHASE 4 — Advanced Motion Systems

Focus:

* virtual camera
* motion choreography
* cinematic transitions
* layered animation systems
* advanced subtitle timing
* beat synchronization

Goal:
High-quality motion storytelling.

---

# PHASE 5 — Motion Graphics Infrastructure

(Far future)

Focus:

* compositing
* masks
* effect graphs
* advanced VFX
* motion graphics engine

Do NOT optimize for this now.

---

# IMMEDIATE EXECUTION PRIORITIES

Build in this order.

---

# PRIORITY 1 — OPERATION SYSTEM

CRITICAL.

Every user action must become a structured operation.

Examples:

{
"operation": "add_caption"
}

{
"operation": "replace_asset"
}

{
"operation": "apply_motion_preset"
}

{
"operation": "change_brand_theme"
}

This becomes foundation for:

* undo/redo
* AI operations
* MCP
* future collaboration

DO NOT allow arbitrary state mutations.

---

# PRIORITY 2 — TIMELINE ORCHESTRATION

Build robust timeline architecture supporting:

* element timing
* overlaps
* transitions
* layered objects
* motion sequencing
* scene durations

Timeline time remains:
single source of truth.

All rendering derives from:
renderFrame(timeMs)

---

# PRIORITY 3 — ASSET MANAGEMENT SYSTEM

Build:

* uploads
* asset references
* caching
* thumbnails
* image/video support
* asset reuse

Prepare future compatibility for:

* stock providers
* AI-generated assets
* CDN systems

---

# PRIORITY 4 — TEXT & SUBTITLE SYSTEM

Build structured text segment system.

Support:

* captions
* subtitles
* emphasis words
* animated text
* subtitle presets

Avoid:

* arbitrary rich text systems
* uncontrolled HTML rendering

Subtitles are motion primitives.

---

# PRIORITY 5 — MOTION PRESET ENGINE

CRITICAL FUTURE DIFFERENTIATOR.

Create reusable motion systems.

Examples:

* aggressive_social
* premium_fashion
* educational_clean
* cinematic_minimal
* mrbeast_fast

Motion presets should control:

* transitions
* subtitle timing
* camera movement
* emphasis rhythm
* animation intensity

---

# PRIORITY 6 — TRANSITION ENGINE

Build:

* fade
* blur
* slide
* zoom
* motion blur transitions

Transitions should support:

* overlap windows
* timing orchestration
* reusable presets

---

# PRIORITY 7 — BRAND SYSTEM

Build:

* brand profiles
* color systems
* typography inheritance
* subtitle styles
* motion styles

Brand inheritance chain:

Brand
↓
Scene
↓
Element

Avoid duplicated styles everywhere.

---

# PRIORITY 8 — VIRTUAL CAMERA SYSTEM

Very important for reels.

Support:

* pan
* zoom
* crop movement
* parallax
* focus movement

This creates motion from static assets.

---

# PRIORITY 9 — AUDIO SYSTEM

Build:

* background music
* sound effects
* timing support
* waveform preview later

Future compatibility:

* beat sync
* subtitle sync
* auto-cutting

---

# PRIORITY 10 — EXPORT CONSISTENCY

Ensure:
Preview == Export

Deterministic rendering is mandatory.

Avoid:

* realtime screen recording
* export-specific rendering hacks

Use:
renderFrame(timeMs)

for both preview and export.

---

# IMPORTANT ARCHITECTURAL RULES

1. Renderer must remain pure.
2. Timeline time is single source of truth.
3. Semantics must survive edits.
4. PixiJS is rendering backend only.
5. Everything important must be serializable.
6. Motion is first-class.
7. Operations drive all state changes.
8. Avoid hidden mutable state.
9. Build constrained systems first.
10. Preserve future MCP compatibility.

---

# IMPORTANT PRODUCT RULES

Do NOT optimize for:

* enterprise complexity
* professional VFX
* arbitrary freeform editing

Optimize for:

* motion quality
* pacing
* brand storytelling
* AI controllability
* fast reel generation

---

# EXECUTION STRATEGY

Before adding major new systems:
create REAL reels internally.

Test workflows:

* fashion reel
* educational reel
* food storytelling reel
* subtitle-heavy reel
* sales reel

Use these to discover:

* missing primitives
* motion weaknesses
* timeline flaws
* rendering problems
* UX friction

Real workflows matter more than theoretical architecture.

---

# CURRENT PRIMARY GOAL

Create a system capable of:
production-quality branded short-form reels
using uploaded assets + motion orchestration.

Focus on:
motion quality,
semantic consistency,
and structured extensibility.

Avoid premature complexity.
