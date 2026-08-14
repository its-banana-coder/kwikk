import type { ProjectDocument } from "@kwikk/shared-types";

// Shape of the /fonts API response — kept local so render-core has no server-side deps.
type ApiFontSummary = {
  family: string; label: string; category: string; source: string;
  google_font_family: string | null; cdn_url: string | null;
  weights: { weight: number; style: string }[];
};

// ---------------------------------------------------------------------------
// Static fallback catalog (used when the API is unreachable)
// ---------------------------------------------------------------------------

export type FontCatalogEntry = {
  label: string;
  family: string;
  weights: number[];
  category: "sans-serif" | "serif" | "display" | "monospace" | "handwriting";
  /** How this font is loaded: via Google Fonts CSS link, or a direct @font-face URL */
  loadStrategy: "google" | "cdn" | "api";
  googleFontFamily?: string;
  cdnUrl?: string;
};

const STATIC_FALLBACK_CATALOG: ReadonlyArray<FontCatalogEntry> = [
  { label: "Inter",             family: "Inter",             weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Inter" },
  { label: "DM Sans",           family: "DM Sans",           weights: [300,400,500,600,700],         category: "sans-serif",  loadStrategy: "google", googleFontFamily: "DM Sans" },
  { label: "Space Grotesk",     family: "Space Grotesk",     weights: [300,400,500,600,700],         category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Space Grotesk" },
  { label: "Manrope",           family: "Manrope",           weights: [300,400,500,600,700,800],     category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Manrope" },
  { label: "Plus Jakarta Sans", family: "Plus Jakarta Sans", weights: [300,400,500,600,700,800],     category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Plus Jakarta Sans" },
  { label: "Outfit",            family: "Outfit",            weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Outfit" },
  { label: "Nunito",            family: "Nunito",            weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Nunito" },
  { label: "Poppins",           family: "Poppins",           weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Poppins" },
  { label: "Raleway",           family: "Raleway",           weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Raleway" },
  { label: "IBM Plex Sans",     family: "IBM Plex Sans",     weights: [300,400,500,600,700],         category: "sans-serif",  loadStrategy: "google", googleFontFamily: "IBM Plex Sans" },
  { label: "Geist",             family: "Geist",             weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Geist" },
  { label: "Montserrat",        family: "Montserrat",        weights: [300,400,500,600,700,800,900], category: "sans-serif",  loadStrategy: "google", googleFontFamily: "Montserrat" },
  { label: "Playfair Display",  family: "Playfair Display",  weights: [400,500,600,700,800,900],     category: "serif",       loadStrategy: "google", googleFontFamily: "Playfair Display" },
  { label: "Lora",              family: "Lora",              weights: [400,500,600,700],             category: "serif",       loadStrategy: "google", googleFontFamily: "Lora" },
  { label: "Merriweather",      family: "Merriweather",      weights: [300,400,700,900],             category: "serif",       loadStrategy: "google", googleFontFamily: "Merriweather" },
  { label: "DM Serif Display",  family: "DM Serif Display",  weights: [400],                         category: "serif",       loadStrategy: "google", googleFontFamily: "DM Serif Display" },
  { label: "Bodoni Moda",       family: "Bodoni Moda",       weights: [400,500,600,700,800,900],     category: "serif",       loadStrategy: "google", googleFontFamily: "Bodoni Moda" },
  { label: "Bebas Neue",        family: "Bebas Neue",        weights: [400],                         category: "display",     loadStrategy: "google", googleFontFamily: "Bebas Neue" },
  { label: "Oswald",            family: "Oswald",            weights: [300,400,500,600,700],         category: "display",     loadStrategy: "google", googleFontFamily: "Oswald" },
  { label: "Barlow Condensed",  family: "Barlow Condensed",  weights: [300,400,500,600,700,800,900], category: "display",     loadStrategy: "google", googleFontFamily: "Barlow Condensed" },
  { label: "Anton",             family: "Anton",             weights: [400],                         category: "display",     loadStrategy: "google", googleFontFamily: "Anton" },
  { label: "JetBrains Mono",    family: "JetBrains Mono",   weights: [300,400,500,600,700,800],     category: "monospace",   loadStrategy: "google", googleFontFamily: "JetBrains Mono" },
  { label: "Fira Code",         family: "Fira Code",        weights: [300,400,500,600,700],         category: "monospace",   loadStrategy: "google", googleFontFamily: "Fira Code" },
  { label: "Pacifico",          family: "Pacifico",         weights: [400],                         category: "handwriting", loadStrategy: "google", googleFontFamily: "Pacifico" },
  { label: "Dancing Script",    family: "Dancing Script",   weights: [400,500,600,700],             category: "handwriting", loadStrategy: "google", googleFontFamily: "Dancing Script" },
];

// ---------------------------------------------------------------------------
// Live catalog (populated from API on init)
// ---------------------------------------------------------------------------

let _liveCatalog: FontCatalogEntry[] | null = null;

function summaryToCatalogEntry(s: ApiFontSummary, apiBaseUrl: string): FontCatalogEntry {
  const weights = [...new Set(s.weights.map((w) => w.weight))].sort((a, b) => a - b);
  const category = s.category as FontCatalogEntry["category"];

  if (s.source === "google" && s.google_font_family) {
    return { label: s.label, family: s.family, weights, category, loadStrategy: "google", googleFontFamily: s.google_font_family };
  }
  if (s.cdn_url) {
    return { label: s.label, family: s.family, weights, category, loadStrategy: "cdn", cdnUrl: s.cdn_url };
  }
  // Served via the API's file endpoint
  return { label: s.label, family: s.family, weights, category, loadStrategy: "api", cdnUrl: `${apiBaseUrl}/v1/fonts/${encodeURIComponent(s.family)}/file` };
}

/**
 * Fetch the font catalog from the kwikk API and cache it.
 * Falls back gracefully to the static catalog on network error.
 *
 * Call once at app startup:
 *   import { initFontRegistry } from '@kwikk/render-core/fontRegistry';
 *   await initFontRegistry({ apiBaseUrl: import.meta.env.VITE_FONT_API_URL });
 */
export async function initFontRegistry(options: { apiBaseUrl?: string } = {}): Promise<void> {
  const apiBaseUrl = (options.apiBaseUrl ?? "").replace(/\/$/, "");
  if (!apiBaseUrl) return; // no API configured — use static fallback

  try {
    const PAGE = 200;
    const all: ApiFontSummary[] = [];
    let offset = 0;

    while (true) {
      const res = await fetch(`${apiBaseUrl}/v1/fonts?limit=${PAGE}&offset=${offset}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { fonts: ApiFontSummary[] };
      all.push(...data.fonts);
      if (data.fonts.length < PAGE) break;
      offset += PAGE;
    }

    _liveCatalog = all.map((s) => summaryToCatalogEntry(s, apiBaseUrl));
  } catch (err) {
    console.warn("[fontRegistry] API unavailable, using static catalog:", err);
  }
}

/** Returns the active font catalog (live if API is up, static otherwise). */
export function getFontCatalog(): ReadonlyArray<FontCatalogEntry> {
  return _liveCatalog ?? STATIC_FALLBACK_CATALOG;
}

// GOOGLE_FONT_CATALOG is kept for backwards-compat imports.
// It always returns the static fallback. Use getFontCatalog() for the live list.
export const GOOGLE_FONT_CATALOG: ReadonlyArray<FontCatalogEntry> = STATIC_FALLBACK_CATALOG;

// ---------------------------------------------------------------------------
// Loading infrastructure
// ---------------------------------------------------------------------------

const loadedKeys = new Set<string>();
const pendingLoads = new Map<string, Promise<void>>();

function fontKey(family: string, weight: number, style: string): string {
  return `${family}:${weight}:${style}`;
}

function injectGoogleFontLink(googleFontFamily: string, weight: number, style: "normal" | "italic"): void {
  const id = `gf-${googleFontFamily.replace(/\s+/g, "-")}-${weight}-${style}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";

  const ital = style === "italic" ? "ital," : "";
  const italVal = style === "italic" ? "1," : "";
  const familyParam = encodeURIComponent(`${googleFontFamily}:${ital}wght@${italVal}${weight}`);
  link.href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;
  document.head.appendChild(link);
}

function nearestWeight(available: number[], requested: number): number {
  if (available.length === 0) return requested;
  return available.reduce((prev, curr) =>
    Math.abs(curr - requested) < Math.abs(prev - requested) ? curr : prev
  );
}

function injectFontFace(family: string, weight: number, style: "normal" | "italic", url: string): void {
  const id = `ff-${family.replace(/\s+/g, "-")}-${weight}-${style}`;
  if (document.getElementById(id)) return;

  const styleEl = document.createElement("style");
  styleEl.id = id;
  // No format() hint — browser infers format from the Content-Type response header.
  // A hardcoded format('truetype') would cause browsers to reject OTF files silently.
  styleEl.textContent = `
    @font-face {
      font-family: '${family}';
      font-weight: ${weight};
      font-style: ${style};
      src: url('${url}');
      font-display: swap;
    }
  `;
  document.head.appendChild(styleEl);
}

export async function ensureFontLoaded(
  family: string,
  weight = 400,
  style: "normal" | "italic" = "normal",
): Promise<void> {
  const key = fontKey(family, weight, style);
  if (loadedKeys.has(key)) return;
  if (pendingLoads.has(key)) return pendingLoads.get(key)!;

  const promise = (async () => {
    const catalog = getFontCatalog();
    const entry = catalog.find((e) => e.family === family);

    if (!entry || entry.loadStrategy === "google") {
      const gfFamily = entry?.googleFontFamily ?? family;
      injectGoogleFontLink(gfFamily, weight, style);
    } else if (entry.loadStrategy === "cdn" && entry.cdnUrl) {
      // CDN CSS (e.g. Adobe Fonts @import URL) — inject as a stylesheet link
      const id = `cdn-${family.replace(/\s+/g, "-")}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = entry.cdnUrl;
        document.head.appendChild(link);
      }
    } else if (entry.loadStrategy === "api" && entry.cdnUrl) {
      // Binary served by the kwikk API — inject @font-face.
      // Use nearest available weight to avoid 404 when the requested weight isn't stored.
      const fileWeight = nearestWeight(entry.weights, weight);
      const styleParam = style === "italic" ? "?style=italic" : "";
      injectFontFace(family, fileWeight, style, `${entry.cdnUrl}/${fileWeight}${styleParam}`);
    }

    try {
      const loadSpec = `${style === "italic" ? "italic " : ""}${weight} 48px "${family}"`;
      await Promise.race([
        document.fonts.load(loadSpec),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Font load timeout")), 6000)),
      ]);
    } catch {
      // Silently fall back — Pixi will use the next available font.
    }

    loadedKeys.add(key);
    pendingLoads.delete(key);
  })();

  pendingLoads.set(key, promise);
  return promise;
}

export async function preloadProjectFonts(project: ProjectDocument): Promise<void> {
  const needed = new Set<string>();

  for (const scene of project.scenes) {
    for (const el of scene.elements) {
      if (el.type !== "text") continue;

      const fam = el.style.fontFamily ?? "Inter";
      const wt = Number(el.style.fontWeight ?? 400);
      const st = (el.style.fontStyle ?? "normal") as "normal" | "italic";
      needed.add(fontKey(fam, wt, st));

      for (const span of el.content?.richText ?? []) {
        const sf = span.style?.fontFamily ?? fam;
        const sw = Number(span.style?.fontWeight ?? wt);
        needed.add(fontKey(sf, sw, "normal"));
      }
    }
  }

  await Promise.allSettled(
    [...needed].map((key) => {
      const [family, weight, style] = key.split(":");
      return ensureFontLoaded(family, Number(weight), style as "normal" | "italic");
    })
  );
}

// Preconnect to Google Fonts CDN on first import to shave off DNS/TLS time.
(function injectPreconnects() {
  if (typeof document === "undefined") return;
  const origins = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
  for (const origin of origins) {
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    if (origin.includes("gstatic")) link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
})();
