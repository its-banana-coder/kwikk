import pg from "pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "apps/api/.env") });

import type { Animation, AnimationType, ElementNode, ElementType, LayoutProps, SemanticLayerType, StyleProps, TemporalZone, Scene } from "@kwikk/shared-types";

function anim(id: string, type: AnimationType, startMs: number, durationMs: number, extra?: Partial<Animation>): Animation {
  return { id, type, startMs, durationMs, easing: "easeOut", ...extra };
}

function el(
  id: string,
  type: ElementType,
  semanticRole: string,
  semanticLayer: SemanticLayerType,
  temporalZone: TemporalZone | undefined,
  layout: LayoutProps,
  style: StyleProps,
  animations: Animation[],
  content?: ElementNode["content"]
): ElementNode {
  const node: ElementNode = { id, type, semanticRole, semanticLayer, layout, style, animations };
  if (temporalZone) node.temporalZone = temporalZone;
  if (content) node.content = content;
  return node;
}

// ─────────────────────────────────────────────────────────────────────────────
const EXISTING_EXAMPLES = [
  {
    "id": "top_n_type_1780227583296",
    "kind": "scene",
    "subcategory": "TOP_N_LIST",
    "label": "Top N List \u2014 Finance Habits",
    "description": "Bold list layout using Bodoni Moda display font on a light green background. Clean, editorial presentation.",
    "meta": {
      "tags": [
        "top_n_list",
        "numbered_list",
        "word_pop_reveal",
        "light_bg",
        "green_palette",
        "bodoni_moda",
        "finance_hook",
        "bold_intro",
        "list_reveal",
        "text_only",
        "richtext_bold"
      ],
      "mood": [
        "authoritative",
        "clear",
        "educational"
      ],
      "palette": "light",
      "scenePosition": "hook",
      "motionAxis": "vertical",
      "contentNiches": [
        "finance",
        "education",
        "general"
      ],
      "visualLanguage": "minimal_clean",
      "difficulty": "beginner"
    },
    "annotations": {
      "whatMakesItGood": [
        "word_pop_reveal on a 130px headline \u2014 each word pops in independently creating rhythm for list content",
        "Bodoni Moda at 500 weight (not bold) \u2014 editorial weight for financial authority without aggression",
        "Light green #E8F5E9 background \u2014 money/growth colour psychology without dark intimidation",
        "richText bold on 'TOP 10' only \u2014 weight contrast draws eye to the number before the premise",
        "Full-bleed text layout (x:36, width:1000) \u2014 maximum canvas use for list typography"
      ],
      "keyDecisions": [
        "word_pop_reveal over slideUp \u2014 list content benefits from word-by-word revelation, viewer reads along",
        "Bodoni Moda over Playfair Display \u2014 Bodoni is sharper/more authoritative for numbered list headings",
        "Light bg over dark \u2014 finance lists work on both; light feels more trustworthy for 'tips' content",
        "Single element, full height \u2014 TOP N lists are one dominant text block, not a multi-layer composition"
      ],
      "remixHints": [
        "Dark finance: bg='#0a0a0f', bg2='#1a0a2e', text='#ffffff', add gold glow orb at z1",
        "Tech/productivity: bg='#0B1020', font='Space Grotesk', text gradient blue-purple",
        "Wellness habits: bg='#F3E5F5', bg2='#E8EAF6', font='Poppins', accent='#9C27B0'",
        "Sports rules: bg='#111111', font='Anton', uppercase, red accent '#EF4444', slam_down"
      ],
      "avoidPatterns": [
        "Never use zoomIn on the scrim/card \u2014 backdrop shapes fade in, content layers animate",
        "Never add decorative corner circles \u2014 the glow orb IS the atmospheric element",
        "Never skip the pattern interrupt for scenes >= 5000ms"
      ]
    },
    "scene_data": {
      "id": "top_n_type_1780227583296_scene",
      "name": "Top 10 Rules",
      "durationMs": 5000,
      "background": {
        "color": "#E8F5E9",
        "color2": "#C8E6C9",
        "gradientAngle": 135
      },
      "elements": [
        {
          "id": "el_topn_glow",
          "type": "shape",
          "semanticRole": "scene_backdrop",
          "semanticLayer": "atmospheric",
          "layout": {
            "x": -50,
            "y": 600,
            "width": 800,
            "height": 800,
            "zIndex": 1,
            "rotation": 0,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "backgroundColor": "#C8E6C9",
            "borderRadius": 999,
            "filters": {
              "blur": 120
            }
          },
          "animations": [
            {
              "id": "a1",
              "type": "atmosphere_pulse",
              "startMs": 0,
              "durationMs": 99999
            }
          ],
          "content": {
            "shape": "circle"
          }
        },
        {
          "id": "el_topn_headline",
          "type": "text",
          "semanticRole": "hero_phrase",
          "semanticLayer": "typography",
          "layout": {
            "x": 36,
            "y": 480,
            "width": 1008,
            "height": 600,
            "zIndex": 5,
            "rotation": 0,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "fontSize": 130,
            "fontFamily": "Bodoni Moda",
            "fontWeight": 500,
            "textAlign": "center",
            "color": "#1b5e20"
          },
          "animations": [
            {
              "id": "a2",
              "type": "word_pop_reveal",
              "startMs": 0,
              "durationMs": 1500
            }
          ],
          "content": {
            "richText": [
              {
                "text": "TOP 10\n",
                "style": {
                  "fontWeight": 800,
                  "color": "#1b5e20"
                }
              },
              {
                "text": "Money Rules of the 1%",
                "style": {
                  "fontWeight": 500,
                  "color": "#2e7d32"
                }
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "calm_intro_1780229347653",
    "kind": "scene",
    "subcategory": "CALM_INTRO",
    "label": "Calm Intro \u2014 Series Opener",
    "description": "Minimalist, slow-paced scene opener using Alegreya Sans Display and a cool gradient background.",
    "meta": {
      "tags": [
        "calm_intro",
        "fade_in_out",
        "slow_zoom",
        "blur_out_transition",
        "light_bg",
        "cyan_gradient",
        "alegreya_sans",
        "series_opener",
        "single_element",
        "minimal",
        "educational_topic"
      ],
      "mood": [
        "calm",
        "intellectual",
        "inviting"
      ],
      "palette": "cool",
      "scenePosition": "hook",
      "motionAxis": "static",
      "contentNiches": [
        "tech",
        "education",
        "general"
      ],
      "visualLanguage": "minimal_clean",
      "difficulty": "beginner"
    },
    "annotations": {
      "whatMakesItGood": [
        "fadeIn (1500ms) + fadeOut (1200ms) \u2014 long fades signal calm, deliberate pacing \u2014 opposite of viral energy",
        "Alegreya Sans at 150px with fontWeight:500 \u2014 humanist serif reads as intelligent, not corporate",
        "White-to-cyan gradient \u2014 cool palette signals tech/AI topic without aggression",
        "blur_out transition \u2014 softer scene exit than a cut, maintains calm mood across scenes",
        "slow_zoom_in camera \u2014 subtle zoom-in gives life to a static single-element composition"
      ],
      "keyDecisions": [
        "Single text element, no decorative layers \u2014 calm intros strip away noise; the topic IS the content",
        "Centred layout, y:440 (roughly vertical centre) \u2014 balanced, academic placement",
        "fadeOut at 3800ms on a 5000ms scene \u2014 element is gone before scene ends, transition feels smooth",
        "Alegreya Sans over Inter/Montserrat \u2014 humanist serif elevates perceived quality for educational content"
      ],
      "remixHints": [
        "Finance series: bg='#0a0a0f', bg2='#1a0a2e', font='Playfair Display', text='#C4A882', fadeIn slower at 2000ms",
        "Wellness practice: bg='#F3E5F5', bg2='#E8EAF6', font='Cormorant Garamond', text='#4a3060'",
        "Bold topic intro: replace fadeIn with depth_charge, add glow orb at z1, use Space Grotesk",
        "Multi-line intro: break into 2 elements \u2014 topic label (small, fadeIn) + hero phrase (large, drift_in)"
      ],
      "avoidPatterns": [
        "Never use aggressive slam_down animations on calm openers",
        "Avoid complex overlays or moving grids that disrupt the silent aesthetic"
      ]
    },
    "scene_data": {
      "id": "calm_intro_1780229347653_scene",
      "name": "Series Intro",
      "durationMs": 5000,
      "background": {
        "color": "#f0fdfa",
        "color2": "#cffafe",
        "gradientAngle": 135
      },
      "camera": {
        "preset": "slow_zoom_in"
      },
      "elements": [
        {
          "id": "el_calm_text",
          "type": "text",
          "semanticRole": "hook_title",
          "semanticLayer": "typography",
          "layout": {
            "x": 60,
            "y": 640,
            "width": 960,
            "height": 400,
            "zIndex": 5,
            "rotation": 0,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "fontSize": 120,
            "fontFamily": "Alegreya Sans",
            "fontWeight": 500,
            "textAlign": "center",
            "color": "#0f766e"
          },
          "animations": [
            {
              "id": "a_fadein",
              "type": "fadeIn",
              "startMs": 0,
              "durationMs": 1500
            },
            {
              "id": "a_fadeout",
              "type": "fadeOut",
              "startMs": 3800,
              "durationMs": 1200
            }
          ],
          "content": {
            "text": "Understanding Artificial Intelligence"
          }
        }
      ]
    }
  },
  {
    "id": "intro_scene_1780809407549",
    "kind": "scene",
    "subcategory": "TOP_N_LIST",
    "label": "Top N List \u2014 Finance Saving",
    "description": "Multi-font typography-led scene with massive scale contrast, using Anak Paud display font and a conversational handwritten aside.",
    "meta": {
      "tags": [
        "top_n_list",
        "triple_font",
        "mixed_weight_hierarchy",
        "light_bg",
        "finance_hook",
        "display_font",
        "hand_font_accent",
        "no_animation",
        "bold_number",
        "contrast_scale"
      ],
      "mood": [
        "bold",
        "playful",
        "conversational"
      ],
      "palette": "light",
      "scenePosition": "hook",
      "motionAxis": "static",
      "contentNiches": [
        "finance",
        "education"
      ],
      "visualLanguage": "social_viral",
      "difficulty": "intermediate"
    },
    "annotations": {
      "whatMakesItGood": [
        "Three distinct font families create personality \u2014 structural (Akshar), impact (Anak Paud), human (Learlexhand)",
        "230px Anak Paud for 'SAVE MONEY' \u2014 extreme size contrast makes the main message unmissable",
        "Handwriting font for the parenthetical aside \u2014 drops register, feels conversational and relatable",
        "No animation on static-aesthetic content \u2014 some scenes work as still compositions for swipe-stop effect",
        "Mixed case register (Top 10 / SAVE MONEY / lowercase aside) \u2014 intentional hierarchy without colour"
      ],
      "keyDecisions": [
        "Three fonts over two \u2014 third font (handwriting) is the personality layer; two-font layouts can feel plain",
        "No animations \u2014 this style works as a still thumbnail; animation would compete with the font hierarchy",
        "230px for the impact word \u2014 must dominate; 113px label and 98px aside bracket the focal word",
        "Light background \u2014 finance 'savings' content feels approachable, not intimidating"
      ],
      "remixHints": [
        "Add motion: give 'SAVE MONEY' a stamp_in (0, 400ms, bounceOut) and the label a slideUp (0, 350ms)",
        "Dark version: bg='#111111', reverse text colors, add glow behind the 230px word",
        "Travel version: 'TOP 10 / DESTINATIONS / (you must visit)' \u2014 same three-font structure, new topic",
        "Wellness: 'DAILY / HABITS / (that actually work)' with Poppins + Bodoni + Kalam handwriting"
      ],
      "avoidPatterns": [
        "Never let the handwriting font exceed 100px \u2014 it becomes unreadable and messy",
        "Avoid complex color gradients when using three fonts \u2014 keep the colors basic to balance the styling"
      ]
    },
    "scene_data": {
      "id": "intro_scene_1780809407549_scene",
      "name": "Money Saving Still",
      "durationMs": 4000,
      "background": {
        "color": "#fcfbf7"
      },
      "elements": [
        {
          "id": "el_mon_label",
          "type": "text",
          "semanticRole": "section_title",
          "semanticLayer": "typography",
          "layout": {
            "x": 60,
            "y": 480,
            "width": 960,
            "height": 140,
            "zIndex": 5,
            "rotation": 0,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "fontSize": 113,
            "fontFamily": "Akshar",
            "fontWeight": 700,
            "textAlign": "center",
            "color": "#1c1917"
          },
          "animations": [],
          "content": {
            "text": "Top 10 Ways to"
          }
        },
        {
          "id": "el_mon_hero",
          "type": "text",
          "semanticRole": "hero_phrase",
          "semanticLayer": "typography",
          "layout": {
            "x": 40,
            "y": 660,
            "width": 1000,
            "height": 300,
            "zIndex": 5,
            "rotation": 0,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "fontSize": 230,
            "fontFamily": "Anak Paud",
            "fontWeight": 700,
            "textAlign": "center",
            "color": "#ea580c"
          },
          "animations": [],
          "content": {
            "text": "SAVE MONEY"
          }
        },
        {
          "id": "el_mon_aside",
          "type": "text",
          "semanticRole": "supporting_caption",
          "semanticLayer": "typography",
          "layout": {
            "x": 60,
            "y": 1020,
            "width": 960,
            "height": 130,
            "zIndex": 6,
            "rotation": 0,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "fontSize": 98,
            "fontFamily": "Kalam",
            "fontWeight": 400,
            "textAlign": "center",
            "color": "#4b5563"
          },
          "animations": [],
          "content": {
            "text": "(that actually work)"
          }
        }
      ]
    }
  },
  {
    "id": "intro_scene_1780810081590",
    "kind": "scene",
    "subcategory": "CREATOR_INTRO",
    "label": "Creator Intro \u2014 Brand Geometry",
    "description": "Vivid shape-based brand introduction using monochrome geometry (pink card + circle) for a modern fashion creator feel.",
    "meta": {
      "tags": [
        "creator_intro",
        "fashion_brand",
        "pink_palette",
        "shape_composition",
        "kinetic_slide",
        "card_and_circle",
        "brand_identity",
        "vibrant_bg",
        "geometric_shapes",
        "fashion_hook"
      ],
      "mood": [
        "bold",
        "youthful",
        "fashionable",
        "energetic"
      ],
      "palette": "vivid",
      "scenePosition": "hook",
      "motionAxis": "horizontal",
      "contentNiches": [
        "luxury",
        "general"
      ],
      "visualLanguage": "social_viral",
      "difficulty": "intermediate"
    },
    "annotations": {
      "whatMakesItGood": [
        "Pink (#ec4899) as both card and circle \u2014 monochromatic shape composition reads as intentional brand design",
        "kinetic_slide on geometric shapes \u2014 shapes sliding in create brand reveal energy",
        "Circle with thick white border + yellow drop shadow \u2014 the circle is a brand stamp, not decoration",
        "Card (rectangle) behind circle creates depth \u2014 layered geometry without image dependency",
        "fadeOut at 4700ms \u2014 shapes exit before scene end, leaves room for next content"
      ],
      "keyDecisions": [
        "kinetic_slide over slideLeft/slideRight \u2014 kinetic_slide has overshoot momentum, feels more premium",
        "White border on circle (16px) \u2014 border makes the circle a frame, not a blob",
        "Yellow (#eab308) drop shadow on circle \u2014 unexpected accent color creates visual tension against pink",
        "Shape-only composition \u2014 no text in this scene; shapes tell the brand story before words"
      ],
      "remixHints": [
        "Luxury fashion: replace pink with black (#1a1a1a), circle becomes white, border becomes gold",
        "Tech brand: bg='#0B1020', shapes in electric blue (#60A5FA), add a typewriter text element",
        "Add brand name text: typography layer with brand name in a contrasting font over the card",
        "Sports brand: bg='#111111', shapes in brand red, slam_down entrance, replace circle with star"
      ],
      "avoidPatterns": [
        "Never align the card and circle edges perfectly \u2014 overlapping offset creates the depth",
        "Avoid placing too many different colors on the shapes; keep to a clean 2-color brand theme"
      ]
    },
    "scene_data": {
      "id": "intro_scene_1780810081590_scene",
      "name": "Brand Stamp Intro",
      "durationMs": 5000,
      "background": {
        "color": "#fdf2f8"
      },
      "elements": [
        {
          "id": "el_brand_card",
          "type": "shape",
          "semanticRole": "scene_backdrop",
          "semanticLayer": "focal",
          "layout": {
            "x": 140,
            "y": 640,
            "width": 800,
            "height": 640,
            "zIndex": 3,
            "rotation": -5,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "backgroundColor": "#ec4899",
            "borderRadius": 32
          },
          "animations": [
            {
              "id": "a_slide_card",
              "type": "kinetic_slide",
              "startMs": 0,
              "durationMs": 800
            },
            {
              "id": "a_out_card",
              "type": "fadeOut",
              "startMs": 4700,
              "durationMs": 300
            }
          ],
          "content": {
            "shape": "rectangle"
          }
        },
        {
          "id": "el_brand_circle",
          "type": "shape",
          "semanticRole": "hero_image",
          "semanticLayer": "focal",
          "layout": {
            "x": 340,
            "y": 740,
            "width": 400,
            "height": 400,
            "zIndex": 4,
            "rotation": 5,
            "scale": 1,
            "opacity": 1
          },
          "style": {
            "backgroundColor": "#ec4899",
            "borderRadius": 999,
            "border": {
              "color": "#ffffff",
              "width": 16
            }
          },
          "animations": [
            {
              "id": "a_slide_circle",
              "type": "kinetic_slide",
              "startMs": 150,
              "durationMs": 800
            },
            {
              "id": "a_out_circle",
              "type": "fadeOut",
              "startMs": 4700,
              "durationMs": 300
            }
          ],
          "content": {
            "shape": "circle"
          }
        }
      ]
    }
  },
  {
    "id": "personal_introduction_top_1780218948592",
    "kind": "typography",
    "label": "Personal Intro \u2014 Bebas Name Top",
    "description": "Ultra-large name intro positioned at the top of the canvas, utilizing Bebas Neue with tight letter-spacing for immediate impact.",
    "fontPair": {
      "headline": "Bebas Neue",
      "body": "Bebas Neue",
      "tone": "bold, cinematic, personal brand, coach, creator"
    },
    "meta": {
      "tags": [
        "personal_intro",
        "bebas_neue",
        "ultra_large_display",
        "dark_text_light_bg",
        "name_and_title",
        "creator_intro",
        "coach_intro",
        "brand_intro",
        "top_positioned",
        "bold_intro",
        "placeholder_text"
      ],
      "mood": [
        "bold",
        "authoritative",
        "confident"
      ],
      "palette": "any",
      "scenePosition": "hook",
      "motionAxis": "vertical",
      "contentNiches": [
        "general",
        "education",
        "sports"
      ],
      "visualLanguage": "social_viral",
      "difficulty": "beginner"
    },
    "annotations": {
      "whatMakesItGood": [
        "250px Bebas Neue \u2014 extreme scale turns a name into a visual event, not just a label",
        "Top-positioned (y:52) \u2014 name anchors the top third, leaves room for subtitle and body below",
        "Bebas Neue 400 weight \u2014 despite the size, 400 weight is Bebas Neue's only weight; it IS bold",
        "letterSpacing:-2 at this size \u2014 tightened tracking makes ultra-large display text feel intentional",
        "Placeholder text '<Name> <Title>' \u2014 signals remixability; this is a template, not a finished piece"
      ],
      "keyDecisions": [
        "Single font (Bebas Neue only) \u2014 when the font IS the statement, mixing pairs dilutes impact",
        "Dark text implied on light bg \u2014 creator intros work on both; dark-on-light feels more personal",
        "Top third placement \u2014 bottom-third intros look cinematic; top-third looks direct and personal",
        "No animation defined \u2014 caller should add slam_down or depth_charge based on energy level needed"
      ],
      "remixHints": [
        "Add slam_down animation: startMs:0, durationMs:450, easing:'bounceOut' for hype/sports energy",
        "Dark bg version: bg='#0a0a0f', text='#ffffff', add textEffect:'shadow_stack' in gold",
        "Add subtitle: second element Outfit 52px with name/role, momentum_carry at 300ms",
        "Luxury coach: swap Bebas Neue for Cormorant Garamond 200px, drift_in 1200ms, gold textEffect"
      ]
    },
    "elements": [
      {
        "id": "el_name",
        "type": "text",
        "semanticRole": "hook_title",
        "semanticLayer": "typography",
        "layout": {
          "x": 60,
          "y": 200,
          "width": 960,
          "height": 300,
          "zIndex": 5,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 250,
          "fontFamily": "Bebas Neue",
          "fontWeight": 400,
          "textAlign": "center",
          "color": "#111111",
          "letterSpacing": -2
        },
        "animations": [],
        "content": {
          "text": "JOHN DOE"
        }
      },
      {
        "id": "el_title",
        "type": "text",
        "semanticRole": "hook_subtitle",
        "semanticLayer": "typography",
        "layout": {
          "x": 92,
          "y": 520,
          "width": 896,
          "height": 100,
          "zIndex": 6,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 56,
          "fontFamily": "Bebas Neue",
          "fontWeight": 400,
          "textAlign": "center",
          "color": "#ef4444"
        },
        "animations": [],
        "content": {
          "text": "CREATIVE DIRECTOR"
        }
      }
    ]
  },
  {
    "id": "personal_introduction_bottom_1780218998831",
    "kind": "typography",
    "label": "Personal Intro \u2014 Bebas Lower Third",
    "description": "Lower-third name card designed for cinematic overlays, bracketing display text in the lower 40% of the viewport.",
    "fontPair": {
      "headline": "Bebas Neue",
      "body": "Inter",
      "tone": "bold, sports, coach, creator, fitness trainer"
    },
    "meta": {
      "tags": [
        "personal_intro",
        "bottom_positioned",
        "bebas_neue",
        "bold_intro",
        "name_lower_third",
        "coach_intro",
        "creator_intro",
        "cinematic_lower_third",
        "dark_text",
        "title_card"
      ],
      "mood": [
        "powerful",
        "cinematic",
        "confident"
      ],
      "palette": "any",
      "scenePosition": "hook",
      "motionAxis": "vertical",
      "contentNiches": [
        "sports",
        "general",
        "education"
      ],
      "visualLanguage": "cinematic_story",
      "difficulty": "beginner"
    },
    "annotations": {
      "whatMakesItGood": [
        "Lower-third placement \u2014 reads cinematically like a broadcast chyron; top-half can have image",
        "Large display font in bottom 40% \u2014 leaves natural space for a background image or video above",
        "Bold intro with name + title \u2014 the two-line hierarchy (who / what they do) is universally understood",
        "Bebas Neue for both lines \u2014 weight consistency, but size contrast creates the hierarchy"
      ],
      "keyDecisions": [
        "Bottom over top \u2014 bottom placement signals 'cinematic', implying image/video content above",
        "Matched font for both lines \u2014 use size to create hierarchy, not font switching",
        "Dark text \u2014 assumes a light or image background; for dark bg swap to white with textShadow"
      ],
      "remixHints": [
        "Pair with image: add hero_image element (z2) with vignette filter behind the text",
        "Add depth_charge on headline, momentum_carry on title \u2014 staggered arrival reads cinematic",
        "Finance version: 'JOHN DOE / Portfolio Manager \u00b7 Goldman Sachs' \u2014 same structure, new context",
        "Add thin gold bar above the name (draw_in 80ms) to separate from image layer"
      ]
    },
    "elements": [
      {
        "id": "el_lower_name",
        "type": "text",
        "semanticRole": "hook_title",
        "semanticLayer": "typography",
        "layout": {
          "x": 60,
          "y": 1400,
          "width": 960,
          "height": 240,
          "zIndex": 5,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 200,
          "fontFamily": "Bebas Neue",
          "fontWeight": 400,
          "textAlign": "center",
          "color": "#111111"
        },
        "animations": [],
        "content": {
          "text": "COACH CARTER"
        }
      },
      {
        "id": "el_lower_title",
        "type": "text",
        "semanticRole": "hook_subtitle",
        "semanticLayer": "typography",
        "layout": {
          "x": 92,
          "y": 1660,
          "width": 896,
          "height": 100,
          "zIndex": 6,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 48,
          "fontFamily": "Inter",
          "fontWeight": 600,
          "textAlign": "center",
          "color": "#374151"
        },
        "animations": [],
        "content": {
          "text": "DISCIPLINE \u00b7 MINDSET \u00b7 STRENGTH"
        }
      }
    ]
  },
  {
    "id": "welcome_message_1780219147842",
    "kind": "typography",
    "label": "Welcome Message \u2014 Destination Reveal",
    "description": "Greeting template structured to build anticipation, bracketing a smaller setup label with a massive reveal headline.",
    "fontPair": {
      "headline": "Display font",
      "body": "Body font",
      "tone": "welcoming, travel, destination, event, hospitality"
    },
    "meta": {
      "tags": [
        "welcome_message",
        "destination_intro",
        "travel_hook",
        "event_opener",
        "hospitality",
        "location_title",
        "place_name",
        "customizable_destination",
        "greeting"
      ],
      "mood": [
        "warm",
        "inviting",
        "excited"
      ],
      "palette": "any",
      "scenePosition": "hook",
      "motionAxis": "vertical",
      "contentNiches": [
        "travel",
        "general"
      ],
      "visualLanguage": "minimal_clean",
      "difficulty": "beginner"
    },
    "annotations": {
      "whatMakesItGood": [
        "Universal template: 'Welcome to [X]' works for destinations, events, channels, brands",
        "The last word / phrase is the variable \u2014 everything before it sets up the reveal",
        "Works as a channel intro, destination reveal, event opener, or brand welcome"
      ],
      "keyDecisions": [
        "Keep the greeting word small \u2014 'Welcome to' is a setup, not the star",
        "Destination name should be the largest, most animated element"
      ],
      "remixHints": [
        "Travel: bg is destination photo (vignette 0.6), 'WELCOME TO' small at top, 'THAILAND' huge slam_down",
        "Channel intro: 'WELCOME TO / [Channel Name]' with brand colors, bounce_letters on the name",
        "Event: 'WELCOME TO / SUMMIT 2025' \u2014 Playfair Display, dark luxury bg, gold textEffect",
        "Sports: 'WELCOME TO / THE GRIND' \u2014 Anton, dark bg, red accent, stamp entrance"
      ]
    },
    "elements": [
      {
        "id": "el_welcome_lbl",
        "type": "text",
        "semanticRole": "section_title",
        "semanticLayer": "typography",
        "layout": {
          "x": 92,
          "y": 740,
          "width": 896,
          "height": 72,
          "zIndex": 5,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 44,
          "fontFamily": "Outfit",
          "fontWeight": 500,
          "textAlign": "center",
          "color": "#4b5563",
          "letterSpacing": 8,
          "textTransform": "uppercase"
        },
        "animations": [],
        "content": {
          "text": "WELCOME TO"
        }
      },
      {
        "id": "el_welcome_hero",
        "type": "text",
        "semanticRole": "hook_title",
        "semanticLayer": "typography",
        "layout": {
          "x": 40,
          "y": 840,
          "width": 1000,
          "height": 300,
          "zIndex": 5,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 140,
          "fontFamily": "Playfair Display",
          "fontWeight": 900,
          "textAlign": "center",
          "color": "#1e3a8a"
        },
        "animations": [],
        "content": {
          "text": "PARIS"
        }
      }
    ]
  },
  {
    "id": "announce_big_1780219843871",
    "kind": "typography",
    "label": "Announcement \u2014 Urgent Teaser",
    "description": "Hype-driven announcement template utilizing Anton in all caps. Fits product launches, breaking news, or teasers.",
    "fontPair": {
      "headline": "Anton",
      "body": "DM Sans",
      "tone": "dramatic, announcement, breaking news, reveal, hype"
    },
    "meta": {
      "tags": [
        "announcement",
        "dramatic_reveal",
        "big_news",
        "breaking_news",
        "countdown_teaser",
        "stamp",
        "slam_down",
        "uppercase",
        "dark_bg",
        "hype",
        "product_launch",
        "event_announcement"
      ],
      "mood": [
        "dramatic",
        "urgent",
        "thrilling",
        "anticipatory"
      ],
      "palette": "dark",
      "scenePosition": "hook",
      "motionAxis": "scale",
      "contentNiches": [
        "general",
        "tech",
        "sports"
      ],
      "visualLanguage": "social_viral",
      "difficulty": "beginner"
    },
    "annotations": {
      "whatMakesItGood": [
        "Announcement scenes live or die by entrance energy \u2014 slam_down or depth_charge is mandatory",
        "ALL CAPS for announcement text \u2014 capitals signal importance, create urgency",
        "Dark background makes any accent color pop \u2014 announcements need maximum contrast",
        "Short, punchy text \u2014 'BIG ANNOUNCEMENT' or 'SOMETHING'S COMING' \u2014 mystery drives engagement"
      ],
      "keyDecisions": [
        "Dark bg over light \u2014 announcements need drama; light backgrounds neutralize urgency",
        "slam_down with bounceOut \u2014 the bounce is the 'ta-da' moment of the announcement landing",
        "Add atmospheric glow orb \u2014 announcement scenes need ambient energy, not a sterile black background"
      ],
      "remixHints": [
        "Product launch: 'NEW DROP / [Product] / COMING [DATE]' \u2014 add countdown element",
        "Sports event: 'THE GAME / IS / ON' \u2014 Anton, red/black, grain_surge filter effect",
        "Finance reveal: '[X]% RETURNS / THIS YEAR' \u2014 gold on dark, depth_charge entrance",
        "Album/content drop: add glitch_in animation, chromatic_pulse for music/entertainment energy"
      ]
    },
    "elements": [
      {
        "id": "el_ann_title",
        "type": "text",
        "semanticRole": "hook_title",
        "semanticLayer": "typography",
        "layout": {
          "x": 40,
          "y": 800,
          "width": 1000,
          "height": 300,
          "zIndex": 5,
          "rotation": 0,
          "scale": 1,
          "opacity": 1
        },
        "style": {
          "fontSize": 120,
          "fontFamily": "Anton",
          "fontWeight": 400,
          "textAlign": "center",
          "color": "#ffffff",
          "textTransform": "uppercase"
        },
        "animations": [],
        "content": {
          "text": "SOMETHING BIG IS COMING"
        }
      }
    ]
  }
];

const TYPO_CONFIGS = [
  {
    "id": "typo_bebas_sports_001",
    "headlineFont": "Bebas Neue",
    "bodyFont": "DM Sans",
    "tone": "athletic, sports hook, high energy",
    "label": "Championship Match",
    "headline": "No Excuses Just Results",
    "subtitle": "The grind never stops. Push past the limits.",
    "body": "Join the elite athletic program and transform your speed.",
    "caption": "Class starts 5am Monday.",
    "niches": [
      "sports"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#EF4444",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "labelAnimation": "stomp",
    "bodyAnimation": "rubber_band",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "rubber_band",
    "tags": [
      "bebas_neue",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "sports"
    ]
  },
  {
    "id": "typo_bebas_finance_001",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "tone": "finance breaking news, high urgency",
    "label": "Market Breakdown",
    "headline": "Inflation Rate Spikes Again",
    "subtitle": "Fed prepares urgent interest rate adjustments.",
    "body": "Protect your assets with capital relocation immediately.",
    "caption": "Full analysis report available now.",
    "niches": [
      "finance"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#F59E0B",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "titleRemix": "glitch_in",
    "tags": [
      "bebas_neue",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "finance"
    ]
  },
  {
    "id": "typo_bebas_motivation_001",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Nunito",
    "tone": "motivation, self-help, raw determination",
    "label": "Daily Mindset Shift",
    "headline": "Your Excuses Are Lies",
    "subtitle": "Stop waiting for the perfect moment. Create it.",
    "body": "Discipline beats motivation every single time.",
    "caption": "Read that again.",
    "niches": [
      "wellness"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#A78BFA",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "bebas_neue",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_bebas_genz_001",
    "headlineFont": "Bebas Neue",
    "bodyFont": "DM Sans",
    "tone": "Gen Z viral hook, high-tempo explainer",
    "label": "Side Hustle Rules",
    "headline": "Quit Your 9 to 5 Early",
    "subtitle": "The exact roadmap to financial freedom in 2026.",
    "body": "No complex coding. No huge starting budget.",
    "caption": "Link in bio to join class.",
    "niches": [
      "general"
    ],
    "palette": "light",
    "visualLanguage": "social_viral",
    "accentColor": "#10B981",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "bebas_neue",
      "typo",
      "social_viral"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_playfair_luxury_001",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "tone": "luxury editorial, premium brand narrative",
    "label": "L'Art de Vivre",
    "headline": "Crafted For Eternity",
    "subtitle": "A testament to master watchmaking and Swiss detail.",
    "body": "Every watch contains 342 individually polished gears.",
    "caption": "Discover the heritage collection.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "playfair_display",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_playfair_travel_001",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "tone": "slow travel, mindful hospitality",
    "label": "Amalfi Escape",
    "headline": "Where Time Stands Still",
    "subtitle": "Discover hidden cliffside villas and quiet mornings.",
    "body": "Italian hospitality meets historic Renaissance design.",
    "caption": "Villas booking for Autumn.",
    "niches": [
      "travel"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "playfair_display",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "travel"
    ]
  },
  {
    "id": "typo_playfair_fashion_001",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "tone": "haute couture, editorial lookbook",
    "label": "Vogue Showcase",
    "headline": "The Poetry of Tailoring",
    "subtitle": "Unveiling the Autumn collection: silhouettes of wool & silk.",
    "body": "Minimal shapes defined by architectural draping.",
    "caption": "Exhibition details inside.",
    "niches": [
      "luxury"
    ],
    "palette": "dark",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#E7D3B1",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "playfair_display",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_playfair_events_001",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "tone": "premium events, formal invitation",
    "label": "The Annual Gala",
    "headline": "A Night of Aspiration",
    "subtitle": "Supporting future design talent and creative grants.",
    "body": "Gala reception starting at 7pm in the main hall.",
    "caption": "Black tie strictly required.",
    "niches": [
      "general"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "playfair_display",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_space_saas_001",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "tone": "SaaS startup, hyper-modern utility",
    "label": "API Deployment",
    "headline": "Instant Global Scale",
    "subtitle": "Deploy code to 47 edge regions in under 2 seconds.",
    "body": "Automatic failover. Real-time logging. No config.",
    "caption": "Deploy free in one click.",
    "niches": [
      "tech"
    ],
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "accentColor": "#60A5FA",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "bodyAnimation": "typewriter",
    "captionAnimation": "pulse",
    "motionAxis": "mixed",
    "titleRemix": "neon_flicker",
    "tags": [
      "space_grotesk",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "tech"
    ]
  },
  {
    "id": "typo_space_crypto_001",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "tone": "crypto, web3 tech, security protocol",
    "label": "Decentralized Trust",
    "headline": "Immutable Ledger Tech",
    "subtitle": "Securing digital transactions with zero-knowledge keys.",
    "body": "Completely permissionless validator nodes global grid.",
    "caption": "Read whitepaper v2.",
    "niches": [
      "tech"
    ],
    "palette": "dark",
    "visualLanguage": "hyper_modern",
    "accentColor": "#A78BFA",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "bodyAnimation": "typewriter",
    "captionAnimation": "pulse",
    "motionAxis": "mixed",
    "titleRemix": "neon_flicker",
    "tags": [
      "space_grotesk",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "tech"
    ]
  },
  {
    "id": "typo_space_data_001",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "tone": "data analytics, database engineering",
    "label": "Query Optimizer",
    "headline": "Sub-Millisecond Joins",
    "subtitle": "Execute complex graph queries with smart caching layers.",
    "body": "Handles 4 million relational rows per CPU thread.",
    "caption": "Explore database stats.",
    "niches": [
      "tech"
    ],
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "accentColor": "#F0ABFC",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "bodyAnimation": "typewriter",
    "captionAnimation": "pulse",
    "motionAxis": "mixed",
    "titleRemix": "neon_flicker",
    "tags": [
      "space_grotesk",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "tech"
    ]
  },
  {
    "id": "typo_poppins_food_001",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "tone": "friendly consumer, food recipe, kitchen tip",
    "label": "Healthy Dinners",
    "headline": "Creamy Avocado Salad",
    "subtitle": "Packed with healthy fats and ready in 5 minutes flat.",
    "body": "Simply blend avocados, lime, coriander, and olive oil.",
    "caption": "Full list of ingredients below.",
    "niches": [
      "food"
    ],
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "accentColor": "#10B981",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "poppins",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "food"
    ]
  },
  {
    "id": "typo_poppins_wellness_001",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "tone": "mindful living, wellness habit, calm advice",
    "label": "Mindful Morning",
    "headline": "Hydrate Before Coffee",
    "subtitle": "500ml of water wakes up your metabolism instantly.",
    "body": "Rehydrates brain cells, boosting focus within 20 mins.",
    "caption": "Start this habit tomorrow.",
    "niches": [
      "wellness"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#8B5CF6",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "poppins",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_poppins_edu_001",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "tone": "education tip, micro-learning explainer",
    "label": "Study Hacks",
    "headline": "The Active Recall Method",
    "subtitle": "Testing yourself boosts retention by 150% over reading.",
    "body": "Instead of re-reading notes, write down quick questions.",
    "caption": "Save this tip for exams.",
    "niches": [
      "education"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#3B82F6",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "poppins",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "education"
    ]
  },
  {
    "id": "typo_anton_news_001",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "tone": "breaking news, opinion piece, urgent reporting",
    "label": "Global Trade Shock",
    "headline": "Supply Chains Halted",
    "subtitle": "Major ports blocked as dockworkers union strikes.",
    "body": "Shipping delays expected to compound retail stock deficits.",
    "caption": "Breaking coverage live updates.",
    "niches": [
      "general"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#EF4444",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "titleRemix": "glitch_in",
    "tags": [
      "anton",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_anton_sports_001",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "tone": "intense workout, athletic motivation",
    "label": "Ultimate Conditioning",
    "headline": "Outwork the Competition",
    "subtitle": "Champion mindset means embracing the physical struggle.",
    "body": "High-intensity circuits to burn fat and build stamina.",
    "caption": "Full routine inside.",
    "niches": [
      "sports"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#EF4444",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "labelAnimation": "stomp",
    "bodyAnimation": "rubber_band",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "rubber_band",
    "tags": [
      "anton",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "sports"
    ]
  },
  {
    "id": "typo_anton_viral_001",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "tone": "viral opinion, hot take, comment bait",
    "label": "Unpopular Truth",
    "headline": "College Degrees Are Dead",
    "subtitle": "90% of technical skills are learned outside classrooms.",
    "body": "Portfolio projects and real clients beat static grades.",
    "caption": "Agree or disagree? Comment below.",
    "niches": [
      "general"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#F59E0B",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "anton",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_montserrat_corp_001",
    "headlineFont": "Montserrat",
    "bodyFont": "Open Sans",
    "tone": "corporate advisory, business presentation",
    "label": "Q4 Financial Review",
    "headline": "Sustainable Profit Growth",
    "subtitle": "Quarterly earnings exceed forecast targets by 14.2%.",
    "body": "Driven by cloud division expansion and hardware sales.",
    "caption": "Shareholder webcast starts at 2pm.",
    "niches": [
      "general"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#1E3A8A",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "montserrat",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_montserrat_health_001",
    "headlineFont": "Montserrat",
    "bodyFont": "Open Sans",
    "tone": "medical wellness, healthcare report",
    "label": "Sleep Diagnostics",
    "headline": "Deep Sleep Restores Brain",
    "subtitle": "Targeting 2 hours of deep REM sleep repairs neural tissue.",
    "body": "Boosts memory consolidation and cleans cellular debris.",
    "caption": "Consult your sleep specialist.",
    "niches": [
      "wellness"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#059669",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "montserrat",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_montserrat_charity_001",
    "headlineFont": "Montserrat",
    "bodyFont": "Open Sans",
    "tone": "nonprofit campaign, clean callout",
    "label": "Clean Water Initiative",
    "headline": "Safe Water For Every Child",
    "subtitle": "Installing solar filtration wells in rural communities.",
    "body": "Providing reliable sanitary water to 5,000+ families.",
    "caption": "Donate to the campaign.",
    "niches": [
      "general"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#0284C7",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "montserrat",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_bodoni_fashion_001",
    "headlineFont": "Bodoni Moda",
    "bodyFont": "Lato",
    "tone": "luxury fashion, editorial lookbook styling",
    "label": "The Summer Edit",
    "headline": "Linen and Silk Silhouettes",
    "subtitle": "Bespoke neutral tailoring designed for coastal warmth.",
    "body": "Flowing cuts crafted with sustainable raw fabrics.",
    "caption": "Exhibition open daily.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "bodoni_moda",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_bodoni_beauty_001",
    "headlineFont": "Bodoni Moda",
    "bodyFont": "Lato",
    "tone": "skincare, premium cosmetics, organic beauty",
    "label": "Pure Skincare",
    "headline": "Botanical Hydration Mist",
    "subtitle": "Nourish dry skin with active rosewater and plant extracts.",
    "body": "Cruelty-free, vegan formulation crafted in small batches.",
    "caption": "Shop the skin collection.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#D946EF",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "bodoni_moda",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_bodoni_arch_001",
    "headlineFont": "Bodoni Moda",
    "bodyFont": "Lato",
    "tone": "architecture, luxury home design, minimalist interior",
    "label": "Brutalist Spaces",
    "headline": "The Beauty of Raw Concrete",
    "subtitle": "Exploring Japanese minimalist homes and structural stone.",
    "body": "Monolithic walls frame clean shadow lines and quiet courtyards.",
    "caption": "Monograph v4 now shipping.",
    "niches": [
      "luxury"
    ],
    "palette": "dark",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "bodoni_moda",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_inter_minimal_001",
    "headlineFont": "Inter",
    "bodyFont": "Inter",
    "tone": "minimalist SaaS, developer utility tool",
    "label": "Deployment Log",
    "headline": "Zero Config Pipelines",
    "subtitle": "Commit code and watch global servers rebuild immediately.",
    "body": "No YAML files. No server provisioning. Just push.",
    "caption": "Explore documentation.",
    "niches": [
      "tech"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#0F172A",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "bodyAnimation": "typewriter",
    "captionAnimation": "pulse",
    "motionAxis": "mixed",
    "titleRemix": "neon_flicker",
    "tags": [
      "inter",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "tech"
    ]
  },
  {
    "id": "typo_inter_product_001",
    "headlineFont": "Inter",
    "bodyFont": "Inter",
    "tone": "clean product highlight, hardware launch",
    "label": "Studio Microphone",
    "headline": "Pure Studio Condenser",
    "subtitle": "Warm vocal response matching vintage tube signals.",
    "body": "Low-noise electronics capture transient details cleanly.",
    "caption": "Reserve the studio series.",
    "niches": [
      "general"
    ],
    "palette": "dark",
    "visualLanguage": "minimal_clean",
    "accentColor": "#F9FAFB",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "inter",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_inter_dev_001",
    "headlineFont": "Inter",
    "bodyFont": "Inter",
    "tone": "terminal tool presentation, minimalist tech",
    "label": "Version Control",
    "headline": "Blazing Fast Git Logs",
    "subtitle": "Review multi-branch project histories in the terminal.",
    "body": "Handles massive repositories with zero UI lag.",
    "caption": "Install via Homebrew.",
    "niches": [
      "tech"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#4F46E5",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "bodyAnimation": "typewriter",
    "captionAnimation": "pulse",
    "motionAxis": "mixed",
    "titleRemix": "neon_flicker",
    "tags": [
      "inter",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "tech"
    ]
  },
  {
    "id": "typo_oswald_travel_001",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "tone": "adventure travel, extreme destinations",
    "label": "Iceland Traverse",
    "headline": "Crossing Glacial Fields",
    "subtitle": "A grueling winter expedition across volcanic mountains.",
    "body": "Facing 60mph winds and absolute sub-zero exposure.",
    "caption": "Read the adventure journal.",
    "niches": [
      "travel"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#0EA5E9",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "oswald",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "travel"
    ]
  },
  {
    "id": "typo_oswald_sports_001",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "tone": "endurance sports, triathlete motivation",
    "label": "Iron Endurance",
    "headline": "Pain is the Catalyst",
    "subtitle": "Championships are forged in early cold winter runs.",
    "body": "Pushing metabolic efficiency to the absolute edge.",
    "caption": "Explore training programs.",
    "niches": [
      "sports"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#F43F5E",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "labelAnimation": "stomp",
    "bodyAnimation": "rubber_band",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "rubber_band",
    "tags": [
      "oswald",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "sports"
    ]
  },
  {
    "id": "typo_oswald_adventure_001",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "tone": "mountaineering, trail exploration",
    "label": "Summit Ascent",
    "headline": "Life Above the Clouds",
    "subtitle": "Alpine navigation tips for thin altitude climbing.",
    "body": "Essential gear, pack weight optimization, and cold survival.",
    "caption": "Download safety checklist.",
    "niches": [
      "travel"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#EAB308",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "oswald",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "travel"
    ]
  },
  {
    "id": "typo_fraunces_food_001",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "tone": "organic food, sustainability narrative",
    "label": "Seasonal Kitchen",
    "headline": "Grown in Clean Soil",
    "subtitle": "Organic produce harvested from local cooperative farms.",
    "body": "Free of synthetics, pesticides, and artificial soil feed.",
    "caption": "Shop fresh harvest boxes.",
    "niches": [
      "food"
    ],
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "accentColor": "#B45309",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "fraunces",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "food"
    ]
  },
  {
    "id": "typo_fraunces_nature_001",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "tone": "forest conservation, eco-friendly lifestyle",
    "label": "Urban Reforest",
    "headline": "Planting Native Canopy",
    "subtitle": "Restoring natural woodland plants to protect city soils.",
    "body": "Improves stormwater management and urban cooling zones.",
    "caption": "Join local planting team.",
    "niches": [
      "wellness"
    ],
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "accentColor": "#15803D",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "fraunces",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_fraunces_slow_001",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "tone": "slow living, simple home tips",
    "label": "Slow Living Home",
    "headline": "Living with Less Stuff",
    "subtitle": "Embracing minimalist rooms for better mental clarity.",
    "body": "Simple decluttering guides to design a peaceful house.",
    "caption": "Get the slow home book.",
    "niches": [
      "wellness"
    ],
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "accentColor": "#854D0E",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "fraunces",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_cormorant_events_001",
    "headlineFont": "Cormorant Garamond",
    "bodyFont": "Nunito",
    "tone": "weddings, boutique events, luxury invitations",
    "label": "The Manor House",
    "headline": "An Evening of Romance",
    "subtitle": "Celebrating the union of creative partners in Florence.",
    "body": "Dinner reception and music under the olive groves.",
    "caption": "RSVP by July 15th.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "cormorant_garamond",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_cormorant_hotel_001",
    "headlineFont": "Cormorant Garamond",
    "bodyFont": "Nunito",
    "tone": "boutique hotel, premium resort, slow retreat",
    "label": "Palazzo Riviera",
    "headline": "Classic Italian Luxury",
    "subtitle": "Private stone terraces overlooking the Mediterranean sea.",
    "body": "Curated wine collections and traditional seaside dining.",
    "caption": "Explore available suites.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "cormorant_garamond",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_cormorant_art_001",
    "headlineFont": "Cormorant Garamond",
    "bodyFont": "Nunito",
    "tone": "art gallery exhibition, classic museum feel",
    "label": "Renaissance Revival",
    "headline": "The Mastery of Light",
    "subtitle": "Exploring oil paint techniques from the Florentine school.",
    "body": "A curated study of master portraits and architectural sketches.",
    "caption": "Exhibition starts October 2nd.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#B45309",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "cormorant_garamond",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_syne_creative_001",
    "headlineFont": "Syne",
    "bodyFont": "Geist",
    "tone": "design agency, modern creative portfolio",
    "label": "Brand Lab",
    "headline": "We Build Loud Identities",
    "subtitle": "Disruptive visuals for startups aiming to change rules.",
    "body": "No boring layouts. No standard palettes. Bold design.",
    "caption": "View selected projects.",
    "niches": [
      "general"
    ],
    "palette": "vivid",
    "visualLanguage": "hyper_modern",
    "accentColor": "#EC4899",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "syne",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "vivid",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_syne_agency_001",
    "headlineFont": "Syne",
    "bodyFont": "Geist",
    "tone": "art direction, creative studio",
    "label": "Visual Studio",
    "headline": "Ideas That Stiff The Status Quo",
    "subtitle": "Conceptual photography, motion design, and styling.",
    "body": "Collaborating with brave clients to invent premium campaigns.",
    "caption": "Say hello to the team.",
    "niches": [
      "general"
    ],
    "palette": "dark",
    "visualLanguage": "hyper_modern",
    "accentColor": "#F43F5E",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "syne",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_syne_art_001",
    "headlineFont": "Syne",
    "bodyFont": "Geist",
    "tone": "avant-garde design, creative direction",
    "label": "Design Digest",
    "headline": "Unapologetically Weird",
    "subtitle": "A print zine exploring experimental layout and fonts.",
    "body": "Issue #8 out now. 120 pages of raw creative work.",
    "caption": "Order print copy.",
    "niches": [
      "general"
    ],
    "palette": "vivid",
    "visualLanguage": "hyper_modern",
    "accentColor": "#EC4899",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "syne",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "vivid",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  },
  {
    "id": "typo_bebas_travel_002",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Raleway",
    "tone": "extreme outdoor travel, survival guides",
    "label": "Glacial Crossing",
    "headline": "Cold Winds Hard Ice",
    "subtitle": "Surviving sub-zero whiteouts in the Icelandic active highlands.",
    "body": "Essential navigation tips and layered winter packing lists.",
    "caption": "Survival logs book inside.",
    "niches": [
      "travel"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#0EA5E9",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "bebas_neue",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "travel"
    ]
  },
  {
    "id": "typo_playfair_beauty_002",
    "headlineFont": "Playfair Display",
    "bodyFont": "Lato",
    "tone": "luxury organic skincare, premium cosmetics",
    "label": "L'Eau de Rose",
    "headline": "Nourish Your Natural Skin",
    "subtitle": "Hydrating face mists distilled from pure Bulgarian rosewater.",
    "body": "Zero synthetics, raw botanical extracts, small-batch press.",
    "caption": "Shop the garden edit.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "playfair_display",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_space_edu_002",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Manrope",
    "tone": "educational technology, web development tip",
    "label": "CSS Layout Hack",
    "headline": "Centering Without Grid",
    "subtitle": "How a simple block margins override can align dynamic elements.",
    "body": "Saves up to 15 lines of raw styling overrides.",
    "caption": "Save this tip for dev.",
    "niches": [
      "education"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#3B82F6",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "space_grotesk",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "education"
    ]
  },
  {
    "id": "typo_poppins_fitness_002",
    "headlineFont": "Poppins",
    "bodyFont": "Inter",
    "tone": "friendly health coaching, cardiovascular tips",
    "label": "Active Cardio V2",
    "headline": "Boost Vo2 Max Fast",
    "subtitle": "High-intensity hill sprint circuits done twice per week.",
    "body": "Triggers rapid metabolic changes and heart rate adaptation.",
    "caption": "Explore cardio schedules.",
    "niches": [
      "wellness"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#EF4444",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "poppins",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_anton_finance_002",
    "headlineFont": "Anton",
    "bodyFont": "DM Sans",
    "tone": "urgent stock trading news, financial bulletin",
    "label": "Breaking Stock Shock",
    "headline": "Market Indices Crash",
    "subtitle": "Heavy selling pressure triggers automated safety blocks.",
    "body": "Brokers halt retail execution as tech index drops 4%.",
    "caption": "Coverage starts 9:30am.",
    "niches": [
      "finance"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#EF4444",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "titleRemix": "glitch_in",
    "tags": [
      "anton",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "finance"
    ]
  },
  {
    "id": "typo_montserrat_wellness_002",
    "headlineFont": "Montserrat",
    "bodyFont": "Nunito",
    "tone": "mindful wellness practices, breath exercises",
    "label": "Stress Relief V1",
    "headline": "Lower Cortisol in 3 Mins",
    "subtitle": "Double inhale followed by slow extended mouth exhale.",
    "body": "Instantly activates your vagus nerve and slows heart rate.",
    "caption": "Practice this baseline guide.",
    "niches": [
      "wellness"
    ],
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "accentColor": "#10B981",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "swoop_in",
    "tags": [
      "montserrat",
      "typo",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "wellness"
    ]
  },
  {
    "id": "typo_bodoni_luxury_002",
    "headlineFont": "Bodoni Moda",
    "bodyFont": "Outfit",
    "tone": "ultra-luxury yacht charter, editorial invite",
    "label": "The Amalfi Voyage",
    "headline": "Sailing Italian Waters",
    "subtitle": "Bespoke mediterranean cruises featuring private chef dining.",
    "body": "Classic wood yachts sailing the quiet bays of Positano.",
    "caption": "Request private charter info.",
    "niches": [
      "luxury"
    ],
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "accentColor": "#C4A882",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "bodyAnimation": "typewriter_word",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "titleRemix": "blur_in",
    "tags": [
      "bodoni_moda",
      "typo",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "luxury"
    ]
  },
  {
    "id": "typo_inter_crypto_002",
    "headlineFont": "Inter",
    "bodyFont": "Geist",
    "tone": "crypto hardware launch, developer security",
    "label": "Offline Keys",
    "headline": "True Air-Gapped Trust",
    "subtitle": "Sign web3 network transactions via zero-contact QR codes.",
    "body": "Never connects to USB, bluetooth, or network signals.",
    "caption": "Reserve the hardware device.",
    "niches": [
      "tech"
    ],
    "palette": "dark",
    "visualLanguage": "hyper_modern",
    "accentColor": "#A78BFA",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "bodyAnimation": "typewriter",
    "captionAnimation": "pulse",
    "motionAxis": "mixed",
    "titleRemix": "neon_flicker",
    "tags": [
      "inter",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "tech"
    ]
  },
  {
    "id": "typo_oswald_sports_002",
    "headlineFont": "Oswald",
    "bodyFont": "DM Sans",
    "tone": "endurance running motivation, marathon coach",
    "label": "Run Baseline v2",
    "headline": "Distance Beats Velocity",
    "subtitle": "Building your aerobic base demands low-intensity long runs.",
    "body": "Keep heart rate under 140bpm for 90% of your training volume.",
    "caption": "Get training calendar guide.",
    "niches": [
      "sports"
    ],
    "palette": "dark",
    "visualLanguage": "social_viral",
    "accentColor": "#F59E0B",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "labelAnimation": "stomp",
    "bodyAnimation": "rubber_band",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "titleRemix": "rubber_band",
    "tags": [
      "oswald",
      "typo",
      "social_viral"
    ],
    "mood": [
      "dark",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "sports"
    ]
  },
  {
    "id": "typo_syne_viral_002",
    "headlineFont": "Syne",
    "bodyFont": "Outfit",
    "tone": "creative marketing agency, social campaign",
    "label": "Attention Rules",
    "headline": "Stop Making Boring Ads",
    "subtitle": "Using standard template designs will destroy conversion rates.",
    "body": "Vibrant color tension and weird font scale wins focus.",
    "caption": "Read marketing analysis.",
    "niches": [
      "general"
    ],
    "palette": "vivid",
    "visualLanguage": "hyper_modern",
    "accentColor": "#EC4899",
    "titleAnimation": "tumble_in",
    "subtitleAnimation": "bounce_letters",
    "labelAnimation": "kinetic_slide",
    "bodyAnimation": "fadeIn",
    "captionAnimation": "tada",
    "motionAxis": "mixed",
    "titleRemix": "flip_in_x",
    "tags": [
      "syne",
      "typo",
      "hyper_modern"
    ],
    "mood": [
      "vivid",
      "creative"
    ],
    "scenePosition": "hook",
    "contentNiches": [
      "general"
    ]
  }
];

const SCENE_CONFIGS = [
  {
    "id": "scene_cinematic_tech_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "tech",
    "title": "Security At Absolute Scale",
    "subtitle": "Safeguarding client databases with military encryption.",
    "caption": "Zero leaks. Zero vulnerability.",
    "palette": "cool",
    "visualLanguage": "cinematic_story",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "imageKeyword": "abstract_shield_tech",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "char_blur_in",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "cinematic_hero",
      "tech",
      "cinematic_story"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_wellness_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "wellness",
    "title": "Breathe In Slow Harmony",
    "subtitle": "Reconnect your brain with morning meditation practices.",
    "caption": "Daily calm classes inside.",
    "palette": "light",
    "visualLanguage": "cinematic_story",
    "bgColor": "#F5F5F7",
    "bgColor2": "#E8EAF6",
    "accentColor": "#10B981",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "imageKeyword": "meditation_calm_sunrise",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "cinematic_hero",
      "wellness",
      "cinematic_story"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_sports_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "sports",
    "title": "Pain Is Just Fuel",
    "subtitle": "Push metabolic efficiency to the absolute peak.",
    "caption": "New training routine drops monday.",
    "palette": "dark",
    "visualLanguage": "cinematic_story",
    "bgColor": "#0B0B0C",
    "bgColor2": "#1A0909",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "imageKeyword": "athlete_running_dark_rain",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "captionAnimation": "stomp",
    "motionAxis": "vertical",
    "tags": [
      "cinematic_hero",
      "sports",
      "cinematic_story"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_travel_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "travel",
    "title": "Into The Glacial Wild",
    "subtitle": "Traversing Icelandic active volcanoes in deep winter.",
    "caption": "Full path map inside report.",
    "palette": "warm",
    "visualLanguage": "cinematic_story",
    "bgColor": "#111111",
    "bgColor2": "#2C1E12",
    "accentColor": "#E65100",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "imageKeyword": "hiker_on_glacier_summit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "tags": [
      "cinematic_hero",
      "travel",
      "cinematic_story"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_luxury_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "luxury",
    "title": "Swiss Heritage Precision",
    "subtitle": "Individually assembled Swiss gears built for life.",
    "caption": "A testament to mechanical art.",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#0a0a0f",
    "bgColor2": "#1a0a2e",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "imageKeyword": "luxury_watch_gears_macro",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "tags": [
      "cinematic_hero",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_finance_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "finance",
    "title": "Compound Your Asset Base",
    "subtitle": "How the top 1% relocates capital during inflation.",
    "caption": "Read the portfolio breakdown.",
    "palette": "dark",
    "visualLanguage": "cinematic_story",
    "bgColor": "#050A0F",
    "bgColor2": "#101F30",
    "accentColor": "#F59E0B",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "imageKeyword": "trading_charts_neon_dark",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "char_blur_in",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "cinematic_hero",
      "finance",
      "cinematic_story"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_food_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "food",
    "title": "Crafting Organic Flavours",
    "subtitle": "Handpicked mountain coffee beans roasted to perfection.",
    "caption": "Sustainably sourced.",
    "palette": "warm",
    "visualLanguage": "cinematic_story",
    "bgColor": "#1C140E",
    "bgColor2": "#38251A",
    "accentColor": "#B45309",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "imageKeyword": "coffee_beans_roasting_slow",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "cinematic_hero",
      "food",
      "cinematic_story"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cinematic_edu_001",
    "subcategory": "CINEMATIC_HERO",
    "niche": "education",
    "title": "Mastering Cognitive Flow",
    "subtitle": "The psychological rules of hyper-learning.",
    "caption": "Increase focus by 3x.",
    "palette": "cool",
    "visualLanguage": "cinematic_story",
    "bgColor": "#0B1020",
    "bgColor2": "#1A237E",
    "accentColor": "#A78BFA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "imageKeyword": "books_library_dramatic_shadows",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "cinematic_hero",
      "education",
      "cinematic_story"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_finance_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "finance",
    "title": "Compound Beats Speculation",
    "subtitle": "Consistently reinvesting yields vastly outstrips day-trading spikes.",
    "caption": "Wealth Rule #4",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#0f0f15",
    "bgColor2": "#20152e",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "value": "99%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "motionAxis": "mixed",
    "tags": [
      "typographic_statement",
      "finance",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_wellness_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "wellness",
    "title": "Discipline Is Self Love",
    "subtitle": "Choosing temporary strain over long-term regret builds character.",
    "caption": "Mantra of the day",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF7F2",
    "bgColor2": "#F3E5F5",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "value": "92%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "typographic_statement",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_sports_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "sports",
    "title": "No Pain No Championship",
    "subtitle": "Muscular hypertrophy demands complete structural breakdown.",
    "caption": "Workout protocol v1",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#1A0A0C",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "value": "100%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "labelAnimation": "stomp",
    "motionAxis": "vertical",
    "tags": [
      "typographic_statement",
      "sports",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_edu_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "education",
    "title": "We Forget 80% In 24 Hours",
    "subtitle": "Spaced repetition halts the natural memory decay curve.",
    "caption": "Cognitive Fact #12",
    "palette": "cool",
    "visualLanguage": "minimal_clean",
    "bgColor": "#0B1020",
    "bgColor2": "#1A237E",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "value": "80%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "motionAxis": "vertical",
    "tags": [
      "typographic_statement",
      "education",
      "minimal_clean"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_tech_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "tech",
    "title": "Edge Compute Is The Future",
    "subtitle": "Executing database logic beside client requests cuts network latency.",
    "caption": "Architecture design",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#F0ABFC",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "value": "300ms",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "glitch_in",
    "subtitleAnimation": "char_blur_in",
    "labelAnimation": "neon_flicker",
    "motionAxis": "mixed",
    "tags": [
      "typographic_statement",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_luxury_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "luxury",
    "title": "True Luxury Is Silent",
    "subtitle": "Aspirational design speaks through heritage craftsmanship and raw textures.",
    "caption": "Editorial digest",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#111111",
    "bgColor2": "#1C1C1C",
    "accentColor": "#E7D3B1",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "value": "1%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "labelAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "typographic_statement",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_travel_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "travel",
    "title": "Collect Paths Not Things",
    "subtitle": "Solitary trail exploration rewires brain receptors and lowers stress.",
    "caption": "Adventure v3",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#111111",
    "bgColor2": "#1A2D20",
    "accentColor": "#0EA5E9",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "value": "100km",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "motionAxis": "vertical",
    "tags": [
      "typographic_statement",
      "travel",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_typo_food_001",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "food",
    "title": "Fermentation Is Alive",
    "subtitle": "Prebiotic microbes inside raw foods repair intestinal lining.",
    "caption": "Kitchen science",
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF6F0",
    "bgColor2": "#EFEBE4",
    "accentColor": "#B45309",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "value": "10B",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "motionAxis": "vertical",
    "tags": [
      "typographic_statement",
      "food",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_wellness_001",
    "subcategory": "TOP_N_LIST",
    "niche": "wellness",
    "title": "1. Hydrate first thing\n2. Light exposure\n3. Walk 10 mins",
    "subtitle": "Three simple micro-habits to reclaim your energy index.",
    "caption": "Morning Rituals",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF7F2",
    "bgColor2": "#F3E5F5",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_education_001",
    "subcategory": "TOP_N_LIST",
    "niche": "education",
    "title": "1. Active Recall\n2. Feynman technique\n3. Pomodoro rules",
    "subtitle": "Retain 3x more information during exams.",
    "caption": "Study Protocols",
    "palette": "cool",
    "visualLanguage": "minimal_clean",
    "bgColor": "#0B1020",
    "bgColor2": "#1A237E",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "education",
      "minimal_clean"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_productivity_001",
    "subcategory": "TOP_N_LIST",
    "niche": "general",
    "title": "1. Timebox email\n2. Phone in drawer\n3. Single-task focus",
    "subtitle": "Eliminate digital noise and build deep work blocks.",
    "caption": "Productivity Rules",
    "palette": "dark",
    "visualLanguage": "hyper_modern",
    "bgColor": "#0B1120",
    "bgColor2": "#1A237E",
    "accentColor": "#F0ABFC",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "general",
      "hyper_modern"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_travel_001",
    "subcategory": "TOP_N_LIST",
    "niche": "travel",
    "title": "1. Lofoten Islands\n2. Kyoto alleys\n3. Patagonia trails",
    "subtitle": "Curated path recommendations for adventurous travelers.",
    "caption": "Dream Destinations",
    "palette": "warm",
    "visualLanguage": "social_viral",
    "bgColor": "#111111",
    "bgColor2": "#2C1E12",
    "accentColor": "#E65100",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "travel",
      "social_viral"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_finance_001",
    "subcategory": "TOP_N_LIST",
    "niche": "finance",
    "title": "1. Emergency Cash\n2. Index Matching\n3. Real Estate Base",
    "subtitle": "Diversified asset allocation rules for long-term growth.",
    "caption": "Portfolio Asset Rules",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#1C1C1C",
    "accentColor": "#C4A882",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_food_001",
    "subcategory": "TOP_N_LIST",
    "niche": "food",
    "title": "1. Fermented Kimchi\n2. Kombucha drinks\n3. Kefir yogurt",
    "subtitle": "Essential probiotic foods to boost your gut microbiome.",
    "caption": "Probiotic Ingredients",
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF6F0",
    "bgColor2": "#EFEBE4",
    "accentColor": "#B45309",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "food",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_topn_sports_001",
    "subcategory": "TOP_N_LIST",
    "niche": "sports",
    "title": "1. Deadlifts\n2. Squats\n3. Weighted pullups",
    "subtitle": "Compound exercises that yield 80% of muscle response.",
    "caption": "Compound Lifting",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0B0B0C",
    "bgColor2": "#1A0909",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "slideUp",
    "titleAnimation": "word_pop_reveal",
    "subtitleAnimation": "word_slide_up",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "top_n_list",
      "sports",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_card_food_001",
    "subcategory": "LAYERED_CARD",
    "niche": "food",
    "title": "Healthy Meal Prep",
    "subtitle": "Pre-portioning veggies and grain cards cuts cooking times by",
    "caption": "Weekly Recipe Guide",
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF6F0",
    "bgColor2": "#EFEBE4",
    "accentColor": "#10B981",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "imageKeyword": "organic_meal_prep_containers",
    "value": "75%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "food",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_card_edu_001",
    "subcategory": "LAYERED_CARD",
    "niche": "education",
    "title": "Active Recall Hack",
    "subtitle": "Flashcards and self-testing boost memory retention indexes by",
    "caption": "Effective Study Tips",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F5F5F7",
    "bgColor2": "#E8EAF6",
    "accentColor": "#0071E3",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "imageKeyword": "books_library_cozy_aesthetic",
    "value": "150%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "education",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_card_fitness_001",
    "subcategory": "LAYERED_CARD",
    "niche": "sports",
    "title": "Aerobic Zone Training",
    "subtitle": "Maintaining heart rate zone 2 burns fat reserves efficiently by",
    "caption": "Endurance Optimization",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#111111",
    "bgColor2": "#2D0A0A",
    "accentColor": "#F43F5E",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "imageKeyword": "triathlete_running_road_sunset",
    "value": "80%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "sports",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_card_ecom_001",
    "subcategory": "LAYERED_CARD",
    "niche": "general",
    "title": "Minimalist Leather Wallet",
    "subtitle": "Crafted from raw veg-tanned hide. Card slot layout holds up to",
    "caption": "Bespoke Carry Collection",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF9F6",
    "bgColor2": "#F3EFE9",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "imageKeyword": "leather_wallet_minimal_styling",
    "value": "8 cards",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "general",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_card_wellness_001",
    "subcategory": "LAYERED_CARD",
    "niche": "wellness",
    "title": "Breathe And Reset",
    "subtitle": "Five deep slow breaths lowers cortisol stress levels immediately by",
    "caption": "Mindful Stress Hacks",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F3E5F5",
    "bgColor2": "#E8EAF6",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "imageKeyword": "meditation_zen_garden_stones",
    "value": "30%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_card_finance_001",
    "subcategory": "LAYERED_CARD",
    "niche": "finance",
    "title": "Cash Reserves Policy",
    "subtitle": "Holding emergency liquidity offsets sudden investment shocks by",
    "caption": "Portfolio Safety Rules",
    "palette": "dark",
    "visualLanguage": "minimal_clean",
    "bgColor": "#0F172A",
    "bgColor2": "#1E293B",
    "accentColor": "#F59E0B",
    "headlineFont": "Inter",
    "bodyFont": "Inter",
    "imageKeyword": "vault_safe_door_steel",
    "value": "100%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "finance",
      "minimal_clean"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_subscribe_001",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "general",
    "title": "Join the Elite List",
    "subtitle": "Get weekly strategies on leverage and wealth building.",
    "caption": "Subscribe Now",
    "palette": "vivid",
    "visualLanguage": "social_viral",
    "bgColor": "#EF4444",
    "bgColor2": "#7F1D1D",
    "accentColor": "#ffffff",
    "headlineFont": "Bebas Neue",
    "bodyFont": "DM Sans",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "general",
      "social_viral"
    ],
    "mood": [
      "vivid",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_shop_001",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "luxury",
    "title": "Secure Your Watch Piece",
    "subtitle": "Extremely limited Swiss watches batch. No re-release.",
    "caption": "Shop Now",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#0a0a0f",
    "bgColor2": "#1a0a2e",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_download_001",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "tech",
    "title": "Download edge-app",
    "subtitle": "Access real-time database query optimizations on the go.",
    "caption": "Get App Free",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#0F172A",
    "bgColor2": "#1E293B",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_linkbio_001",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "wellness",
    "title": "Claim Zen Guide",
    "subtitle": "Download the morning breathwork PDF checklist.",
    "caption": "Link In Bio",
    "palette": "vivid",
    "visualLanguage": "social_viral",
    "bgColor": "#8B5CF6",
    "bgColor2": "#4C1D95",
    "accentColor": "#ffffff",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "wellness",
      "social_viral"
    ],
    "mood": [
      "vivid",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_sports_001",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "sports",
    "title": "Join the Lift Group",
    "subtitle": "Get free athletic programming templates.",
    "caption": "Click Link",
    "palette": "vivid",
    "visualLanguage": "social_viral",
    "bgColor": "#111111",
    "bgColor2": "#EF4444",
    "accentColor": "#ffffff",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "sports",
      "social_viral"
    ],
    "mood": [
      "vivid",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_quote_motivational_001",
    "subcategory": "QUOTE_BLOCK",
    "niche": "wellness",
    "title": "We suffer more in imagination than in reality.",
    "subtitle": "Seneca",
    "caption": "Stoic Wisdom v4",
    "palette": "dark",
    "visualLanguage": "minimal_clean",
    "bgColor": "#0A0A0C",
    "bgColor2": "#121217",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "word_fade_in",
    "barAnimation": "draw_in",
    "subtitleAnimation": "slideUp",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "quote_block",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_quote_business_001",
    "subcategory": "QUOTE_BLOCK",
    "niche": "luxury",
    "title": "Details are not details, they make the design.",
    "subtitle": "Charles Eames",
    "caption": "Craftsmanship Ethics",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#111111",
    "bgColor2": "#1C1C1C",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "word_fade_in",
    "barAnimation": "draw_in",
    "subtitleAnimation": "slideUp",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "quote_block",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_quote_tech_001",
    "subcategory": "QUOTE_BLOCK",
    "niche": "tech",
    "title": "Simplicity is subtraction of the obvious.",
    "subtitle": "John Maeda",
    "caption": "Design Philosophy",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "word_fade_in",
    "barAnimation": "draw_in",
    "subtitleAnimation": "slideUp",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "quote_block",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_quote_finance_001",
    "subcategory": "QUOTE_BLOCK",
    "niche": "finance",
    "title": "The market is a device for transferring money from the impatient to the patient.",
    "subtitle": "Warren Buffett",
    "caption": "Investing Rules",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#101F30",
    "accentColor": "#F59E0B",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "word_fade_in",
    "barAnimation": "draw_in",
    "subtitleAnimation": "slideUp",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "quote_block",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_quote_sports_001",
    "subcategory": "QUOTE_BLOCK",
    "niche": "sports",
    "title": "The only bad workout is the one that did not happen.",
    "subtitle": "Anonymous",
    "caption": "Daily Motivation",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0B0B0C",
    "bgColor2": "#1A0909",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "word_fade_in",
    "barAnimation": "draw_in",
    "subtitleAnimation": "slideUp",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "quote_block",
      "sports",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_stat_finance_001",
    "subcategory": "STAT_REVEAL",
    "niche": "finance",
    "title": "Wealth Increase",
    "subtitle": "Median capital returns achieved via index compounding.",
    "caption": "Q4 Performance",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#1A102E",
    "accentColor": "#F59E0B",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "value": "14%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_stat_health_001",
    "subcategory": "STAT_REVEAL",
    "niche": "wellness",
    "title": "Anxiety Reduction",
    "subtitle": "Drop in heart rate stress markers after 10 mins meditation.",
    "caption": "Heart Lab Test",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F3E5F5",
    "bgColor2": "#E8EAF6",
    "accentColor": "#10B981",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "value": "35%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_stat_tech_001",
    "subcategory": "STAT_REVEAL",
    "niche": "tech",
    "title": "CPU Optimization",
    "subtitle": "Performance increase achieved by database query refactoring.",
    "caption": "Deploy v2.4",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "value": "80%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_stat_travel_001",
    "subcategory": "STAT_REVEAL",
    "niche": "travel",
    "title": "Trail Traverse Length",
    "subtitle": "Mountain trails mapped in the new adventure guidelines.",
    "caption": "Explore Catalog",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#111111",
    "bgColor2": "#1A2E22",
    "accentColor": "#0EA5E9",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "value": "500km",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "travel",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_stat_food_001",
    "subcategory": "STAT_REVEAL",
    "niche": "food",
    "title": "Soil Moisture Save",
    "subtitle": "Watering overhead saved via automated soil diagnostics.",
    "caption": "Farm Tech v1",
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF6F0",
    "bgColor2": "#EFEBE4",
    "accentColor": "#B45309",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "value": "40%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "food",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_finance_001",
    "subcategory": "CALM_INTRO",
    "niche": "finance",
    "title": "The Wealth Compound",
    "subtitle": "Hosted by John Sterling",
    "caption": "Series Opener",
    "palette": "dark",
    "visualLanguage": "minimal_clean",
    "bgColor": "#0A0A0C",
    "bgColor2": "#1B1020",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "finance",
      "minimal_clean"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_wellness_001",
    "subcategory": "CALM_INTRO",
    "niche": "wellness",
    "title": "The Calm Breathing Guide",
    "subtitle": "Created by Emma Vance",
    "caption": "Morning Practice",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F5F5F7",
    "bgColor2": "#F3E5F5",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_tech_001",
    "subcategory": "CALM_INTRO",
    "niche": "tech",
    "title": "Inside Server Optimization",
    "subtitle": "By edge-compute labs",
    "caption": "Tech Lecture 1",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_luxury_001",
    "subcategory": "CALM_INTRO",
    "niche": "luxury",
    "title": "The Quiet Luxury Edit",
    "subtitle": "Swiss design digest",
    "caption": "Heritage Series",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#111111",
    "bgColor2": "#1C1C1C",
    "accentColor": "#E7D3B1",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_coach_001",
    "subcategory": "CREATOR_INTRO",
    "niche": "wellness",
    "title": "Coach Carter",
    "subtitle": "High Performance Mindset Trainer",
    "caption": "@coachcarter",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#1A0909",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "avatarAnimation": "spring_in",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "creator_intro",
      "wellness",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_designer_001",
    "subcategory": "CREATOR_INTRO",
    "niche": "general",
    "title": "Jane Foster",
    "subtitle": "Experimental Art Director",
    "caption": "@janefoster",
    "palette": "vivid",
    "visualLanguage": "hyper_modern",
    "bgColor": "#111111",
    "bgColor2": "#1C1C1C",
    "accentColor": "#EC4899",
    "headlineFont": "Syne",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "avatarAnimation": "spring_in",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "creator_intro",
      "general",
      "hyper_modern"
    ],
    "mood": [
      "vivid",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_chef_001",
    "subcategory": "CREATOR_INTRO",
    "niche": "food",
    "title": "Chef Marco",
    "subtitle": "Artisanal Baking Specialist",
    "caption": "@chefmarco",
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF6F0",
    "bgColor2": "#EFEBE4",
    "accentColor": "#B45309",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "avatarAnimation": "spring_in",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "vertical",
    "tags": [
      "creator_intro",
      "food",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_before_after_001",
    "subcategory": "BEFORE_AFTER",
    "niche": "wellness",
    "title": "Fatigue",
    "subtitle": "Focus",
    "caption": "10-day water hydration transformation.",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF7F2",
    "bgColor2": "#E8EAF6",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "before_after",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_before_after_finance_001",
    "subcategory": "BEFORE_AFTER",
    "niche": "finance",
    "title": "Debt",
    "subtitle": "Asset",
    "caption": "Strategic budgeting cash reallocation result.",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#101F30",
    "accentColor": "#F59E0B",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "before_after",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_before_after_fitness_001",
    "subcategory": "BEFORE_AFTER",
    "niche": "sports",
    "title": "10km",
    "subtitle": "42km",
    "caption": "Endurance conditioning run milestones.",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0B0B0C",
    "bgColor2": "#1A0909",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "before_after",
      "sports",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_split_mindset_001",
    "subcategory": "COMPARISON_SPLIT",
    "niche": "finance",
    "title": "Broke",
    "subtitle": "Rich",
    "caption": "Spending first vs investing first comparison.",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#050A0F",
    "bgColor2": "#101F30",
    "accentColor": "#C4A882",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "comparison_split",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_split_habits_001",
    "subcategory": "COMPARISON_SPLIT",
    "niche": "wellness",
    "title": "Unhealthy",
    "subtitle": "Healthy",
    "caption": "Late screen time vs reading book comparison.",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F5F5F7",
    "bgColor2": "#E8EAF6",
    "accentColor": "#10B981",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "comparison_split",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_tech_002",
    "subcategory": "CALM_INTRO",
    "niche": "tech",
    "title": "Quantum Computing Opener",
    "subtitle": "A lecture by Dr. Alan Vance",
    "caption": "Qubit Physics",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_finance_002",
    "subcategory": "CALM_INTRO",
    "niche": "finance",
    "title": "Global Market Outlook",
    "subtitle": "Presented by Sterling Advisory",
    "caption": "Macro Report",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#0A0A0C",
    "bgColor2": "#1A102E",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "finance",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_wellness_002",
    "subcategory": "CALM_INTRO",
    "niche": "wellness",
    "title": "Breathing Foundations",
    "subtitle": "Instructed by Sarah Jenkins",
    "caption": "Zen Session 1",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F5F5F7",
    "bgColor2": "#E8EAF6",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_intro_luxury_002",
    "subcategory": "CALM_INTRO",
    "niche": "luxury",
    "title": "Grand Yacht Preview",
    "subtitle": "An exclusive editorial walk",
    "caption": "Summer Tour",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#111111",
    "bgColor2": "#1C1C1C",
    "accentColor": "#E7D3B1",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "labelAnimation": "fadeIn",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "fadeIn",
    "motionAxis": "horizontal",
    "tags": [
      "calm_intro",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_hook_sports_002",
    "subcategory": "CINEMATIC_HERO",
    "niche": "sports",
    "title": "Break the Physical Wall",
    "subtitle": "Push beyond metabolic limits and fatigue signals.",
    "caption": "Conditioning Routine",
    "palette": "dark",
    "visualLanguage": "cinematic_story",
    "bgColor": "#0A0B0C",
    "bgColor2": "#1C0A0A",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "imageKeyword": "athlete_running_dark_rain",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "bounce_floor",
    "captionAnimation": "stomp",
    "motionAxis": "vertical",
    "tags": [
      "cinematic_hero",
      "sports",
      "cinematic_story"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_hook_finance_002",
    "subcategory": "CINEMATIC_HERO",
    "niche": "finance",
    "title": "Inflation Wealth Siphon",
    "subtitle": "How cash savings lose half their purchasing index.",
    "caption": "Capital Protection Rules",
    "palette": "dark",
    "visualLanguage": "cinematic_story",
    "bgColor": "#050A0F",
    "bgColor2": "#101F30",
    "accentColor": "#F59E0B",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "imageKeyword": "trading_charts_neon_dark",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "char_blur_in",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "cinematic_hero",
      "finance",
      "cinematic_story"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_hook_tech_002",
    "subcategory": "CINEMATIC_HERO",
    "niche": "tech",
    "title": "The AI Tools of 2026",
    "subtitle": "Automation setups that replace standard dev tasks.",
    "caption": "Productivity Hack",
    "palette": "cool",
    "visualLanguage": "cinematic_story",
    "bgColor": "#0B1020",
    "bgColor2": "#1A237E",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "imageKeyword": "abstract_shield_tech",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "depth_charge",
    "subtitleAnimation": "char_blur_in",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "cinematic_hero",
      "tech",
      "cinematic_story"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_hook_education_002",
    "subcategory": "TYPOGRAPHIC_STATEMENT",
    "niche": "education",
    "title": "How to Learn Python in 3 Steps",
    "subtitle": "Focus on loops, collections, and simple file functions.",
    "caption": "Coding Hacks",
    "palette": "cool",
    "visualLanguage": "minimal_clean",
    "bgColor": "#0B1020",
    "bgColor2": "#1A237E",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "value": "100%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "draw_in",
    "titleAnimation": "spring_in",
    "subtitleAnimation": "word_slide_up",
    "labelAnimation": "slideUp",
    "motionAxis": "vertical",
    "tags": [
      "typographic_statement",
      "education",
      "minimal_clean"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_image_travel_002",
    "subcategory": "CINEMATIC_HERO",
    "niche": "travel",
    "title": "Kyoto Temple Walk",
    "subtitle": "Unveiling ancient stone paths and early morning mist.",
    "caption": "Explore Japan v2",
    "palette": "warm",
    "visualLanguage": "cinematic_story",
    "bgColor": "#111111",
    "bgColor2": "#2C1E12",
    "accentColor": "#E65100",
    "headlineFont": "Oswald",
    "bodyFont": "Raleway",
    "imageKeyword": "hiker_on_glacier_summit",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "depth_drift",
    "barAnimation": "draw_in",
    "depthAnimation": "zip_in",
    "titleAnimation": "drift_in",
    "subtitleAnimation": "word_fade_in",
    "captionAnimation": "breathe",
    "motionAxis": "horizontal",
    "tags": [
      "cinematic_hero",
      "travel",
      "cinematic_story"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_image_food_002",
    "subcategory": "LAYERED_CARD",
    "niche": "food",
    "title": "Sourdough Crust Rise",
    "subtitle": "Baking with natural active starter and high heat saves",
    "caption": "Artisanal Baking",
    "palette": "warm",
    "visualLanguage": "minimal_clean",
    "bgColor": "#FAF6F0",
    "bgColor2": "#EFEBE4",
    "accentColor": "#B45309",
    "headlineFont": "Fraunces",
    "bodyFont": "DM Sans",
    "imageKeyword": "organic_meal_prep_containers",
    "value": "4 hours",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "food",
      "minimal_clean"
    ],
    "mood": [
      "warm",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_image_luxury_002",
    "subcategory": "LAYERED_CARD",
    "niche": "luxury",
    "title": "Villa Architecture",
    "subtitle": "Concrete structures frame visual shadows and quiet space",
    "caption": "Home Monograph v2",
    "palette": "luxury",
    "visualLanguage": "luxury_editorial",
    "bgColor": "#111111",
    "bgColor2": "#1C1C1C",
    "accentColor": "#C4A882",
    "headlineFont": "Playfair Display",
    "bodyFont": "Outfit",
    "imageKeyword": "leather_wallet_minimal_styling",
    "value": "1%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "luxury",
      "luxury_editorial"
    ],
    "mood": [
      "luxury",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_image_wellness_002",
    "subcategory": "LAYERED_CARD",
    "niche": "wellness",
    "title": "Morning Routine Sun",
    "subtitle": "Waking up with natural morning light exposure cuts stress by",
    "caption": "Hormone Optimization",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F5F5F7",
    "bgColor2": "#E8EAF6",
    "accentColor": "#10B981",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "imageKeyword": "meditation_zen_garden_stones",
    "value": "40%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "imageAnimation": "spring_in",
    "bgAnimation": "cinematic_breathe",
    "barAnimation": "draw_in",
    "titleAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "motionAxis": "vertical",
    "tags": [
      "layered_card",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_motion_tech_002",
    "subcategory": "STAT_REVEAL",
    "niche": "tech",
    "title": "Query Latency drop",
    "subtitle": "Edge caching lowers database server round-trip latency.",
    "caption": "Server Performance",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "value": "200ms",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_motion_sports_002",
    "subcategory": "STAT_REVEAL",
    "niche": "sports",
    "title": "Heart Rate Baseline",
    "subtitle": "Active cardio conditioning lowers resting pulse to",
    "caption": "Athletic Lab Results",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0B0B0C",
    "bgColor2": "#1A0909",
    "accentColor": "#EF4444",
    "headlineFont": "Anton",
    "bodyFont": "Inter",
    "value": "62bpm",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "sports",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_motion_wellness_002",
    "subcategory": "STAT_REVEAL",
    "niche": "wellness",
    "title": "Stress Reduction",
    "subtitle": "Controlled breathing lowers cortisol markers immediately by",
    "caption": "Cortisol Lab Test",
    "palette": "light",
    "visualLanguage": "minimal_clean",
    "bgColor": "#F3E5F5",
    "bgColor2": "#E8EAF6",
    "accentColor": "#8B5CF6",
    "headlineFont": "Poppins",
    "bodyFont": "Manrope",
    "value": "45%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "wellness",
      "minimal_clean"
    ],
    "mood": [
      "light",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_motion_finance_002",
    "subcategory": "STAT_REVEAL",
    "niche": "finance",
    "title": "Portfolio Growth Index",
    "subtitle": "Median annual capital returns achieved through real equity.",
    "caption": "Q4 Performance v2",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#0A0A0C",
    "bgColor2": "#101F30",
    "accentColor": "#F59E0B",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "value": "18%",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "titleAnimation": "count_up",
    "labelAnimation": "slideUp",
    "subtitleAnimation": "momentum_carry",
    "captionAnimation": "pop_in",
    "motionAxis": "scale",
    "tags": [
      "stat_reveal",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_newsletter_002",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "general",
    "title": "Subscribe to Edge Weekly",
    "subtitle": "Get modern design rules and dev hacks straight to your inbox.",
    "caption": "Join Free List",
    "palette": "vivid",
    "visualLanguage": "hyper_modern",
    "bgColor": "#0F172A",
    "bgColor2": "#1E293B",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "general",
      "hyper_modern"
    ],
    "mood": [
      "vivid",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_cta_download_002",
    "subcategory": "MINIMAL_BOLD_CTA",
    "niche": "tech",
    "title": "Get Serverless Client",
    "subtitle": "Access localized edge caching configurations instantly.",
    "caption": "Get Client v4",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#0B1020",
    "bgColor2": "#1A237E",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "imageKeyword": "star",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "bgAnimation": "float",
    "titleAnimation": "slam_down",
    "subtitleAnimation": "fadeIn",
    "buttonBgAnimation": "spring_in",
    "buttonTextAnimation": "fadeIn",
    "motionAxis": "scale",
    "tags": [
      "minimal_bold_cta",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_before_after_tech_002",
    "subcategory": "BEFORE_AFTER",
    "niche": "tech",
    "title": "Old Stack",
    "subtitle": "Edge Stack",
    "caption": "Legacy VM hosting vs modern localized serverless rebuild.",
    "palette": "cool",
    "visualLanguage": "hyper_modern",
    "bgColor": "#050A0F",
    "bgColor2": "#0D2137",
    "accentColor": "#60A5FA",
    "headlineFont": "Space Grotesk",
    "bodyFont": "Geist",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "before_after",
      "tech",
      "hyper_modern"
    ],
    "mood": [
      "cool",
      "inspired"
    ],
    "scenePosition": "body"
  },
  {
    "id": "scene_split_wealth_002",
    "subcategory": "COMPARISON_SPLIT",
    "niche": "finance",
    "title": "Labor",
    "subtitle": "Equity",
    "caption": "Selling hourly time vs owning scalable compound assets.",
    "palette": "dark",
    "visualLanguage": "social_viral",
    "bgColor": "#050A0F",
    "bgColor2": "#101F30",
    "accentColor": "#C4A882",
    "headlineFont": "Bebas Neue",
    "bodyFont": "Inter",
    "glowAnimation": "atmosphere_pulse",
    "bgFadeAnimation": "fadeIn",
    "barAnimation": "draw_in",
    "titleAnimation": "slideLeft",
    "subtitleAnimation": "slideRight",
    "captionAnimation": "momentum_carry",
    "motionAxis": "horizontal",
    "tags": [
      "comparison_split",
      "finance",
      "social_viral"
    ],
    "mood": [
      "dark",
      "inspired"
    ],
    "scenePosition": "body"
  }
];

// Typography builder
// ─────────────────────────────────────────────────────────────────────────────
function buildTypographyExample(cfg: any): any {
  const elements: ElementNode[] = [];
  
  elements.push(
    el(cfg.id + "_label", "text", "section_title", "typography", "hook",
      { x: 92, y: 740, width: 896, height: 72, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      { fontSize: 36, fontFamily: cfg.bodyFont, fontWeight: 700, textAlign: "center", color: cfg.accentColor, letterSpacing: 10, textTransform: "uppercase" },
      [anim(cfg.id + "_label_a", cfg.labelAnimation || "slideUp", 0, 350, { fromOffset: 40 })],
      { text: cfg.label }
    )
  );

  elements.push(
    el(cfg.id + "_hook", "text", "hook_title", "typography", "hook",
      { x: 40, y: 840, width: 1000, height: 340, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 100, fontFamily: cfg.headlineFont, fontWeight: 800, textAlign: "center",
        color: "#ffffff", textTransform: "uppercase",
        textShadow: { offsetX: 0, offsetY: 6, blur: 20, color: "#000000", alpha: 0.8 },
        textEffect: cfg.visualLanguage === "luxury_editorial" ? "gold" : (cfg.visualLanguage === "hyper_modern" ? "glow" : "shadow_stack"),
        textEffectColor: cfg.accentColor
      },
      [anim(cfg.id + "_hook_a", cfg.titleAnimation || (cfg.motionAxis === "scale" ? "slam_down" : "drift_in"), 100, 450, { easing: "bounceOut" })],
      { text: cfg.headline }
    )
  );

  elements.push(
    el(cfg.id + "_sub", "text", "hook_subtitle", "typography", "reveal",
      { x: 92, y: 1220, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
      {
        fontSize: 48, fontFamily: cfg.bodyFont, fontWeight: 600, textAlign: "center",
        color: "#d1d5db",
        textShadow: { offsetX: 0, offsetY: 2, blur: 8, color: "#000000", alpha: 0.5 }
      },
      [anim(cfg.id + "_sub_a", cfg.subtitleAnimation || "word_slide_up", 400, 600)],
      { text: cfg.subtitle }
    )
  );

  if (cfg.body) {
    elements.push(
      el(cfg.id + "_body", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1340, width: 896, height: 140, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 44, fontFamily: cfg.bodyFont, fontWeight: 400, textAlign: "center", color: "#9ca3af" },
        [anim(cfg.id + "_body_a", cfg.bodyAnimation || "fadeIn", 600, 800)],
        { text: cfg.body }
      )
    );
  }

  if (cfg.caption) {
    elements.push(
      el(cfg.id + "_cap", "text", "supporting_caption", "typography", "emphasis",
        { x: 92, y: 1500, width: 896, height: 80, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 38, fontFamily: cfg.bodyFont, fontWeight: 500, textAlign: "center", color: cfg.accentColor },
        [anim(cfg.id + "_cap_a", cfg.captionAnimation || "pop_in", 2000, 300)],
        { text: cfg.caption }
      )
    );
  }

  return {
    kind: "typography",
    id: cfg.id,
    label: `${cfg.id.replace('typo_', '').toUpperCase()} — ${cfg.headlineFont} + ${cfg.bodyFont}`,
    description: `Typography system for ${cfg.tone}. Includes hierarchical spacing, animations, and clean positioning.`,
    fontPair: { headline: cfg.headlineFont, body: cfg.bodyFont, tone: cfg.tone },
    meta: {
      tags: [...cfg.niches, "typography", "kwikk_seeder", cfg.headlineFont.toLowerCase().replace(' ', '_')],
      mood: [cfg.palette, "inspired"],
      palette: cfg.palette,
      scenePosition: cfg.scenePosition || "hook",
      motionAxis: cfg.motionAxis,
      contentNiches: cfg.niches,
      visualLanguage: cfg.visualLanguage,
      difficulty: cfg.difficulty || "intermediate"
    },
    data: elements,
    annotations: {
      whatMakesItGood: [
        `${cfg.headlineFont} paired with ${cfg.bodyFont} establishes visual hierarchy appropriate for ${cfg.tone}`,
        `Strict text sizing contrast (100px headline vs 36px label and 48px subtitle) guides readability`,
        `Headline uses entry animation '${cfg.titleAnimation || "drift_in"}' matching the visual character of the content`,
        `Subtitle entry animation '${cfg.subtitleAnimation || "word_slide_up"}' creates polished staggered reading flow`,
        `Label entrance animation '${cfg.labelAnimation || "slideUp"}' guides the reader's eye starting position`
      ],
      keyDecisions: [
        `Used ${cfg.headlineFont} for the main visual headline to project ${cfg.tone}`,
        `Kept ${cfg.bodyFont} clean and readable at 48px for multi-line subtitles`,
        `Selected '${cfg.titleAnimation || "drift_in"}' to control visual pacing and tone alignment`,
        `Assigned startMs delays matching visual priority: label (0ms) -> title (100ms) -> subtitle (400ms)`
      ],
      remixHints: [
        `Change accent color from ${cfg.accentColor} to gold (#C4A882) for premium editorial feel`,
        `For dark modes, use near-black background and white text with a soft shadow effect`,
        `Change the headline animation to '${cfg.titleRemix || "spring_in"}' or 'zoomIn' for an alternative entry style`,
        `Change subtitle animation to 'typewriter_word' or 'char_blur_in' to experiment with word/character level dynamics`
      ]
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene builder
// ─────────────────────────────────────────────────────────────────────────────
function buildSceneExample(cfg: any): any {
  const elements: ElementNode[] = [];
  const headlineFont = cfg.headlineFont || "Inter";
  const bodyFont = cfg.bodyFont || "Inter";
  const accentColor = cfg.accentColor || "#3b82f6";
  const bgColor = cfg.bgColor || "#0B1020";
  const bgColor2 = cfg.bgColor2 || "#111827";
  const imageKeyword = cfg.imageKeyword || "abstract_tech";
  const valueText = cfg.value || "100%";

  elements.push(
    el(cfg.id + "_glow", "shape", "scene_backdrop", "atmospheric", undefined,
      { x: -50, y: 600, width: 800, height: 800, zIndex: 1, rotation: 0, scale: 1, opacity: 1 },
      { backgroundColor: accentColor, borderRadius: 999, filters: { blur: 140 }, blendMode: "screen" },
      [anim(cfg.id + "_glow_pulse", cfg.glowAnimation || "atmosphere_pulse", 0, 99999, { amplitude: 0.06, speed: 0.3 })],
      { shape: "circle" }
    )
  );

  if (cfg.subcategory === "CINEMATIC_HERO") {
    elements.push(
      el(cfg.id + "_img", "image", "hero_image", "background_motion", undefined,
        { x: 0, y: 0, width: 1080, height: 1920, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
        { filters: { cinematic: true, vignette: 0.6, brightness: 0.45 } },
        [
          anim(cfg.id + "_img_fade", cfg.bgFadeAnimation || "fadeIn", 0, 700),
          anim(cfg.id + "_img_drift", cfg.bgAnimation || "depth_drift", 0, 99999, { amplitude: 10, speed: 0.4 })
        ],
        { src: imageKeyword }
      )
    );
    elements.push(
      el(cfg.id + "_scrim", "shape", "scene_backdrop", "focal", undefined,
        { x: 0, y: 760, width: 1080, height: 1160, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: "#000000" },
        [anim(cfg.id + "_scrim_fade", "fadeIn", 0, 600)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_bar", "shape", "divider", "secondary_motion", "hook",
        { x: 92, y: 1040, width: 140, height: 5, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: accentColor },
        [anim(cfg.id + "_bar_draw", cfg.barAnimation || "draw_in", 80, 350)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_title", "text", "hook_title", "typography", "hook",
        { x: 92, y: 1080, width: 896, height: 320, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 96, fontFamily: headlineFont, fontWeight: 900, textAlign: "left", color: "#ffffff",
          textShadow: { offsetX: 0, offsetY: 6, blur: 24, color: "#000000", alpha: 0.8 },
          textEffect: cfg.visualLanguage === "luxury_editorial" ? "gold" : "shadow_stack",
          textEffectColor: accentColor
        },
        [anim(cfg.id + "_title_anim", cfg.titleAnimation || "depth_charge", 0, 550)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_sub", "text", "hook_subtitle", "typography", "reveal",
        { x: 92, y: 1440, width: 896, height: 100, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 52, fontFamily: bodyFont, fontWeight: 400, textAlign: "left", color: "#d1d5db",
          textShadow: { offsetX: 0, offsetY: 3, blur: 12, color: "#000000", alpha: 0.6 }
        },
        [anim(cfg.id + "_sub_anim", cfg.subtitleAnimation || "momentum_carry", 300, 500)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_cap", "text", "supporting_caption", "typography", "emphasis",
        { x: 92, y: 1590, width: 896, height: 72, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 40, fontFamily: bodyFont, fontWeight: 600, textAlign: "left", color: accentColor },
        [anim(cfg.id + "_cap_anim", cfg.captionAnimation || "pop_in", 2000, 300)],
        { text: cfg.caption }
      )
    );
    elements.push(
      el(cfg.id + "_depth", "shape", "divider", "depth", "payoff",
        { x: 92, y: 1700, width: 300, height: 4, zIndex: 8, rotation: 0, scale: 1, opacity: 0.4 },
        { backgroundColor: "#ffffff" },
        [anim(cfg.id + "_depth_anim", cfg.depthAnimation || "zip_in", 2100, 250)],
        { shape: "rectangle" }
      )
    );

  } else if (cfg.subcategory === "TYPOGRAPHIC_STATEMENT") {
    elements.push(
      el(cfg.id + "_geo", "shape", "scene_backdrop", "background_motion", undefined,
        { x: 760, y: 200, width: 400, height: 400, zIndex: 2, rotation: 45, scale: 1, opacity: 0.15 },
        { backgroundColor: accentColor, borderRadius: 12 },
        [
          anim(cfg.id + "_geo_fade", cfg.bgFadeAnimation || "fadeIn", 0, 1000),
          anim(cfg.id + "_geo_drift", cfg.bgAnimation || "depth_drift", 0, 99999, { amplitude: 14, speed: 0.35 })
        ],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_bar", "shape", "divider", "secondary_motion", "hook",
        { x: 440, y: 820, width: 200, height: 4, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: accentColor },
        [anim(cfg.id + "_bar_draw", cfg.barAnimation || "draw_in", 0, 350)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_label", "text", "section_title", "typography", "hook",
        { x: 92, y: 860, width: 896, height: 72, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 40, fontFamily: bodyFont, fontWeight: 700, textAlign: "center", color: accentColor, letterSpacing: 8, textTransform: "uppercase" },
        [anim(cfg.id + "_label_anim", cfg.labelAnimation || "slideUp", 0, 380, { fromOffset: 40 })],
        { text: cfg.caption }
      )
    );
    elements.push(
      el(cfg.id + "_title", "text", "hero_phrase", "typography", "hook",
        { x: 40, y: 950, width: 1000, height: 280, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 90, fontFamily: headlineFont, fontWeight: 900, textAlign: "center", color: "#ffffff",
          textGradient: { type: "linear", angle: 135, stops: [{ offset: 0, color: "#ffffff" }, { offset: 1, color: accentColor }] },
          textShadow: { offsetX: 0, offsetY: 4, blur: 24, color: "#000000", alpha: 0.7 },
          textEffect: "glow", textEffectColor: accentColor
        },
        [anim(cfg.id + "_title_anim", cfg.titleAnimation || "depth_charge", 150, 600)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_body", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1270, width: 896, height: 160, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 46, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#9ca3af" },
        [anim(cfg.id + "_body_anim", cfg.subtitleAnimation || "word_slide_up", 500, 700)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_depth", "shape", "divider", "depth", "payoff",
        { x: 440, y: 1520, width: 200, height: 3, zIndex: 8, rotation: 0, scale: 1, opacity: 0.5 },
        { backgroundColor: accentColor },
        [anim(cfg.id + "_depth_anim", cfg.depthAnimation || "draw_in", 2200, 400)],
        { shape: "rectangle" }
      )
    );

  } else if (cfg.subcategory === "TOP_N_LIST") {
    elements.push(
      el(cfg.id + "_scrim", "shape", "scene_backdrop", "focal", undefined,
        { x: 60, y: 380, width: 960, height: 1160, zIndex: 3, rotation: 0, scale: 1, opacity: 0.2 },
        { backgroundColor: "#000000", borderRadius: 24 },
        [anim(cfg.id + "_scrim_fade", "fadeIn", 0, 600)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_label", "text", "section_title", "typography", "hook",
        { x: 92, y: 440, width: 896, height: 72, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 48, fontFamily: headlineFont, fontWeight: 800, textAlign: "center", color: accentColor, textTransform: "uppercase" },
        [anim(cfg.id + "_label_anim", cfg.labelAnimation || "slideUp", 0, 380)],
        { text: cfg.caption }
      )
    );
    elements.push(
      el(cfg.id + "_list", "text", "hero_phrase", "typography", "hook",
        { x: 92, y: 560, width: 896, height: 600, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 80, fontFamily: headlineFont, fontWeight: 700, textAlign: "center", color: "#ffffff",
          textShadow: { offsetX: 0, offsetY: 4, blur: 12, color: "#000000", alpha: 0.5 }
        },
        [anim(cfg.id + "_list_anim", cfg.titleAnimation || "word_pop_reveal", 200, 1200)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_desc", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1200, width: 896, height: 180, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 44, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#d1d5db" },
        [anim(cfg.id + "_desc_anim", cfg.subtitleAnimation || "fadeIn", 800, 600)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_cta", "text", "supporting_caption", "typography", "emphasis",
        { x: 92, y: 1420, width: 896, height: 72, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 38, fontFamily: bodyFont, fontWeight: 600, textAlign: "center", color: accentColor },
        [anim(cfg.id + "_cta_anim", cfg.captionAnimation || "pop_in", 2000, 350)],
        { text: "Swipe to reveal next habits →" }
      )
    );

  } else if (cfg.subcategory === "LAYERED_CARD") {
    elements.push(
      el(cfg.id + "_card", "shape", "scene_backdrop", "focal", undefined,
        { x: 60, y: 380, width: 960, height: 1160, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: "#ffffff", borderRadius: 32, filters: { dropShadow: { color: "#000000", blur: 48, alpha: 0.11, offsetX: 0, offsetY: 16 } } },
        [anim(cfg.id + "_card_fade", "fadeIn", 0, 600)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_img", "image", "hero_image", "focal", "hook",
        { x: 60, y: 380, width: 960, height: 620, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        { borderRadius: 32, filters: { brightness: 1.05, cinematic: true, vignette: 0.2 } },
        [
          anim(cfg.id + "_img_anim", cfg.imageAnimation || "slideUp", 0, 600, { fromOffset: 60, easing: "overshoot" }),
          anim(cfg.id + "_img_breathe", cfg.bgAnimation || "cinematic_breathe", 0, 99999, { amplitude: 0.015, speed: 0.3 })
        ],
        { src: imageKeyword }
      )
    );
    elements.push(
      el(cfg.id + "_divider", "shape", "divider", "secondary_motion", "reveal",
        { x: 60, y: 960, width: 960, height: 5, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: accentColor },
        [anim(cfg.id + "_divider_draw", cfg.barAnimation || "draw_in", 100, 400)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_title", "text", "hero_phrase", "typography", "reveal",
        { x: 92, y: 1000, width: 896, height: 190, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 76, fontFamily: headlineFont, fontWeight: 800, textAlign: "center", color: "#1a1a1a" },
        [anim(cfg.id + "_title_anim", cfg.titleAnimation || "slideUp", 250, 500, { fromOffset: 60, easing: "overshoot" })],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_body", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1225, width: 896, height: 150, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 44, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#444444" },
        [anim(cfg.id + "_body_anim", cfg.subtitleAnimation || "momentum_carry", 450, 500)],
        {
          richText: [
            { text: cfg.subtitle + " ", style: { color: "#444444", fontWeight: 400 } },
            { text: valueText, style: { color: accentColor, fontWeight: 700, highlight: "rgba(0,0,0,0.05)", highlightRadius: 8 } }
          ]
        }
      )
    );

  } else if (cfg.subcategory === "MINIMAL_BOLD_CTA") {
    elements.push(
      el(cfg.id + "_star", "shape", "scene_backdrop", "background_motion", undefined,
        { x: 830, y: 1400, width: 120, height: 120, zIndex: 2, rotation: 0, scale: 1, opacity: 0.8 },
        { backgroundColor: "#ffffff", filters: { blur: 2 } },
        [
          anim(cfg.id + "_star_fade", "fadeIn", 0, 800),
          anim(cfg.id + "_star_float", cfg.bgAnimation || "float", 0, 99999, { amplitude: 15, speed: 0.5 })
        ],
        { shape: "star" }
      )
    );
    elements.push(
      el(cfg.id + "_title", "text", "cta_label", "typography", "hook",
        { x: 60, y: 820, width: 960, height: 280, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 96, fontFamily: headlineFont, fontWeight: 900, textAlign: "center", color: "#ffffff",
          textShadow: { offsetX: 0, offsetY: 4, blur: 20, color: "#000000", alpha: 0.4 },
          textEffect: "shadow_stack", textEffectColor: "#ffffff"
        },
        [anim(cfg.id + "_title_anim", cfg.titleAnimation || "slam_down", 0, 480, { easing: "bounceOut" })],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_body", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1150, width: 896, height: 90, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 44, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "rgba(255,255,255,0.8)" },
        [anim(cfg.id + "_body_fade", cfg.subtitleAnimation || "fadeIn", 300, 500)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_btn_bg", "shape", "cta_backdrop", "secondary_motion", "reveal",
        { x: 180, y: 1380, width: 720, height: 148, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: "#ffffff", borderRadius: 50 },
        [anim(cfg.id + "_btn_bg_anim", cfg.buttonBgAnimation || "spring_in", 350, 550, { easing: "overshoot" })],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_btn_text", "text", "cta_button", "typography", "reveal",
        { x: 180, y: 1388, width: 720, height: 132, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 56, fontFamily: headlineFont, fontWeight: 700, textAlign: "center", color: bgColor },
        [anim(cfg.id + "_btn_text_fade", cfg.buttonTextAnimation || "fadeIn", 500, 400)],
        { text: cfg.caption }
      )
    );

  } else if (cfg.subcategory === "QUOTE_BLOCK") {
    elements.push(
      el(cfg.id + "_scrim", "shape", "scene_backdrop", "focal", undefined,
        { x: 80, y: 440, width: 920, height: 1040, zIndex: 3, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 24, filters: { dropShadow: { color: "#000000", blur: 40, alpha: 0.4, offsetX: 0, offsetY: 10 } } },
        [anim(cfg.id + "_scrim_fade", "fadeIn", 0, 600)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_quote", "text", "hero_phrase", "typography", "hook",
        { x: 140, y: 560, width: 800, height: 500, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 64, fontFamily: headlineFont, fontWeight: 600, textAlign: "center", color: "#ffffff",
          fontStyle: "italic", textShadow: { offsetX: 0, offsetY: 3, blur: 10, color: "#000000", alpha: 0.5 }
        },
        [anim(cfg.id + "_quote_anim", cfg.titleAnimation || "word_fade_in", 150, 900)],
        { text: `"${cfg.title}"` }
      )
    );
    elements.push(
      el(cfg.id + "_bar", "shape", "divider", "secondary_motion", "reveal",
        { x: 440, y: 1100, width: 200, height: 4, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: accentColor },
        [anim(cfg.id + "_bar_draw", cfg.barAnimation || "draw_in", 400, 400)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_author", "text", "body_copy", "typography", "reveal",
        { x: 140, y: 1160, width: 800, height: 80, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 48, fontFamily: bodyFont, fontWeight: 700, textAlign: "center", color: "#ffffff" },
        [anim(cfg.id + "_author_anim", cfg.subtitleAnimation || "slideUp", 600, 500)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_title_text", "text", "supporting_caption", "typography", "emphasis",
        { x: 140, y: 1260, width: 800, height: 120, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 36, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#9ca3af" },
        [anim(cfg.id + "_title_anim", cfg.captionAnimation || "pop_in", 2000, 350)],
        { text: cfg.caption }
      )
    );

  } else if (cfg.subcategory === "STAT_REVEAL") {
    elements.push(
      el(cfg.id + "_num", "text", "hero_phrase", "typography", "hook",
        { x: 92, y: 640, width: 896, height: 260, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 160, fontFamily: headlineFont, fontWeight: 900, textAlign: "center", color: accentColor,
          textShadow: { offsetX: 0, offsetY: 8, blur: 32, color: "#000000", alpha: 0.8 },
          textEffect: "glow", textEffectColor: accentColor
        },
        [anim(cfg.id + "_num_anim", cfg.titleAnimation || "count_up", 100, 1500, { fromValue: 0, toValue: parseInt(valueText) || 100 })],
        { text: valueText }
      )
    );
    elements.push(
      el(cfg.id + "_label", "text", "section_title", "typography", "hook",
        { x: 92, y: 920, width: 896, height: 100, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 48, fontFamily: bodyFont, fontWeight: 700, textAlign: "center", color: "#ffffff", textTransform: "uppercase" },
        [anim(cfg.id + "_label_anim", cfg.labelAnimation || "slideUp", 300, 500)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_desc", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1060, width: 896, height: 180, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 44, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#9ca3af" },
        [anim(cfg.id + "_desc_anim", cfg.subtitleAnimation || "momentum_carry", 600, 600)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_badge", "text", "supporting_caption", "depth", "emphasis",
        { x: 240, y: 1320, width: 600, height: 90, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 36, fontFamily: bodyFont, fontWeight: 600, textAlign: "center", color: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16 },
        [anim(cfg.id + "_badge_anim", cfg.captionAnimation || "pop_in", 2000, 300)],
        { text: cfg.caption }
      )
    );

  } else if (cfg.subcategory === "CALM_INTRO") {
    elements.push(
      el(cfg.id + "_label", "text", "section_title", "typography", "hook",
        { x: 92, y: 780, width: 896, height: 72, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 40, fontFamily: bodyFont, fontWeight: 500, textAlign: "center", color: accentColor, letterSpacing: 8, textTransform: "uppercase" },
        [anim(cfg.id + "_label_anim", cfg.labelAnimation || "fadeIn", 0, 1000)],
        { text: cfg.caption }
      )
    );
    elements.push(
      el(cfg.id + "_title", "text", "hook_title", "typography", "hook",
        { x: 60, y: 880, width: 960, height: 320, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 104, fontFamily: headlineFont, fontWeight: 500, textAlign: "center", color: "#ffffff",
          textShadow: { offsetX: 0, offsetY: 4, blur: 20, color: "#000000", alpha: 0.5 }
        },
        [anim(cfg.id + "_title_anim", cfg.titleAnimation || "drift_in", 200, 1200)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_presenter", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1240, width: 896, height: 90, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 46, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#d1d5db" },
        [anim(cfg.id + "_pres_anim", cfg.subtitleAnimation || "fadeIn", 600, 800)],
        { text: cfg.subtitle }
      )
    );

  } else if (cfg.subcategory === "CREATOR_INTRO") {
    elements.push(
      el(cfg.id + "_avatar", "image", "hero_image", "background_motion", undefined,
        { x: 415, y: 440, width: 250, height: 250, zIndex: 2, rotation: 0, scale: 1, opacity: 1 },
        { borderRadius: 999, border: { color: accentColor, width: 8 } },
        [anim(cfg.id + "_av_anim", cfg.avatarAnimation || "slideUp", 0, 600, { fromOffset: 80, easing: "overshoot" })],
        { src: "creator_avatar_headshot" }
      )
    );
    elements.push(
      el(cfg.id + "_title", "text", "hook_title", "typography", "hook",
        { x: 92, y: 760, width: 896, height: 160, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        {
          fontSize: 90, fontFamily: headlineFont, fontWeight: 900, textAlign: "center", color: "#ffffff",
          textShadow: { offsetX: 0, offsetY: 4, blur: 16, color: "#000000", alpha: 0.5 }
        },
        [anim(cfg.id + "_title_anim", cfg.titleAnimation || "slam_down", 200, 500)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_role", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 950, width: 896, height: 140, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 48, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#9ca3af" },
        [anim(cfg.id + "_role_anim", cfg.subtitleAnimation || "momentum_carry", 500, 500)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_handle", "text", "supporting_caption", "typography", "emphasis",
        { x: 92, y: 1120, width: 896, height: 90, zIndex: 7, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 40, fontFamily: bodyFont, fontWeight: 600, textAlign: "center", color: accentColor },
        [anim(cfg.id + "_handle_anim", cfg.captionAnimation || "pop_in", 2000, 350)],
        { text: cfg.caption }
      )
    );

  } else if (cfg.subcategory === "BEFORE_AFTER" || cfg.subcategory === "COMPARISON_SPLIT") {
    elements.push(
      el(cfg.id + "_card_l", "shape", "scene_backdrop", "focal", undefined,
        { x: 60, y: 440, width: 450, height: 900, zIndex: 3, rotation: 0, scale: 1, opacity: 0.15 },
        { backgroundColor: "#000000", borderRadius: 24 },
        [anim(cfg.id + "_card_l_fade", "fadeIn", 0, 600)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_card_r", "shape", "scene_backdrop", "focal", undefined,
        { x: 570, y: 440, width: 450, height: 900, zIndex: 3, rotation: 0, scale: 1, opacity: 0.25 },
        { backgroundColor: accentColor, borderRadius: 24 },
        [anim(cfg.id + "_card_r_fade", "fadeIn", 150, 600)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_divider", "shape", "divider", "secondary_motion", "hook",
        { x: 538, y: 440, width: 4, height: 900, zIndex: 4, rotation: 0, scale: 1, opacity: 1 },
        { backgroundColor: accentColor },
        [anim(cfg.id + "_div_draw", cfg.barAnimation || "draw_in", 100, 500)],
        { shape: "rectangle" }
      )
    );
    elements.push(
      el(cfg.id + "_txt_l", "text", "hero_phrase", "typography", "hook",
        { x: 80, y: 560, width: 410, height: 400, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 64, fontFamily: headlineFont, fontWeight: 800, textAlign: "center", color: "#d1d5db" },
        [anim(cfg.id + "_txt_l_anim", cfg.titleAnimation || "slideUp", 200, 500)],
        { text: cfg.title }
      )
    );
    elements.push(
      el(cfg.id + "_txt_r", "text", "hero_phrase", "typography", "hook",
        { x: 590, y: 560, width: 410, height: 400, zIndex: 5, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 64, fontFamily: headlineFont, fontWeight: 800, textAlign: "center", color: "#ffffff" },
        [anim(cfg.id + "_txt_r_anim", cfg.subtitleAnimation || "slideUp", 350, 500)],
        { text: cfg.subtitle }
      )
    );
    elements.push(
      el(cfg.id + "_desc", "text", "body_copy", "typography", "reveal",
        { x: 92, y: 1380, width: 896, height: 120, zIndex: 6, rotation: 0, scale: 1, opacity: 1 },
        { fontSize: 44, fontFamily: bodyFont, fontWeight: 400, textAlign: "center", color: "#9ca3af" },
        [anim(cfg.id + "_desc_anim", cfg.captionAnimation || "momentum_carry", 600, 600)],
        { text: cfg.caption }
      )
    );
  }

  const finalScene: Scene = {
    id: cfg.id + "_scene",
    name: cfg.title.slice(0, 24),
    durationMs: 5000,
    background: { color: bgColor, color2: bgColor2, gradientAngle: 145, gradientAngleSpeed: 0.4 },
    transition: { type: "slide_left", durationMs: 350 },
    camera: { preset: cfg.subcategory === "MINIMAL_BOLD_CTA" ? "zoom_punch" : "slow_zoom_in" },
    rhythmPattern: "burst",
    dominantFocalId: elements[elements.length - 1]?.id || "",
    elements
  };

  return {
    kind: "scene",
    id: cfg.id,
    subcategory: cfg.subcategory,
    label: `${cfg.subcategory} — ${cfg.niche.toUpperCase()} template`,
    description: `Complete layout template for ${cfg.niche} videos. Preconfigured with proper semantic layers and transitions.`,
    meta: {
      tags: [...cfg.tags, "scene", "kwikk_seeder", headlineFont.toLowerCase().replace(' ', '_')],
      mood: [cfg.palette, "inspired"],
      palette: cfg.palette,
      scenePosition: cfg.scenePosition || "body",
      motionAxis: cfg.motionAxis || "vertical",
      contentNiches: [cfg.niche],
      visualLanguage: cfg.visualLanguage,
      difficulty: cfg.difficulty || "intermediate"
    },
    data: finalScene,
    annotations: {
      whatMakesItGood: [
        `Strict compliance with the 6-8 element layout structure across all 6 semantic layers`,
        `Atmospheric glow uses '${cfg.glowAnimation || "atmosphere_pulse"}' to maintain continuous ambient depth`,
        `Main title utilizes '${cfg.titleAnimation || "depth_charge"}' to draw visual focus instantly upon entry`,
        `Coordinated startMs timings establish an elegant staggered reveal order across layers`,
        `Niche-specific palette and typography chosen to resonate with the target audience`
      ],
      keyDecisions: [
        `Selected ${cfg.subcategory} layout structure for high-impact visual delivery`,
        `Used ${headlineFont} for display elements and paired with ${bodyFont} for body copy`,
        `Matched '${cfg.titleAnimation || "depth_charge"}' and '${cfg.subtitleAnimation || "momentum_carry"}' animations to the ${cfg.niche} theme`,
        `Used '${cfg.bgAnimation || "depth_drift"}' loop on background elements to keep the screen active but non-distracting`
      ],
      remixHints: [
        `Swap title animation to 'glitch_in' or 'neon_flicker' for cyberpunk/tech energy`,
        `Swap title animation to 'spring_in' or 'bounceIn' for playful or organic topics`,
        `Swap image background or key visuals to fit different niches or brands`,
        `Modify primary colors and highlights to match specific corporate guidelines`,
        `Update transition types to change pacing speed between scenes`
      ],
      avoidPatterns: [
        `Do not apply hard zoom transitions to the base scrim shape`,
        `Avoid adding unrelated geometric accents that clutter the text layout`
      ]
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeder Main Execution
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  console.log("Connected to PostgreSQL database. Seeding inspiration library...");

  let upsertCount = 0;

  // 1. Upsert the 8 existing examples
  for (const ex of EXISTING_EXAMPLES) {
    await pool.query(
      `INSERT INTO inspiration_examples (id, kind, subcategory, label, description, meta, font_pair, data, annotations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         subcategory = EXCLUDED.subcategory,
         label = EXCLUDED.label,
         description = EXCLUDED.description,
         meta = EXCLUDED.meta,
         font_pair = EXCLUDED.font_pair,
         data = EXCLUDED.data,
         annotations = EXCLUDED.annotations,
         updated_at = NOW(),
         deleted_at = NULL`,
      [
        ex.id,
        ex.kind,
        ex.subcategory || null,
        ex.label,
        ex.description,
        JSON.stringify(ex.meta),
        ex.fontPair ? JSON.stringify(ex.fontPair) : null,
        JSON.stringify(ex.scene_data || ex.elements),
        JSON.stringify(ex.annotations)
      ]
    );
    upsertCount++;
  }

  // 2. Build and upsert the 36 typography examples
  for (const cfg of TYPO_CONFIGS) {
    const ex = buildTypographyExample(cfg);
    await pool.query(
      `INSERT INTO inspiration_examples (id, kind, subcategory, label, description, meta, font_pair, data, annotations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         subcategory = EXCLUDED.subcategory,
         label = EXCLUDED.label,
         description = EXCLUDED.description,
         meta = EXCLUDED.meta,
         font_pair = EXCLUDED.font_pair,
         data = EXCLUDED.data,
         annotations = EXCLUDED.annotations,
         updated_at = NOW(),
         deleted_at = NULL`,
      [
        ex.id,
        ex.kind,
        null,
        ex.label,
        ex.description,
        JSON.stringify(ex.meta),
        JSON.stringify(ex.fontPair),
        JSON.stringify(ex.data),
        JSON.stringify(ex.annotations)
      ]
    );
    upsertCount++;
  }

  // 3. Build and upsert the 56 scene examples
  for (const cfg of SCENE_CONFIGS) {
    const ex = buildSceneExample(cfg);
    await pool.query(
      `INSERT INTO inspiration_examples (id, kind, subcategory, label, description, meta, font_pair, data, annotations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         subcategory = EXCLUDED.subcategory,
         label = EXCLUDED.label,
         description = EXCLUDED.description,
         meta = EXCLUDED.meta,
         font_pair = EXCLUDED.font_pair,
         data = EXCLUDED.data,
         annotations = EXCLUDED.annotations,
         updated_at = NOW(),
         deleted_at = NULL`,
      [
        ex.id,
        ex.kind,
        ex.subcategory,
        ex.label,
        ex.description,
        JSON.stringify(ex.meta),
        null,
        JSON.stringify(ex.data),
        JSON.stringify(ex.annotations)
      ]
    );
    upsertCount++;
  }

  console.log(`Success! Upserted ${upsertCount} inspiration examples total.`);
  await pool.end();
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
