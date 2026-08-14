import { Hono } from "hono";
import { executeTool } from "../tool-executor.js";

const DEFAULT_USER_ID = 2;

export const toolRoutes = new Hono();

// POST /v1/tools/:name — generic passthrough to executeTool(). This is the
// one HTTP surface the MCP server calls for discovery/search tools and
// create_project, so tool-executor.ts stays the single implementation shared
// by every caller (CLAUDE.md constraint #7 — AI and humans use the same system).
toolRoutes.post("/:name", async (c) => {
  const name = c.req.param("name");
  const input = await c.req.json().catch(() => ({}));
  const result = await executeTool(name, input, { userId: DEFAULT_USER_ID });
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json(result.data);
});
