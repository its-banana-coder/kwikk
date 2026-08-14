import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

type StorageModule = typeof import("./storage");

async function importStorage(): Promise<StorageModule> {
  vi.resetModules();
  return await import("./storage");
}

describe("@kwikk/font-manager storage helpers", () => {
  async function withTempDir(testFn: (storage: StorageModule) => Promise<void>) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kwikk-font-storage-"));
    try {
      process.env.KWIKK_DATA_DIR = tmpDir;
      const storage = await importStorage();
      await testFn(storage);
    } finally {
      delete process.env.KWIKK_DATA_DIR;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  it("stores local font files and resolves local URLs", async () => {
    await withTempDir(async (storage) => {
      const srcPath = path.join(process.env.KWIKK_DATA_DIR!, "source.otf");
      await fs.writeFile(srcPath, "dummy-font-content");

      const stored = storage.storeLocal(srcPath, "My Font", 500, "italic");
      expect(stored.s3_key).toBeNull();
      expect(stored.file_path).toContain("/fonts/my-font/500-italic.otf");

      await expect(fs.access(stored.file_path!)).resolves.toBeUndefined();
      const loaded = storage.readLocalFontFile("My Font", 500, "italic");
      expect(loaded?.toString()).toBe("dummy-font-content");
      expect(storage.resolveLocalUrl("My Font", 500, "italic")).toBe("/fonts/my-font/file/500-italic");
      expect(storage.readLocalFontFile("Missing Font", 400)).toBeNull();
    });
  });

  it("throws when S3_BUCKET is not configured for S3 storage", async () => {
    delete process.env.S3_BUCKET;
    const storage = await importStorage();
    await expect(storage.storeS3("unused.ttf", "My Font", 400)).rejects.toThrow(
      "S3_BUCKET env var is required for S3 storage"
    );
  });

  it("throws when S3_BUCKET is not configured for presigned URLs", async () => {
    delete process.env.S3_BUCKET;
    const storage = await importStorage();
    await expect(storage.presignFontUrl("fonts/my-font/400.ttf")).rejects.toThrow(
      "S3_BUCKET env var is required"
    );
  });
});
