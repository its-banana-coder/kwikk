import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiPost, downloadFile, toResult } from "../client.js";

export function registerExportTools(server: McpServer) {
  server.tool(
    "export_project",
    "Trigger a headless MP4 render of a project. Returns a job id — poll get_export_status to check progress. " +
      "Once status is 'done', you'll have two options: share the returned downloadUrl as a link, or call " +
      "download_export to save the MP4 to local disk. Don't download automatically — ask the user which they want.",
    {
      projectId: z.union([z.string(), z.number()]),
      fps: z.number().int().optional().describe("default 30"),
      preset: z.enum(["720p", "1080p", "4k"]).optional().describe("default '1080p'"),
    },
    async ({ projectId, fps, preset }: { projectId: number | string; fps?: number; preset?: string }) =>
      toResult(() => apiPost("/v1/exports", { projectId, fps, preset }))
  );

  server.tool(
    "get_export_status",
    "Check the status/progress of an export job. Once status is 'done', the response includes an absolute, " +
      "directly-fetchable downloadUrl. At that point present the user two options: (1) share/open that " +
      "downloadUrl as a link to the video, or (2) call download_export with the same jobId to save the MP4 " +
      "to local disk. Don't call download_export automatically — ask which the user wants first.",
    { jobId: z.union([z.string(), z.number()]) },
    async ({ jobId }: { jobId: number | string }) => toResult(() => apiGet(`/v1/exports/${jobId}`))
  );

  server.tool(
    "download_export",
    "Download a completed export's MP4 to local disk and return the absolute file path. Only call this when " +
      "the user has chosen the 'save a local copy' option over just getting the link — if they just want to " +
      "view or share the video, the downloadUrl from get_export_status is enough on its own. The job must be " +
      "'done' (check with get_export_status first) — this streams the video from the kwikk-api server this " +
      "MCP instance is configured against, so it works regardless of where that server is hosted. By default " +
      "saves into the current working directory.",
    {
      jobId: z.union([z.string(), z.number()]),
      destinationPath: z.string().optional().describe("absolute local path to save to; defaults to export_<jobId>.mp4 in the current working directory"),
    },
    async ({ jobId, destinationPath }: { jobId: number | string; destinationPath?: string }) =>
      toResult(() =>
        downloadFile(
          `/v1/exports/${jobId}/download`,
          destinationPath ?? path.join(process.cwd(), `export_${jobId}.mp4`)
        )
      )
  );
}
