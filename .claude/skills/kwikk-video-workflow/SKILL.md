---
name: kwikk-video-workflow
description: Use when creating, planning, or reviewing a short-form social video (TikTok/Reels/Shorts) with kwikk's MCP tools — covers hook writing, retention pacing, mobile-safe layout, typography hierarchy, sound design, art direction, storyboard structure, render QA, and the full brief-to-delivery build pipeline.
---

# Kwikk Social Video Creation Skill — TikTok / Instagram Reels

## Mission

Turn a plain-language brief such as:

> "Create a 35-second reel about X, 1080x1920, educational, no TTS"

into a **social-native short-form video** that is researched, scripted, visually designed, animated, assembled, rendered, and quality-checked.

The goal is NOT to create a miniature presentation.

The goal is to create a video that feels like it belongs natively on:

* Instagram Reels
* TikTok
* YouTube Shorts

Optimize in this order:

1. **Viewer retention**
2. **Immediate comprehension**
3. **Visual novelty**
4. **Information density**
5. **Mobile readability**
6. **Emotional / curiosity payoff**
7. **Aesthetic polish**

A beautiful video that loses attention is a failed reel.

---

# 1. SOCIAL-NATIVE HARD RULES

## Rule 1 — Win the first second

The viewer must understand one of these within approximately the first 0.5–1.0 seconds:

* What is this about?
* Why should I care?
* What surprising thing am I about to learn?
* What question is going to be answered?

Never spend the first 2–3 seconds on:

* Logo animation
* Generic intro
* "Welcome to..."
* Long title reveal
* Slow cinematic establishing shot
* Decorative animation with no information

The opening should immediately create:

**curiosity + context + motion**

Examples:

Bad:

> "Dubai Visa Types"

Better:

> "Going to Dubai? DON'T pick the wrong visa."

Better:

> "Most Indians choose the wrong Dubai visa."

Best:

> "Dubai visa? Here's the one most Indians don't need."

The first visual should reinforce the hook, not merely decorate it.

---

# 2. DESIGN FOR RETENTION, NOT SCENES

Do not think:

> Scene 1 → Scene 2 → Scene 3

Think:

> Hook → Curiosity → Information → Pattern interrupt → Payoff → Re-hook → Information → Payoff → CTA

A scene may contain several micro-beats.

A 30-second reel can have 8–15 meaningful visual changes without needing 8–15 completely different scenes.

## Retention rhythm

As a default target:

* 0–1s: hook
* 1–3s: establish the promise
* 3–6s: first payoff
* 6–8s: visual/text pattern interrupt
* 8–12s: second payoff
* 12–15s: re-hook
* 15–22s: strongest information
* 22–27s: final payoff
* 27–30s: CTA / loop

Adjust according to content.

Do NOT mechanically follow this timing. The principle is:

> Something meaningful should change frequently enough that the viewer never feels the video has stalled.

---

# 3. MICRO-PATTERN INTERRUPTS

Every approximately 1–2 seconds, introduce a meaningful visual change when appropriate.

Possible interrupts:

* Cut to a new image
* Punch-in from 100% → 115%
* Camera direction change
* Text replacement
* Word emphasis
* Number appearing
* Prop entering
* Highlight circle
* Arrow
* Crop change
* Background swap
* Full-screen keyword
* Quick blur → sharp reveal
* Shape wipe
* Card entering
* Screenshot / document appearing
* Map movement
* Chart movement
* Object tracking
* Fast transition
* Sound effect

Do NOT make every change an animation.

Sometimes a **hard cut** is more social-native than a fancy transition.

Avoid repetitive:

> fade → fade → fade → fade

Prefer rhythm:

> cut → punch → text slam → image swap → slide → hard cut → reveal

---

# 4. NO DEAD AIR

Never leave a visual unchanged simply because the scene technically still has time remaining.

If a scene lasts 4 seconds, ask:

> What should happen at second 1?
> What should happen at second 2?
> What should happen at second 3?

A background image can remain for 4 seconds, but something else should provide movement or progression.

Avoid:

* 4-second static photo
* 4-second title
* 4-second paragraph
* Long logo hold
* Empty breathing room without intentional purpose

Intentional pauses are allowed, but they must create anticipation.

---

# 5. MOBILE-FIRST COMPOSITION

Default reel viewport:

```json
{
  "width": 1080,
  "height": 1920
}
```

Everything must be designed for a phone viewed at approximately arm's length.

## Safe zones

Treat the following as UI-obstructed zones:

### Top

Keep important information away from the extreme top.

### Bottom

Reserve substantial space for:

* caption area
* account information
* music/audio UI
* buttons
* comments/share controls

### Right edge

Keep critical information away from the right-side interaction controls.

Never put:

* essential text
* key numbers
* CTA
* faces
* important diagrams

directly underneath platform UI.

Create an internal safe layout approximately:

```text
┌─────────────────────┐
│       SAFE           │
│                     │
│   PRIMARY CONTENT   │
│                     │
│   PRIMARY CONTENT   │
│                     │
│       SAFE           │
│                     │
│   CTA / END CARD    │
│                     │
└─────────────────────┘
```

The exact safe-zone margins may vary by platform, but the principle is mandatory.

---

# 6. TEXT MUST BE SOCIAL-NATIVE

Traditional presentation typography is too slow.

Prefer:

* 2–7 words per text beat
* One idea at a time
* Large bold keywords
* Short supporting copy
* High hierarchy
* Frequent replacement rather than stacking

Avoid paragraphs.

Instead of:

> "There are three different types of tourist visas available depending on how long you intend to stay."

Use:

> **3 VISA OPTIONS**
>
> Short trip?
>
> → 30 days
>
> Staying longer?
>
> → 60 days

The viewer should understand the scene even without audio.

---

# 7. CAPTION / TEXT HIERARCHY

Use at least three text levels:

### HERO

Huge:

* hook
* number
* key word
* reveal

### SUPPORT

Medium:

* explanation
* context
* qualification

### MICRO

Small:

* source
* label
* category
* date
* footnote

The hero text should be readable immediately.

As a starting point for 1080px width:

* Hero: 80–140px
* Section title: 60–100px
* Supporting text: 40–60px
* Micro text: 28–38px

Adjust according to typeface and content.

Never allow a text box to become so large that the actual type occupies only a tiny fraction of it.

For every text element:

```text
fontSize / boxHeight
```

should be checked.

For single-line text, target approximately 70–90% visual fill of the text box.

**Before finalizing any stacked-text layout (title + subtitle/support directly below it), estimate wrap line count for the box width, not just fontSize/boxHeight fill — a box sized correctly for a *single* line still collides with the element below it if the actual copy wraps to two lines at that width and font size.** This is a distinct failure from the fill-ratio check above: fill ratio catches undersized text, this catches an undersized *box* relative to how many lines the text will actually take.

Concrete check: `estimated_lines = ceil(text_width_at_fontsize / box_width)`. If `estimated_lines > 1`, the box height must be at least `fontSize × 1.2 × estimated_lines` (line-height ≈1.2), and every element positioned below it must have its `y` pushed down by however much that exceeds the original single-line box height — don't just widen/heighten the title box and leave the next element's `y` where it was.

**The Hero/Section/Support/Micro size ranges above are ceilings for *dense* scenes, not defaults — when a scene is sparse (few elements, lots of unused vertical space below the last text block), push every text element toward the top of its tier's range, or up into the tier above, rather than defaulting to the small end.** The tiers exist to create hierarchy under real space pressure (a scene packed with copy that has to fit); a scene with only a badge, a number, a title, and one supporting line has no such pressure, so leaving the last line at the bottom of the "micro" range (e.g. 28-32px) just makes it needlessly hard to read for no layout reason. Concrete example: a "yields" scene had only 5 text elements total and roughly 700px of empty safe-zone space below the last line, yet its closing caption ("JVC 8-9% · Business Bay 7-8% · Marina 6.5-7.5%") was set to 32px — the very bottom of the micro range — with nothing forcing it that small. Fix: check how much of the scene's vertical space is actually occupied before picking a size within a tier; a sparse scene should size up (here, bumped to 44px, in line with the video's other supporting_caption sizes) even for its smallest text tier.

Real example: a 5-6 word section title at fontSize 82-92 in a 1000px-wide box was given a box height sized for one line (~130px). At that size the copy wrapped to two lines (actual rendered height ~200-220px), and the second line landed directly on top of the supporting-caption text positioned right below it — visibly overlapping, illegible text in the exported video. This happened in 5 of 6 content scenes in one project (all following the same title→support stacking pattern), because the same box-height assumption was copy-pasted across scenes without re-checking wrap count per scene's actual copy length. Fix: bump the title box height to fit the real line count, then shift every subsequent stacked element's `y` down by the difference.

---

# 8. SOCIAL CAPTION STYLE

For educational / informational reels, prefer dynamic emphasis:

> This costs **₹5,000**

rather than:

> This costs ₹5,000

Animate or style the important word/number differently.

Use:

* bold keyword
* accent color
* underline
* highlight box
* marker effect
* scale punch
* background pill

Do not emphasize everything.

If everything is bold, nothing is emphasized.

---

# 9. WORD-BY-WORD TEXT — USE SPARINGLY

Word-by-word hooks are powerful but should not become the default visual language.

Use them for:

* shocking statement
* suspense
* question
* dramatic reveal
* important number

Example:

> "You..."
>
> "are..."
>
> "doing..."
>
> "THIS..."
>
> "wrong."

Then immediately pay it off visually.

For short reels under ~20 seconds:

* maximum 1 major word-by-word sequence

For 20–45 seconds:

* usually 1
* optionally a second major re-hook

Never turn the whole reel into word-by-word karaoke.

---

# 10. THE HOOK MUST HAVE A PAYOFF

A hook is not merely an attractive title.

The video must answer the promise.

Use structures such as:

### Curiosity

> "There's one thing nobody tells you about X."

### Mistake

> "Stop doing X like this."

### Number

> "3 things you need before X."

### Contrarian

> "You probably don't need X."

### Outcome

> "Here's how to save ₹20,000."

### Question

> "Would you pay ₹10,000 for this?"

### Secret

> "The easiest way to X."

Never make a sensational claim that the video doesn't actually support.

---

# 11. RE-HOOK LONGER VIDEOS

For videos longer than approximately 20 seconds, introduce another curiosity beat around the middle.

Examples:

> "But #3 is the one most people miss."

> "And here's where it gets interesting."

> "Wait until you see option 3."

> "There's a catch."

The re-hook should naturally lead into the strongest upcoming information.

Do not artificially interrupt every 5 seconds.

---

# 12. CONTENT ARCHETYPES

Before writing the storyboard, classify the video.

Choose the strongest structure.

## Listicle

```text
Hook
↓
#3
↓
#2
↓
Re-hook
↓
#1
↓
CTA
```

Do NOT automatically reveal items in numerical order.

Often:

> 3 → 2 → tease 1 → 1

creates better retention.

## Myth busting

```text
Common belief
↓
"FALSE"
↓
Why people believe it
↓
Reality
↓
Proof
↓
Takeaway
```

## Before / After

```text
Before
↓
Problem
↓
Transformation
↓
After
↓
How it happened
```

## Tutorial

```text
Result
↓
Step 1
↓
Step 2
↓
Step 3
↓
Result
```

Show the result before explaining the process.

## Comparison

```text
A vs B
↓
Category 1
↓
Category 2
↓
Category 3
↓
Winner
```

## Surprising fact

```text
Unexpected claim
↓
Context
↓
Evidence
↓
Escalation
↓
Payoff
```

## Story

```text
Cold open
↓
Context
↓
Problem
↓
Escalation
↓
Reveal
↓
Resolution
```

---

# 13. INFORMATION DENSITY

A reel should not merely move quickly.

It should **deliver useful information quickly**.

For educational content:

* One major idea per visual beat
* Avoid repeating the same sentence visually
* Prefer examples over abstract explanation
* Use diagrams, screenshots, numbers, maps and objects whenever possible

Ask:

> Can this sentence become a visual?

If yes, visualize it.

Instead of:

> "The price increased significantly."

Show:

```text
₹499
  ↓
₹799
  ↓
+60%
```

Instead of:

> "The molecule contains six atoms."

Show the molecule.

The text should reinforce the visual, not duplicate it unnecessarily.

## Numeric and compositional comparisons must become a chart, not stat text

If a beat's whole point is a **comparison between numbers** — this is bigger than that, this grew, this city beats that city — plain stat text (even styled, even large) forces the viewer to do the comparison in their head by reading and remembering two separate numbers. A chart lets them see the comparison instantly. Pick the chart type by the *shape* of the comparison, not by habit:

* **Comparison across categories/entities** (this city vs. that city, this year vs. that year, us vs. competitors) → **bar chart**. Bar height/length is the comparison.
* **Change over time / growth or decline** → **line chart** (or an animated bar that visibly grows/rises to convey trend, not just a static end-state).
* **Composition / proportion of a whole** (breakdown of spend, share of market, what makes up 100%) → **pie chart**, since the "whole" is the thing being communicated, not just relative size.
* **Sequence/timeline of stages or durations** → **Gantt-style bar timeline**.

Kwikk has no native chart element — there is no `type:"chart"` primitive. Build charts from the existing primitives (`shape` rects + `text` + entrance animations):

* **Bars**: one `shape` (`rect`) per value, `height` set proportional to the value (compute pixel heights from the real numbers, don't eyeball them), positioned on a shared baseline `y`. Give the standout/winning bar a solid accent-color fill at full opacity; give the comparison bars a muted fill (e.g. the base text color at 20-30% opacity) so the eye goes straight to the point being made.
* **Baseline**: a thin full-width `shape` rect (2-4px tall, low opacity) under the bars reads as an axis without needing real chart-axis tooling.
* **Value + category labels**: a `text` element above each bar for its number, and one below the baseline for its category name — reuse the muted/accent color split from the bars so label and bar visually pair up.
* **Growth motion**: animate each bar in with `slideUp` (or `slam_down`/`pop_in` for the payoff bar) staggered left-to-right, each starting ~200-300ms after the previous, with the corresponding value/label fading in ~150-250ms after its bar. This reads as the chart "building itself" rather than appearing all at once, and lets the standout bar land last as the payoff. Do not attempt a true animated height-growth (scaleY) on the bar shape itself — transform-origin behavior for shape scaling isn't reliable enough to guarantee the bar grows from its baseline rather than its center.
* Do not build a chart with more than 4-5 data points in a single reel beat — beyond that it stops being instantly readable on a phone screen and becomes the paragraph-of-text problem in a different shape.

Concrete example: a Dubai real-estate reel had a "yields" beat making the claim "Dubai's rental yields beat other major cities," originally shown as plain stat text ("6-9% gross rental returns" + a small line listing Dubai sub-neighborhood percentages) — this made the comparison invisible, since no competing city's number was ever shown. Fixed by replacing the sub-neighborhood line with a 4-bar comparison chart (Singapore 2.5%, London 3.5%, New York 4.5%, Dubai 7%, sourced from real market data, not invented) ordered ascending left-to-right so Dubai's bar lands tallest and gold on the right as the visual payoff, bars staggered in over ~1.2s.

---

# 14. VISUAL VARIETY

Do not use:

> stock photo + dark overlay + title

for every scene.

Mix:

* full-screen video
* full-screen photo
* cropped image
* document screenshot
* map
* UI mockup
* diagram
* chart
* card
* isolated object
* animated shapes
* kinetic typography
* collage
* split screen
* before/after
* phone frame
* browser frame
* infographic
* real-world logo / document

The viewer should feel that the video is continuously progressing.

---

# 15. IMAGE CROPPING

Do not always show the entire image.

Use the image as raw material.

For a 9:16 reel:

* punch into faces
* crop landmarks
* isolate objects
* pan across wide images
* move from detail → wide shot
* use foreground/background separation

One strong image can generate multiple visual beats through:

```text
wide
→ punch-in
→ extreme detail
→ pan
→ alternate crop
```

This helps avoid excessive asset sourcing while preserving visual novelty.

---

# 16. CAMERA LANGUAGE

Use camera movement according to meaning.

### Calm / premium

* slow_zoom_in
* ken_burns
* drift

### Exciting

* crash_zoom
* punch-in
* fast pan

### Discovery

* slow reveal
* crane up
* push in

### Urgency

* shake
* handheld
* fast directional movement

### Important reveal

* hold
* sudden zoom
* cut
* reveal

Never use camera motion merely because the tool supports it.

---

# 17. TRANSITIONS

Prefer hard cuts for most scene changes.

Use fancy transitions only when they contribute meaningfully.

Good:

```text
map → map zoom → destination
```

Bad:

```text
photo → random spiral → photo
```

Default transition mix:

* hard cut: dominant
* slide: occasional
* whip: energetic transition
* flash: reveal / emphasis
* fade: beginning/end or intentional pause

Avoid using the same transition repeatedly.

---

# 18. SOUND DESIGN

"No TTS" does NOT mean "no sound."

If the user does not request silence:

Use:

* music bed where appropriate
* whoosh
* pop
* impact
* click
* camera shutter
* notification
* stamp
* typing
* swipe
* riser
* subtle ambience

Synchronize SFX with:

* text appearing
* major number reveal
* object arrival
* transition
* punch-in
* CTA

Do not put a sound effect on every animation.

Sound should reinforce rhythm.

---

# 19. MUSIC

If music is allowed:

Choose music according to content:

* education → subtle rhythmic background
* travel → upbeat / atmospheric
* finance → confident / modern
* sports → energetic
* food → upbeat / warm
* luxury → restrained / premium

Music should never overpower narration or essential SFX.

For no-TTS educational reels, music can provide the rhythmic glue between otherwise silent visual beats.

---

# 20. TOPIC-DRIVEN ART DIRECTION

Before building, derive:

* 1 primary accent
* 1 supporting accent
* 1 primary text color
* 1 dark/scrim color
* 1 typography mood
* 1 recurring motif

Examples:

### Chemistry

* molecular blue
* laboratory cyan
* white
* dark navy
* scientific / clean
* molecule motif

### Finance

* money green
* deep navy
* white
* charcoal
* confident / analytical
* graph motif

### Travel

* destination-specific palette
* premium/editorial typography
* map/passport/plane motif

Do not use the same palette for every reel.

**Watch for accent colors that hue-match the exact stock imagery their own topic attracts — a full-bleed base scrim is not a blanket guarantee against this.** A "luxury/gold" accent picked for a finance/real-estate/premium topic is the color most likely to visually merge into golden-hour, sunset, or warm-interior stock footage sourced for that same topic — real estate reels lean on sunset skyline shots, finance reels lean on warm-lit offices, luxury reels lean on gold-toned product shots. The base full-bleed scrim (Rule 4) darkens the whole frame but doesn't change its hue, so gold-on-golden-hour or green-on-forest text can still visually merge even at 55-60% scrim opacity, especially in the brighter parts of the frame (sun, sky highlights, light interior surfaces).

Concrete example: a Dubai real-estate reel used `#D4AF6A` (muted gold) as its accent text color — an on-theme, deliberate choice per this rule — but placed it directly over a Dubai Marina **sunset** video for a large mid-frame stat ("6-9% gross rental returns"). Sunset footage is intrinsically gold/amber, the same hue family as the text, so even with the full-bleed navy scrim at 0.55 opacity the pairing was flagged as hard to read. Fix: add a dedicated, tighter local scrim (a rect sized to the text's bounding box, ~55-65% opacity, dark/navy) behind that specific element — same technique as the base scrim, just scoped to the one at-risk text block instead of relying on the whole-frame one to carry it. Reserve the accent color itself for text sitting over cooler/darker regions (near-top badges over a full-bleed scrim's darkest area, or over cooler-toned footage) and default every other instance of that accent-over-image pairing to a local scrim unless you've confirmed the specific frame region is cool/dark enough to contrast against it.

## Card/panel fills on a dark flat background need a large, deliberate lightness jump — not a subtle tonal shift

When a scene's design calls for a distinct "card" or "panel" sitting on top of a solid dark background (a terminal window, a stat card, a UI mockup frame), picking the panel fill by eye as "a bit lighter than the background" tends to land far too close in lightness to actually read as a separate surface once exported and viewed at phone size. A ~3-5% relative lightness difference (e.g. background `#0B0F14` vs panel `#141B24`) looks like it has *some* contrast in an isolated side-by-side color swatch comparison, but on an actual rendered frame at mobile viewing distance it reads as a single flat color — the card outline effectively disappears, and anything meant to anchor to "the card" (a header bar, corner-radius edge, drop shadow illusion) becomes invisible along with it.

Fix: use a much larger, deliberate lightness jump between background and panel — target roughly 3-4x the "looks reasonable" difference (e.g. background `#0B0F14` → panel `#1E2733`, a jump from ~6% to ~15% lightness), and additionally draw a thin, lighter-still border/outline rect (1-2 shades lighter than the panel, ~3px larger on each side, same corner radius) behind the panel as a dedicated edge-definition layer rather than relying on the fill contrast alone to read as an edge. A header bar or top strip within the card should step up again from the panel fill (background → panel → header, each step clearly visible), not sit within the same few percent of lightness as the panel body.

Concrete example: a "senior vs junior Python" terminal-comparison reel used background `#0B0F14`, panel `#141B24`, header `#1B232E` — all three colors differed by only a few percent lightness. In exported frames the terminal cards were essentially invisible; only the traffic-light dots and text floated on what looked like a single flat background. Fixed by bumping panel to `#1E2733`, header to `#2A3542`, and adding a `#3D4C5E` border rect (3px larger, same corner radius) behind each panel — after the fix the card boundary, header strip, and dots were all clearly legible in the same frame positions.

---

# 21. RECURRING VISUAL MOTIF

Each reel should have one visual motif.

Examples:

Travel:

> passport stamp / plane / map line

Finance:

> chart / coin / percentage

Education:

> notebook / diagram / highlight marker

Food:

> ingredient / plate / price tag

Use the motif 2–4 times.

This creates visual identity without making every scene look identical.

---

# 22. REAL-WORLD GROUNDING

Whenever appropriate, use recognizable real-world artifacts:

* official documents
* textbooks
* maps
* product packaging
* UI
* logos
* charts
* screenshots
* app interfaces
* institutional references

These should make the content feel specific rather than generic.

Do not fabricate testimonials, reviews, statistics, screenshots, or official-looking documents.

If illustrative UI is used, make it clearly illustrative.

---

# 23. ASSET SOURCING

Do not settle for the first stock result.

For each important scene:

1. Search the obvious query.
2. Search a more specific query.
3. Search for a visual interpretation rather than the topic itself.
4. Prefer vertical assets when available.
5. Prefer footage with natural movement.
6. Prefer strong composition and clear focal points.

For example, don't search only:

> Dubai visa

Also try:

> Indian passport Dubai airport
> Dubai immigration counter
> Dubai skyline night vertical
> passport stamp UAE
> traveler airport boarding

Use different assets across beats unless repetition is intentional.

## Icons

`search_icons` and `add_icon` are unreliable in the current tool set — `search_icons` consistently returns an empty result even for common queries (bookmark, bell, arrow, heart), and icons added via `add_icon` don't surface back through search or produce a directly usable URL. Do not depend on the icon catalog.

Workaround: hand-write a simple SVG for the icon you need, base64-encode it, and use it directly as an `image` element's `content.src` via a `data:image/svg+xml;base64,...` URI. This also sidesteps the emoji-tofu export bug (Rule 34) entirely, since it's a real image element rather than a glyph the renderer has to font-match. Keep the SVG minimal (single-color strokes/fills matching the scene's accent or text color) so it reads clearly at small sizes.

## Cross-outs / X marks built from rotated shapes don't self-center — verify after creation

A "strike-through" or "X" mark (e.g. crossing out a person/flag icon to mean "not required") is built from two thin `shape` rects, same fill, rotated to opposite angles (e.g. `rotation: 18` and `rotation: -18`) over the same target area. It is tempting to give both rects identical `x`/`y`/`width`/`height` (mirrored only in rotation sign) and assume they'll cross at one shared center point. **They won't reliably.** The platform silently renormalizes a rotated shape's stored `x`/`y` (and sometimes `width`/`height`) after creation — in one build, two strikes created with the same input `x:413, y:1228` came back with `y:1211.4` and `y:1286.9` respectively, a ~75px vertical divergence, which visibly skewed the "X" off-center instead of crossing cleanly through the middle of the icons it was meant to strike out.

Fix: after adding both rotated rects, re-fetch the project (`get_project`) and read back their actual `x/y/width/height`. Compute each one's true center as `x + width/2, y + height/2` (rotation pivots around the element's own center) and compare — if the two centers don't coincide, patch one element's `x`/`y` to pull its center onto the other's, rather than trusting the original mirrored input values. Don't assume symmetric input produces a symmetric result for rotated shapes.

---

# 24. SCRIPT BEFORE KWIKK

Before calling `create_project`, create a storyboard.

For each beat:

```text
Beat N — 1.8s

Purpose:
What does this beat accomplish?

Hook / information:
Exact message.

On-screen text:
Exact copy.

Visual:
What does the viewer see?

Motion:
What changes during this beat?

Pattern interrupt:
What prevents the beat from becoming static?

Sound:
Music / SFX / silence.

Transition:
How does this enter and leave?

Retention reason:
Why does the viewer keep watching?
```

The storyboard should be reviewed before building.

---

# 25. RETENTION REVIEW

Before building, ask:

### First second

* Would I stop scrolling?
* Is the subject immediately clear?
* Is there a curiosity gap?

### Every 2 seconds

* Has something meaningful changed?
* Is the viewer receiving new information?

### Middle

* Is there a re-hook?
* Does the video escalate?

### Final third

* Is the strongest information still coming?
* Is there a payoff?

### End

* Is the CTA short?
* Can the ending naturally loop into the beginning?

---

# 26. LOOP DESIGN

When appropriate, make the final frame naturally connect to the first.

Example:

Opening:

> "Which Dubai visa should you get?"

Ending:

> "And that's why choosing the right visa matters."

Then return visually to the opening question.

A good loop makes the transition back to the beginning feel intentional rather than abrupt.

Do not force loops into every video.

---

# 27. CTA

Do not waste 4 seconds saying:

> "Like, comment, subscribe and follow for more."

Keep it specific.

Examples:

> "Save this for your trip."

> "Follow for more JEE shortcuts."

> "Send this to your travel buddy."

> "Part 2?"

Use the CTA only when appropriate.

For educational content, **Save** is often more natural than generic "Follow us."

**The closing scene needs to be its own designed moment, not a background photo with one line of CTA text and a label under it.** Rule 5 ("every scene needs its own concept, not stock photo + caption") applies to the CTA scene too — it's easy to treat it as an afterthought once the real content is done, but it's the last thing the viewer sees and the one beat explicitly asking for action, so it deserves at least as much craft as a mid-video benefit beat. Concrete checklist for a closing scene:
- **Give the ask a real affordance, not just colored text.** A pill/button-shaped scrim behind the CTA line (same technique as Rule 4's local scrim, but styled to read as "tap this") makes the ask look actionable instead of decorative.
- **Make the ask specific and singular** — per the examples above, not a generic "like, follow, subscribe" stack. One clear next action beats three vague ones.
- **Give the viewer a second, different reason to stay engaged beyond the primary CTA** — a specific follow-reason ("follow for the next city breakdown," "part 2 tomorrow"), a concrete proof point, or a loop back to the hook (Rule 26) — something with actual content value, not just repeated branding text.
- **Reuse the video's recurring motif or palette accent** (Rule 21) so the close feels like the same designed object as the rest of the video, not a generic template slide dropped on at the end.
- A closing scene of "full-bleed photo + scrim + two plain text lines" is the same failure mode as any other under-designed scene — it just happens to be the one every viewer who finishes the video will actually see.
- **Don't default to pinning the CTA block against the very bottom safe-zone edge.** A CTA squeezed into the last ~150-250px of the frame reads as an afterthought no matter how well-styled it is. Treat the CTA's vertical position the same way Rule 7's sparse-scene guidance treats font size: if the scene has a lot of unused vertical space, use it — center the CTA block in the lower-middle of the frame (roughly the middle third to lower-middle, not the bottom 10%) so it's the clear focal point of the scene, not a caption stuck under the image.
- **Use real icon elements next to the CTA and secondary line, not emoji.** A bookmark icon next to "Save this," a bell/notification icon next to a "follow" line, etc. make the ask read as an actual UI action instead of a text label — and sidestep the emoji-tofu export bug (the earlier gotcha about emoji rendering as blank boxes) entirely, since these are real image elements, not glyphs. See the Icons note under Rule 23 (Asset Sourcing) for how to actually get icons onto the canvas, since the icon catalog is unreliable.

---

# 28. TEXT ANIMATION

Text should enter decisively and then become stable.

Good:

* slideUp
* pop_in
* spring_in
* slam_down
* depth_charge
* zoomIn

Bad:

* continuous drifting
* endless zoom
* text flying off-screen
* decorative motion that makes reading difficult

Animation should communicate hierarchy.

The hook gets the strongest entrance.

Supporting text gets simpler motion.

CTA should be calm and readable.

## Entrance animations do not hide an element before they start — you must set opacity:0 yourself

An element's `layout.opacity` (or the implicit default when omitted, which is `1`) is what renders for the *entire* scene outside the animation's own `[startMs, startMs+durationMs]` window. `fadeIn`, `slideUp`, `pop_in`, `slam_down`, `depth_charge`, etc. only override the render during their active window — they do not retroactively hide the element from frame 0 just because their `startMs` is later than 0. If you build a multi-beat scene (e.g. a badge that should only appear after a code block finishes typing, or a second panel that should only slide in partway through the scene) and leave `layout.opacity` unset, every element renders at full opacity from the very first frame regardless of its animation's `startMs` — silently collapsing the whole "reveal in sequence" structure into "everything visible immediately, motion happens somewhere in the middle." This only shows up when you inspect actual exported frames (Rule 34) — the editor JSON looks correct, and a description of the scene sounds correct, but the rendered video is wrong.

Fix, two parts:
1. **Every element that has an entrance animation must have its base `layout.opacity` explicitly set to `0`.** Do not rely on an unset/default value.
2. **Do not assume a non-fade motion type (`slideUp`, `pop_in`, `slam_down`, `depth_charge`, etc.) also drives the opacity channel.** It may only be documented as moving/scaling. To guarantee the element actually fades in rather than staying at opacity 0 forever after its base is corrected, pair every non-fade entrance animation with an **explicit second `fadeIn` animation on the same `startMs`/`durationMs`** — animations compose across independent channels (opacity via fadeIn, transform via the motion type), so both apply together safely. Concrete pattern: `entrance(el, motionType, start, dur)` helper that always pushes `{type:"fadeIn", startMs:start, durationMs:dur}` plus (if motionType != "fadeIn") `{type:motionType, startMs:start, durationMs:dur}`.

The one exception: elements whose visibility is itself controlled by a non-opacity mechanism — e.g. a `text` element using `typewriter` (which reveals characters progressively, independent of the element's own opacity) — must keep `layout.opacity:1` from the start, since typewriter does not touch the opacity channel and setting it to 0 would hide the whole block, typed characters included, for the entire scene.

Concrete example: a "senior vs junior Python" comparison reel had two terminal panels per scene (junior's code typed first, badge appears, then senior's panel slides in and types). First render: every badge, panel, header bar, and traffic-light dot was visible from frame 1 of the scene — the whole comparison structure was destroyed because none of the entrance elements had `opacity:0` set at baseline. Fixed by auditing every element type against the two rules above.

---

# 29. ANIMATION INTENSITY

Use three levels:

### Level 1 — Calm

For:

* explanations
* definitions
* premium content

### Level 2 — Active

For:

* normal informational beats
* lists
* tutorials

### Level 3 — Punchy

For:

* hook
* major reveal
* surprising number
* strongest payoff

Do not animate everything at Level 3.

Contrast creates impact.

---

# 30. THEMED COMPOSITIONS

If the topic has a strong visual object, build one bespoke signature animation.

Examples:

Dubai:

> Burj Khalifa assembles upward.

Finance:

> Chart rapidly climbs and locks onto a number.

Chemistry:

> Molecule assembles atom-by-atom.

Food:

> Ingredients fly together into the finished dish.

Technology:

> UI components snap together into an app.

Keep signature animations short:

**~1–2 seconds**

They are pattern interrupts, not entire scenes.

---

# 31. CREATE_PROJECT

Build the initial project in one `create_project` call wherever possible.

Default:

```json
{
  "viewport": {
    "width": 1080,
    "height": 1920
  }
}
```

Each scene should generally contain:

```text
background
+
optional scrim
+
primary visual
+
short text
+
motion
+
optional SFX
```

Do not mechanically force every scene to have exactly the same element stack.

The social-native rule is:

> Consistent art direction, variable composition.

---

# 32. SCENE DURATION

Do not use a fixed 3–4 seconds per scene merely because it is convenient.

Use duration based on information complexity.

Typical range:

* Hook: 0.7–2.5s
* Simple visual beat: 1–2s
* Normal explanation: 2–3s
* Complex concept: 3–4s
* CTA: 1.5–3s

If the viewer can understand the beat in 1.2 seconds, don't stretch it to 4 seconds.

---

# 33. INFORMATION FIT CHECK

Before finalizing each beat:

Calculate:

```text
reading_time ≈ word_count / 3.0–4.0 words_per_second
```

Then add visual comprehension time.

If text takes 2 seconds to read and the beat lasts 1 second:

FAIL.

If the text takes 1 second and the beat lasts 5 seconds:

Probably too slow.

Short-form video must respect cognitive load.

---

# 34. RENDER QUALITY CHECK

Never trust only the JSON/editor representation.

After rendering:

1. Export MP4.
2. Inspect representative frames throughout the video.
3. Inspect:

   * 0.5s
   * 1s
   * every major beat
   * every text-heavy beat
   * CTA
4. Inspect actual video playback where possible.

Check:

* text clipping
* safe zones
* contrast
* unreadable text
* incorrect numbers
* animation timing
* blank images
* missing assets
* emoji tofu boxes
* awkward transitions
* dead moments
* excessive motion
* platform UI overlap

If emoji rendering is unreliable, replace emoji with an icon/image/shape.

---

# 35. SOCIAL-NATIVE QA SCORE

Before calling the reel complete, score each category 1–5.

```text
Hook strength:              /5
First-second clarity:       /5
Information density:        /5
Visual variety:             /5
Mobile readability:         /5
Text hierarchy:             /5
Pattern interrupts:         /5
Pacing:                     /5
Visual storytelling:        /5
Sound design:               /5
Payoff:                     /5
CTA:                        /5
Loop potential:             /5
```

If any of these are below 3:

**revise before export.**

If hook, pacing, readability, or information density are weak:

**do not compensate with prettier animation.**

Fix the underlying problem.

---

# 36. FINAL BUILD PIPELINE

Execute in this order:

```text
1. Parse brief
        ↓
2. Determine target audience
        ↓
3. Identify content archetype
        ↓
4. Research facts
        ↓
5. Identify hook
        ↓
6. Identify payoff
        ↓
7. Plan retention beats
        ↓
8. Write complete storyboard
        ↓
9. Select art direction
        ↓
10. Source assets
        ↓
11. Select typography
        ↓
12. Build create_project
        ↓
13. Apply font system
        ↓
14. Add audio/SFX if requested/appropriate
        ↓
15. Export
        ↓
16. Inspect actual render
        ↓
17. Run social-native QA
        ↓
18. Patch failures
        ↓
19. Re-render
        ↓
20. Deliver final video
```

---

# 36A. DELIVERY — ASK, DON'T AUTO-DOWNLOAD

Once the final QA-passed export reaches `status: "done"`, do **not** automatically call `download_export`.

`get_export_status` returns a `downloadUrl` the moment the job is done — that URL alone is enough to deliver the video. Pulling the whole MP4 to local disk is a separate, heavier step that isn't always wanted (e.g. the user just wants to preview/share the link, or is working against a remote/hosted kwikk instance where a local copy is meaningless).

Ask the user which they want:

* **Link only** — hand back the `downloadUrl` from `get_export_status`. Nothing is written to local disk.
* **Export the file** — call `download_export` to save the MP4 locally, then report the saved path.

Default to asking (e.g. via a short question) rather than assuming — only skip the question if the user's original brief already specified one ("export it to my folder" → download; "just send me a link" → link only).

---

# 37. DEFAULT PHILOSOPHY

When uncertain, prefer:

**cut over transition**

**visual over paragraph**

**short text over long text**

**specific over generic**

**movement over static**

**curiosity over introduction**

**payoff over decoration**

**mobile readability over desktop aesthetics**

**real-world visual evidence over generic stock**

**one strong idea over five weak ideas**

The final question is not:

> "Does this look professional?"

It is:

> **"Would someone who has never heard of this account stop scrolling, understand the point, and keep watching?"**

That is the standard.
