#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerEditingTools } from "./tools/editing.js";
import { registerDiscoveryTools } from "./tools/discovery.js";
import { registerCatalogTools } from "./tools/catalog.js";
import { registerExportTools } from "./tools/export.js";

const server = new McpServer({ name: "kwikk", version: "0.1.0" });

registerProjectTools(server);
registerEditingTools(server);
registerDiscoveryTools(server);
registerCatalogTools(server);
registerExportTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
