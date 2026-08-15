import { Hono } from "hono";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, queryOne, execute } from "../db.js";
import { embedAndStore } from "../embed.js";
import { describeImage } from "../vision.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const DEFAULT_USER_ID = 2;

type DbAsset = {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  type: string;
  url: string;
  file_path: string;
  size: number;
  mime_type: string;
  description: string;
  tags: string[];
  user_id: number | null;
  source_url?: string | null;
};

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function detectType(mime: string, filename: string): string {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  const ext = path.extname(filename).toLowerCase();
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  return "image";
}

export const assetRoutes = new Hono();

/**
 * Shared insert path for anything that gets bytes onto disk (multipart
 * upload or a server-fetched URL): writes the file, inserts the assets row,
 * then kicks off auto-tag (vision) + embed in the background. If the caller
 * already supplied a description/tags (e.g. an MCP client that already knows
 * what the asset is), auto-tagging is skipped — only fills gaps.
 */
export async function insertAssetFromBytes(opts: {
  name: string;
  bytes: Buffer;
  mime: string;
  description: string;
  tags: string[];
  userId: number | null;
  baseUrl: string;
  category?: string;
  source?: string;
  assetType?: string;
  sourceUrl?: string;
}): Promise<DbAsset> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const diskName = `${Date.now()}_${opts.name}`;
  const diskPath = path.join(UPLOADS_DIR, diskName);
  await writeFile(diskPath, opts.bytes);

  const assetType = opts.assetType ?? detectType(opts.mime, opts.name);
  const url = `${opts.baseUrl}/uploads/${diskName}`;

  const asset = (await queryOne<DbAsset>(
    `INSERT INTO assets (name, type, url, file_path, size, mime_type, description, tags, user_id, category, source, source_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'upload'), $12)
     RETURNING *`,
    [opts.name, assetType, url, diskPath, opts.bytes.byteLength, opts.mime, opts.description, opts.tags, opts.userId, opts.category ?? "", opts.source, opts.sourceUrl ?? null]
  ))!;

  if (assetType === "image" && opts.mime.startsWith("image/") && !opts.description && opts.tags.length === 0) {
    void (async () => {
      const { description: autoDesc, tags: autoTags } = await describeImage(diskPath, opts.mime);
      if (autoDesc || autoTags.length) {
        await execute(
          `UPDATE assets SET description = $1, tags = $2, updated_at = NOW() WHERE id = $3`,
          [autoDesc, autoTags, asset.id]
        );
      }
      const embedText = [opts.name, assetType, autoDesc, ...autoTags].filter(Boolean).join(" ");
      embedAndStore("assets", asset.id, embedText);
    })();
  } else {
    const embedText = [opts.name, assetType, opts.description, ...opts.tags].filter(Boolean).join(" ");
    embedAndStore("assets", asset.id, embedText);
  }

  return asset;
}

export function requestBaseUrl(c: { req: { header: (name: string) => string | undefined } }): string {
  return process.env.ASSET_BASE_URL
    ?? `${c.req.header("x-forwarded-proto") ?? "http"}://${c.req.header("host") ?? "localhost:8080"}`;
}

/** Server-fetches `url` and stores it via insertAssetFromBytes, tagging it with sourceUrl. */
async function fetchAndInsert(url: string, opts: {
  baseUrl: string;
  name?: string;
  description?: string;
  tags?: string[];
  userId: number | null;
  category?: string;
  source?: string;
  assetType?: string;
}): Promise<DbAsset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch url: ${res.status}`);
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream";
  const bytes = Buffer.from(await res.arrayBuffer());
  const name = opts.name?.trim() || path.basename(new URL(url).pathname) || "asset";
  return insertAssetFromBytes({
    name,
    bytes,
    mime,
    description: opts.description?.trim() ?? "",
    tags: opts.tags ?? [],
    userId: opts.userId,
    baseUrl: opts.baseUrl,
    category: opts.category,
    source: opts.source,
    assetType: opts.assetType,
    sourceUrl: url,
  });
}

const LOCAL_URL_PREFIXES = ["/uploads/", "/system/", "data:"];

/**
 * Downloads an external image/video/audio URL (e.g. a Pixabay CDN link) into the local
 * asset library and returns the resulting `/uploads/...` URL — so elements referencing it
 * load instantly from this server instead of re-fetching a remote host on every render.
 * Already-local URLs (relative `/uploads/`, `/system/`, `data:`, or already under `baseUrl`)
 * are returned unchanged. Repeated calls with the same URL reuse the first download via the
 * `source_url` unique index. On any fetch failure, falls back to returning the original URL
 * unchanged — a slow/broken remote asset must never block the edit that referenced it.
 */
export async function ensureLocalAsset(url: string | undefined, baseUrl: string): Promise<string | undefined> {
  const trimmed = url?.trim();
  if (!trimmed) return url;
  if (LOCAL_URL_PREFIXES.some((p) => trimmed.startsWith(p)) || trimmed.startsWith(baseUrl)) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  const cached = await queryOne<{ url: string }>(
    "SELECT url FROM assets WHERE source_url = $1 AND deleted_at IS NULL LIMIT 1",
    [trimmed]
  );
  if (cached) return cached.url;

  try {
    const asset = await fetchAndInsert(trimmed, { baseUrl, userId: DEFAULT_USER_ID, source: "stock" });
    return asset.url;
  } catch (e) {
    console.warn(`[assets] failed to localize ${trimmed}: ${(e as Error).message}`);
    return trimmed;
  }
}

assetRoutes.post("/upload", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return c.json({ error: "missing file field" }, 400);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const description = (form.get("description") as string | null) ?? "";
  const tagsRaw = (form.get("tags") as string | null) ?? "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const category = (form.get("category") as string | null) ?? undefined;
  const source = (form.get("source") as string | null) ?? undefined;
  const assetType = (form.get("type") as string | null) ?? undefined;
  const system = (form.get("system") as string | null) === "true";

  const asset = await insertAssetFromBytes({
    name: file.name,
    bytes,
    mime: file.type ?? "",
    description,
    tags,
    userId: system ? null : DEFAULT_USER_ID,
    baseUrl: requestBaseUrl(c),
    category,
    source,
    assetType,
  });

  return c.json(asset, 201);
});

// POST /v1/assets/from-url — server-fetches a URL and stores it like a normal
// upload. Used by the MCP `add_asset` tool so an AI client can add images/
// video/audio/svg_animation content it found (Pixabay, etc.) or generated,
// without needing a multipart file upload. `category`/`source` let the item
// show up in the dedicated backgrounds browser (GET /v1/backgrounds selects
// assets WHERE source IN ('stock','css')); `type` overrides auto-detection,
// e.g. to file an SVG as a "svg_animation" sticker instead of a plain image.
assetRoutes.post("/from-url", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    url?: string; name?: string; description?: string; tags?: string[]; system?: boolean;
    category?: string; source?: string; type?: string;
  } | null;
  const url = body?.url?.trim();
  if (!url) return c.json({ error: "url is required" }, 400);

  // Reuse an existing local copy if this exact URL was already downloaded before.
  const cached = await queryOne<DbAsset>(
    "SELECT * FROM assets WHERE source_url = $1 AND deleted_at IS NULL LIMIT 1",
    [url]
  );
  if (cached) return c.json(cached, 200);

  let asset: DbAsset;
  try {
    asset = await fetchAndInsert(url, {
      baseUrl: requestBaseUrl(c),
      name: body?.name,
      description: body?.description,
      tags: Array.isArray(body?.tags) ? body!.tags! : [],
      userId: body?.system ? null : DEFAULT_USER_ID,
      category: body?.category,
      source: body?.source,
      assetType: body?.type,
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }

  return c.json(asset, 201);
});

assetRoutes.get("/", async (c) => {
  const typeFilter = c.req.query("type");
  let rows: DbAsset[];
  if (typeFilter) {
    rows = await query<DbAsset>(
      "SELECT * FROM assets WHERE user_id = $1 AND type = $2 AND deleted_at IS NULL ORDER BY created_at DESC",
      [DEFAULT_USER_ID, typeFilter]
    );
  } else {
    rows = await query<DbAsset>(
      "SELECT * FROM assets WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
      [DEFAULT_USER_ID]
    );
  }
  return c.json(rows);
});

assetRoutes.delete("/:id", async (c) => {
  const asset = await queryOne<DbAsset>(
    "SELECT * FROM assets WHERE id = $1 AND deleted_at IS NULL",
    [c.req.param("id")]
  );
  if (!asset) return c.json({ error: "not found" }, 404);
  if (asset.file_path) await unlink(asset.file_path).catch(() => {});
  await execute("UPDATE assets SET deleted_at = NOW() WHERE id = $1", [asset.id]);
  return new Response(null, { status: 204 });
});

assetRoutes.patch("/:id/metadata", async (c) => {
  const asset = await queryOne<DbAsset>(
    "SELECT * FROM assets WHERE id = $1 AND deleted_at IS NULL",
    [c.req.param("id")]
  );
  if (!asset) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const updated = await queryOne<DbAsset>(
    `UPDATE assets SET name = $1, type = $2, description = $3, tags = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [
      body.name ?? asset.name,
      body.type ?? asset.type,
      body.description ?? asset.description,
      body.tags ?? asset.tags,
      asset.id,
    ]
  );
  if (updated) {
    const embedText = [updated.name, updated.type, updated.description, ...updated.tags].filter(Boolean).join(" ");
    embedAndStore("assets", updated.id, embedText);
  }
  return c.json(updated);
});
