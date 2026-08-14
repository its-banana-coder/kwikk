import { describe, expect, it } from "vitest";
import { resolveFireworksShellState } from "./compositions/fireworks";

describe("resolveFireworksShellState", () => {
  it("activates the first shell at composition start", () => {
    const state = resolveFireworksShellState(0, 0, 0, 1);
    expect(state.active).toBe(true);
    expect(state.sinceLaunchMs).toBe(0);
  });

  it("keeps later shells inactive until their stagger delay", () => {
    const state = resolveFireworksShellState(200, 0, 3, 1);
    expect(state.active).toBe(false);
    expect(state.sinceLaunchMs).toBeGreaterThan(1600);
  });

  it("wraps deterministically after one full launch loop", () => {
    const a = resolveFireworksShellState(9000, 0, 2, 1);
    const b = resolveFireworksShellState(9000 + 8200, 0, 2, 1);
    expect(a.active).toBe(b.active);
    expect(a.sinceLaunchMs).toBe(b.sinceLaunchMs);
  });
});
