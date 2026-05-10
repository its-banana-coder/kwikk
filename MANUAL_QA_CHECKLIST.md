# Manual QA Checklist

## Workspace Startup

- [ ] Install and use `pnpm` locally, since the repo is now configured around `pnpm` workspaces.
- [ ] Run the editor app and confirm it boots without TypeScript/runtime errors.
- [ ] Run the renderer app and confirm it boots fullscreen without console errors.
- [ ] Confirm both apps can resolve workspace packages correctly.

## Prototype Reel

- [ ] Verify the default project loads as a 3-scene vertical reel.
- [ ] Confirm total playback duration is 30 seconds.
- [ ] Check each scene appears in the scene list with the expected name and duration.
- [ ] Confirm scene durations add up correctly after initial load.

## Editor UI

- [ ] Verify the layout matches the intended structure: scene list, preview canvas, properties panel.
- [ ] Check the UI is usable on desktop widths.
- [ ] Check the UI remains usable on narrower/mobile-sized widths.
- [ ] Confirm no obviously broken spacing, overflow, or clipped controls.

## Scene Selection

- [ ] Click each scene and confirm the preview updates to that scene.
- [ ] Confirm selecting a scene also updates the selected element list.
- [ ] Confirm selecting a scene moves playback focus to that scene’s start time.

## Element Selection

- [ ] Select multiple different elements in each scene, one at a time.
- [ ] Confirm the properties panel always reflects the selected element.
- [ ] Confirm semantic role and element identity remain stable while editing.
- [ ] Confirm selection does not unexpectedly jump during playback.

## Text Editing

- [ ] Edit text content for text elements and confirm the preview updates immediately.
- [ ] Confirm long text still renders in a readable wrapped form.
- [ ] Confirm empty text does not crash the preview.
- [ ] Confirm text edits persist while switching scenes and coming back.

## Layout Editing

- [ ] Change `x` and verify horizontal movement is correct.
- [ ] Change `y` and verify vertical movement is correct.
- [ ] Change `width` and `height` and verify size updates visually.
- [ ] Change `scale` and confirm scaling behaves consistently.
- [ ] Change `opacity` and confirm transparency updates correctly.
- [ ] Try extreme values like `0`, large numbers, and decimals to spot broken rendering.
- [ ] Verify edits do not remove semantic metadata or element identity.

## Scene Duration Editing

- [ ] Change a scene duration and confirm the scene list updates.
- [ ] Confirm total project duration updates correctly.
- [ ] Confirm playback slider max updates correctly after duration changes.
- [ ] Confirm downstream scene start times shift correctly after duration changes.
- [ ] Confirm current time is clamped safely if duration becomes shorter.

## Playback

- [ ] Press Play and confirm playback advances smoothly.
- [ ] Press Pause and confirm playback stops immediately.
- [ ] Resume after pause and confirm playback continues from the paused time.
- [ ] Let playback loop through the full reel and confirm it wraps cleanly.
- [ ] Scrub manually while paused and confirm preview updates deterministically.
- [ ] Scrub during playback and confirm the engine recovers cleanly.

## Animation Behavior

- [ ] Verify `fadeIn` elements start transparent and become visible as expected.
- [ ] Verify `fadeOut` behavior if any element is configured with it.
- [ ] Verify `slideUp` moves from lower position into place.
- [ ] Verify `slideDown` moves from higher position into place.
- [ ] Verify `zoomIn` starts smaller and settles into final scale.
- [ ] Pause at multiple timestamps and confirm the same `timeMs` always produces the same frame.

## Renderer Output

- [ ] Confirm text renders with expected color and rough font styling.
- [ ] Confirm rectangle shape placeholders render in expected positions/layers.
- [ ] Confirm image placeholders render correctly with labels.
- [ ] Confirm layering works: foreground elements should visually sit above lower `zIndex` items.
- [ ] Confirm rotation/opacity/scale don’t cause strange placement bugs.
- [ ] Verify no flicker or duplicated objects during playback.

## Determinism

- [ ] Scrub to a specific timestamp multiple times and confirm the frame is visually identical each time.
- [ ] Reload the app and confirm the same default reel produces the same playback behavior.
- [ ] Pause on a known timestamp, switch scenes, return, and confirm the resolved frame is consistent.
- [ ] Compare editor preview behavior and standalone renderer behavior at the same timestamps.

## Validation / Debug Surfaces

- [ ] Confirm the resolved frame JSON updates as playback time changes.
- [ ] Confirm validation panel remains empty for the default prototype.
- [ ] Intentionally create a questionable edit and confirm the app fails gracefully rather than crashing.

## Basic Stability

- [ ] Refresh browser during playback and confirm clean recovery.
- [ ] Switch scenes repeatedly and confirm no gradual slowdown.
- [ ] Edit properties rapidly and confirm no preview desync.
- [ ] Watch browser console for warnings/errors during a full pass of interactions.

## Export-Readiness Sanity

- [ ] Confirm every visual item still has stable `id`.
- [ ] Confirm semantic roles remain intact after manual edits.
- [ ] Confirm timeline-derived playback remains the only visible source of truth.
- [ ] Confirm no DOM-recording or screen-capture assumptions are baked into preview behavior.
