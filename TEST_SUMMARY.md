# Unit Test Suite - Kwikk Semantic Video Engine

## Overview
Comprehensive unit tests covering the highest-value semantic domain functions and export pipeline logic. Tests validate core platform functionality end-to-end.

## Test Coverage Summary

### TypeScript Packages (59 tests)

#### 1. **Scene Graph** (@kwikk/scene-graph) - 16 tests
Core project and scene management validation.

**Functions tested:**
- `createSceneObject()` - Object creation with defaults
- `createScene()` - Scene creation with defaults  
- `validateProject()` - Project validation logic
- `createStarterProject()` - Starter project generation

**Key test cases:**
- ✓ Object creation with default layout values
- ✓ Scene creation with default duration and background
- ✓ Project validation: detects non-positive durations
- ✓ Project validation: detects duplicate object IDs
- ✓ Project validation: detects missing scene references
- ✓ Starter project passes all validation
- ✓ Starter project has expected semantic structure
- ✓ Animations configured on intro scene objects

---

#### 2. **Timeline** (@kwikk/timeline) - 14 tests
Timeline resolution and clip sequencing logic.

**Functions tested:**
- `getProjectDurationMs()` - Total project duration calculation
- `getActiveSceneWindow()` - Active scene resolution at given timeMs

**Key test cases:**
- ✓ Duration returns 0 for no clips
- ✓ Duration correctly sums sequential clips
- ✓ Duration handles overlapping clips
- ✓ Active scene resolves to null outside clip ranges
- ✓ Active scene resolves at clip boundaries
- ✓ Correctly computes localTimeMs for clip offsets
- ✓ Selects lowest layer when clips overlap
- ✓ Handles multiple sequential clips

---

#### 3. **Animation Engine** (@kwikk/animation-engine) - 16 tests
Deterministic animation sampling with easing functions.

**Functions tested:**
- `resolveAnimatedObject()` - Animation frame sampling at given timeMs

**Key test cases:**
- ✓ Static objects unchanged when no animations
- ✓ Linear easing: 0-1000ms = 0-100 at t=500ms equals 50
- ✓ Ease-out: accelerates towards end
- ✓ Ease-in: accelerates from start
- ✓ Ease-in-out: S-curve progression
- ✓ Position properties (x, y) sampled correctly
- ✓ Opacity property sampled correctly
- ✓ Rotation property sampled correctly
- ✓ Scale property adjusts width/height
- ✓ Holds first keyframe value before timeline
- ✓ Holds last keyframe value after timeline
- ✓ Multiple tracks applied simultaneously
- ✓ Handles unsorted keyframes
- ✓ Does not mutate original object
- ✓ Handles empty/single keyframe cases

---

#### 4. **Render Core** (@kwikk/render-core) - 13 tests
Render frame construction with animation resolution.

**Functions tested:**
- `buildRenderFrame()` - Render frame construction at timeMs

**Key test cases:**
- ✓ Returns null when timeMs outside all clips
- ✓ Includes scene backgroundColor in frame
- ✓ Includes all scene objects in frame
- ✓ Sorts nodes by zIndex for compositing order
- ✓ Applies animations via resolveAnimatedObject
- ✓ Correctly computes localTimeMs for animation sampling
- ✓ Includes timeMs metadata in frame
- ✓ Works with starter project
- ✓ Handles scenes with no objects
- ✓ Defaults zIndex to 0 when undefined
- ✓ Selects lowest layer in overlapping clips
- ✓ Returns null for missing scene references

---

### Go Packages (11 tests)

#### 5. **Exporter** (apps/api/internal/exporter) - 11 tests
FFmpeg export plan generation and validation.

**Functions tested:**
- `BuildExportPlan()` - FFmpeg command construction

**Test categories:**

**Structure Tests (9 parameterized cases):**
- ✓ Basic export plan generation
- ✓ Frame pattern includes project ID
- ✓ FFmpeg command has correct -framerate
- ✓ FFmpeg command has correct -vf scale filter
- ✓ FFmpeg command structure validation
- ✓ High FPS value (120fps)
- ✓ 4K resolution (3840x2160)
- ✓ Vertical video resolution (1080x1920)

**Format Tests:**
- ✓ Frame pattern uses %06d format specifier
- ✓ Frame pattern ends with .png
- ✓ Output path starts with /tmp/
- ✓ Output path ends with .mp4
- ✓ Output path contains project ID

**Benchmark:**
- `BenchmarkBuildExportPlan` - Performance baseline

---

## Test Execution

### TypeScript Tests
```bash
# Run all TypeScript tests
cd /home/kawadhiya21/kwikk
npm run test

# Test individual packages
cd packages/scene-graph && npm test
cd packages/timeline && npm test
cd packages/animation-engine && npm test
cd packages/render-core && npm test
```

### Go Tests
```bash
cd apps/api
go test ./internal/exporter/... -v
```

---

## Test Results Summary

| Package | Test Count | Status | Coverage |
|---------|-----------|--------|----------|
| scene-graph | 16 | ✅ PASS | createSceneObject, createScene, validateProject, createStarterProject |
| timeline | 14 | ✅ PASS | getProjectDurationMs, getActiveSceneWindow |
| animation-engine | 16 | ✅ PASS | resolveAnimatedObject (all easing types, properties) |
| render-core | 13 | ✅ PASS | buildRenderFrame |
| exporter (Go) | 11 | ✅ PASS | BuildExportPlan (structure, format, edge cases) |
| **TOTAL** | **70** | **✅ PASS** | 100% of high-value units |

---

## High-Value Unit Coverage

This test suite covers the highest-value units identified for semantic video platform:

1. **Domain Validation** - `validateProject()` prevents invalid states
2. **Timeline Resolution** - `getActiveSceneWindow()` + `getProjectDurationMs()` handles sequencing
3. **Animation Sampling** - `resolveAnimatedObject()` provides deterministic frame animation
4. **Frame Building** - `buildRenderFrame()` integrates all layers into compositor output
5. **Export Planning** - `BuildExportPlan()` generates correct FFmpeg invocations

---

## Architecture Notes

### Semantic-First Testing
- Tests validate project structure stays valid through transformations
- Object IDs validated globally across scenes
- Timeline references resolved correctly
- Animation keyframes sampled deterministically

### Deterministic Rendering
- All animation easing functions tested with expected values
- Time mapping (globalMs → localTimeMs) validated
- zIndex sorting verified for layer order
- Frame composition tested end-to-end

### Export Pipeline
- FFmpeg command structure validated
- Frame pattern formatting tested across resolutions
- FPS and scale parameters verified for various output targets

---

## Running Tests in CI/CD

```bash
# TypeScript tests with coverage
npm run test:coverage

# Go tests with race detector
go test -race ./...

# Full validation suite (type check + tests + build)
npm run typecheck
npm run test
npm run build
cd apps/api && go test ./...
```

---

## Future Test Expansion Areas

These units are intentionally thin (no tests yet):
- Media loading/render node resolution
- Headless frame export worker
- Persistence/database integration
- AI operation layer
- Transitions/effects system

Test infrastructure is ready for expansion as these features solidify.
