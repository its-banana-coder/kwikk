import type { ElementNode, ProjectDocument, Scene } from "@kwikk/shared-types";
import type { VisualLanguage } from "../index.js";

export type ExampleCategory = "typography" | "scene_archetype" | "motion_pattern" | "content_type";

export type PaletteFamily = "dark" | "light" | "warm" | "cool" | "vivid" | "luxury" | "any";
export type ScenePosition = "hook" | "body" | "cta" | "any";
export type MotionAxis = "vertical" | "horizontal" | "scale" | "static" | "mixed";
export type ContentNiche = "finance" | "tech" | "wellness" | "travel" | "luxury" | "food" | "education" | "sports" | "general";

/** Queryable metadata that drives example selection for a given generation request. */
export type ExampleMeta = {
  tags: string[];
  mood: string[];
  palette: PaletteFamily;
  scenePosition: ScenePosition;
  motionAxis: MotionAxis;
  contentNiches: ContentNiche[];
  visualLanguage?: VisualLanguage;
  difficulty: "beginner" | "intermediate" | "advanced";
};

/** A text-element-only example — shows font pair, sizing, effects, and spacing hierarchy. */
export type TypographyExample = {
  kind: "typography";
  id: string;
  label: string;
  description: string;
  fontPair: { headline: string; body: string; tone: string };
  meta: ExampleMeta;
  elements: ElementNode[];
  annotations: {
    whatMakesItGood: string[];
    keyDecisions: string[];
    remixHints: string[];
  };
};

/** A single complete scene — all 6 layers, semantics, animations. */
export type SceneExample = {
  kind: "scene";
  id: string;
  subcategory: string;
  label: string;
  description: string;
  meta: ExampleMeta;
  scene: Scene;
  annotations: {
    whatMakesItGood: string[];
    keyDecisions: string[];
    remixHints: string[];
    avoidPatterns?: string[];
  };
};

/** A full multi-scene video — use as end-to-end inspiration. */
export type VideoExample = {
  kind: "video";
  id: string;
  label: string;
  description: string;
  meta: ExampleMeta;
  project: Pick<ProjectDocument, "name" | "viewport" | "scenes">;
  annotations: {
    narrative: string;
    scenePacing: string[];
    motionPhilosophy: string;
    paletteRationale: string;
    remixHints: string[];
  };
};

export type AnyExample = TypographyExample | SceneExample | VideoExample;

/** Filter criteria for querying examples from the library. */
export type ExampleQuery = {
  kind?: AnyExample["kind"] | AnyExample["kind"][];
  tags?: string[];
  mood?: string[];
  palette?: PaletteFamily;
  scenePosition?: ScenePosition;
  motionAxis?: MotionAxis;
  contentNiche?: ContentNiche;
  visualLanguage?: VisualLanguage;
  maxResults?: number;
};
