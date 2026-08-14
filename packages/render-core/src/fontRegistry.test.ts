import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FontRegistryModule = typeof import("./fontRegistry.ts");

async function importRegistry(): Promise<FontRegistryModule> {
  vi.resetModules();
  document.head.innerHTML = "";
  return await import("./fontRegistry.ts");
}

function setupFontLoadSpy() {
  if (typeof document.fonts?.load === "function") {
    vi.spyOn(document.fonts, "load").mockResolvedValue([] as any);
  } else {
    (document as any).fonts = { load: vi.fn().mockResolvedValue([]) };
  }
}

describe("@kwikk/render-core fontRegistry", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    vi.restoreAllMocks();
    delete (globalThis as any).fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).fetch;
  });

  it("returns the static fallback catalog before init", async () => {
    setupFontLoadSpy();
    const registry = await importRegistry();
    const catalog = registry.getFontCatalog();

    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog[0].family).toBeDefined();
  });

  it("initializes live catalog from the API", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fonts: [
          {
            family: "Test Font",
            label: "Test Font",
            category: "sans-serif",
            source: "google",
            google_font_family: "Test Font",
            cdn_url: null,
            weights: [{ weight: 400, style: "normal" }]
          }
        ]
      })
    });

    setupFontLoadSpy();
    const registry = await importRegistry();
    await registry.initFontRegistry({ apiBaseUrl: "https://api.example.com/" });

    const catalog = registry.getFontCatalog();
    expect(catalog[0].family).toBe("Test Font");
    expect(catalog[0].loadStrategy).toBe("google");
    expect((globalThis as any).fetch).toHaveBeenCalledWith("https://api.example.com/v1/fonts?limit=200&offset=0", expect.any(Object));
  });

  it("falls back to the static catalog when the API is unavailable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("network failure"));

    setupFontLoadSpy();
    const registry = await importRegistry();
    await registry.initFontRegistry({ apiBaseUrl: "https://api.example.com" });

    expect(warnSpy).toHaveBeenCalled();
    expect(registry.getFontCatalog()).toBe(registry.GOOGLE_FONT_CATALOG);
  });

  it("injects a Google font stylesheet for unknown fonts", async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("network"));

    setupFontLoadSpy();
    const registry = await importRegistry();
    await registry.initFontRegistry({ apiBaseUrl: "https://api.example.com" });
    await registry.ensureFontLoaded("Unknown Font", 400, "normal");

    expect(document.getElementById("gf-Unknown-Font-400-normal")).toBeInstanceOf(HTMLLinkElement);
  });

  it("injects a CDN stylesheet for fonts with CDN loadStrategy", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fonts: [
          {
            family: "Cdn Font",
            label: "Cdn Font",
            category: "display",
            source: "commercial",
            google_font_family: null,
            cdn_url: "https://cdn.example.com/CdnFont.css",
            weights: [{ weight: 400, style: "normal" }]
          }
        ]
      })
    });

    setupFontLoadSpy();
    const registry = await importRegistry();
    await registry.initFontRegistry({ apiBaseUrl: "https://api.example.com" });
    await registry.ensureFontLoaded("Cdn Font", 400, "normal");

    const link = document.getElementById("cdn-Cdn-Font") as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.href).toContain("https://cdn.example.com/CdnFont.css");
  });

  it("injects API font-face rules using the nearest available weight", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fonts: [
          {
            family: "Custom Font",
            label: "Custom Font",
            category: "display",
            source: "commercial",
            google_font_family: null,
            cdn_url: null,
            weights: [
              { weight: 400, style: "normal" },
              { weight: 700, style: "normal" }
            ]
          }
        ]
      })
    });

    setupFontLoadSpy();
    const registry = await importRegistry();
    await registry.initFontRegistry({ apiBaseUrl: "https://api.example.com" });
    await registry.ensureFontLoaded("Custom Font", 600, "italic");

    const style = document.getElementById("ff-Custom-Font-700-italic");
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("/v1/fonts/Custom%20Font/file/700?style=italic");
  });

  it("preloads fonts referenced by project text and rich text spans", async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("network"));

    setupFontLoadSpy();
    const registry = await importRegistry();
    await registry.initFontRegistry({ apiBaseUrl: "https://api.example.com" });

    const project = {
      id: "project",
      name: "Project",
      scenes: [
        {
          id: "scene_1",
          name: "Scene 1",
          durationMs: 1000,
          backgroundColor: "#ffffff",
          elements: [
            {
              id: "text_1",
              type: "text",
              style: { fontFamily: "Inter", fontWeight: 400, fontStyle: "normal" },
              content: {
                text: "Hello",
                richText: [
                  {
                    text: "Span",
                    style: { fontFamily: "Poppins", fontWeight: 700 }
                  }
                ]
              }
            }
          ]
        }
      ],
      timelineTracks: []
    } as any;

    await registry.preloadProjectFonts(project);

    expect(document.getElementById("gf-Inter-400-normal")).not.toBeNull();
    expect(document.getElementById("gf-Poppins-700-normal")).not.toBeNull();
  });
});
