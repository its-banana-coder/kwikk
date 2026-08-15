/**
 * Thin HTTP client to a running kwikk-api instance. apps/mcp holds no DB
 * connection and no business logic — every tool call is a fetch() to the API,
 * so this server can point at any kwikk-api deployment via KWIKK_API_URL.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const API_URL = (process.env.KWIKK_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class KwikkApiError extends Error {}

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data && (data.error ?? data.message)) ?? `${res.status} ${res.statusText}`;
    throw new KwikkApiError(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

export const apiGet = (path: string) => request("GET", path);
export const apiPost = (path: string, body?: unknown) => request("POST", path, body);
export const apiPut = (path: string, body?: unknown) => request("PUT", path, body);
export const apiDelete = (path: string) => request("DELETE", path);

/**
 * Streams a binary response (e.g. an export MP4) from the API to a local file. MCP tools can only
 * return text/JSON content blocks, so "downloading" a file means writing it to disk here — where
 * this server process actually has filesystem access — and handing back the resulting path.
 */
export async function downloadFile(apiPath: string, destPath?: string): Promise<{ path: string; bytes: number }> {
  const res = await fetch(`${API_URL}${apiPath}`);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      message = (data && (data.error ?? data.message)) ?? message;
    } catch {
      // body wasn't JSON — fall back to the status line
    }
    throw new KwikkApiError(typeof message === "string" ? message : JSON.stringify(message));
  }

  const dest = destPath ?? path.join(os.tmpdir(), "kwikk-exports", path.basename(apiPath) || "download");
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buffer);

  return { path: dest, bytes: buffer.length };
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".bmp": "image/bmp",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".m4v": "video/x-m4v", ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac",
};

/**
 * Reads a local file (from this MCP server process's own filesystem — the only
 * place a "local file path" is meaningful, since apps/api may run on a different
 * host) and multipart-uploads it to an API endpoint, e.g. /v1/assets/upload.
 * Mirrors downloadFile()'s role in reverse: local disk access lives here so
 * tool handlers never need direct fs access.
 */
export async function uploadFile(
  apiPath: string,
  filePath: string,
  fields: Record<string, string | undefined> = {},
  name?: string
): Promise<unknown> {
  const resolved = path.resolve(filePath);
  const bytes = await fs.promises.readFile(resolved);
  const mime = MIME_BY_EXT[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";

  const form = new FormData();
  form.set("file", new Blob([bytes], { type: mime }), name?.trim() || path.basename(resolved));
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.set(key, value);
  }

  const res = await fetch(`${API_URL}${apiPath}`, { method: "POST", body: form });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.error ?? data.message)) ?? `${res.status} ${res.statusText}`;
    throw new KwikkApiError(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

/** Calls the generic tool passthrough — POST /v1/tools/:name (executeTool()). */
export const callTool = (name: string, input: Record<string, unknown> = {}) =>
  apiPost(`/v1/tools/${name}`, input);

/** Applies one EditorOperation to a project — POST /v1/projects/:id/operations. */
export const applyOperation = (projectId: number | string, operation: Record<string, unknown>) =>
  apiPost(`/v1/projects/${projectId}/operations`, operation);

export type ToolResponse = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Wraps an API call as an MCP tool result — success is JSON text, failure is a structured tool error. */
export async function toResult(work: () => Promise<unknown>): Promise<ToolResponse> {
  try {
    const data = await work();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true };
  }
}

/** JSON-Schema-friendly permissive object, for EditorOperation fields whose exact shape isn't worth re-declaring in zod. */
export const jsonValue = z.record(z.string(), z.any());

/**
 * Registers a named tool that builds one EditorOperation (by name + a set of
 * extra fields) and applies it via POST /v1/projects/:id/operations. This is
 * the pattern behind every project-edit tool — see tools/projects.ts and
 * tools/editing.ts.
 */
export function opTool(
  server: McpServer,
  name: string,
  description: string,
  shape: Record<string, z.ZodTypeAny>,
  buildOperation: (args: Record<string, unknown>) => Record<string, unknown>
) {
  server.tool(
    name,
    description,
    { projectId: z.union([z.string(), z.number()]), ...shape },
    async (args: Record<string, unknown>) =>
      toResult(() => applyOperation(args.projectId as number | string, buildOperation(args)))
  );
}
