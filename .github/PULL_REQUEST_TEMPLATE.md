## What does this PR do?

<!-- A short summary of the change and why it's needed. -->

## Related issue

<!-- Closes #... , or "N/A" -->

## Checklist

- [ ] I've read [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] No direct `ProjectDocument` mutation — all edits go through `EditorOperation` / `applyOperation`
- [ ] Renderer changes stay pure (no writes to scene graph/editor state)
- [ ] New `AnimationType`s are registered in the animation catalog / `buildAnimationSection()` in the same change
- [ ] `id` / `semanticRole` / `motionPreset` are preserved through any edit path this PR touches

## How was this tested?

<!-- Manual repro steps, screenshots/recording, or which automated tests cover this. -->
