import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { ensureSchema, insertFont } from "./db.js";
import type {
  FontCategory,
  FontInsert,
  FontPairingRole,
  FontSemanticMetadata,
  FontSemanticRole,
  FontStyle,
  TypographyPairCategory,
} from "./types.js";

const WORKSPACE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../../");
const DEFAULT_DATA_DIR = path.join(process.env.KWIKK_DATA_DIR ?? path.join(WORKSPACE_ROOT, "data"), "fonts");
const DEFAULT_SOURCE_DIR = path.join(os.tmpdir(), "beautiful-web-type");
const FONT_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf"]);

type UpstreamTypefaceMeta = {
  slug: string;
  name: string;
  category: "Display" | "Monospaced" | "Sans-Serif" | "Serif";
  styles: string | number;
  italic?: boolean;
  smallcap?: boolean;
  sampleText?: string;
  projectUrl: string;
  gFontsUrl?: string;
  latestRelease?: {
    version?: string;
    date?: string;
  };
  creator?: { name?: string; url?: string };
  description?: string;
  weights: Array<{ weight: number; name: string }>;
  comparisonFaces?: string[];
  familyFaces?: string[];
};

type UpstreamPairingMeta = {
  typefaces: [string, string];
};

type FontAsset = {
  path: string;
  baseName: string;
  normalizedBaseName: string;
  ext: string;
  style: FontStyle;
  isVariable: boolean;
};

export type BeautifulWebTypeSyncOptions = {
  sourceDir?: string;
  repoUrl?: string;
  targetFontDir?: string;
  cloneIfMissing?: boolean;
  upsertDb?: boolean;
  dryRun?: boolean;
};

export type BeautifulWebTypeSyncResult = {
  sourceDir: string;
  fontCount: number;
  copiedFamilyCount: number;
  copiedFileCount: number;
  upsertedCount: number;
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function categoryFromUpstream(category: UpstreamTypefaceMeta["category"]): FontCategory {
  switch (category) {
    case "Sans-Serif":
      return "sans-serif";
    case "Serif":
      return "serif";
    case "Display":
      return "display";
    case "Monospaced":
      return "monospace";
  }
}

function deriveGoogleFontFamily(gFontsUrl?: string): string | undefined {
  if (!gFontsUrl) return undefined;
  const match = gFontsUrl.match(/\/specimen\/([^/?#]+)/i);
  if (!match) return undefined;
  return decodeURIComponent(match[1]).replace(/\+/g, " ");
}

function extractDescriptionKeywords(description: string): string[] {
  const normalized = description.toLowerCase();
  const tags = new Set<string>();
  const keywordMap: Array<[string, string]> = [
    ["screen", "screen"],
    ["user interface", "ui"],
    ["body copy", "body-copy"],
    ["headlines", "headline"],
    ["headline", "headline"],
    ["display", "display"],
    ["condensed", "condensed"],
    ["humanist", "humanist"],
    ["grotesque", "grotesque"],
    ["serif", "serif"],
    ["sans-serif", "sans-serif"],
    ["sans serif", "sans-serif"],
    ["monospace", "monospace"],
    ["fixed-width", "monospace"],
    ["technical", "technical"],
    ["quirkiness", "quirky"],
    ["distinctive", "distinctive"],
    ["versatile", "versatile"],
    ["corporate", "corporate"],
    ["editorial", "editorial"],
    ["classical", "classic"],
    ["elegant", "elegant"],
    ["brand", "branding"],
  ];

  for (const [needle, tag] of keywordMap) {
    if (normalized.includes(needle)) tags.add(tag);
  }

  return [...tags];
}

function buildTags(meta: UpstreamTypefaceMeta): string[] {
  const tags = new Set<string>(extractDescriptionKeywords(meta.description ?? ""));
  tags.add(meta.slug);
  tags.add(categoryFromUpstream(meta.category));
  if (meta.styles === "Variable") tags.add("variable");
  if (meta.italic) tags.add("italic");
  if (meta.smallcap) tags.add("small-caps");
  return [...tags];
}

function buildSemanticMetadata(meta: UpstreamTypefaceMeta, category: FontCategory): FontSemanticMetadata {
  return {
    source_collection: "beautiful-web-type",
    upstream_slug: meta.slug,
    upstream_category: meta.category,
    category,
    styles_label: meta.styles,
    supports_italic: Boolean(meta.italic),
    supports_small_caps: Boolean(meta.smallcap),
    weight_count: meta.weights.length,
    weights: meta.weights.map((weight) => ({ weight: weight.weight, name: weight.name })),
    latest_release_version: meta.latestRelease?.version ?? null,
    latest_release_date: meta.latestRelease?.date ?? null,
    project_url: meta.projectUrl,
    google_fonts_url: meta.gFontsUrl ?? null,
    creator_name: meta.creator?.name ?? null,
    creator_url: meta.creator?.url ?? null,
    description: meta.description ?? null,
    sample_text: meta.sampleText ?? null,
    family_faces: meta.familyFaces ?? [],
    comparison_faces: meta.comparisonFaces ?? [],
  };
}

function buildIndustryScores(category: FontCategory, description: string): Record<string, number> {
  const scores: Record<string, number> = {};
  const add = (key: string, value: number) => { scores[key] = Math.max(scores[key] ?? 0, value); };
  const normalized = description.toLowerCase();

  if (category === "sans-serif") {
    add("tech", 0.78);
    add("saas", 0.74);
    add("corporate", 0.72);
    add("ecommerce", 0.64);
  } else if (category === "serif") {
    add("editorial", 0.84);
    add("fashion", 0.72);
    add("luxury", 0.7);
  } else if (category === "display") {
    add("entertainment", 0.82);
    add("fashion", 0.7);
    add("sports", 0.66);
  } else if (category === "monospace") {
    add("tech", 0.86);
    add("developer", 0.95);
    add("fintech", 0.62);
  }

  if (normalized.includes("screen") || normalized.includes("user interface")) add("tech", 0.9);
  if (normalized.includes("corporate")) add("corporate", 0.9);
  if (normalized.includes("editorial")) add("editorial", 0.9);
  if (normalized.includes("brand")) add("branding", 0.88);

  return scores;
}

function buildSemanticRoles(category: FontCategory, description: string): Record<string, number> {
  const roles: Record<FontSemanticRole, number> = {
    body: 0.55,
    headline: 0.55,
    caption: 0.45,
    display: 0.45,
    accent: 0.45,
    code: 0.05,
    logo: 0.35,
  };
  const normalized = description.toLowerCase();

  if (category === "sans-serif") {
    roles.body = 0.88;
    roles.headline = 0.78;
    roles.caption = 0.74;
    roles.display = 0.62;
  } else if (category === "serif") {
    roles.body = 0.72;
    roles.headline = 0.85;
    roles.caption = 0.58;
    roles.display = 0.74;
    roles.logo = 0.62;
  } else if (category === "display") {
    roles.headline = 0.93;
    roles.display = 0.96;
    roles.accent = 0.78;
    roles.body = 0.28;
    roles.caption = 0.22;
    roles.logo = 0.72;
  } else if (category === "monospace") {
    roles.code = 0.96;
    roles.caption = 0.68;
    roles.body = 0.48;
    roles.headline = 0.42;
    roles.accent = 0.56;
  }

  if (normalized.includes("body copy") || normalized.includes("long stretches")) {
    roles.body = Math.max(roles.body, 0.9);
    roles.caption = Math.max(roles.caption, 0.76);
  }
  if (normalized.includes("headlines")) roles.headline = Math.max(roles.headline, 0.9);
  if (normalized.includes("display")) roles.display = Math.max(roles.display, 0.86);
  if (normalized.includes("screen") || normalized.includes("user interface")) roles.caption = Math.max(roles.caption, 0.78);

  return roles;
}

function buildPairCategory(category: FontCategory, description: string): TypographyPairCategory {
  const normalized = description.toLowerCase();
  if (category === "monospace") return "MINIMAL_SINGLE";
  if (category === "display") {
    return normalized.includes("distinctive") || normalized.includes("alternate glyphs")
      ? "BOLD_IMPACT"
      : "ENERGETIC_MOTION";
  }
  if (category === "serif") {
    return normalized.includes("display") || normalized.includes("condensed")
      ? "PREMIUM_EDITORIAL"
      : "ELEGANT_LIFESTYLE";
  }
  if (normalized.includes("screen") || normalized.includes("user interface") || normalized.includes("technical")) {
    return "MODERN_CLEAN";
  }
  if (normalized.includes("corporate") || normalized.includes("classical")) return "BOLD_AUTHORITY";
  if (normalized.includes("friendly") || normalized.includes("warm")) return "FRIENDLY_CONSUMER";
  return "MINIMAL_SINGLE";
}

function buildPairRole(category: FontCategory, semanticRoles: Record<string, number>): "headline" | "body" | "accent" {
  if (category === "display") return "headline";
  if (category === "monospace") return "accent";
  return (semanticRoles.headline ?? 0) > (semanticRoles.body ?? 0) ? "headline" : "body";
}

function inferAssetStyle(baseName: string): FontStyle {
  const normalized = normalizeToken(baseName);
  return normalized.includes("italic") || normalized.includes("oblique") ? "italic" : "normal";
}

function isVariableAsset(baseName: string): boolean {
  return /\b(var|vf|variable)\b/i.test(baseName) || /[\[\]]/.test(baseName);
}

function listFontAssets(fontDir: string): FontAsset[] {
  if (!fs.existsSync(fontDir)) return [];

  return fs.readdirSync(fontDir)
    .filter((name) => FONT_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => {
      const ext = path.extname(name).toLowerCase();
      const baseName = path.basename(name, ext);
      return {
        path: path.join(fontDir, name),
        baseName,
        normalizedBaseName: normalizeToken(baseName),
        ext,
        style: inferAssetStyle(baseName),
        isVariable: isVariableAsset(baseName),
      };
    })
    .sort((left, right) => left.baseName.localeCompare(right.baseName));
}

function weightTokens(weight: number, name: string): string[] {
  const base = normalizeToken(name);
  const aliases = new Set<string>([base]);

  if (base === "extralight") aliases.add("ultralight");
  if (base === "ultralight") aliases.add("extralight");
  if (base === "semibold") aliases.add("demibold");
  if (base === "black") aliases.add("heavy");
  if (base === "heavy") aliases.add("black");
  if (base === "regular") {
    aliases.add("roman");
    aliases.add("upright");
  }

  if (weight === 400) {
    aliases.add("regular");
    aliases.add("roman");
    aliases.add("upright");
  }
  if (weight === 900) {
    aliases.add("black");
    aliases.add("heavy");
  }

  return [...aliases];
}

export function pickFontAsset(
  assets: FontAsset[],
  weight: number,
  weightName: string,
  style: FontStyle,
): FontAsset | null {
  const styledAssets = assets.filter((asset) => asset.style === style);
  if (styledAssets.length === 0) return null;

  const tokens = weightTokens(weight, weightName);
  let best: { asset: FontAsset; score: number } | null = null;

  for (const asset of styledAssets) {
    let score = 0;
    for (const token of tokens) {
      if (asset.normalizedBaseName.includes(token)) score += 8;
    }
    if (asset.isVariable) score += 4;
    if (styledAssets.length === 1) score += 3;
    if (weight === 400 && !asset.isVariable && !/italic|oblique/i.test(asset.baseName)) score += 1;

    if (!best || score > best.score) best = { asset, score };
  }

  return best?.asset ?? null;
}

function loadYaml<T>(filePath: string): T {
  return parse(fs.readFileSync(filePath, "utf8")) as T;
}

function loadTypefaces(sourceDir: string): UpstreamTypefaceMeta[] {
  const typefacesDir = path.join(sourceDir, "content", "typefaces");
  return fs.readdirSync(typefacesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const meta = loadYaml<Omit<UpstreamTypefaceMeta, "slug">>(path.join(typefacesDir, slug, "meta.yml"));
      return { ...meta, slug };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function loadPairings(sourceDir: string): UpstreamPairingMeta[] {
  const pairingsDir = path.join(sourceDir, "content", "pairings");
  return fs.readdirSync(pairingsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadYaml<UpstreamPairingMeta>(path.join(pairingsDir, entry.name, "meta.yml")))
    .filter((entry) => Array.isArray(entry.typefaces) && entry.typefaces.length === 2)
    .map((entry) => ({ typefaces: [entry.typefaces[0], entry.typefaces[1]] }));
}

function buildPairingsIndex(
  metas: UpstreamTypefaceMeta[],
  roleIndex: Map<string, Record<string, number>>,
  pairings: UpstreamPairingMeta[],
): Map<string, FontInsert["pairings"]> {
  const metaByName = new Map(metas.map((meta) => [meta.name, meta]));
  const result = new Map<string, NonNullable<FontInsert["pairings"]>>();

  const pushPairing = (fontName: string, pairing: NonNullable<FontInsert["pairings"]>[number]) => {
    const existing = result.get(fontName) ?? [];
    if (!existing.some((item) => item.paired_family === pairing.paired_family && item.role === pairing.role)) {
      existing.push(pairing);
      result.set(fontName, existing);
    }
  };

  for (const pairing of pairings) {
    const [leftName, rightName] = pairing.typefaces;
    const leftMeta = metaByName.get(leftName);
    const rightMeta = metaByName.get(rightName);
    if (!leftMeta || !rightMeta) continue;

    const leftRoles = roleIndex.get(leftName) ?? {};
    const rightRoles = roleIndex.get(rightName) ?? {};

    let leftRole: FontPairingRole = "heading_body";
    let rightRole: FontPairingRole = "body_heading";

    if (categoryFromUpstream(leftMeta.category) === "monospace" && categoryFromUpstream(rightMeta.category) !== "monospace") {
      leftRole = "accent_body";
      rightRole = "heading_accent";
    } else if (categoryFromUpstream(rightMeta.category) === "monospace" && categoryFromUpstream(leftMeta.category) !== "monospace") {
      leftRole = "heading_accent";
      rightRole = "accent_body";
    } else if ((rightRoles.headline ?? 0) > (leftRoles.headline ?? 0) && (rightRoles.body ?? 0) <= (leftRoles.body ?? 0)) {
      leftRole = "body_heading";
      rightRole = "heading_body";
    }

    pushPairing(leftName, { paired_family: rightName, role: leftRole, compatibility_score: 0.9 });
    pushPairing(rightName, { paired_family: leftName, role: rightRole, compatibility_score: 0.9 });
  }

  return result;
}

function ensureRepoAvailable(sourceDir: string, repoUrl: string, cloneIfMissing: boolean): string {
  if (fs.existsSync(sourceDir)) return sourceDir;
  if (!cloneIfMissing) {
    throw new Error(`beautiful-web-type source not found at ${sourceDir}`);
  }

  fs.mkdirSync(path.dirname(sourceDir), { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", repoUrl, sourceDir], { stdio: "inherit" });
  return sourceDir;
}

function materializeFontAssets(
  meta: UpstreamTypefaceMeta,
  sourceDir: string,
  targetFontDir: string,
  dryRun: boolean,
): { localPath: string; weights: FontInsert["weights"]; copiedFileCount: number } {
  const sourceFontDir = path.join(sourceDir, "assets", "fonts", meta.slug);
  const targetDir = path.join(targetFontDir, meta.slug);
  const assets = listFontAssets(sourceFontDir);

  if (assets.length === 0) {
    throw new Error(`No upstream font assets found for ${meta.name} in ${sourceFontDir}`);
  }

  if (!dryRun) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(sourceFontDir, targetDir, { recursive: true });
  }

  let copiedFileCount = dryRun ? 0 : fs.readdirSync(targetDir).length;
  const weights: FontInsert["weights"] = [];

  for (const weight of meta.weights) {
    const normalAsset = pickFontAsset(assets, weight.weight, weight.name, "normal");
    if (normalAsset) {
      const destName = `${weight.weight}${normalAsset.ext}`;
      const destPath = path.join(targetDir, destName);
      if (!dryRun) fs.copyFileSync(normalAsset.path, destPath);
      copiedFileCount++;
      weights.push({ weight: weight.weight, style: "normal", file_path: destPath });
    }

    if (meta.italic) {
      const italicAsset = pickFontAsset(assets, weight.weight, weight.name, "italic");
      if (italicAsset) {
        const destName = `${weight.weight}-italic${italicAsset.ext}`;
        const destPath = path.join(targetDir, destName);
        if (!dryRun) fs.copyFileSync(italicAsset.path, destPath);
        copiedFileCount++;
        weights.push({ weight: weight.weight, style: "italic", file_path: destPath });
      }
    }
  }

  if (weights.length === 0) {
    throw new Error(`Unable to map any weights for ${meta.name}`);
  }

  return { localPath: targetDir, weights, copiedFileCount };
}

function buildFontInsert(
  meta: UpstreamTypefaceMeta,
  materialized: { localPath: string; weights: FontInsert["weights"] },
  pairingsIndex: Map<string, FontInsert["pairings"]>,
): FontInsert {
  const category = categoryFromUpstream(meta.category);
  const description = meta.description ?? "";
  const semantic_roles = buildSemanticRoles(category, description);
  const semantic_metadata = buildSemanticMetadata(meta, category);

  return {
    id: meta.slug,
    family: meta.name,
    label: meta.name,
    category,
    source: deriveGoogleFontFamily(meta.gFontsUrl) ? "google" : "custom",
    license: "OFL-1.1",
    designer: meta.creator?.name,
    google_font_family: deriveGoogleFontFamily(meta.gFontsUrl),
    local_path: materialized.localPath,
    specimen_text: meta.sampleText,
    pair_category: buildPairCategory(category, description),
    pair_role: buildPairRole(category, semantic_roles),
    semantic_metadata,
    weights: materialized.weights,
    tags: buildTags(meta),
    industry_scores: buildIndustryScores(category, description),
    semantic_roles,
    pairings: pairingsIndex.get(meta.name) ?? [],
  };
}

export async function syncBeautifulWebType(options: BeautifulWebTypeSyncOptions = {}): Promise<BeautifulWebTypeSyncResult> {
  const sourceDir = ensureRepoAvailable(
    options.sourceDir ?? process.env.BEAUTIFUL_WEB_TYPE_DIR ?? DEFAULT_SOURCE_DIR,
    options.repoUrl ?? "https://github.com/ubuwaits/beautiful-web-type",
    options.cloneIfMissing ?? true,
  );
  const targetFontDir = options.targetFontDir ?? DEFAULT_DATA_DIR;
  const metas = loadTypefaces(sourceDir);
  const roleIndex = new Map<string, Record<string, number>>();

  for (const meta of metas) {
    roleIndex.set(meta.name, buildSemanticRoles(categoryFromUpstream(meta.category), meta.description ?? ""));
  }

  const pairingsIndex = buildPairingsIndex(metas, roleIndex, loadPairings(sourceDir));
  let copiedFamilyCount = 0;
  let copiedFileCount = 0;
  let upsertedCount = 0;

  if (options.upsertDb !== false) {
    await ensureSchema();
  }

  for (const meta of metas) {
    const materialized = materializeFontAssets(meta, sourceDir, targetFontDir, options.dryRun ?? false);
    copiedFamilyCount++;
    copiedFileCount += materialized.copiedFileCount;

    if (options.upsertDb !== false) {
      const input = buildFontInsert(meta, materialized, pairingsIndex);
      await insertFont(input);
      upsertedCount++;
    }
  }

  return {
    sourceDir,
    fontCount: metas.length,
    copiedFamilyCount,
    copiedFileCount,
    upsertedCount,
  };
}
