# AI-Native Semantic Video Engine

Semantic-first video creation platform scaffold.

## Workspace Layout

- `apps/editor`: React + Vite editor UI
- `apps/renderer`: PixiJS renderer shell
- `apps/api`: Go + Gin API skeleton
- `packages/shared-types`: shared domain types
- `packages/scene-graph`: scene graph helpers
- `packages/timeline`: timeline sequencing helpers
- `packages/animation-engine`: deterministic animation sampling
- `packages/render-core`: semantic-to-render model bridge

## Core Principles

- Scene-centric, not timeline-centric
- Declarative and serializable
- Editable by both humans and AI
- Deterministic rendering via explicit `timeMs`
- Semantic meaning preserved across manual edits

## Quick Start

```bash
npm install
npm run dev:editor
```

```bash
cd apps/api
go run ./cmd/api
```

