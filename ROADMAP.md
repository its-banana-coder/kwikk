# ROADMAP.md — kwikk

---

## Phase 1 — Deterministic Rendering Engine

**Goal:** Deterministic Timeline Rendering → Frame Output

Build the foundational rendering pipeline. Same `sceneGraph + timeMs` must always produce the same visual output.

### Status

| Step | Description | Status |
|---|---|---|
| 1 | Timeline Engine (`play`, `pause`, `seek`, `tick`) | ✅ Done |
| 2 | `resolveRenderFrame(project, { timeMs })` — pure renderer function | ✅ Done |
| 3 | Scene graph rendering (text, image, video, shapes; x/y/scale/opacity/rotation/zIndex) | ✅ Done |
| 4 | Animation interpolation (`interpolate`, `resolveAnimatedLayout`, easing) | ✅ Done |
| 5 | PixiJS rendering pipeline (`PixiSceneRenderer`) | ✅ Done |
| 6 | Frame determinism — same inputs always produce same frame | ✅ Done |
| 7 | Frame capture — `seek(timeMs)` → `renderFrame()` → `canvas.toBlob()` per frame | ⬜ TODO |
| 8 | Export architecture prep — frame sequence pipeline for future FFmpeg encode | ⬜ TODO |
| 9 | Preview playback — play/pause/seek/loop in editor and renderer | ✅ Done |
| 10 | Motion primitives — `fade_in/out`, `zoom_in/out`, `slide_left/right`, `subtitle_pop` | ✅ Done |

**Phase 1 success criteria:**
- `renderFrame(timeMs)` works ✅
- Animations interpolate correctly ✅
- Playback is deterministic ✅
- Frame capture works ⬜
- Scenes render consistently ✅
- Renderer remains pure ✅

**Remaining work:** frame capture pipeline (Step 7) and export architecture prep (Step 8).

**Note on frame capture:** preview playback uses `requestAnimationFrame` + delta time. Frame extraction must use explicit `seek(timeMs)` → `renderFrame()` → `canvas.toBlob()` per frame — no rAF involvement.

---

## Phase 2 — Editor Polish

> Not yet planned.

---

## Phase 3 — AI Orchestration

> Not yet planned.

---

## Phase 4 — MCP Exposure

> Not yet planned.

---

## Phase 5 — Cloud Rendering

> Not yet planned.
