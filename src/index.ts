#!/usr/bin/env node
/**
 * MCP server for the U.S. Census Bureau International Trade Data API.
 *
 * Exposes tools to query monthly U.S. export and import statistics (January 2010-present)
 * by Harmonized System, NAICS, End-Use, SITC, USDA, and Advanced Technology commodity
 * classifications, plus state- and port-level detail, along with workflow tools for
 * computing trade balances and ranking top trading partners.
 *
 * Docs: https://www.census.gov/data/developers/data-sets/international-trade.html
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { registerDatasetTools } from "./tools/datasets.js";
import { registerQueryTools } from "./tools/query.js";
import { registerAnalysisTools } from "./tools/analysis.js";
import { registerCountryTools } from "./tools/countries.js";

const server = new McpServer({
  name: "uscensus-intl-trade-api-mcp",
  version: "1.0.0",
});

registerDatasetTools(server);
registerQueryTools(server);
registerAnalysisTools(server);
registerCountryTools(server);

function requireApiKey(): void {
  if (!process.env.CENSUS_API_KEY) {
    console.error(
      "ERROR: CENSUS_API_KEY environment variable is required. " +
        "Request a free key at https://api.census.gov/data/key_signup.html"
    );
    process.exit(1);
  }
}

async function runStdio(): Promise<void> {
  requireApiKey();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("uscensus-intl-trade-api-mcp server running via stdio");
}

async function runHttp(): Promise<void> {
  requireApiKey();
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "127.0.0.1", () => {
    console.error(`uscensus-intl-trade-api-mcp server running on http://127.0.0.1:${port}/mcp`);
  });
}

const transportMode = process.env.TRANSPORT || "stdio";
if (transportMode === "http") {
  runHttp().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
