import { config } from "dotenv";
import { fileURLToPath as _ftu } from "node:url";
import _path from "node:path";
config({ path: _path.resolve(_path.dirname(_ftu(import.meta.url)), "../.env") });

import fs from "node:fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initDb, query } from "./db.js";
import { projectRoutes } from "./routes/projects.js";
import { assetRoutes } from "./routes/assets.js";
import { brandKitRoutes } from "./routes/brand-kit.js";
import { fontRoutes } from "./routes/fonts.js";
import { iconRoutes } from "./routes/icons.js";
import { exportRoutes } from "./routes/exports.js";
import { renderRoutes } from "./routes/render.js";
import { searchRoutes } from "./routes/search.js";
import { adminRoutes } from "./routes/admin.js";
import { backgroundRoutes } from "./routes/backgrounds.js";
import { templateRoutes } from "./routes/templates.js";
import { motionPresetRoutes } from "./routes/motion-presets.js";
import { animationRoutes } from "./routes/animations.js";
import { exampleRoutes } from "./routes/examples.js";
import { toolRoutes } from "./routes/tools.js";
import { ttsRoutes } from "./routes/tts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Persistent logging ────────────────────────────────────────────────────────
const LOG_FILE = process.env.LOG_FILE ?? "/tmp/kwikk-api.log";
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
function logLine(line: string) {
  const ts = new Date().toISOString();
  const msg = `${ts} ${line}\n`;
  process.stdout.write(msg);
  logStream.write(msg);
}
console.log  = (...a) => logLine("[LOG] " + a.map(String).join(" "));
console.error = (...a) => logLine("[ERR] " + a.map(String).join(" "));
logLine("[START] kwikk-api starting, log → " + LOG_FILE);

const app = new Hono();

// Log every request
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  logLine(`[HTTP] ${c.req.method} ${c.req.path} → ${c.res.status} (${Date.now() - start}ms)`);
});

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(
  "/uploads/*",
  serveStatic({ root: path.resolve(__dirname, "../"), rewriteRequestPath: (p) => p })
);

// System assets — version-controlled, not user-generated. Lives in apps/api/system/
app.use(
  "/system/*",
  serveStatic({ root: path.resolve(__dirname, "../"), rewriteRequestPath: (p) => p })
);

app.get("/health", (c) => c.json({ status: "ok", service: "kwikk-api" }));

app.get("/v1/architecture", (c) =>
  c.json({
    editor: "React + TypeScript + Zustand",
    renderer: "PixiJS deterministic scene renderer",
    timeline: "semantic-first sequencing layer",
    export_pipeline: "Pixi frame output -> FFmpeg -> MP4",
    ai_contract: [
      "create_hook_scene",
      "increase_pacing",
      "insert_cta",
      "apply_motion_pack",
      "blur_sensitive_region",
    ],
  })
);

// Public system-asset catalog — no auth.
// ?type=svg_animation|image|video   ?q=search term
app.get("/v1/system-assets", async (c) => {
  const q = (c.req.query("q") ?? "").trim().toLowerCase();
  const type = c.req.query("type") ?? "";
  type Row = { id: number; name: string; url: string; tags: string[]; mime_type: string; type: string };
  const validTypes = new Set(["svg_animation", "image", "video"]);
  const typeClause = validTypes.has(type) ? `AND type = '${type}'` : "";
  let rows: Row[];
  if (q) {
    rows = await query<Row>(
      `SELECT id, name, url, tags, mime_type, type FROM assets
       WHERE user_id IS NULL AND deleted_at IS NULL ${typeClause}
       AND (LOWER(name) LIKE $1 OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t LIKE $1))
       ORDER BY type, name ASC`,
      [`%${q}%`]
    );
  } else {
    rows = await query<Row>(
      `SELECT id, name, url, tags, mime_type, type FROM assets
       WHERE user_id IS NULL AND deleted_at IS NULL ${typeClause}
       ORDER BY type, name ASC`,
      []
    );
  }
  return c.json(rows);
});

app.route("/v1/fonts", fontRoutes);
app.route("/v1/icons", iconRoutes);
app.route("/v1/projects", projectRoutes);
app.route("/v1/assets", assetRoutes);
app.route("/v1/brand-kit", brandKitRoutes);
app.route("/v1/exports", exportRoutes);
app.route("/v1/render", renderRoutes);
app.route("/v1/search", searchRoutes);
app.route("/v1/admin", adminRoutes);
app.route("/v1/backgrounds", backgroundRoutes);
app.route("/v1/templates", templateRoutes);
app.route("/v1/motion-presets", motionPresetRoutes);
app.route("/v1/animations", animationRoutes);
app.route("/v1/examples", exampleRoutes);
app.route("/v1/tools", toolRoutes);
app.route("/v1/tts", ttsRoutes);

const PORT = parseInt(process.env.PORT ?? "8080", 10);

// Initialise DB schema before accepting requests
await initDb();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`kwikk-api listening on http://localhost:${PORT}`);
});
