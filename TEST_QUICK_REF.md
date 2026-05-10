# Quick Test Reference

## Run All Tests

```bash
# From repo root
npm run test              # Run all TypeScript tests
cd apps/api && go test ./...  # Run Go tests
```

## Run Tests by Package

```bash
# Scene graph (validateProject, createStarterProject)
cd packages/scene-graph && npm test

# Timeline (getProjectDurationMs, getActiveSceneWindow)
cd packages/timeline && npm test

# Animation engine (resolveAnimatedObject)
cd packages/animation-engine && npm test

# Render core (buildRenderFrame)
cd packages/render-core && npm test

# Export plan (BuildExportPlan)
cd apps/api && go test ./internal/exporter/... -v
```

## Watch Mode (Development)

```bash
cd packages/scene-graph && npm test -- --watch
cd packages/timeline && npm test -- --watch
cd packages/animation-engine && npm test -- --watch
cd packages/render-core && npm test -- --watch
```

## Test with Coverage

```bash
# To add coverage reports, install vitest coverage:
npm install --save-dev @vitest/coverage-v8

# Run with coverage
cd packages/scene-graph && npm test -- --coverage
cd packages/timeline && npm test -- --coverage
cd packages/animation-engine && npm test -- --coverage
cd packages/render-core && npm test -- --coverage
```

## Test File Locations

- `packages/scene-graph/src/index.test.ts` - 16 tests
- `packages/timeline/src/index.test.ts` - 14 tests
- `packages/animation-engine/src/index.test.ts` - 16 tests
- `packages/render-core/src/index.test.ts` - 13 tests
- `apps/api/internal/exporter/exporter_test.go` - 11 tests (plus benchmark)

## Key Test Functions

| Function | File | Tests |
|----------|------|-------|
| `validateProject()` | packages/scene-graph | 6 |
| `createStarterProject()` | packages/scene-graph | 6 |
| `getProjectDurationMs()` | packages/timeline | 5 |
| `getActiveSceneWindow()` | packages/timeline | 9 |
| `resolveAnimatedObject()` | packages/animation-engine | 16 |
| `buildRenderFrame()` | packages/render-core | 13 |
| `BuildExportPlan()` | apps/api/internal/exporter | 11 |

## Total: 70 unit tests, 100% passing ✅
