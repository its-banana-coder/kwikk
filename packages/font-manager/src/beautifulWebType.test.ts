import { describe, expect, it } from "vitest";
import { pickFontAsset } from "./beautifulWebType.js";

type Asset = Parameters<typeof pickFontAsset>[0][number];

function asset(baseName: string, style: "normal" | "italic", isVariable = false): Asset {
  return {
    path: `/tmp/${baseName}.woff2`,
    baseName,
    normalizedBaseName: baseName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    ext: ".woff2",
    style,
    isVariable,
  };
}

describe("beautiful-web-type asset selection", () => {
  it("prefers an exact static weight match over a variable fallback", () => {
    const selected = pickFontAsset(
      [
        asset("Inter-roman.var", "normal", true),
        asset("Inter-Bold", "normal"),
      ],
      700,
      "Bold",
      "normal",
    );

    expect(selected?.baseName).toBe("Inter-Bold");
  });

  it("falls back to a variable font when that is the only available match", () => {
    const selected = pickFontAsset(
      [
        asset("Commissioner[FLAR,VOLM,wght]", "normal", true),
      ],
      300,
      "Light",
      "normal",
    );

    expect(selected?.baseName).toContain("Commissioner");
  });

  it("handles italic and oblique naming for style resolution", () => {
    const selected = pickFontAsset(
      [
        asset("fivosansmodern-bold-oblique", "italic"),
        asset("fivosansmodern-bold", "normal"),
      ],
      700,
      "Bold",
      "italic",
    );

    expect(selected?.baseName).toBe("fivosansmodern-bold-oblique");
  });
});
