export type ElementType = "text" | "image" | "video" | "shape";

export type AnimationType =
  | "fadeIn"
  | "fadeOut"
  | "slideUp"
  | "slideDown"
  | "zoomIn";

export type ShapeKind = "rectangle";

export interface LayoutProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

export interface StyleProps {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  backgroundColor?: string;
}

export interface ElementContent {
  text?: string;
  src?: string;
  shape?: ShapeKind;
  label?: string;
}

export interface ManualOverrides {
  layout?: Partial<LayoutProps>;
  style?: Partial<StyleProps>;
  content?: Partial<ElementContent>;
}

export type Animation = {
  id: string;
  type: AnimationType;
  startMs: number;
  durationMs: number;
  easing?: string;
};

export type ElementNode = {
  id: string;
  type: ElementType;
  semanticRole?: string;
  layout: LayoutProps;
  style: StyleProps;
  animations: Animation[];
  overrides?: ManualOverrides;
  content?: ElementContent;
};

export type Scene = {
  id: string;
  name: string;
  durationMs: number;
  elements: ElementNode[];
  backgroundColor?: string;
};

export type TimelineTrack = {
  id: string;
  sceneId: string;
  startMs: number;
  durationMs: number;
  layer: number;
};

export interface Viewport {
  width: number;
  height: number;
}

export interface ProjectDocument {
  id: string;
  name: string;
  scenes: Scene[];
  timelineTracks: TimelineTrack[];
  viewport: Viewport;
}

export interface RenderRequest {
  projectId: string;
  viewport: Viewport;
  frameRate: number;
}
