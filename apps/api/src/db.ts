import pg, { type QueryResultRow } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANIMATION_CATALOG } from "./animation-catalog.js";
import { COMPOSITION_CATALOG } from "@kwikk/shared-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, "..");
// Font files and other data assets live in the monorepo root's data/ directory.
const MONOREPO_ROOT = path.resolve(API_ROOT, "../..");

export const dataDir = process.env.KWIKK_DATA_DIR ?? path.join(MONOREPO_ROOT, "data");

// Pool is created lazily so dotenv has time to load before the connection string is read.
let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/kwikk",
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }
  return _pool;
}


// ─── Query helpers ────────────────────────────────────────────────────────────

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | undefined> {
  const res = await getPool().query<T>(text, params);
  return res.rows[0];
}

export async function execute(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  return getPool().query(text, params);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const EMBEDDING_DIMS = parseInt(process.env.EMBEDDING_DIMS ?? "1536", 10);

export async function initDb(): Promise<void> {
  // pgvector extension must be installed on the Postgres server
  await getPool().query(`CREATE EXTENSION IF NOT EXISTS vector`);

  // Idempotent migrations
  const migrations = [
    // user_id is a plain scoping column (no auth/users table) — DEFAULT_USER_ID
    // constants in the route files key off it to separate system-owned rows
    // (user_id IS NULL) from the single local user's rows.
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id INTEGER`,
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id INTEGER`,
    `ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS user_id INTEGER`,
    `ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS user_id INTEGER`,
    // Template enrichment columns
    `ALTER TABLE templates ADD COLUMN IF NOT EXISTS estimated_duration_ms INTEGER DEFAULT 0`,
    `ALTER TABLE templates ADD COLUMN IF NOT EXISTS scene_count INTEGER DEFAULT 0`,
    `ALTER TABLE templates ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Beginner'`,
    // Merge backgrounds → assets: add stock-specific columns
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'upload'`,
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT ''`,
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS pixabay_id INTEGER`,
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS color_palette TEXT[] DEFAULT '{}'`,
    `CREATE UNIQUE INDEX IF NOT EXISTS assets_pixabay_id_uniq ON assets (pixabay_id) WHERE pixabay_id IS NOT NULL`,
    // Tracks the remote URL an asset was downloaded from (e.g. a Pixabay CDN link) so
    // repeated references to the same external asset across elements/projects reuse the
    // one local copy instead of re-downloading — see ensureLocalAsset() in routes/assets.ts.
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS source_url TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS assets_source_url_uniq ON assets (source_url) WHERE source_url IS NOT NULL`,
    // CSS pattern style storage
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS css_style JSONB DEFAULT NULL`,
  ];
  for (const sql of migrations) {
    await getPool().query(sql).catch(() => {/* column/constraint may already exist */});
  }

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS projects (
      id          SERIAL PRIMARY KEY,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'draft',
      thumbnail   TEXT DEFAULT '',
      duration_ms INTEGER DEFAULT 0,
      meta        JSONB DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS assets (
      id          SERIAL PRIMARY KEY,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL,
      url         TEXT NOT NULL,
      file_path   TEXT DEFAULT '',
      size        INTEGER DEFAULT 0,
      mime_type   TEXT DEFAULT '',
      description TEXT DEFAULT '',
      tags        TEXT[] DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS brand_kits (
      id              SERIAL PRIMARY KEY,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      deleted_at      TIMESTAMPTZ,
      brand_name      TEXT DEFAULT '',
      category        TEXT DEFAULT '',
      audience        TEXT DEFAULT '',
      primary_color   TEXT DEFAULT '#F59E0B',
      secondary_color TEXT DEFAULT '#18181B',
      accent_color    TEXT DEFAULT '#FAFAFA',
      font_family     TEXT DEFAULT 'modern',
      motion_style    TEXT DEFAULT 'cinematic',
      subtitle_style  TEXT DEFAULT 'minimal',
      logo_url        TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS icons (
      id         SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      name       TEXT NOT NULL,
      style      TEXT NOT NULL,
      file_path  TEXT NOT NULL,
      tags       TEXT[] DEFAULT '{}',
      UNIQUE(name, style)
    );

    CREATE TABLE IF NOT EXISTS fonts (
      id                  TEXT PRIMARY KEY,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW(),
      family              TEXT NOT NULL UNIQUE,
      label               TEXT NOT NULL,
      category            TEXT NOT NULL,
      subcategory         TEXT,
      source              TEXT NOT NULL DEFAULT 'google',
      license             TEXT NOT NULL DEFAULT 'OFL-1.1',
      designer            TEXT,
      foundry             TEXT,
      year_released       INTEGER,
      google_font_family  TEXT,
      cdn_url             TEXT,
      s3_key              TEXT,
      local_path          TEXT,
      specimen_text       TEXT,
      pair_category       TEXT,
      pair_role           TEXT,
      semantic_metadata   JSONB
    );

    CREATE TABLE IF NOT EXISTS font_weights (
      id        SERIAL PRIMARY KEY,
      font_id   TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      weight    INTEGER NOT NULL,
      style     TEXT NOT NULL DEFAULT 'normal',
      file_path TEXT,
      s3_key    TEXT,
      UNIQUE(font_id, weight, style)
    );

    CREATE TABLE IF NOT EXISTS font_tags (
      font_id TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      tag     TEXT NOT NULL,
      PRIMARY KEY (font_id, tag)
    );

    CREATE TABLE IF NOT EXISTS font_industry_scores (
      font_id  TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      industry TEXT NOT NULL,
      score    REAL NOT NULL CHECK(score >= 0 AND score <= 1),
      PRIMARY KEY (font_id, industry)
    );

    CREATE TABLE IF NOT EXISTS font_semantic_roles (
      font_id       TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      semantic_role TEXT NOT NULL,
      score         REAL NOT NULL CHECK(score >= 0 AND score <= 1),
      PRIMARY KEY (font_id, semantic_role)
    );

    CREATE TABLE IF NOT EXISTS font_pairings (
      font_id           TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      paired_family     TEXT NOT NULL,
      role              TEXT NOT NULL,
      compatibility_score REAL NOT NULL CHECK(compatibility_score >= 0 AND compatibility_score <= 1),
      PRIMARY KEY (font_id, paired_family, role)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id            SERIAL PRIMARY KEY,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      deleted_at    TIMESTAMPTZ,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      category      TEXT NOT NULL DEFAULT '',
      tags          TEXT[] DEFAULT '{}',
      thumbnail_url TEXT DEFAULT '',
      document      JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS motion_presets (
      id           SERIAL PRIMARY KEY,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW(),
      deleted_at   TIMESTAMPTZ,
      name         TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      category     TEXT NOT NULL DEFAULT '',
      tags         TEXT[] DEFAULT '{}',
      animations   JSONB NOT NULL
    );

  `);

  // Add embedding columns if they don't exist yet — idempotent
  const embeddableTables = ["assets", "icons", "fonts", "templates", "motion_presets"];
  for (const table of embeddableTables) {
    await getPool().query(`
      ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIMS})
    `);
  }

  // HNSW indexes for fast ANN search — idempotent via IF NOT EXISTS
  for (const table of embeddableTables) {
    await getPool().query(`
      CREATE INDEX IF NOT EXISTS ${table}_embedding_hnsw
      ON ${table} USING hnsw (embedding vector_cosine_ops)
    `);
  }

  // One-time migration: copy backgrounds → assets, then drop the old table.
  // The DO block is a no-op once `backgrounds` no longer exists.
  await getPool().query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'backgrounds'
      ) THEN
        INSERT INTO assets (
          created_at, updated_at, deleted_at, name, type, source,
          url, file_path, tags, category, thumbnail_url, pixabay_id, color_palette, embedding
        )
        SELECT
          b.created_at, b.updated_at, b.deleted_at, b.name, b.type, 'stock',
          b.url, COALESCE(b.file_path, ''), b.tags, b.category,
          COALESCE(b.thumbnail_url, ''), b.pixabay_id, COALESCE(b.color_palette, '{}'), b.embedding
        FROM backgrounds b
        WHERE b.pixabay_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM assets a WHERE a.pixabay_id = b.pixabay_id
          );
      END IF;
    END $$;
  `);
  await getPool().query(`DROP TABLE IF EXISTS backgrounds`);

  // Migrate existing fonts table — idempotent
  await getPool().query(`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS pair_category TEXT`);
  await getPool().query(`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS pair_role TEXT`);
  await getPool().query(`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS semantic_metadata JSONB`);

  // Export jobs — idempotent
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS export_jobs (
      id          SERIAL PRIMARY KEY,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      project_id  INTEGER NOT NULL REFERENCES projects(id),
      status      TEXT NOT NULL DEFAULT 'queued',
      progress    INTEGER NOT NULL DEFAULT 0,
      fps         INTEGER NOT NULL DEFAULT 30,
      preset      TEXT NOT NULL DEFAULT '1080p',
      output_path TEXT NOT NULL DEFAULT '',
      error       TEXT NOT NULL DEFAULT ''
    )
  `);

  // Animations catalog — system-defined, seeded from animation-catalog.ts
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS animations (
      id           TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      category     TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      tags         TEXT[] DEFAULT '{}',
      suitable_for TEXT[] DEFAULT '{}'
    )
  `);
  await getPool().query(`ALTER TABLE animations ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIMS})`);
  await getPool().query(`
    CREATE INDEX IF NOT EXISTS animations_embedding_hnsw
    ON animations USING hnsw (embedding vector_cosine_ops)
  `);

  // Composition catalog — system-defined, seeded from COMPOSITION_CATALOG
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS composition_catalog (
      id           TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      use_cases    TEXT[] DEFAULT '{}',
      tags         TEXT[] DEFAULT '{}',
      default_size JSONB  DEFAULT '{}'
    )
  `);
  await getPool().query(`ALTER TABLE composition_catalog ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIMS})`);
  await getPool().query(`
    CREATE INDEX IF NOT EXISTS composition_catalog_embedding_hnsw
    ON composition_catalog USING hnsw (embedding vector_cosine_ops)
  `);

  // Seed animation catalog rows (idempotent)
  for (const entry of ANIMATION_CATALOG) {
    await getPool().query(
      `INSERT INTO animations (id, label, category, description, tags, suitable_for)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET label=$2, category=$3, description=$4, tags=$5, suitable_for=$6`,
      [entry.id, entry.label, entry.category, entry.description, entry.tags, entry.suitable_for]
    );
  }

  // Seed composition catalog rows (idempotent)
  for (const [key, comp] of Object.entries(COMPOSITION_CATALOG)) {
    await getPool().query(
      `INSERT INTO composition_catalog (id, label, description, use_cases, tags, default_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET label=$2, description=$3, use_cases=$4, tags=$5, default_size=$6`,
      [
        key,
        comp.label,
        comp.description,
        comp.typicalUseCases,
        [comp.compositionType, ...comp.typicalUseCases.flatMap((u) => u.toLowerCase().split(/\s+/).slice(0, 3))],
        comp.defaultSize,
      ]
    );
  }

  // Inspiration examples — editor-created assets for LLM context
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS inspiration_examples (
      id           TEXT PRIMARY KEY,
      kind         TEXT NOT NULL CHECK (kind IN ('typography', 'scene', 'video')),
      subcategory  TEXT,
      label        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      meta         JSONB NOT NULL DEFAULT '{}',
      font_pair    JSONB,
      data         JSONB NOT NULL,
      annotations  JSONB NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW(),
      deleted_at   TIMESTAMPTZ
    )
  `);

  console.log("[db] postgres schema ready");
}
