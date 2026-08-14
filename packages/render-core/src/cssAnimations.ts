/**
 * CSS-powered animations via Web Animations API (WAAPI).
 *
 * Strategy:
 *   - transform animations use composite:'add' so they stack on top of the
 *     element's static layout transform without conflicting.
 *   - opacity / filter animations use composite:'replace' (default).
 *   - Scrubbing: animation.currentTime = elapsed (single write, no JS easing math).
 *   - Playback: animations run natively on the compositor thread.
 *   - Looping animations use iterations:Infinity; scrubbing wraps with modulo.
 */

import type { Animation as KwikkAnimation } from "@kwikk/shared-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimationSpec {
  transformKF: Keyframe[] | null;
  opacityKF:   Keyframe[] | null;
  filterKF:    Keyframe[] | null;
  iterations:  number;
  easing:      string;
}

export interface ManagedAnimation {
  transformAnim: globalThis.Animation | null;
  opacityAnim:   globalThis.Animation | null;
  filterAnim:    globalThis.Animation | null;
  startMs:       number;
  durationMs:    number;
  iterations:    number;
}

// ─── Easing map ───────────────────────────────────────────────────────────────

const EASING: Record<string, string> = {
  linear:          "linear",
  ease_in:         "ease-in",
  ease_out:        "ease-out",
  ease_in_out:     "ease-in-out",
  bounce:          "cubic-bezier(0.34,1.56,0.64,1)",
  spring:          "cubic-bezier(0.175,0.885,0.32,1.275)",
  ease_back:       "cubic-bezier(0.68,-0.55,0.265,1.55)",
  ease_in_circ:    "cubic-bezier(0.6,0.04,0.98,0.34)",
  ease_out_circ:   "cubic-bezier(0.075,0.82,0.165,1)",
  ease_in_expo:    "cubic-bezier(0.95,0.05,0.795,0.035)",
  ease_out_expo:   "cubic-bezier(0.19,1,0.22,1)",
  ease_in_quart:   "cubic-bezier(0.895,0.03,0.685,0.22)",
  ease_out_quart:  "cubic-bezier(0.165,0.84,0.44,1)",
};

export function easingToCSS(easing: string | undefined): string {
  return EASING[easing ?? "ease_in_out"] ?? "ease-in-out";
}

// ─── Spec builder ─────────────────────────────────────────────────────────────

export function buildAnimationSpec(anim: KwikkAnimation): AnimationSpec | null {
  const easing   = easingToCSS(anim.easing);
  const offset   = anim.fromOffset ?? 60;
  const amp      = anim.amplitude  ?? 0.3;
  const type     = anim.type;

  switch (type) {

    // ── Fades — opacity handled by animation-engine via el.layout.opacity ─────
    // fadeIn / fadeOut produce no transform, so WAAPI has nothing to do.
    // Return null → createManagedAnimation skips them, animation-engine owns opacity.
    case "fadeIn":
    case "fadeOut":
      return null;

    // ── Slides ───────────────────────────────────────────────────────────────
    // Opacity for these (when combined with fadeIn) comes from animation-engine.
    case "slideUp":
      return {
        transformKF: [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
        opacityKF: null, filterKF: null, iterations: 1, easing,
      };
    case "slideDown":
      return {
        transformKF: [{ transform: `translateY(-${offset}px)` }, { transform: "translateY(0)" }],
        opacityKF: null, filterKF: null, iterations: 1, easing,
      };
    case "slideLeft":
      return {
        transformKF: [{ transform: `translateX(${offset}px)` }, { transform: "translateX(0)" }],
        opacityKF: null, filterKF: null, iterations: 1, easing,
      };
    case "slideRight":
      return {
        transformKF: [{ transform: `translateX(-${offset}px)` }, { transform: "translateX(0)" }],
        opacityKF: null, filterKF: null, iterations: 1, easing,
      };

    // ── Zoom ─────────────────────────────────────────────────────────────────
    case "zoomIn":
      return {
        transformKF: [{ transform: `scale(${amp})` }, { transform: "scale(1)" }],
        opacityKF: null,
        filterKF: null, iterations: 1, easing,
      };
    case "zoomOut":
      return {
        transformKF: [{ transform: `scale(${2 - amp})` }, { transform: "scale(1)" }],
        opacityKF: null,
        filterKF: null, iterations: 1, easing,
      };

    // ── Bounce ───────────────────────────────────────────────────────────────
    case "bounceIn":
      return {
        transformKF: [
          { transform: "scale(0)",               offset: 0 },
          { transform: `scale(${1 + amp})`,      offset: 0.7 },
          { transform: `scale(${1 - amp * 0.3})`,offset: 0.85 },
          { transform: "scale(1)",               offset: 1 },
        ],
        opacityKF: null,
        filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "bounceOut":
      return {
        transformKF: [
          { transform: "scale(1)",              offset: 0 },
          { transform: `scale(${1 + amp * 0.3})`, offset: 0.3 },
          { transform: `scale(${1 - amp})`,     offset: 0.7 },
          { transform: "scale(0)",              offset: 1 },
        ],
        opacityKF: [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }],
        filterKF: null, iterations: 1, easing: "ease-in",
      };

    // ── Rotate ───────────────────────────────────────────────────────────────
    case "rotateIn":
      return {
        transformKF: [{ transform: "rotate(-180deg) scale(0)" }, { transform: "rotate(0) scale(1)" }],
        opacityKF: null,
        filterKF: null, iterations: 1, easing,
      };
    case "rotateOut":
      return {
        transformKF: [{ transform: "rotate(0) scale(1)" }, { transform: "rotate(180deg) scale(0)" }],
        opacityKF:   [{ opacity: 1 }, { opacity: 0 }],
        filterKF: null, iterations: 1, easing,
      };

    // ── Blur ─────────────────────────────────────────────────────────────────
    case "blur_transition":
    case "blur_in":
      return {
        transformKF: null,
        opacityKF: null,
        filterKF:    [{ filter: "blur(20px)" }, { filter: "blur(0px)" }],
        iterations: 1, easing,
      };
    case "blur_out":
      return {
        transformKF: null,
        opacityKF:   [{ opacity: 1 }, { opacity: 0 }],
        filterKF:    [{ filter: "blur(0px)" }, { filter: "blur(20px)" }],
        iterations: 1, easing,
      };

    // ── Cinematic entries ─────────────────────────────────────────────────────
    case "subtitle_pop":
      return {
        transformKF: [
          { transform: "scale(0.8) translateY(10px)", offset: 0 },
          { transform: "scale(1.05) translateY(0)",   offset: 0.6 },
          { transform: "scale(1) translateY(0)",      offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing,
      };
    case "kinetic_slide":
      return {
        transformKF: [
          { transform: `translateX(-${offset * 1.3}px) skewX(-10deg)` },
          { transform: "translateX(0) skewX(0)" },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.19,1,0.22,1)",
      };
    case "spring_in":
      return {
        transformKF: [
          { transform: "scale(0) translateY(30px)",   offset: 0 },
          { transform: "scale(1.15) translateY(-10px)", offset: 0.6 },
          { transform: "scale(0.95) translateY(3px)", offset: 0.8 },
          { transform: "scale(1) translateY(0)",      offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "slam_down":
      return {
        transformKF: [
          { transform: "translateY(-100px) scale(1.1)", offset: 0 },
          { transform: "translateY(8px) scale(0.96)",   offset: 0.7 },
          { transform: "translateY(0) scale(1)",        offset: 1 },
        ],
        opacityKF: null,
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.68,-0.55,0.265,1.55)",
      };
    case "depth_charge":
      return {
        transformKF: [{ transform: "scale(2)" }, { transform: "scale(1)" }],
        opacityKF: null,
        filterKF:    [{ filter: "blur(15px)" }, { filter: "blur(0px)" }],
        iterations: 1, easing,
      };
    case "drift_in":
      return {
        transformKF: [
          { transform: `translateX(${offset * 0.5}px) translateY(${offset * 0.3}px)` },
          { transform: "translateX(0) translateY(0)" },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.25,0.1,0.25,1)",
      };
    case "stomp":
      return {
        transformKF: [
          { transform: "scale(1.5) translateY(-20px)", offset: 0 },
          { transform: "scale(0.95) translateY(3px)",  offset: 0.5 },
          { transform: "scale(1) translateY(0)",       offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "tumble_in":
      return {
        transformKF: [
          { transform: "rotate(720deg) scale(0) translateX(100px)" },
          { transform: "rotate(0) scale(1) translateX(0)" },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing,
      };
    case "glitch_in":
      return {
        transformKF: [
          { transform: "translateX(-8px) skewX(5deg)",  offset: 0 },
          { transform: "translateX(8px) skewX(-5deg)",  offset: 0.15 },
          { transform: "translateX(-5px)",              offset: 0.3 },
          { transform: "translateX(5px)",               offset: 0.45 },
          { transform: "translateX(-2px)",              offset: 0.6 },
          { transform: "translateX(0)",                 offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "linear",
      };
    case "spiral_in":
      return {
        transformKF: [
          { transform: "rotate(720deg) scale(0) translateX(100px)" },
          { transform: "rotate(0) scale(1) translateX(0)" },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.165,0.84,0.44,1)",
      };
    case "flip_in_x":
      return {
        transformKF: [
          { transform: "perspective(400px) rotateX(90deg)",  offset: 0 },
          { transform: "perspective(400px) rotateX(-10deg)", offset: 0.6 },
          { transform: "perspective(400px) rotateX(0)",      offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "flip_out_x":
      return {
        transformKF: [
          { transform: "perspective(400px) rotateX(0)",      offset: 0 },
          { transform: "perspective(400px) rotateX(-10deg)", offset: 0.3 },
          { transform: "perspective(400px) rotateX(90deg)",  offset: 1 },
        ],
        opacityKF: [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }],
        filterKF: null, iterations: 1, easing: "ease-in",
      };
    case "swoop_in":
      return {
        transformKF: [
          { transform: `translateX(-${offset * 2}px) translateY(${offset}px) rotate(-10deg) scale(0.5)` },
          { transform: "translateX(0) translateY(0) rotate(0) scale(1)" },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.19,1,0.22,1)",
      };
    case "stamp":
      return {
        transformKF: [
          { transform: "scale(1.8)",  offset: 0 },
          { transform: "scale(0.92)", offset: 0.5 },
          { transform: "scale(1.05)", offset: 0.75 },
          { transform: "scale(1)",    offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "pop_in":
      return {
        transformKF: [
          { transform: "scale(0)",   offset: 0 },
          { transform: "scale(1.2)", offset: 0.7 },
          { transform: "scale(1)",   offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "rubber_band":
      return {
        transformKF: [
          { transform: "scaleX(1)",                    offset: 0 },
          { transform: "scaleX(1.25) scaleY(0.75)",    offset: 0.3 },
          { transform: "scaleX(0.75) scaleY(1.25)",    offset: 0.5 },
          { transform: "scaleX(1.15) scaleY(0.85)",    offset: 0.65 },
          { transform: "scaleX(0.95) scaleY(1.05)",    offset: 0.75 },
          { transform: "scaleX(1)",                    offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: 1, easing: "ease-out",
      };
    case "roll_in":
      return {
        transformKF: [
          { transform: "translateX(-200px) rotate(-120deg)" },
          { transform: "translateX(0) rotate(0)" },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing,
      };
    case "zip_in":
      return {
        transformKF: [
          { transform: `translateY(${offset * 2}px) scale(0.1)`, offset: 0 },
          { transform: "translateY(0) scale(1)", offset: 1 },
        ],
        opacityKF: [{ opacity: 0 }, { opacity: 1 }],
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.19,1,0.22,1)",
      };

    // ── Exits ─────────────────────────────────────────────────────────────────
    case "swoop_out":
      return {
        transformKF: [
          { transform: "translateX(0) translateY(0) rotate(0) scale(1)" },
          { transform: `translateX(${offset * 2}px) translateY(-${offset}px) rotate(10deg) scale(0.5)` },
        ],
        opacityKF: null,
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.895,0.03,0.685,0.22)",
      };
    case "implode":
      return {
        transformKF: [{ transform: "scale(1)" }, { transform: "scale(0)" }],
        opacityKF:   [{ opacity: 1 }, { opacity: 0 }],
        filterKF: null, iterations: 1, easing,
      };
    case "whip_exit":
    case "whip_up":
      return {
        transformKF: [{ transform: "translate(0,0)" }, { transform: "translate(0,-120px)" }],
        opacityKF:   [{ opacity: 1 }, { opacity: 0 }],
        filterKF: null, iterations: 1, easing: "cubic-bezier(0.895,0.03,0.685,0.22)",
      };

    // ── Attention ─────────────────────────────────────────────────────────────
    case "shake":
    case "vibrate":
      return {
        transformKF: [
          { transform: "translateX(0)",   offset: 0 },
          { transform: "translateX(-8px)", offset: 0.1 },
          { transform: "translateX(8px)",  offset: 0.2 },
          { transform: "translateX(-8px)", offset: 0.3 },
          { transform: "translateX(8px)",  offset: 0.4 },
          { transform: "translateX(-5px)", offset: 0.5 },
          { transform: "translateX(5px)",  offset: 0.6 },
          { transform: "translateX(-3px)", offset: 0.7 },
          { transform: "translateX(3px)",  offset: 0.8 },
          { transform: "translateX(-1px)", offset: 0.9 },
          { transform: "translateX(0)",   offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: 1, easing: "linear",
      };
    case "tada":
      return {
        transformKF: [
          { transform: "scale(1) rotate(0)",          offset: 0 },
          { transform: `scale(${1 - amp}) rotate(-3deg)`, offset: 0.1 },
          { transform: `scale(${1 - amp}) rotate(-3deg)`, offset: 0.2 },
          { transform: `scale(${1 + amp}) rotate(3deg)`,  offset: 0.3 },
          { transform: `scale(${1 + amp}) rotate(-3deg)`, offset: 0.4 },
          { transform: `scale(${1 + amp}) rotate(3deg)`,  offset: 0.5 },
          { transform: `scale(${1 + amp}) rotate(-3deg)`, offset: 0.6 },
          { transform: `scale(${1 + amp}) rotate(3deg)`,  offset: 0.7 },
          { transform: `scale(${1 + amp}) rotate(-3deg)`, offset: 0.8 },
          { transform: "scale(1) rotate(0)",          offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: 1, easing: "ease-in-out",
      };
    case "jello":
      return {
        transformKF: [
          { transform: "skewX(0) skewY(0)",       offset: 0 },
          { transform: "skewX(-12deg) skewY(-12deg)", offset: 0.22 },
          { transform: "skewX(6deg) skewY(6deg)",  offset: 0.44 },
          { transform: "skewX(-3deg) skewY(-3deg)", offset: 0.66 },
          { transform: "skewX(2deg) skewY(2deg)",  offset: 0.77 },
          { transform: "skewX(0) skewY(0)",        offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: 1, easing: "linear",
      };
    case "pulse":
    case "heartbeat":
      return {
        transformKF: [
          { transform: "scale(1)",    offset: 0 },
          { transform: "scale(1.08)", offset: 0.2 },
          { transform: "scale(1)",    offset: 0.4 },
          { transform: "scale(1.08)", offset: 0.6 },
          { transform: "scale(1)",    offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: 1, easing: "ease-in-out",
      };
    case "flicker":
      return {
        transformKF: null,
        opacityKF: [
          { opacity: 1,   offset: 0 },
          { opacity: 0.4, offset: 0.1 },
          { opacity: 1,   offset: 0.2 },
          { opacity: 0.6, offset: 0.35 },
          { opacity: 1,   offset: 0.5 },
          { opacity: 0.3, offset: 0.65 },
          { opacity: 1,   offset: 0.8 },
          { opacity: 0.7, offset: 0.9 },
          { opacity: 1,   offset: 1 },
        ],
        filterKF: null, iterations: 1, easing: "linear",
      };

    // ── Looping ───────────────────────────────────────────────────────────────
    case "float":
      return {
        transformKF: [
          { transform: "translateY(0)",    offset: 0 },
          { transform: "translateY(-10px)", offset: 0.5 },
          { transform: "translateY(0)",    offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "ease-in-out",
      };
    case "breathe":
      return {
        transformKF: [
          { transform: "scale(1)",    offset: 0 },
          { transform: "scale(1.04)", offset: 0.5 },
          { transform: "scale(1)",    offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "ease-in-out",
      };
    case "spin":
      return {
        transformKF: [{ transform: "rotate(0turn)" }, { transform: "rotate(1turn)" }],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "linear",
      };
    case "sway":
      return {
        transformKF: [
          { transform: "rotate(-5deg)", offset: 0 },
          { transform: "rotate(5deg)",  offset: 0.5 },
          { transform: "rotate(-5deg)", offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "ease-in-out",
      };
    case "orbit":
      return {
        transformKF: [
          { transform: "rotate(0deg) translateX(30px) rotate(0deg)" },
          { transform: "rotate(360deg) translateX(30px) rotate(-360deg)" },
        ],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "linear",
      };
    case "pendulum":
      return {
        transformKF: [
          { transform: "rotate(-20deg)", offset: 0 },
          { transform: "rotate(20deg)",  offset: 0.5 },
          { transform: "rotate(-20deg)", offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "ease-in-out",
      };
    case "bounce_floor":
      return {
        transformKF: [
          { transform: "translateY(0) scaleY(1)",   offset: 0 },
          { transform: "translateY(40px) scaleY(0.8)", offset: 0.5 },
          { transform: "translateY(0) scaleY(1)",   offset: 1 },
        ],
        opacityKF: null, filterKF: null, iterations: Infinity, easing: "ease-in-out",
      };
    case "neon_flicker":
      return {
        transformKF: null,
        opacityKF: [
          { opacity: 1,   offset: 0 },
          { opacity: 0.2, offset: 0.05 },
          { opacity: 1,   offset: 0.1 },
          { opacity: 1,   offset: 0.5 },
          { opacity: 0.3, offset: 0.55 },
          { opacity: 1,   offset: 0.6 },
          { opacity: 1,   offset: 0.8 },
          { opacity: 0.1, offset: 0.85 },
          { opacity: 1,   offset: 0.9 },
          { opacity: 1,   offset: 1 },
        ],
        filterKF: null, iterations: Infinity, easing: "linear",
      };

    case "backInDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "translateY(-1200px) scale(0.7)"},
          {offset: 0.8, transform: "translateY(0px) scale(0.7)"},
          {offset: 1.0, transform: "scale(1)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.7},
          {offset: 0.8, opacity: 0.7},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backInLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translateX(-2000px) scale(0.7)"},
          {offset: 0.8, transform: "translateX(0px) scale(0.7)"},
          {offset: 1.0, transform: "scale(1)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.7},
          {offset: 0.8, opacity: 0.7},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backInRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translateX(2000px) scale(0.7)"},
          {offset: 0.8, transform: "translateX(0px) scale(0.7)"},
          {offset: 1.0, transform: "scale(1)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.7},
          {offset: 0.8, opacity: 0.7},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backInUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "translateY(1200px) scale(0.7)"},
          {offset: 0.8, transform: "translateY(0px) scale(0.7)"},
          {offset: 1.0, transform: "scale(1)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.7},
          {offset: 0.8, opacity: 0.7},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backOutDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale(1)"},
          {offset: 0.2, transform: "translateY(0px) scale(0.7)"},
          {offset: 1.0, transform: "translateY(700px) scale(0.7)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 0.2, opacity: 0.7},
          {offset: 1.0, opacity: 0.7}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backOutLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale(1)"},
          {offset: 0.2, transform: "translateX(0px) scale(0.7)"},
          {offset: 1.0, transform: "translateX(-2000px) scale(0.7)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 0.2, opacity: 0.7},
          {offset: 1.0, opacity: 0.7}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backOutRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale(1)"},
          {offset: 0.2, transform: "translateX(0px) scale(0.7)"},
          {offset: 1.0, transform: "translateX(2000px) scale(0.7)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 0.2, opacity: 0.7},
          {offset: 1.0, opacity: 0.7}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "backOutUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale(1)"},
          {offset: 0.2, transform: "translateY(0px) scale(0.7)"},
          {offset: 1.0, transform: "translateY(-700px) scale(0.7)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 0.2, opacity: 0.7},
          {offset: 1.0, opacity: 0.7}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounce":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 0.2, transform: "translate3d(0, 0, 0)"},
          {offset: 0.4, transform: "translate3d(0, -30px, 0) scaleY(1.1)"},
          {offset: 0.43, transform: "translate3d(0, -30px, 0) scaleY(1.1)"},
          {offset: 0.53, transform: "translate3d(0, 0, 0)"},
          {offset: 0.7, transform: "translate3d(0, -15px, 0) scaleY(1.05)"},
          {offset: 0.8, transform: "translate3d(0, 0, 0) scaleY(0.95)"},
          {offset: 0.9, transform: "translate3d(0, -4px, 0) scaleY(1.02)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceInDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, -3000px, 0) scaleY(3)"},
          {offset: 0.6, transform: "translate3d(0, 25px, 0) scaleY(0.9)"},
          {offset: 0.75, transform: "translate3d(0, -10px, 0) scaleY(0.95)"},
          {offset: 0.9, transform: "translate3d(0, 5px, 0) scaleY(0.985)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceInLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-3000px, 0, 0) scaleX(3)"},
          {offset: 0.6, transform: "translate3d(25px, 0, 0) scaleX(1)"},
          {offset: 0.75, transform: "translate3d(-10px, 0, 0) scaleX(0.98)"},
          {offset: 0.9, transform: "translate3d(5px, 0, 0) scaleX(0.995)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceInRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(3000px, 0, 0) scaleX(3)"},
          {offset: 0.6, transform: "translate3d(-25px, 0, 0) scaleX(1)"},
          {offset: 0.75, transform: "translate3d(10px, 0, 0) scaleX(0.98)"},
          {offset: 0.9, transform: "translate3d(-5px, 0, 0) scaleX(0.995)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceInUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 3000px, 0) scaleY(5)"},
          {offset: 0.6, transform: "translate3d(0, -20px, 0) scaleY(0.9)"},
          {offset: 0.75, transform: "translate3d(0, 10px, 0) scaleY(0.95)"},
          {offset: 0.9, transform: "translate3d(0, -5px, 0) scaleY(0.985)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceOutDown":
      return {
        transformKF: [
          {offset: 0.2, transform: "translate3d(0, 10px, 0) scaleY(0.985)"},
          {offset: 0.4, transform: "translate3d(0, -20px, 0) scaleY(0.9)"},
          {offset: 0.45, transform: "translate3d(0, -20px, 0) scaleY(0.9)"},
          {offset: 1.0, transform: "translate3d(0, 2000px, 0) scaleY(3)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 0.45, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceOutLeft":
      return {
        transformKF: [
          {offset: 0.2, transform: "translate3d(20px, 0, 0) scaleX(0.9)"},
          {offset: 1.0, transform: "translate3d(-2000px, 0, 0) scaleX(2)"}
        ],
        opacityKF: [
          {offset: 0.2, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceOutRight":
      return {
        transformKF: [
          {offset: 0.2, transform: "translate3d(-20px, 0, 0) scaleX(0.9)"},
          {offset: 1.0, transform: "translate3d(2000px, 0, 0) scaleX(2)"}
        ],
        opacityKF: [
          {offset: 0.2, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "bounceOutUp":
      return {
        transformKF: [
          {offset: 0.2, transform: "translate3d(0, -10px, 0) scaleY(0.985)"},
          {offset: 0.4, transform: "translate3d(0, 20px, 0) scaleY(0.9)"},
          {offset: 0.45, transform: "translate3d(0, 20px, 0) scaleY(0.9)"},
          {offset: 1.0, transform: "translate3d(0, -2000px, 0) scaleY(3)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 0.45, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInBottomLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-100%, 100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInBottomRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(100%, 100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, -100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInDownBig":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, -2000px, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-100%, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInLeftBig":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-2000px, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(100%, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInRightBig":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(2000px, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInTopLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-100%, -100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInTopRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(100%, -100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeInUpBig":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 2000px, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutBottomLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(-100%, 100%, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutBottomRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(100%, 100%, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutDown":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(0, 100%, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutDownBig":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(0, 2000px, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutLeft":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(-100%, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutLeftBig":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(-2000px, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutRight":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(100%, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutRightBig":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(2000px, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutTopLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(-100%, -100%, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutTopRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(100%, -100%, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutUp":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(0, -100%, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "fadeOutUpBig":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(0, -2000px, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "flash":
      return {
        transformKF: null,
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 0.25, opacity: 0.0},
          {offset: 0.5, opacity: 1.0},
          {offset: 0.75, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "flip":
      return {
        transformKF: [
          {offset: 0.0, transform: "perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, -360deg)"},
          {offset: 0.4, transform: "perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -190deg)"},
          {offset: 0.5, transform: "perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -170deg)"},
          {offset: 0.8, transform: "perspective(400px) scale3d(0.95, 0.95, 0.95) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg)"},
          {offset: 1.0, transform: "perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "flipInX":
      return {
        transformKF: [
          {offset: 0.0, transform: "perspective(400px) rotate3d(1, 0, 0, 90deg)"},
          {offset: 0.4, transform: "perspective(400px) rotate3d(1, 0, 0, -20deg)"},
          {offset: 0.6, transform: "perspective(400px) rotate3d(1, 0, 0, 10deg)"},
          {offset: 0.8, transform: "perspective(400px) rotate3d(1, 0, 0, -5deg)"},
          {offset: 1.0, transform: "perspective(400px)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "flipInY":
      return {
        transformKF: [
          {offset: 0.0, transform: "perspective(400px) rotate3d(0, 1, 0, 90deg)"},
          {offset: 0.4, transform: "perspective(400px) rotate3d(0, 1, 0, -20deg)"},
          {offset: 0.6, transform: "perspective(400px) rotate3d(0, 1, 0, 10deg)"},
          {offset: 0.8, transform: "perspective(400px) rotate3d(0, 1, 0, -5deg)"},
          {offset: 1.0, transform: "perspective(400px)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "flipOutX":
      return {
        transformKF: [
          {offset: 0.0, transform: "perspective(400px)"},
          {offset: 0.3, transform: "perspective(400px) rotate3d(1, 0, 0, -20deg)"},
          {offset: 1.0, transform: "perspective(400px) rotate3d(1, 0, 0, 90deg)"}
        ],
        opacityKF: [
          {offset: 0.3, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "flipOutY":
      return {
        transformKF: [
          {offset: 0.0, transform: "perspective(400px)"},
          {offset: 0.3, transform: "perspective(400px) rotate3d(0, 1, 0, -15deg)"},
          {offset: 1.0, transform: "perspective(400px) rotate3d(0, 1, 0, 90deg)"}
        ],
        opacityKF: [
          {offset: 0.3, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "headShake":
      return {
        transformKF: [
          {offset: 0.0, transform: "translateX(0)"},
          {offset: 0.065, transform: "translateX(-6px) rotateY(-9deg)"},
          {offset: 0.185, transform: "translateX(5px) rotateY(7deg)"},
          {offset: 0.315, transform: "translateX(-3px) rotateY(-5deg)"},
          {offset: 0.435, transform: "translateX(2px) rotateY(3deg)"},
          {offset: 0.5, transform: "translateX(0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "heartBeat":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale(1)"},
          {offset: 0.14, transform: "scale(1.3)"},
          {offset: 0.28, transform: "scale(1)"},
          {offset: 0.42, transform: "scale(1.3)"},
          {offset: 0.7, transform: "scale(1)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "hinge":
      return {
        transformKF: [
          {offset: 0.2, transform: "rotate3d(0, 0, 1, 80deg)"},
          {offset: 0.4, transform: "rotate3d(0, 0, 1, 60deg)"},
          {offset: 0.6, transform: "rotate3d(0, 0, 1, 80deg)"},
          {offset: 0.8, transform: "rotate3d(0, 0, 1, 60deg)"},
          {offset: 1.0, transform: "translate3d(0, 700px, 0)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 0.8, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "jackInTheBox":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale(0.1) rotate(30deg)", transformOrigin: "center bottom"},
          {offset: 0.5, transform: "rotate(-10deg)"},
          {offset: 0.7, transform: "rotate(3deg)"},
          {offset: 1.0, transform: "scale(1)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "lightSpeedInLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-100%, 0, 0) skewX(30deg)"},
          {offset: 0.6, transform: "skewX(-20deg)"},
          {offset: 0.8, transform: "skewX(5deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "lightSpeedInRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(100%, 0, 0) skewX(-30deg)"},
          {offset: 0.6, transform: "skewX(20deg)"},
          {offset: 0.8, transform: "skewX(-5deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "lightSpeedOutLeft":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(-100%, 0, 0) skewX(-30deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "lightSpeedOutRight":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(100%, 0, 0) skewX(30deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rollIn":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-100%, 0, 0) rotate3d(0, 0, 1, -120deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rollOut":
      return {
        transformKF: [
          {offset: 1.0, transform: "translate3d(100%, 0, 0) rotate3d(0, 0, 1, 120deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateInDownLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "rotate3d(0, 0, 1, -45deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateInDownRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "rotate3d(0, 0, 1, 45deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateInUpLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "rotate3d(0, 0, 1, 45deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateInUpRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "rotate3d(0, 0, 1, -90deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 1.0, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateOutDownLeft":
      return {
        transformKF: [
          {offset: 1.0, transform: "rotate3d(0, 0, 1, 45deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateOutDownRight":
      return {
        transformKF: [
          {offset: 1.0, transform: "rotate3d(0, 0, 1, -45deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateOutUpLeft":
      return {
        transformKF: [
          {offset: 1.0, transform: "rotate3d(0, 0, 1, -45deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rotateOutUpRight":
      return {
        transformKF: [
          {offset: 1.0, transform: "rotate3d(0, 0, 1, 90deg)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "rubberBand":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale3d(1, 1, 1)"},
          {offset: 0.3, transform: "scale3d(1.25, 0.75, 1)"},
          {offset: 0.4, transform: "scale3d(0.75, 1.25, 1)"},
          {offset: 0.5, transform: "scale3d(1.15, 0.85, 1)"},
          {offset: 0.65, transform: "scale3d(0.95, 1.05, 1)"},
          {offset: 0.75, transform: "scale3d(1.05, 0.95, 1)"},
          {offset: 1.0, transform: "scale3d(1, 1, 1)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "shakeX":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 0.1, transform: "translate3d(-10px, 0, 0)"},
          {offset: 0.2, transform: "translate3d(10px, 0, 0)"},
          {offset: 0.3, transform: "translate3d(-10px, 0, 0)"},
          {offset: 0.4, transform: "translate3d(10px, 0, 0)"},
          {offset: 0.5, transform: "translate3d(-10px, 0, 0)"},
          {offset: 0.6, transform: "translate3d(10px, 0, 0)"},
          {offset: 0.7, transform: "translate3d(-10px, 0, 0)"},
          {offset: 0.8, transform: "translate3d(10px, 0, 0)"},
          {offset: 0.9, transform: "translate3d(-10px, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "shakeY":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 0.1, transform: "translate3d(0, -10px, 0)"},
          {offset: 0.2, transform: "translate3d(0, 10px, 0)"},
          {offset: 0.3, transform: "translate3d(0, -10px, 0)"},
          {offset: 0.4, transform: "translate3d(0, 10px, 0)"},
          {offset: 0.5, transform: "translate3d(0, -10px, 0)"},
          {offset: 0.6, transform: "translate3d(0, 10px, 0)"},
          {offset: 0.7, transform: "translate3d(0, -10px, 0)"},
          {offset: 0.8, transform: "translate3d(0, 10px, 0)"},
          {offset: 0.9, transform: "translate3d(0, -10px, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideInDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, -100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideInLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(-100%, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideInRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(100%, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideInUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 100%, 0)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideOutDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, 100%, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideOutLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(-100%, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideOutRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(100%, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "slideOutUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 1.0, transform: "translate3d(0, -100%, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "swing":
      return {
        transformKF: [
          {offset: 0.2, transform: "rotate3d(0, 0, 1, 15deg)"},
          {offset: 0.4, transform: "rotate3d(0, 0, 1, -10deg)"},
          {offset: 0.6, transform: "rotate3d(0, 0, 1, 5deg)"},
          {offset: 0.8, transform: "rotate3d(0, 0, 1, -5deg)"},
          {offset: 1.0, transform: "rotate3d(0, 0, 1, 0deg)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "wobble":
      return {
        transformKF: [
          {offset: 0.0, transform: "translate3d(0, 0, 0)"},
          {offset: 0.15, transform: "translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg)"},
          {offset: 0.3, transform: "translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg)"},
          {offset: 0.45, transform: "translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg)"},
          {offset: 0.6, transform: "translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg)"},
          {offset: 0.75, transform: "translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg)"},
          {offset: 1.0, transform: "translate3d(0, 0, 0)"}
        ],
        opacityKF: null,
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomInDown":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale3d(0.1, 0.1, 0.1) translate3d(0, -1000px, 0)"},
          {offset: 0.6, transform: "scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomInLeft":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale3d(0.1, 0.1, 0.1) translate3d(-1000px, 0, 0)"},
          {offset: 0.6, transform: "scale3d(0.475, 0.475, 0.475) translate3d(10px, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomInRight":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale3d(0.1, 0.1, 0.1) translate3d(1000px, 0, 0)"},
          {offset: 0.6, transform: "scale3d(0.475, 0.475, 0.475) translate3d(-10px, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomInUp":
      return {
        transformKF: [
          {offset: 0.0, transform: "scale3d(0.1, 0.1, 0.1) translate3d(0, 1000px, 0)"},
          {offset: 0.6, transform: "scale3d(0.475, 0.475, 0.475) translate3d(0, -60px, 0)"}
        ],
        opacityKF: [
          {offset: 0.0, opacity: 0.0},
          {offset: 0.6, opacity: 1.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomOutDown":
      return {
        transformKF: [
          {offset: 0.4, transform: "scale3d(0.475, 0.475, 0.475) translate3d(0, -60px, 0)"},
          {offset: 1.0, transform: "scale3d(0.1, 0.1, 0.1) translate3d(0, 2000px, 0)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomOutLeft":
      return {
        transformKF: [
          {offset: 0.4, transform: "scale3d(0.475, 0.475, 0.475) translate3d(42px, 0, 0)"},
          {offset: 1.0, transform: "scale(0.1) translate3d(-2000px, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomOutRight":
      return {
        transformKF: [
          {offset: 0.4, transform: "scale3d(0.475, 0.475, 0.475) translate3d(-42px, 0, 0)"},
          {offset: 1.0, transform: "scale(0.1) translate3d(2000px, 0, 0)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    case "zoomOutUp":
      return {
        transformKF: [
          {offset: 0.4, transform: "scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0)"},
          {offset: 1.0, transform: "scale3d(0.1, 0.1, 0.1) translate3d(0, -2000px, 0)"}
        ],
        opacityKF: [
          {offset: 0.4, opacity: 1.0},
          {offset: 1.0, opacity: 0.0}
        ],
        filterKF: null,
        iterations: 1,
        easing,
      };

    // LLM-authored WAAPI keyframes (see Animation.inlineSpec's doc comment in
    // shared-types) — the only field that carries data for this type. Cast is
    // safe: inlineSpec's keyframe arrays are structurally Keyframe[] already,
    // just typed loosely in shared-types to avoid a DOM-lib dependency there.
    case "custom":
      if (!anim.inlineSpec) return null;
      return {
        transformKF: (anim.inlineSpec.transformKF as Keyframe[] | undefined) ?? null,
        opacityKF:   (anim.inlineSpec.opacityKF as Keyframe[] | undefined) ?? null,
        filterKF:    (anim.inlineSpec.filterKF as Keyframe[] | undefined) ?? null,
        iterations:  anim.inlineSpec.iterations ?? 1,
        easing:      anim.inlineSpec.easing ? easingToCSS(anim.inlineSpec.easing) : easing,
      };

    default:
      return null; // fall back to animation-engine
  }
}

// ─── WAAPI factory ────────────────────────────────────────────────────────────

export function createManagedAnimation(
  el: HTMLElement,
  anim: KwikkAnimation,
): ManagedAnimation | null {
  const spec = buildAnimationSpec(anim);
  if (!spec) return null;
  // If all keyframe arrays are null, there's nothing for WAAPI to animate
  if (!spec.transformKF && !spec.opacityKF && !spec.filterKF) return null;

  const isInfinite = spec.iterations === Infinity;
  const opts: KeyframeAnimationOptions = {
    duration:   anim.durationMs,
    easing:     spec.easing,
    // Finite animations use 'forwards' + native delay so there is no backward
    // fill before startMs — prevents first-keyframe offsets leaking onto elements
    // (e.g. backdrop appears shifted left before its entrance animation begins).
    // Infinite (looping) animations use 'both' with no native delay; scrubbing
    // wraps via modulo and their first keyframe is always the identity/natural state.
    fill:       isInfinite ? "both" : "forwards",
    iterations: spec.iterations,
    delay:      isInfinite ? 0 : anim.startMs,
  };

  let transformAnim: globalThis.Animation | null = null;
  let opacityAnim:   globalThis.Animation | null = null;
  let filterAnim:    globalThis.Animation | null = null;

  // composite:'add' stacks the animation transform ON TOP of the element's
  // static layout transform (translate/scale/rotate from _applyTransform).
  if (spec.transformKF) {
    transformAnim = el.animate(spec.transformKF, { ...opts, composite: "add" });
    transformAnim.pause();
  }
  if (spec.opacityKF) {
    opacityAnim = el.animate(spec.opacityKF, opts);
    opacityAnim.pause();
  }
  if (spec.filterKF) {
    filterAnim = el.animate(spec.filterKF, opts);
    filterAnim.pause();
  }

  return {
    transformAnim,
    opacityAnim,
    filterAnim,
    startMs:    anim.startMs,
    durationMs: anim.durationMs,
    iterations: spec.iterations,
  };
}

// ─── Scrub ────────────────────────────────────────────────────────────────────

export function scrubManagedAnimation(ma: ManagedAnimation, timeMs: number): void {
  const isInfinite = ma.iterations === Infinity;

  let t: number;
  if (isInfinite) {
    // Infinite animations use no native delay; modulo wraps time within the period.
    const elapsed = timeMs - ma.startMs;
    t = elapsed <= 0 ? 0 : elapsed % ma.durationMs;
  } else {
    // Finite animations use native WAAPI delay = startMs, so setting currentTime =
    // localTimeMs lets WAAPI correctly determine the phase (before delay → no
    // backward fill; active; or ended → forward fill holds last frame).
    t = timeMs;
  }

  if (ma.transformAnim) ma.transformAnim.currentTime = t;
  if (ma.opacityAnim)   ma.opacityAnim.currentTime   = t;
  if (ma.filterAnim)    ma.filterAnim.currentTime     = t;
}

export function cancelManagedAnimation(ma: ManagedAnimation): void {
  ma.transformAnim?.cancel();
  ma.opacityAnim?.cancel();
  ma.filterAnim?.cancel();
}
