# Contributing to kwikk

Thanks for your interest in contributing. kwikk is an AI-native, scene-graph-based
video composition engine, and it's built around a small set of non-negotiable
architectural constraints — read [CLAUDE.md](CLAUDE.md) and [ENGINE.md](ENGINE.md)
before making changes. PRs that violate those constraints (direct `ProjectDocument`
mutation, renderer-owned state, business logic in React components, etc.) will be
asked to rework before review.

## Getting set up

**Prerequisites:** Node 20+, pnpm 10+, PostgreSQL 15+ with pgvector, ffmpeg

```bash
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
pnpm install
cp apps/api/.env.example apps/api/.env   # edit DATABASE_URL at minimum
pnpm dev:api        # API on :8080
pnpm dev:editor      # Editor UI on :5173
pnpm dev:renderer    # Headless renderer on :5174
```

See the [README](README.md#quick-start) for the full quick start, including MCP
server setup.

## Project structure

```
packages/   — engine internals (scene-graph, animation-engine, render-core, timeline, shared-types, font-manager, tts-engine)
apps/       — editor (React UI), api (Hono server), renderer (headless export), mcp (MCP server)
```

`packages/` holds all business logic. `apps/editor` is a control surface only — it
should never contain logic that belongs in a package. See the package map in
[CLAUDE.md](CLAUDE.md#package-map) for what lives where.

## Before you open a PR

- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- Run both from the repo root — they fan out across all workspaces.

There's no linter configured yet; match the style of the surrounding code.

## Making changes

- **New mutation types** must extend `EditorOperation` and `applyOperation` in
  `packages/scene-graph` — never mutate `ProjectDocument` directly.
- **New animation behavior** must extend `AnimationType` in `packages/shared-types`
  and be handled in `resolveAnimatedLayout` in `packages/animation-engine`, *and*
  be registered in `apps/api/src/animation-catalog.ts` (or
  `buildAnimationSection()` in `packages/llm-context`) in the same change — an
  animation the renderer can play but no discovery tool can find is effectively
  dead code to every AI/MCP client.
- **Renderer changes** must stay pure: `resolveRenderFrame(project, { timeMs })`
  reads the scene graph and renders — it must never write back to it.
- Keep `id`, `semanticRole`, and `motionPreset` intact through any edit path you
  touch (drag, resize, animation change, manual override).

Run through the [checklist in CLAUDE.md](CLAUDE.md#checklist-before-any-code-change)
before submitting.

## Commit / PR conventions

- Keep PRs focused — one logical change per PR.
- Write commit messages that explain *why*, not just *what*.
- Reference any related issue in the PR description.
- If you're changing renderer or animation-engine behavior, note whether it's a
  visual/behavioral change and how you verified it (screenshot, test, manual repro).

## Reporting bugs / requesting features

Use the issue templates on the [Issues](https://github.com/its-banana-coder/kwikk/issues)
page. For security issues, see [SECURITY.md](SECURITY.md) instead of opening a
public issue.

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
