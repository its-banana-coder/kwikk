/**
 * Font file storage utilities — local disk and S3-compatible.
 *
 * Environment variables for S3:
 *   S3_BUCKET        — required when using S3 storage
 *   S3_ENDPOINT      — optional, for non-AWS providers (Cloudflare R2, MinIO, etc.)
 *   S3_REGION        — default "us-east-1"
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 */
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../../");

export type StorageBackend = "local" | "s3";

export interface StoredFile {
  /** Absolute local path (local backend) or null */
  file_path: string | null;
  /** S3 object key (s3 backend) or null */
  s3_key: string | null;
}

function fontSlug(family: string): string {
  return family.toLowerCase().replace(/\s+/g, "-");
}

function localFontDir(): string {
  const dataDir = process.env["KWIKK_DATA_DIR"] ?? path.join(WORKSPACE_ROOT, "data");
  return path.join(dataDir, "fonts");
}

// ---------------------------------------------------------------------------
// Local storage
// ---------------------------------------------------------------------------

export function storeLocal(
  srcPath: string,
  family: string,
  weight: number,
  style: "normal" | "italic" = "normal",
): StoredFile {
  const ext = path.extname(srcPath).toLowerCase() || ".ttf";
  const slug = fontSlug(family);
  const styleSuffix = style === "italic" ? "-italic" : "";
  const destDir = path.join(localFontDir(), slug);
  fs.mkdirSync(destDir, { recursive: true });

  const filename = `${weight}${styleSuffix}${ext}`;
  const destPath = path.join(destDir, filename);
  fs.copyFileSync(srcPath, destPath);

  return { file_path: destPath, s3_key: null };
}

export function resolveLocalUrl(family: string, weight: number, style: "normal" | "italic" = "normal"): string {
  const slug = fontSlug(family);
  const styleSuffix = style === "italic" ? "-italic" : "";
  return `/fonts/${slug}/file/${weight}${styleSuffix}`;
}

// ---------------------------------------------------------------------------
// S3 storage
// ---------------------------------------------------------------------------

export async function storeS3(
  srcPath: string,
  family: string,
  weight: number,
  style: "normal" | "italic" = "normal",
): Promise<StoredFile> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const bucket = process.env["S3_BUCKET"];
  if (!bucket) throw new Error("S3_BUCKET env var is required for S3 storage");

  const endpoint = process.env["S3_ENDPOINT"];
  const region   = process.env["S3_REGION"] ?? "us-east-1";

  const s3 = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });

  const ext = path.extname(srcPath).toLowerCase() || ".ttf";
  const slug = fontSlug(family);
  const styleSuffix = style === "italic" ? "-italic" : "";
  const key = `fonts/${slug}/${weight}${styleSuffix}${ext}`;

  const body = fs.createReadStream(srcPath);
  const contentType = ext === ".ttf" ? "font/ttf"
    : ext === ".otf"  ? "font/otf"
    : ext === ".woff" ? "font/woff"
    : ext === ".woff2"? "font/woff2"
    : "application/octet-stream";

  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));

  console.log(`Uploaded s3://${bucket}/${key}`);
  return { file_path: null, s3_key: key };
}

// ---------------------------------------------------------------------------
// Presigned URL for serving S3-stored fonts via the API
// ---------------------------------------------------------------------------

export async function presignFontUrl(s3Key: string, expiresIn = 3600): Promise<string> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner" as string);

  const bucket = process.env["S3_BUCKET"];
  if (!bucket) throw new Error("S3_BUCKET env var is required");

  const s3 = new S3Client({
    region: process.env["S3_REGION"] ?? "us-east-1",
    ...(process.env["S3_ENDPOINT"] ? { endpoint: process.env["S3_ENDPOINT"], forcePathStyle: true } : {}),
  });

  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: s3Key }), { expiresIn });
}

// ---------------------------------------------------------------------------
// Serve a local font file as a Buffer (used by the API route)
// ---------------------------------------------------------------------------

export function readLocalFontFile(family: string, weight: number, style: "normal" | "italic" = "normal"): Buffer | null {
  const slug = fontSlug(family);
  const styleSuffix = style === "italic" ? "-italic" : "";
  const dir = path.join(localFontDir(), slug);

  for (const ext of [".ttf", ".otf", ".woff2", ".woff"]) {
    const p = path.join(dir, `${weight}${styleSuffix}${ext}`);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  return null;
}
