# Catalog Update Guide

How to add or update animations, compositions, fonts, icons, and backgrounds in production.

---

## Mental model

There are two layers to every catalog entry:

1. **The row** — inserted/updated at API startup via `ON CONFLICT DO UPDATE` (idempotent, always in sync with code).
2. **The embedding** — generated asynchronously by calling the admin reembed endpoint. Must be run manually after any add or update.

Schema changes (new tables, new columns) also run at startup via `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. No migration files needed.

---

## Compositions

Compositions are defined in `packages/shared-types/src/index.ts` inside `COMPOSITION_CATALOG`.

**To add a new composition type:**

1. Add an entry to `COMPOSITION_CATALOG` in `packages/shared-types/src/index.ts`.
2. Implement the renderer in `packages/render-core/src/` (follow the pattern of `bookFlip` or `fireworks`).
3. Register it in the render-core composition registry.
4. Deploy → the row is upserted into `composition_catalog` on the next API startup.
5. Re-embed so it appears in semantic search:
   ```bash
   curl -X POST https://<api>/v1/admin/reembed \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"tables": ["composition_catalog"]}'
   ```

**To update metadata** (description, use cases, color params): edit the entry in `shared-types`, deploy, reembed.

The `description` and `typicalUseCases` fields become the embedding text — write them descriptively so the AI can suggest the composition at the right moment.

---

## Animations

Animations are defined in `apps/api/src/animation-catalog.ts`.

**To add a new animation type:**

1. Add the `AnimationType` value to the union in `packages/shared-types/src/index.ts`.
2. Implement the animation in `packages/render-core/src/` and `packages/animation-engine/src/`.
3. Add an entry to `ANIMATION_CATALOG` in `apps/api/src/animation-catalog.ts`.
4. Deploy → row upserted on next startup.
5. Re-embed:
   ```bash
   curl -X POST https://<api>/v1/admin/reembed \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"tables": ["animations"]}'
   ```

---

## Fonts

Font metadata lives in `packages/font-manager/src/seed.ts` and is migrated into Postgres via the migration script.

**To add fonts:** run `pnpm tsx scripts/migrate-fonts-to-pg.ts` locally or in prod, then reembed:
```bash
curl -X POST https://<api>/v1/admin/reembed \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tables": ["fonts"]}'
```

---

## Icons

Icons are seeded from the Phosphor SVG directory via `apps/api/src/scripts/seed-icons.ts`.

**To add icon packs:** place SVGs in the correct directory structure, run the seed script, then reembed:
```bash
pnpm tsx apps/api/src/scripts/seed-icons.ts
curl -X POST https://<api>/v1/admin/reembed \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tables": ["icons"], "limit": 2000}'
```

Icons are large (50k+ rows across styles). Call reembed repeatedly until the status shows 0 missing.

---

## Checking embedding status

```bash
curl https://<api>/v1/admin/reembed/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Returns `{ table: { total, embedded, missing } }` for every catalog table. Rows with `missing > 0` won't appear in semantic search results.

---

## Summary table

| Catalog | Source of truth | Row sync | Re-embed needed |
|---|---|---|---|
| Compositions | `shared-types` COMPOSITION_CATALOG | Auto on startup | Yes, after any change |
| Animations | `animation-catalog.ts` | Auto on startup | Yes, after any change |
| Fonts | `font-manager` seed + migration script | Manual script | Yes, after migration |
| Icons | Phosphor SVG dir + seed script | Manual script | Yes, after seed |
| Assets | User uploads | Automatic on upload | Auto (vision pipeline) |
| Templates | DB direct insert | Manual | Yes, after insert |
| Backgrounds | DB direct insert | Manual | Yes, after insert |
