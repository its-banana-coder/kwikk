# Composition Ideas

Sourced from codingstella.com/category/javascript. These are candidates for new kwikk composition types — sealed, time-driven animations that fit the multi-asset model.

---

## Priority 1 — Implement next

### 1. Fireworks
- **Source:** https://codingstella.com/how-to-create-animated-firework-diwali-using-html-css-and-js/
- **What it is:** Physics-based rockets launch upward and burst into colored star particles with trails and sparks. Multiple shell variants — willow (drooping trails), crossette (splits into 4), crackle (golden sparks). Each burst is a random color from a palette (red, green, blue, purple, gold, white).
- **Motion:** Rockets arc upward under simulated gravity, explode at peak, particles radiate outward and decay with air drag. Stars emit spark sub-particles during flight.
- **Slots:** None — purely procedural
- **Background:** Transparent (composites over any scene)
- **Use cases:** Diwali, New Year, birthdays, product launches, celebrations
- **kwikk notes:** Auto-launches shells on a staggered timer driven by `localTimeMs`. No user config needed beyond speed.

### 2. Galaxy
- **Source:** https://codingstella.com/how-to-create-galaxy-animation-using-html-css-and-js/
- **What it is:** 3D rotating galactic disk of ~100k star particles arranged in spiral arms. Color transitions from warm orange-red at the core to deep blue at the edges. Particles use additive blending so overlapping stars glow brighter.
- **Motion:** The entire galaxy disk rotates slowly around its center axis. Camera perspective gives a slight 3D tilt.
- **Slots:** None — procedural
- **Background:** Transparent / very dark
- **Use cases:** Space, tech, sci-fi, ambient background layer for any dramatic scene
- **kwikk notes:** Reduce particle count to ~5k–10k for PixiJS performance. Core color and edge color could be accent/page color params.

### 3. Solar System
- **Source:** https://codingstella.com/how-to-make-solar-system-planet-picker-animation-using-html-css-javascript/
- **What it is:** Sun at center with planets orbiting at different radii and speeds. Each planet is a colored circle with a label and orbital ring. Planets orbit continuously at speeds proportional to real ratios (inner planets faster).
- **Motion:** Continuous orbit. Each planet has its own period. Orbital trails fade behind each planet.
- **Slots:** Could have image slots per planet (replace circle with a texture) or keep as pure procedural with colored circles and text labels.
- **Background:** Dark space, transparent outer
- **Use cases:** Space/science content, tech companies, educational, abstract backgrounds
- **kwikk notes:** 6–8 planets, each with its own orbital radius, speed, size, and color. Text labels optional via slots.

### 4. Blossoming Flower
- **Source:** https://codingstella.com/how-to-create-blossoming-flower-animation-using-html-css-and-js/
- **What it is:** Flower petals unfurl from the center outward in a radial burst. Petals animate with a spring/ease-out curve. Multiple layers of petals at different scales for depth.
- **Motion:** Petals grow from 0 scale and rotate into final position. After blooming, a gentle sway/breathe loop.
- **Slots:** None — or optionally one slot for the image shown at flower center
- **Background:** Transparent
- **Use cases:** Spring, romance, weddings, lifestyle brands, beauty
- **kwikk notes:** Color driven by accent/page color. Petal count and layers configurable. Could loop bloom → wilt → bloom.

### 5. Animated Credit Card
- **Source:** https://codingstella.com/how-to-create-animated-credit-card-using-html-css-and-js/
- **What it is:** A credit card that flips 3D to reveal front and back faces. Holographic sheen sweeps across the card surface. Card details (number, name, expiry) animate in sequentially.
- **Motion:** Y-axis 3D flip (same technique as book_flip). Sheen highlight moves across surface.
- **Slots:** 2 — front face image, back face image (or keep as branded card with text params)
- **Background:** Can sit on dark gradient or transparent
- **Use cases:** Fintech, banking, subscription products, loyalty cards, gift cards
- **kwikk notes:** Pair slots for front/back. Params for card color, number text, name text.

---

## Priority 2 — Strong candidates

### 6. Heart Particles
- **Source:** https://codingstella.com/how-to-create-heart-animation-using-html-css-and-js/ and https://codingstella.com/how-to-make-heart-animation-in-html-css-javascript/
- **What it is:** Particles stream upward and curve into a heart outline, or hearts float up and fade in a looping emitter pattern.
- **Motion:** Particles follow a parametric heart curve. Floats upward with slight drift. Alpha fades at top.
- **Slots:** None — purely decorative
- **Background:** Transparent
- **Use cases:** Valentine's Day, love/relationship content, weddings, anniversaries
- **kwikk notes:** Heart curve via parametric equation `(x,y) = (16sin³t, 13cos t − 5cos 2t − 2cos 3t − cos 4t)`. Color = accent color.

### 7. Crystal Heart
- **Source:** https://codingstella.com/how-to-make-crystal-heart-animation-in-html-css-javascript/
- **What it is:** A faceted 3D crystal heart that slowly rotates and catches light. Refraction and glint effects across the faces.
- **Motion:** Slow Y-axis rotation with light glints pulsing across crystal faces.
- **Slots:** None
- **Background:** Transparent or subtle dark gradient
- **Use cases:** Valentine's, jewelry, luxury brands, premium products
- **kwikk notes:** Simulate facets with multiple polygon fills at varying opacities. Rotate using scale.x trick or full 3D projection.

### 8. New Year Confetti Cannon
- **Source:** https://codingstella.com/how-to-create-new-year-animation-using-html-css-javascript/
- **What it is:** Confetti and streamers burst from one or two cannon points, rain down with gravity and flutter rotation. Loopable — burst repeats on a timer.
- **Motion:** Particles launch upward with spread, arc under gravity, flutter (rotation oscillates), slow with drag.
- **Slots:** None
- **Background:** Transparent
- **Use cases:** New Year, birthdays, product launches, announcements, celebrations
- **kwikk notes:** Similar physics to fireworks but confetti shapes (rectangles + circles) instead of glowing stars. Color palette cycles through bright party colors.

### 9. 3D Rotating Product Orbit
- **Source:** https://codingstella.com/how-to-create-nike-shoes-animation-using-html-css-and-js/
- **What it is:** A single product image mounted on a slow 3D turntable with a soft drop shadow beneath it. Subtle ambient light glow around the product.
- **Motion:** Continuous slow Y-axis rotation. Product image scales slightly as it faces front vs. side (simulated perspective).
- **Slots:** 1 — the product image
- **Background:** Transparent or subtle radial gradient
- **Use cases:** Single-product hero, fashion, footwear, electronics
- **kwikk notes:** Simpler than product_cart — just one image rotating. Good pairing with a text composition for product name + price.

### 10. Animated Rubik's Cube
- **Source:** https://codingstella.com/how-to-create-animated-rubik-cube-using-html-css-and-js/
- **What it is:** A 3D Rubik's cube that rotates overall and periodically makes layer moves (face rotations). Colors on each face match the classic red/blue/green/yellow/white/orange scheme.
- **Motion:** Slow global rotation + periodic face turn animations (each face takes ~600ms to rotate 90°).
- **Slots:** None — purely decorative
- **Background:** Transparent
- **Use cases:** Puzzle, tech, problem-solving brands, satisfying loop content
- **kwikk notes:** 27 small cubes projected in 3D. Face rotations are the hardest part — could simplify to just global rotation for v1.

---

## Priority 3 — Interesting, lower priority

### 11. Bouncy Clock
- **Source:** https://codingstella.com/how-to-make-animated-bouncy-clock-in-html-css-javascript/
- **What it is:** Clock face with hands that have a springy bounce on each tick. Hour and minute hands overshoot and settle.
- **Motion:** Each second, hands jump to new position with easeOutBack overshoot.
- **Slots:** None — shows real time or a fixed time driven by localTimeMs
- **kwikk notes:** Drive from `localTimeMs` rather than `Date.now()` to stay deterministic. Show elapsed video time as clock time.

### 12. Airpods / Headphone Reveal
- **Source:** https://codingstella.com/how-to-create-airpods-animation-using-html-css-and-js/
- **What it is:** Product image fades/scales in with a glowing ring expanding outward from behind it. Ambient particles drift around the product.
- **Slots:** 1 — product image
- **kwikk notes:** Simple entry animation followed by ambient particle loop. Good for tech/audio product content.

### 13. Valentine's Letter
- **Source:** https://codingstella.com/how-to-create-valentines-day-letter-using-html-css-javascript/
- **What it is:** An envelope that opens and a letter unfolds out. Hearts float up from the letter.
- **Slots:** 1 — letter content image or text
- **kwikk notes:** Seasonal, very specific use case. Good for Valentine's Day campaigns.

### 14. Spider Clock
- **Source:** https://codingstella.com/how-to-create-spider-clock-animation-using-html-css-and-js/
- **What it is:** Clock with web-like lines radiating from center, hands styled as spider legs. Eerie, stylized.
- **Slots:** None
- **kwikk notes:** Niche Halloween/spooky use case. Low priority.

### 15. Flowers Animation (general)
- **Source:** https://codingstella.com/how-to-create-flowers-animation-using-html-css-and-js/
- **What it is:** Multiple small flowers growing and swaying across the frame.
- **Slots:** None
- **kwikk notes:** Similar territory to Blossoming Flower but more of a field/scene. Could be implemented together.

---

## Excluded (not suitable for kwikk compositions)

- **Games** (Tennis, Archery, Stick Hero, Cross Road, Snake, etc.) — interactive, not video output
- **Navigation / UI components** (Tab bars, dock menus, login forms) — UI elements, not compositions
- **Cursor effects** (Dragon, Spider, Reptile, Glowing Neon) — require pointer interaction
- **Full websites / portfolios** (Tesla, Fanta, Gaming site) — too large, not a composition unit
- **Hover effects** (Magnetic button, 3D card hover) — require interaction
- **Utility tools** (Calculator, Color picker, Password input) — not visual compositions
