export type FontCategory = "sans-serif" | "serif" | "display" | "monospace" | "handwriting";

export type FontSource = "google" | "commercial" | "custom";

export type FontStyle = "normal" | "italic";

export type FontSemanticRole = "headline" | "body" | "caption" | "display" | "accent" | "code" | "logo";

/**
 * Each font belongs to exactly one typography pair category.
 * The category captures the font's primary design personality and intended pairing context.
 * Used by list_typography_pairs and search_fonts(pair_category) to give the LLM opinionated choices.
 */
export type TypographyPairCategory =
  | "BOLD_IMPACT"         // high-energy: fitness, sports, Gen Z, street culture
  | "MODERN_CLEAN"        // tech, startup, SaaS, productivity
  | "PREMIUM_EDITORIAL"   // luxury, beauty, fashion, editorial
  | "FRIENDLY_CONSUMER"   // food, retail, education, consumer apps
  | "BOLD_AUTHORITY"      // finance, B2B, professional services, news
  | "ENERGETIC_MOTION"    // sports events, entertainment, music, gaming
  | "ELEGANT_LIFESTYLE"   // travel, wellness, yoga, minimal aesthetics
  | "MINIMAL_SINGLE";     // fintech, developer tools, ultra-minimal (single-family pair)

export type FontPairingRole =
  | "heading_body"   // this font is heading, paired font is body
  | "body_heading"   // this font is body, paired font is heading
  | "heading_accent" // this font is heading, paired font is accent
  | "accent_body";   // this font is accent, paired font is body

export interface FontWeightRecord {
  weight: number;
  style: FontStyle;
  /** Absolute local path to the TTF/OTF file, if stored on disk */
  file_path: string | null;
  /** S3 object key, if stored in S3-compatible storage */
  s3_key: string | null;
}

export interface FontPairing {
  paired_family: string;
  role: FontPairingRole;
  /** 0–1: how well these two fonts pair together */
  compatibility_score: number;
}

export type FontSemanticMetadata = Record<string, unknown>;

/** Complete font record as returned by the DB and the API */
export interface FontRecord {
  id: string;
  family: string;
  label: string;
  category: FontCategory;
  /** Typographic subcategory: geometric, humanist, grotesque, transitional, slab, condensed, etc. */
  subcategory: string | null;
  source: FontSource;
  /** SPDX license identifier, e.g. "OFL-1.1", "Apache-2.0", "proprietary" */
  license: string;
  designer: string | null;
  foundry: string | null;
  year_released: number | null;
  /** Family name as used in the Google Fonts API URL (null for non-Google fonts) */
  google_font_family: string | null;
  /** Direct CSS @import URL, used when source is commercial/custom without a local file */
  cdn_url: string | null;
  /** S3 object key for the font CSS or the base path. Weights stored in font_weights table. */
  s3_key: string | null;
  /** Absolute local path to the font directory */
  local_path: string | null;
  /** A sample sentence that showcases this font well */
  specimen_text: string | null;
  /** Primary typography pair category — defines where this font belongs in list_typography_pairs */
  pair_category: TypographyPairCategory | null;
  /** Role within the pair: headline, body, or accent (script/monospace special use) */
  pair_role: "headline" | "body" | "accent" | null;
  /** Structured metadata used to enrich semantic search and ranking. */
  semantic_metadata: FontSemanticMetadata | null;
  weights: FontWeightRecord[];
  /** Mood / style tags: professional, playful, elegant, bold, minimal, etc. */
  tags: string[];
  /** Industry fit scores: { tech: 0.95, fashion: 0.4, ... } */
  industry_scores: Record<string, number>;
  /** Suitability score per semantic role: { headline: 0.8, body: 0.95, ... } */
  semantic_roles: Record<string, number>;
  pairings: FontPairing[];
  created_at: string;
  updated_at: string;
}

/** Minimal record used in font picker / catalog list */
export interface FontSummary {
  id: string;
  family: string;
  label: string;
  category: FontCategory;
  subcategory: string | null;
  source: FontSource;
  license: string;
  google_font_family: string | null;
  cdn_url: string | null;
  pair_category: TypographyPairCategory | null;
  pair_role: "headline" | "body" | "accent" | null;
  semantic_metadata: FontSemanticMetadata | null;
  weights: Pick<FontWeightRecord, "weight" | "style">[];
  tags: string[];
  industry_scores: Record<string, number>;
  semantic_roles: Record<string, number>;
}

export interface FontQueryOptions {
  category?: FontCategory;
  source?: FontSource;
  /** Filter fonts that have ALL of these tags */
  tags?: string[];
  /** Filter by minimum score for this industry */
  industry?: string;
  min_industry_score?: number;
  /** Filter by minimum score for this semantic role */
  semantic_role?: FontSemanticRole;
  min_semantic_score?: number;
  /** Filter by typography pair category */
  pair_category?: TypographyPairCategory;
  /** Filter by pair role within the category */
  pair_role?: "headline" | "body" | "accent";
  limit?: number;
  offset?: number;
}

/** Input shape for inserting a new font (used by the add-font script) */
export interface FontInsert {
  id: string;
  family: string;
  label: string;
  category: FontCategory;
  subcategory?: string;
  source: FontSource;
  license: string;
  designer?: string;
  foundry?: string;
  year_released?: number;
  google_font_family?: string;
  cdn_url?: string;
  s3_key?: string;
  local_path?: string;
  specimen_text?: string;
  pair_category?: TypographyPairCategory;
  pair_role?: "headline" | "body" | "accent";
  semantic_metadata?: FontSemanticMetadata;
  weights: { weight: number; style?: FontStyle; file_path?: string; s3_key?: string }[];
  tags: string[];
  industry_scores: Record<string, number>;
  semantic_roles: Record<string, number>;
  pairings?: { paired_family: string; role: FontPairingRole; compatibility_score: number }[];
}
