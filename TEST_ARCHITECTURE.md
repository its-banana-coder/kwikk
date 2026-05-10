# Test Architecture & Best Practices

## Testing Philosophy

The Kwikk semantic video engine test suite follows these principles:

1. **Semantic-First Testing** - Tests focus on semantic domain invariants
2. **Deterministic Validation** - Animation and timeline logic validated with fixed time values
3. **High-Value Coverage** - Tests focus on core algorithms, not UI/integration layers
4. **Explicit Contracts** - Each test documents expected behavior contracts

---

## Test Structure

### TypeScript Testing (Vitest)

All TypeScript packages use **Vitest** with globals enabled for:
- Cleaner test syntax (`describe`, `it`, `expect`)
- Fast ESM support for monorepo packages
- Excellent TypeScript integration
- Easy watch mode for development

**Config:** Each package includes `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  }
});
```

### Go Testing

Go tests use the standard `testing` package with:
- Table-driven tests for parameterized validation
- Subtests for logical grouping
- Benchmarking support via `go test -bench`

---

## Test Categories

### 1. Unit Tests (Core Logic)
Tests for pure functions with fixed inputs/outputs.

**Examples:**
- `resolveAnimatedObject(object, timeMs)` → resolves animation state at specific time
- `validateProject(project)` → returns list of validation errors
- `getProjectDurationMs(project)` → returns total project duration

**Pattern:**
```typescript
it("describes expected behavior", () => {
  const input = createFixture();
  const result = functionUnderTest(input);
  expect(result).toBe(expectedOutput);
});
```

### 2. Integration Tests (Component Interaction)
Tests for functions that compose multiple units.

**Examples:**
- `buildRenderFrame()` - uses timeline resolution + animation sampling
- `getActiveSceneWindow()` - uses clip selection + scene lookup

**Pattern:**
```typescript
it("composes dependencies correctly", () => {
  const project = createTestProject();
  const result = buildRenderFrame(project, timeMs);
  
  expect(result?.nodes).toHaveLength(expectedCount);
  expect(result?.nodes[0].layout.x).toBe(expectedX);
});
```

### 3. Edge Case Tests
Tests for boundary conditions and error states.

**Examples:**
- Empty arrays, null references
- Negative values, zero durations
- Out-of-range time values
- Overlapping/conflicting configurations

**Pattern:**
```typescript
it("handles edge case: empty keyframes", () => {
  const obj = createSceneObject({...animations: [{keyframes: []}]});
  const resolved = resolveAnimatedObject(obj, 500);
  expect(resolved.layout.x).toBe(obj.layout.x);
});
```

---

## Key Testing Patterns

### Pattern 1: Fixture Creation
Use `createScene`, `createSceneObject` helpers to reduce boilerplate:

```typescript
const obj = createSceneObject({
  id: "obj_1",
  type: "text",
  semanticRole: "generic",
  name: "Test",
  // Only override what you need to test
  layout: { x: 100 }
});
```

### Pattern 2: Time-Based Validation
For animation/timeline logic, test specific time values:

```typescript
expect(resolveAnimatedObject(obj, 0).layout.opacity).toBe(0);      // Start
expect(resolveAnimatedObject(obj, 500).layout.opacity).toBe(0.5);   // Mid
expect(resolveAnimatedObject(obj, 1000).layout.opacity).toBe(1);    // End
```

### Pattern 3: Error Collection
For validators, check multiple errors in one project:

```typescript
const project = createTestProject({...invalidConfig});
const errors = validateProject(project);
expect(errors).toContain("expected error message 1");
expect(errors).toContain("expected error message 2");
```

### Pattern 4: Parameterized Tests (Go)
Use table-driven tests for similar test cases:

```go
tests := []struct {
  name     string
  input    TestInput
  validate func(t *testing.T, output TestOutput)
}{
  {
    name:  "case 1",
    input: TestInput{...},
    validate: func(t *testing.T, output TestOutput) {
      if output != expected {
        t.Errorf("failed")
      }
    },
  },
  // More cases...
}

for _, tt := range tests {
  t.Run(tt.name, func(t *testing.T) {
    output := FunctionUnderTest(tt.input)
    tt.validate(t, output)
  })
}
```

---

## Test File Organization

### TypeScript Pattern
```
packages/module-name/
├── src/
│   ├── index.ts          # Implementation
│   └── index.test.ts     # Tests (co-located)
└── vitest.config.ts      # Test config
```

### Go Pattern
```
apps/api/
├── internal/
│   └── exporter/
│       ├── exporter.go       # Implementation
│       └── exporter_test.go  # Tests (co-located)
```

**Co-location benefit:** Tests stay near implementation for easy synchronization.

---

## Common Test Scenarios

### Scenario 1: Timeline Boundary Testing
```typescript
describe("getActiveSceneWindow", () => {
  // Test clip boundaries
  it("returns active scene at start boundary", () => {
    const window = getActiveSceneWindow(project, clip.startMs);
    expect(window?.localTimeMs).toBe(0);
  });

  it("returns null at exact end boundary", () => {
    const window = getActiveSceneWindow(project, clip.startMs + clip.durationMs);
    expect(window).toBeNull();
  });
});
```

### Scenario 2: Animation Easing Validation
```typescript
describe("resolveAnimatedObject", () => {
  // Test each easing type
  it("applies ease-out correctly", () => {
    const mid = resolveAnimatedObject(obj, 500);
    const linear = 50;
    expect(mid.layout.y).toBeGreaterThan(linear); // Ease-out accelerates
  });
});
```

### Scenario 3: Composition Testing
```typescript
describe("buildRenderFrame", () => {
  // Test composed behavior
  it("applies animations to objects in render frame", () => {
    const frame = buildRenderFrame(project, timeMs);
    const node = frame?.nodes[0];
    // Animation should have been resolved
    expect(node?.layout.x).toBe(expectedAnimatedX);
  });
});
```

---

## Adding New Tests

When adding new functionality:

1. **Create test file** (co-located with implementation)
2. **Define test cases** for:
   - Happy path (normal usage)
   - Edge cases (boundaries, empty, null)
   - Error cases (invalid inputs)
3. **Use existing fixtures** for consistency
4. **Run tests** to ensure they pass
5. **Document intent** with clear test names

Example:
```typescript
describe("newFunction", () => {
  it("returns expected value for valid input", () => {
    // Happy path
  });

  it("handles edge case: empty array", () => {
    // Edge case
  });

  it("returns error for invalid state", () => {
    // Error case
  });
});
```

---

## Continuous Integration Checklist

Before committing:

```bash
# 1. Run all tests
npm run test
cd apps/api && go test ./...

# 2. Check types
npm run typecheck

# 3. Build packages
npm run build

# 4. Verify no console errors
# (manual review of test output)
```

---

## Performance Considerations

### Test Speed
- Target: Individual tests < 10ms
- Vitest: Runs all 59 TS tests in ~3 seconds
- Go: Runs all 11 tests in <5ms

### Optimization Tips
- Use memoized fixtures where possible
- Avoid filesystem operations
- Use `describe` blocks to group related tests
- Consider snapshot tests for large objects (future)

---

## Debugging Tests

### Visual Debugging
```typescript
// Add console output for inspection
console.log("Project:", project);
console.log("Result:", result);
```

### Watch Mode
```bash
cd packages/module && npm test -- --watch
```

### Specific Test
```bash
# Run only failing test
npm test -- --grep "test name pattern"

# Run single file
npm test -- src/specific.test.ts
```

---

## Coverage Strategy

Current coverage focuses on **high-value units** per requirements:
- ✅ `validateProject` - 100%
- ✅ `createStarterProject` - 100%
- ✅ `getActiveSceneWindow` - 100%
- ✅ `getProjectDurationMs` - 100%
- ✅ `resolveAnimatedObject` - 100%
- ✅ `buildRenderFrame` - 100%
- ✅ `BuildExportPlan` - 100%

**Not tested (intentionally thin):**
- React/PixiJS rendering (visual testing deferred)
- Database/persistence (not yet integrated)
- AI operations (contract only)
- Effects/transitions (placeholder contracts)

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Go Testing Package](https://golang.org/pkg/testing/)
- [Jest Expect Matchers](https://jestjs.io/docs/expect) (Vitest compatible)
- [Table-Driven Tests Pattern](https://github.com/golang/go/wiki/TableDrivenTests)
