/**
 * Cinematic Motion System Expander
 *
 * Maps a CinematicMotionSystem key + CinematicIntent into a MotionBlueprint —
 * a concrete set of element construction hints, recommended animations, and
 * layout guidance that the LLM generation prompt injects per scene.
 *
 * This is a pure, deterministic function. It does NOT produce ElementNodes
 * directly — it produces a blueprint that constrains the LLM's scene assembly.
 */

import type { CinematicIntent, CinematicMotionSystem, AnimationType } from "@kwikk/shared-types";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ElementBlueprint {
  /** Semantic role the element should receive. */
  semanticRole: string;
  /** SemanticLayer assignment. */
  semanticLayer: "atmospheric" | "background_motion" | "focal" | "secondary_motion" | "typography" | "depth";
  /** TemporalZone assignment. */
  temporalZone: "hook" | "reveal" | "emphasis" | "payoff";
  /** Plain-English description of what this element should be. */
  description: string;
  /** Which AnimationType(s) should drive this element's entrance. */
  entranceAnimations: AnimationType[];
  /** Which AnimationType(s) should loop on this element (durationMs:99999). */
  loopAnimations: AnimationType[];
  /** StaggerDelayMs recommendation. */
  staggerDelayMs: number;
  /** Whether this element is a type:"graph" element. */
  isGraph?: boolean;
  /** Whether this element is a type:"animated_stat" element. */
  isStat?: boolean;
  /** Whether this element is a type:"image" element. */
  isImage?: boolean;
  /** Whether this element is a type:"shape" element acting as a connector line. */
  isConnectorLine?: boolean;
}

export interface MotionBlueprint {
  /** The system that generated this blueprint. */
  motionSystem: CinematicMotionSystem;
  /** Prose summary the LLM receives as the motion strategy for this scene. */
  motionStrategyDescription: string;
  /** Ordered list of element blueprints — LLM should produce elements matching these. */
  elementBlueprints: ElementBlueprint[];
  /** Scene motion preset key — if set, overrides per-element animation writing. */
  recommendedMotionPreset?: string;
  /** How the LLM should describe this scene's rhythm in `scene.rhythmPattern`. */
  rhythmPattern: "burst" | "sweep" | "reveal" | "compression" | "release" | "payoff";
  /** Specific patterns to avoid (injected into the generation prompt as negatives). */
  avoid: string[];
}

// ─── Per-system blueprint factories ──────────────────────────────────────────

function blueprintKineticHook(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "kinetic_hook",
    motionStrategyDescription:
      "KINETIC HOOK: Oversized impact typography dominates. The headline arrives first with maximum force — slam_down or depth_charge. A single supporting line follows with momentum_carry. No decorative clutter. Energy and contrast do the work.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Giant hook headline — 96–120px, fontWeight:900, textEffect:shadow_stack or neon, centered or left-aligned off-center",
        entranceAnimations: ["slam_down"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "hook_subtitle",
        semanticLayer: "typography",
        temporalZone: "reveal",
        description: "Single supporting sub-phrase — 52–68px, fontWeight:600, momentum_carry after headline",
        entranceAnimations: ["momentum_carry"],
        loopAnimations: [],
        staggerDelayMs: 350,
      },
      {
        semanticRole: "background_image",
        semanticLayer: "background_motion",
        temporalZone: "hook",
        description: "Full-bleed atmospheric image or rich gradient — sets the emotional backdrop, filters:cinematic+vignette",
        entranceAnimations: ["depth_drift"],
        loopAnimations: ["depth_drift"],
        staggerDelayMs: 0,
        isImage: true,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "depth",
        temporalZone: "payoff",
        description: "Pattern-interrupt accent — small icon or stat badge that pops at 2000ms+",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 2000,
      },
    ],
    rhythmPattern: "burst",
    avoid: [
      "centered poster layout with equal-weight text blocks",
      "static flat gradient with no atmospheric depth",
      "plain fadeIn on the hero headline — use slam_down or depth_charge",
      "more than 2 text elements at the same font size",
    ],
  };
}

function blueprintSocialSwarm(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "social_swarm",
    motionStrategyDescription:
      "SOCIAL SWARM: 4–6 platform icons orbit inward toward a central focal point, then burst outward or converge. The focal element (logo, stat, or person) is surrounded by an ecosystem of brand icons. Use orbit animation with staggered radii and amplitude.",
    elementBlueprints: [
      {
        semanticRole: "hero_image",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Central focal — brand logo, creator avatar, or platform hero image (200–360px circle)",
        entranceAnimations: ["spring_in"],
        loopAnimations: ["breathe"],
        staggerDelayMs: 0,
        isImage: true,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Platform icon #1 — orbiting at ~300px radius, orbit animation, staggerDelayMs:100",
        entranceAnimations: ["drift_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 100,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Platform icon #2 — orbiting at ~280px radius, offset phase, staggerDelayMs:200",
        entranceAnimations: ["drift_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 200,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Platform icon #3 — orbiting at ~320px radius, offset phase, staggerDelayMs:300",
        entranceAnimations: ["drift_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 300,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "emphasis",
        description: "Platform icon #4 — orbiting at ~260px radius, staggerDelayMs:400",
        entranceAnimations: ["pop_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 400,
      },
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "emphasis",
        description: "Stat or headline below the cluster — count_up for numbers, word_slide_up for text",
        entranceAnimations: ["word_slide_up"],
        loopAnimations: [],
        staggerDelayMs: 600,
      },
    ],
    rhythmPattern: "release",
    avoid: [
      "static icon grid with no orbital motion",
      "icons arranged in a fixed row or column",
      "full-bleed hero photo competing with the icon cluster",
    ],
  };
}

function blueprintViralSpread(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "viral_spread",
    motionStrategyDescription:
      "VIRAL SPREAD: A central node spawns expanding rings of connected nodes. Use concentric shape circles with atmosphere_pulse + staggered spring_in, connected by draw_in line elements. Each ring represents one degree of spread.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Central origin node — circle shape, 120–180px, accent color, source of the spread",
        entranceAnimations: ["pop_in"],
        loopAnimations: ["heartbeat"],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "First-ring spread nodes — 3 circle shapes, spring_in with stagger, positioned around center",
        entranceAnimations: ["spring_in"],
        loopAnimations: ["float"],
        staggerDelayMs: 300,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "emphasis",
        description: "Second-ring spread nodes — 4–5 circle shapes, larger stagger offset, further from center",
        entranceAnimations: ["spring_in"],
        loopAnimations: [],
        staggerDelayMs: 700,
        isConnectorLine: false,
      },
      {
        semanticRole: "divider",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Connector lines from origin to first-ring — shape:line with draw_in, arrowEnd:none",
        entranceAnimations: ["draw_in"],
        loopAnimations: [],
        staggerDelayMs: 400,
        isConnectorLine: true,
      },
      {
        semanticRole: "hero_phrase",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "Reach stat or viral metric — animated_stat with count_up at scene peak",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 1400,
        isStat: true,
      },
    ],
    rhythmPattern: "release",
    avoid: [
      "static network diagram with no animation",
      "text-only list of facts — the spread must be visual",
      "too many simultaneous animations obscuring the propagation logic",
    ],
  };
}

function blueprintGraphGrowth(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "graph_growth",
    motionStrategyDescription:
      "GRAPH GROWTH: An animated chart builds progressively from zero — bars extend, lines trace, donut sectors fill. A headline stat counts up simultaneously. The motion of data is the story.",
    elementBlueprints: [
      {
        semanticRole: "hero_phrase",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Chart headline — the claim the graph proves. Large, bold, arrives before the chart.",
        entranceAnimations: ["slam_down"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "hero_image",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "type:graph element — bar or line chart with draw_in animation, 6–8 data points, accent color bars",
        entranceAnimations: ["draw_in"],
        loopAnimations: [],
        staggerDelayMs: 400,
        isGraph: true,
      },
      {
        semanticRole: "supporting_caption",
        semanticLayer: "secondary_motion",
        temporalZone: "emphasis",
        description: "Key stat callout — animated_stat with count_up, appears at chart peak moment",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 1600,
        isStat: true,
      },
      {
        semanticRole: "body_copy",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "One-line insight below the chart — what the data means, word_slide_up reveal",
        entranceAnimations: ["word_slide_up"],
        loopAnimations: [],
        staggerDelayMs: 2200,
      },
    ],
    rhythmPattern: "sweep",
    avoid: [
      "static screenshot of a chart — must animate with draw_in",
      "describing chart data as bullet text instead of using type:graph",
      "headline that appears after the chart — the claim must precede the evidence",
    ],
  };
}

function blueprintStatBurst(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "stat_burst",
    motionStrategyDescription:
      "STAT BURST: ONE enormous number commands the entire scene. It counts up from zero with a count_up animation, surrounded by a burst of energy — glowing orbs, a background pulse, an accent line. The stat IS the scene.",
    elementBlueprints: [
      {
        semanticRole: "hero_phrase",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "The stat — type:animated_stat, content.text = the number, massive font, accent color, count_up from 0",
        entranceAnimations: ["depth_charge"],
        loopAnimations: [],
        staggerDelayMs: 0,
        isStat: true,
      },
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "reveal",
        description: "Context label above or below the stat — what does this number mean? 48–64px",
        entranceAnimations: ["momentum_carry"],
        loopAnimations: [],
        staggerDelayMs: 300,
      },
      {
        semanticRole: "supporting_caption",
        semanticLayer: "typography",
        temporalZone: "emphasis",
        description: "Source or supporting detail — smaller text, word_fade_in, adds credibility",
        entranceAnimations: ["word_fade_in"],
        loopAnimations: [],
        staggerDelayMs: 1000,
      },
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "atmospheric",
        temporalZone: "hook",
        description: "Burst glow orb behind the stat — large circle shape, blendMode:screen, atmosphere_pulse loop",
        entranceAnimations: ["fadeIn"],
        loopAnimations: ["atmosphere_pulse"],
        staggerDelayMs: 0,
      },
    ],
    rhythmPattern: "burst",
    avoid: [
      "multiple stats competing for attention — this system is ONE stat per scene",
      "decorative elements that distract from the number",
      "plain slideUp on the stat — use depth_charge or pop_in",
    ],
  };
}

function blueprintComparisonSplit(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "comparison_split",
    motionStrategyDescription:
      "COMPARISON SPLIT: The scene divides into two opposing panels — left/right or top/bottom. Contrasting content enters from opposite directions simultaneously. A divider line draws in at the center. Neither side dominates until the payoff reveals the winner.",
    elementBlueprints: [
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "atmospheric",
        temporalZone: "hook",
        description: "Left panel background shape — half the canvas, brand primary or accent color",
        entranceAnimations: ["slideRight"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "atmospheric",
        temporalZone: "hook",
        description: "Right panel background shape — contrasting color (lighter or complementary)",
        entranceAnimations: ["slideLeft"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "divider",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Center divider line — shape:line, draws in vertically from top to bottom",
        entranceAnimations: ["draw_in"],
        loopAnimations: [],
        staggerDelayMs: 300,
        isConnectorLine: true,
      },
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "reveal",
        description: "Left panel label — slideRight entrance, contrasting text color for that panel bg",
        entranceAnimations: ["slideRight"],
        loopAnimations: [],
        staggerDelayMs: 500,
      },
      {
        semanticRole: "hero_phrase",
        semanticLayer: "typography",
        temporalZone: "reveal",
        description: "Right panel label — slideLeft entrance, contrasting text color for that panel bg",
        entranceAnimations: ["slideLeft"],
        loopAnimations: [],
        staggerDelayMs: 500,
      },
      {
        semanticRole: "supporting_caption",
        semanticLayer: "depth",
        temporalZone: "payoff",
        description: "Payoff verdict — which side wins, centered badge or stamp at 2000ms+",
        entranceAnimations: ["stamp"],
        loopAnimations: [],
        staggerDelayMs: 2000,
      },
    ],
    rhythmPattern: "reveal",
    avoid: [
      "all elements on the same side — the split must be spatial and simultaneous",
      "same motion direction for both panels",
      "revealing the verdict too early — hold it for payoff zone",
    ],
  };
}

function blueprintTimelineBuild(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "timeline_build",
    motionStrategyDescription:
      "TIMELINE BUILD: Steps, stages, or moments reveal sequentially with stagger. Each step has an icon + label + connector line. The viewer watches the story construct itself from left-to-right or top-to-bottom.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "hook",
        description: "Timeline title — brief statement of what process/journey this shows",
        entranceAnimations: ["slideDown"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Step 1 icon + step label — staggerDelayMs:0, appears as first node",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 200,
      },
      {
        semanticRole: "divider",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Connector line from step 1 to step 2 — draw_in, 200px horizontal",
        entranceAnimations: ["draw_in"],
        loopAnimations: [],
        staggerDelayMs: 450,
        isConnectorLine: true,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Step 2 icon + label — appears after connector draws",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 700,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "emphasis",
        description: "Step 3 icon + label — the pivot or climax step, slightly larger",
        entranceAnimations: ["spring_in"],
        loopAnimations: [],
        staggerDelayMs: 1050,
      },
      {
        semanticRole: "body_copy",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "Final step or outcome — the resolution, arrives last with fadeIn",
        entranceAnimations: ["fadeIn"],
        loopAnimations: [],
        staggerDelayMs: 1800,
      },
    ],
    rhythmPattern: "sweep",
    avoid: [
      "all steps appearing simultaneously — the sequential reveal IS the motion story",
      "no connector lines — the connections are what make it a timeline not a list",
      "more than 5 steps in a single scene — split across multiple scenes",
    ],
  };
}

function blueprintAlgorithmFlow(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "algorithm_flow",
    motionStrategyDescription:
      "ALGORITHM FLOW: Node-and-connector diagram that builds progressively. Input nodes appear first, flow lines trace toward processing nodes, output nodes reveal last. The routing motion makes the logic tangible.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "hook",
        description: "System name or claim — what this algorithm/pipeline does, typewriter animation",
        entranceAnimations: ["typewriter"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Input node(s) — rectangle shapes on the left, slideRight entrance",
        entranceAnimations: ["slideRight"],
        loopAnimations: [],
        staggerDelayMs: 400,
      },
      {
        semanticRole: "divider",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Flow connectors — shape:line with arrowEnd:arrow, draw_in tracing left-to-right",
        entranceAnimations: ["draw_in"],
        loopAnimations: [],
        staggerDelayMs: 700,
        isConnectorLine: true,
      },
      {
        semanticRole: "hero_image",
        semanticLayer: "focal",
        temporalZone: "emphasis",
        description: "Central processing node — larger rectangle, accent color, the 'brain' of the system",
        entranceAnimations: ["pop_in"],
        loopAnimations: ["heartbeat"],
        staggerDelayMs: 1000,
      },
      {
        semanticRole: "supporting_caption",
        semanticLayer: "secondary_motion",
        temporalZone: "payoff",
        description: "Output node(s) — slideLeft or pop_in after processing node, show the result",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 1400,
      },
    ],
    rhythmPattern: "sweep",
    avoid: [
      "bullet lists describing the algorithm — the flow diagram IS the explanation",
      "all nodes appearing simultaneously — the routing order is the narrative",
      "no connector lines — they are mandatory for this system",
    ],
  };
}

function blueprintCardCascade(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "card_cascade",
    motionStrategyDescription:
      "CARD CASCADE: A stack of content cards fans out or cascades into view. Each card slightly overlaps the previous. The layering creates perceived depth. Cards can represent products, examples, or evidence items.",
    elementBlueprints: [
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Bottom card of the stack — fullest visible, first to arrive, largest, slideUp",
        entranceAnimations: ["slideUp"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "hero_image",
        semanticLayer: "focal",
        temporalZone: "reveal",
        description: "Card 2 — slightly smaller, offset right by 8–12px, arrives 250ms later",
        entranceAnimations: ["slideUp"],
        loopAnimations: [],
        staggerDelayMs: 250,
        isImage: true,
      },
      {
        semanticRole: "product_image",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Card 3 — smallest in the stack, farthest back, arrives 450ms later",
        entranceAnimations: ["slideUp"],
        loopAnimations: [],
        staggerDelayMs: 450,
        isImage: true,
      },
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "emphasis",
        description: "Headline over the card stack — arrives after cards land, momentum_carry",
        entranceAnimations: ["momentum_carry"],
        loopAnimations: [],
        staggerDelayMs: 700,
      },
      {
        semanticRole: "body_copy",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "Supporting copy or call-to-action below the stack",
        entranceAnimations: ["fadeIn"],
        loopAnimations: [],
        staggerDelayMs: 1100,
      },
    ],
    rhythmPattern: "reveal",
    avoid: [
      "cards appearing as a flat grid — they must overlap and have perceived depth",
      "all cards the same size and z-position",
      "headline appearing before the cards land",
    ],
  };
}

function blueprintOrbitCluster(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "orbit_cluster",
    motionStrategyDescription:
      "ORBIT CLUSTER: Concepts, entities, or icons orbit a central dominant element. Each satellite has a different orbit radius and phase offset, creating a dynamic gravitational ecosystem. The center element defines the category; the orbiting elements are its members.",
    elementBlueprints: [
      {
        semanticRole: "hero_image",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Central attractor — logo, concept label, or hero image at the gravitational center (200–300px)",
        entranceAnimations: ["spring_in"],
        loopAnimations: ["breathe"],
        staggerDelayMs: 0,
        isImage: true,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Satellite 1 — orbit amplitude:280, phase:0, drift_in then continuous orbit",
        entranceAnimations: ["drift_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 200,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Satellite 2 — orbit amplitude:310, phase:120°, drift_in then continuous orbit",
        entranceAnimations: ["drift_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 350,
      },
      {
        semanticRole: "icon_element",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Satellite 3 — orbit amplitude:260, phase:240°, drift_in then continuous orbit",
        entranceAnimations: ["drift_in"],
        loopAnimations: ["orbit"],
        staggerDelayMs: 500,
      },
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "emphasis",
        description: "System label or stat — appears below/above the cluster after ecosystem is established",
        entranceAnimations: ["word_slide_up"],
        loopAnimations: [],
        staggerDelayMs: 900,
      },
    ],
    rhythmPattern: "release",
    avoid: [
      "all satellites at the same orbit radius — varied radii create visual richness",
      "satellites that don't actually orbit — loop animation is required",
      "more than 6 satellites — the cluster becomes unreadable",
    ],
  };
}

function blueprintDataRipple(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "data_ripple",
    motionStrategyDescription:
      "DATA RIPPLE: A signal propagates outward from a central point. Concentric ring shapes expand with staggered atmosphere_pulse animations. Connecting lines trace the propagation paths. Represents influence, reach, or signal spreading.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Signal origin — central circle or icon, pop_in, heartbeat loop",
        entranceAnimations: ["pop_in"],
        loopAnimations: ["heartbeat"],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "atmospheric",
        temporalZone: "reveal",
        description: "First ripple ring — large circle shape, low opacity (0.15–0.25), atmosphere_pulse loop, blendMode:screen",
        entranceAnimations: ["fadeIn"],
        loopAnimations: ["atmosphere_pulse"],
        staggerDelayMs: 300,
      },
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "atmospheric",
        temporalZone: "reveal",
        description: "Second ripple ring — larger circle, even lower opacity, atmosphere_pulse at offset phase",
        entranceAnimations: ["fadeIn"],
        loopAnimations: ["atmosphere_pulse"],
        staggerDelayMs: 600,
      },
      {
        semanticRole: "scene_backdrop",
        semanticLayer: "background_motion",
        temporalZone: "emphasis",
        description: "Third ripple ring — outermost, minimal opacity (0.06–0.10), slowest pulse",
        entranceAnimations: ["fadeIn"],
        loopAnimations: ["atmosphere_pulse"],
        staggerDelayMs: 900,
      },
      {
        semanticRole: "hero_phrase",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "Reach/impact stat — animated_stat counting up, appears at peak ripple",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 1400,
        isStat: true,
      },
    ],
    rhythmPattern: "release",
    avoid: [
      "sharp solid rings — use low opacity shapes with blendMode:screen for soft glows",
      "all rings the same size — they must expand progressively",
      "static rings with no animation — atmosphere_pulse is mandatory",
    ],
  };
}

function blueprintMorphReveal(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "morph_reveal",
    motionStrategyDescription:
      "MORPH REVEAL: One concept transforms into another through fluid shape change or image transition. A before-state is established, then morphs via blur_in/blur_out crossfade or type:custom keyframes into the after-state. The transformation IS the message.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "typography",
        temporalZone: "hook",
        description: "Before-state label — what this WAS, arrives with kinetic_slide",
        entranceAnimations: ["kinetic_slide"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "hero_image",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "Before-state visual — image or shape representing the origin concept",
        entranceAnimations: ["fadeIn"],
        loopAnimations: [],
        staggerDelayMs: 200,
        isImage: true,
      },
      {
        semanticRole: "hero_image",
        semanticLayer: "focal",
        temporalZone: "emphasis",
        description: "After-state visual — morphs in over the before-state via blur_in, different image",
        entranceAnimations: ["blur_in"],
        loopAnimations: [],
        staggerDelayMs: 1800,
        isImage: true,
      },
      {
        semanticRole: "hero_phrase",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "After-state label — the transformation result, arrives with momentum_carry after morph",
        entranceAnimations: ["momentum_carry"],
        loopAnimations: [],
        staggerDelayMs: 2200,
      },
    ],
    rhythmPattern: "reveal",
    avoid: [
      "abrupt cut between states — the blur_in crossfade transition is the core of this system",
      "showing before and after simultaneously — establish one, then transform",
      "more than 2 visual states per scene — morph is a binary transformation",
    ],
  };
}

function blueprintProofStack(_intent: CinematicIntent): MotionBlueprint {
  return {
    motionSystem: "proof_stack",
    motionStrategyDescription:
      "PROOF STACK: Evidence layers stack progressively. Each layer adds credibility — quote, stat, source badge, annotation line. The first element makes the claim; subsequent elements prove it. Each piece of proof arrives with a stagger, building an unassailable case.",
    elementBlueprints: [
      {
        semanticRole: "hook_title",
        semanticLayer: "focal",
        temporalZone: "hook",
        description: "The claim — bold, authoritative headline that the proof supports",
        entranceAnimations: ["slam_down"],
        loopAnimations: [],
        staggerDelayMs: 0,
      },
      {
        semanticRole: "hero_phrase",
        semanticLayer: "typography",
        temporalZone: "reveal",
        description: "First proof — key statistic or quote excerpt, highlight_sweep on the key phrase",
        entranceAnimations: ["slideUp"],
        loopAnimations: [],
        staggerDelayMs: 500,
      },
      {
        semanticRole: "supporting_caption",
        semanticLayer: "secondary_motion",
        temporalZone: "emphasis",
        description: "Source badge — small rectangle with source name, pop_in after the stat",
        entranceAnimations: ["pop_in"],
        loopAnimations: [],
        staggerDelayMs: 900,
      },
      {
        semanticRole: "divider",
        semanticLayer: "secondary_motion",
        temporalZone: "reveal",
        description: "Annotation connector — draw_in line pointing from badge to the statistic",
        entranceAnimations: ["draw_in"],
        loopAnimations: [],
        staggerDelayMs: 800,
        isConnectorLine: true,
      },
      {
        semanticRole: "body_copy",
        semanticLayer: "typography",
        temporalZone: "payoff",
        description: "Second proof or reinforcing detail — arrives at 2000ms+ as pattern interrupt",
        entranceAnimations: ["word_fade_in"],
        loopAnimations: [],
        staggerDelayMs: 2000,
      },
    ],
    rhythmPattern: "reveal",
    avoid: [
      "claim and proof appearing simultaneously — the stack must build over time",
      "generic decorative elements — every element must be a piece of evidence",
      "no source attribution — the badge is what makes this a proof stack, not a claim",
    ],
  };
}

// ─── Dispatch table ───────────────────────────────────────────────────────────

const SYSTEM_FACTORIES: Record<
  CinematicMotionSystem,
  (intent: CinematicIntent) => MotionBlueprint
> = {
  kinetic_hook:      blueprintKineticHook,
  social_swarm:      blueprintSocialSwarm,
  viral_spread:      blueprintViralSpread,
  graph_growth:      blueprintGraphGrowth,
  stat_burst:        blueprintStatBurst,
  comparison_split:  blueprintComparisonSplit,
  timeline_build:    blueprintTimelineBuild,
  algorithm_flow:    blueprintAlgorithmFlow,
  card_cascade:      blueprintCardCascade,
  orbit_cluster:     blueprintOrbitCluster,
  data_ripple:       blueprintDataRipple,
  morph_reveal:      blueprintMorphReveal,
  proof_stack:       blueprintProofStack,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Expand a CinematicMotionSystem + intent into a concrete MotionBlueprint.
 * Pure function — deterministic, no side effects, no randomness.
 *
 * @param system   The motion system key (primaryMotionSystem from CinematicIntent)
 * @param intent   The full CinematicIntent for this scene
 * @returns        A MotionBlueprint with element hints and constraints
 */
export function expandMotionIntent(
  system: CinematicMotionSystem,
  intent: CinematicIntent,
): MotionBlueprint {
  const factory = SYSTEM_FACTORIES[system];
  return factory(intent);
}

/**
 * Serialize a MotionBlueprint as a compact prompt injection string.
 * Used by buildBatchPrompt / buildSteppedAssemblyPrompt to give the LLM
 * its marching orders for a specific scene.
 */
export function blueprintToPromptString(bp: MotionBlueprint): string {
  const elementLines = bp.elementBlueprints.map((el, i) =>
    `  ${i + 1}. ${el.semanticRole} [${el.semanticLayer}/${el.temporalZone}] stagger:${el.staggerDelayMs}ms` +
    `${el.isGraph ? " → type:graph" : el.isStat ? " → type:animated_stat" : el.isConnectorLine ? " → shape:line+draw_in" : ""}` +
    `\n     entrance: ${el.entranceAnimations.join("+")}` +
    (el.loopAnimations.length > 0 ? ` | loop: ${el.loopAnimations.join("+")}` : "") +
    `\n     → ${el.description}`
  ).join("\n");

  const avoidLines = bp.avoid.map((a) => `  ✗ ${a}`).join("\n");

  return `CINEMATIC MOTION STRATEGY: ${bp.motionSystem.toUpperCase()}
${bp.motionStrategyDescription}

Rhythm: ${bp.rhythmPattern}
${bp.recommendedMotionPreset ? `Scene motion preset: ${bp.recommendedMotionPreset}` : ""}

Element construction guide (build these in order):
${elementLines}

AVOID in this scene:
${avoidLines}`;
}
