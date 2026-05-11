import { describe, expect, it } from "vitest";
import { buildPresetAnimations, MOTION_PRESETS } from "./index";

describe("MOTION_PRESETS and buildPresetAnimations", () => {
  it("exposes all preset keys", () => {
    const keys = Object.keys(MOTION_PRESETS).sort();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain("fade_through");
    expect(keys).toContain("aggressive_zoom");
  });

  it("buildPresetAnimations assigns ids and respects sceneDuration for fade_through", () => {
    const animations = buildPresetAnimations("fade_through", 4000);
    expect(animations.length).toBe(2);
    expect(animations[0].id).toBeDefined();
    expect(animations[1].id).toBeDefined();
    // second animation should start at sceneDuration - 500
    expect(animations[1].startMs).toBe(3500);
  });

  it("buildPresetAnimations produces stable ids for multiple presets", () => {
    const a = buildPresetAnimations("aggressive_zoom");
    const b = buildPresetAnimations("aggressive_zoom", 6000);

    expect(a[0].id).toContain("aggressive_zoom_");
    expect(b[0].id).toContain("aggressive_zoom_");
  });
});
