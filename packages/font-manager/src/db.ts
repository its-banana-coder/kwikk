import pg from "pg";
import type {
  FontRecord,
  FontSummary,
  FontWeightRecord,
  FontPairing,
  FontQueryOptions,
  FontInsert,
  TypographyPairCategory,
} from "./types.js";

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/kwikk",
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return _pool;
}

// Alias kept for scripts that import getDb
export const getDb = getPool;

// ---------------------------------------------------------------------------
// Schema — idempotent, safe to call on every seed/start
// ---------------------------------------------------------------------------

export async function ensureSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fonts (
      id                TEXT PRIMARY KEY,
      family            TEXT NOT NULL UNIQUE,
      label             TEXT NOT NULL,
      category          TEXT NOT NULL,
      subcategory       TEXT,
      source            TEXT NOT NULL DEFAULT 'google',
      license           TEXT NOT NULL DEFAULT 'OFL-1.1',
      designer          TEXT,
      foundry           TEXT,
      year_released     INTEGER,
      google_font_family TEXT,
      cdn_url           TEXT,
      s3_key            TEXT,
      local_path        TEXT,
      specimen_text     TEXT,
      pair_category     TEXT,
      pair_role         TEXT,
      semantic_metadata JSONB,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
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
      font_id             TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      paired_family       TEXT NOT NULL,
      role                TEXT NOT NULL,
      compatibility_score REAL NOT NULL CHECK(compatibility_score >= 0 AND compatibility_score <= 1),
      PRIMARY KEY (font_id, paired_family, role)
    );

    CREATE INDEX IF NOT EXISTS idx_fonts_category      ON fonts(category);
    CREATE INDEX IF NOT EXISTS idx_fonts_source        ON fonts(source);
    CREATE INDEX IF NOT EXISTS idx_fonts_pair_category ON fonts(pair_category);
    CREATE INDEX IF NOT EXISTS idx_font_tags_tag       ON font_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_font_industry_scores_industry
      ON font_industry_scores(industry, score DESC);
    CREATE INDEX IF NOT EXISTS idx_font_semantic_roles_role
      ON font_semantic_roles(semantic_role, score DESC);
  `);

  // Migrate existing fonts table — add pair columns if absent
  await pool.query(`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS pair_category TEXT`);
  await pool.query(`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS pair_role TEXT`);
  await pool.query(`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS semantic_metadata JSONB`);
}

// ---------------------------------------------------------------------------
// Assembler
// ---------------------------------------------------------------------------

type FontRow = {
  id: string; family: string; label: string; category: string;
  subcategory: string | null; source: string; license: string;
  designer: string | null; foundry: string | null; year_released: number | null;
  google_font_family: string | null; cdn_url: string | null;
  s3_key: string | null; local_path: string | null;
  specimen_text: string | null;
  pair_category: TypographyPairCategory | null; pair_role: string | null;
  semantic_metadata: Record<string, unknown> | null;
  created_at: string; updated_at: string;
};

function buildFallbackSemanticMetadata(input: FontInsert): Record<string, unknown> {
  return {
    category: input.category,
    subcategory: input.subcategory ?? null,
    source: input.source,
    license: input.license,
    designer: input.designer ?? null,
    foundry: input.foundry ?? null,
    year_released: input.year_released ?? null,
    google_font_family: input.google_font_family ?? null,
    specimen_text: input.specimen_text ?? null,
    pair_category: input.pair_category ?? null,
    pair_role: input.pair_role ?? null,
    tags: input.tags,
    weights: input.weights.map((weight) => ({ weight: weight.weight, style: weight.style ?? "normal" })),
    industry_scores: input.industry_scores,
    semantic_roles: input.semantic_roles,
    pairings: (input.pairings ?? []).map((pairing) => ({
      paired_family: pairing.paired_family,
      role: pairing.role,
      compatibility_score: pairing.compatibility_score,
    })),
  };
}

async function assembleRecord(pool: pg.Pool, row: FontRow): Promise<FontRecord> {
  const [weights, tagRows, industryRows, roleRows, pairingRows] = await Promise.all([
    pool.query<FontWeightRecord>(
      "SELECT weight, style, file_path, s3_key FROM font_weights WHERE font_id = $1 ORDER BY weight",
      [row.id]
    ),
    pool.query<{ tag: string }>(
      "SELECT tag FROM font_tags WHERE font_id = $1",
      [row.id]
    ),
    pool.query<{ industry: string; score: number }>(
      "SELECT industry, score FROM font_industry_scores WHERE font_id = $1",
      [row.id]
    ),
    pool.query<{ semantic_role: string; score: number }>(
      "SELECT semantic_role, score FROM font_semantic_roles WHERE font_id = $1",
      [row.id]
    ),
    pool.query<FontPairing>(
      "SELECT paired_family, role, compatibility_score FROM font_pairings WHERE font_id = $1",
      [row.id]
    ),
  ]);

  return {
    ...(row as unknown as FontRecord),
    weights: weights.rows,
    tags: tagRows.rows.map((r) => r.tag),
    industry_scores: Object.fromEntries(industryRows.rows.map((r) => [r.industry, r.score])),
    semantic_roles: Object.fromEntries(roleRows.rows.map((r) => [r.semantic_role, r.score])),
    pairings: pairingRows.rows,
  };
}

function toSummary(record: FontRecord): FontSummary {
  return {
    id: record.id,
    family: record.family,
    label: record.label,
    category: record.category,
    subcategory: record.subcategory,
    source: record.source,
    license: record.license,
    google_font_family: record.google_font_family,
    cdn_url: record.cdn_url,
    pair_category: record.pair_category,
    pair_role: record.pair_role,
    semantic_metadata: record.semantic_metadata,
    weights: record.weights.map((w) => ({ weight: w.weight, style: w.style })),
    tags: record.tags,
    industry_scores: record.industry_scores,
    semantic_roles: record.semantic_roles,
  };
}

// ---------------------------------------------------------------------------
// Public query API
// ---------------------------------------------------------------------------

export async function queryFonts(opts: FontQueryOptions = {}): Promise<FontSummary[]> {
  const pool = getPool();

  const joins: string[] = [];
  const wheres: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (opts.tags && opts.tags.length > 0) {
    opts.tags.forEach((tag) => {
      joins.push(`JOIN font_tags ft${p} ON ft${p}.font_id = f.id AND ft${p}.tag = $${p}`);
      params.push(tag); p++;
    });
  }
  if (opts.industry) {
    joins.push(`JOIN font_industry_scores fis ON fis.font_id = f.id AND fis.industry = $${p}`);
    params.push(opts.industry); p++;
    if (opts.min_industry_score != null) {
      wheres.push(`fis.score >= $${p}`); params.push(opts.min_industry_score); p++;
    }
  }
  if (opts.semantic_role) {
    joins.push(`JOIN font_semantic_roles fsr ON fsr.font_id = f.id AND fsr.semantic_role = $${p}`);
    params.push(opts.semantic_role); p++;
    if (opts.min_semantic_score != null) {
      wheres.push(`fsr.score >= $${p}`); params.push(opts.min_semantic_score); p++;
    }
  }
  if (opts.category)      { wheres.push(`f.category = $${p}`);      params.push(opts.category);      p++; }
  if (opts.source)        { wheres.push(`f.source = $${p}`);        params.push(opts.source);        p++; }
  if (opts.pair_category) { wheres.push(`f.pair_category = $${p}`); params.push(opts.pair_category); p++; }
  if (opts.pair_role)     { wheres.push(`f.pair_role = $${p}`);     params.push(opts.pair_role);     p++; }

  let sql = "SELECT DISTINCT f.* FROM fonts f";
  if (joins.length)  sql += " " + joins.join(" ");
  if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
  sql += " ORDER BY f.label";
  if (opts.limit)  { sql += ` LIMIT $${p}`;  params.push(opts.limit);  p++; }
  if (opts.offset) { sql += ` OFFSET $${p}`; params.push(opts.offset); p++; }

  const { rows } = await pool.query<FontRow>(sql, params);
  const records = await Promise.all(rows.map((row) => assembleRecord(pool, row)));
  return records.map(toSummary);
}

export async function getFontByFamily(family: string): Promise<FontRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<FontRow>("SELECT * FROM fonts WHERE family = $1", [family]);
  if (!rows[0]) return null;
  return assembleRecord(pool, rows[0]);
}

export async function getFontById(id: string): Promise<FontRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<FontRow>("SELECT * FROM fonts WHERE id = $1", [id]);
  if (!rows[0]) return null;
  return assembleRecord(pool, rows[0]);
}

// ---------------------------------------------------------------------------
// Insert / upsert
// ---------------------------------------------------------------------------

export async function insertFont(input: FontInsert): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  const semanticMetadata = input.semantic_metadata ?? buildFallbackSemanticMetadata(input);

  try {
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO fonts
        (id, family, label, category, subcategory, source, license, designer, foundry,
         year_released, google_font_family, cdn_url, s3_key, local_path, specimen_text,
         pair_category, pair_role, semantic_metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO UPDATE SET
        label=EXCLUDED.label, category=EXCLUDED.category, subcategory=EXCLUDED.subcategory,
        source=EXCLUDED.source, license=EXCLUDED.license, designer=EXCLUDED.designer,
        foundry=EXCLUDED.foundry, year_released=EXCLUDED.year_released,
        google_font_family=EXCLUDED.google_font_family, cdn_url=EXCLUDED.cdn_url,
        s3_key=EXCLUDED.s3_key, local_path=EXCLUDED.local_path,
        specimen_text=EXCLUDED.specimen_text, pair_category=EXCLUDED.pair_category,
        pair_role=EXCLUDED.pair_role, semantic_metadata=EXCLUDED.semantic_metadata,
        updated_at=NOW()
    `, [
      input.id, input.family, input.label, input.category, input.subcategory ?? null,
      input.source, input.license, input.designer ?? null, input.foundry ?? null,
      input.year_released ?? null, input.google_font_family ?? null,
      input.cdn_url ?? null, input.s3_key ?? null, input.local_path ?? null,
      input.specimen_text ?? null, input.pair_category ?? null, input.pair_role ?? null,
      JSON.stringify(semanticMetadata),
    ]);

    await client.query("DELETE FROM font_weights WHERE font_id = $1", [input.id]);
    for (const w of input.weights) {
      await client.query(
        "INSERT INTO font_weights (font_id, weight, style, file_path, s3_key) VALUES ($1,$2,$3,$4,$5)",
        [input.id, w.weight, w.style ?? "normal", w.file_path ?? null, w.s3_key ?? null]
      );
    }

    await client.query("DELETE FROM font_tags WHERE font_id = $1", [input.id]);
    for (const tag of input.tags) {
      await client.query("INSERT INTO font_tags (font_id, tag) VALUES ($1,$2)", [input.id, tag]);
    }

    await client.query("DELETE FROM font_industry_scores WHERE font_id = $1", [input.id]);
    for (const [industry, score] of Object.entries(input.industry_scores)) {
      await client.query(
        "INSERT INTO font_industry_scores (font_id, industry, score) VALUES ($1,$2,$3)",
        [input.id, industry, score]
      );
    }

    await client.query("DELETE FROM font_semantic_roles WHERE font_id = $1", [input.id]);
    for (const [role, score] of Object.entries(input.semantic_roles)) {
      await client.query(
        "INSERT INTO font_semantic_roles (font_id, semantic_role, score) VALUES ($1,$2,$3)",
        [input.id, role, score]
      );
    }

    await client.query("DELETE FROM font_pairings WHERE font_id = $1", [input.id]);
    for (const pairing of input.pairings ?? []) {
      await client.query(
        "INSERT INTO font_pairings (font_id, paired_family, role, compatibility_score) VALUES ($1,$2,$3,$4)",
        [input.id, pairing.paired_family, pairing.role, pairing.compatibility_score]
      );
    }

    // If the app DB has pgvector enabled, mark this font for re-embedding.
    await client.query("UPDATE fonts SET embedding = NULL WHERE id = $1", [input.id]).catch(() => {});

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteFont(id: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query("DELETE FROM fonts WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
