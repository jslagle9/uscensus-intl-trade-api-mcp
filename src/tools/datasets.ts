import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DATASETS } from "../data/datasets.js";
import { getVariablesForDataset, CensusApiError } from "../services/censusClient.js";
import { datasetSchema, responseFormatSchema, ResponseFormat } from "../schemas/trade.js";
import { CHARACTER_LIMIT } from "../constants.js";

export function registerDatasetTools(server: McpServer): void {
  server.registerTool(
    "census_trade_list_datasets",
    {
      title: "List Census International Trade Datasets",
      description: `List the 9 commodity classification / geography datasets available in the Census International Trade Data API, for both exports and imports.

Use this first when you're not sure which dataset to query. Each dataset covers the same underlying monthly trade data (2010-present) but organizes it by a different commodity classification (HS, NAICS, End-Use, SITC, USDA, Advanced Technology) or geography (state, port instead of customs district).

Args: none.

Returns: For each dataset - its short code (used as the "dataset" parameter in census_trade_query_exports/imports), full name, description, level of detail available for exports vs. imports, and which commodity-code parameters it accepts.

Examples:
  - Use when: "What trade datasets are available?" or "Which dataset has state-level export data?"
  - Don't use when: You already know the dataset code you need - go straight to census_trade_query_exports/imports.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const lines = ["# Census International Trade Datasets", ""];
      for (const d of DATASETS) {
        lines.push(`## ${d.dataset} — ${d.name}`);
        lines.push(d.description);
        lines.push(`- Export detail: ${d.detailExports}`);
        lines.push(`- Import detail: ${d.detailImports}`);
        lines.push(`- Export commodity-code params: ${d.exportCodeParams.join(", ")}`);
        lines.push(`- Import commodity-code params: ${d.importCodeParams.join(", ")}`);
        lines.push("");
      }
      const text = lines.join("\n");
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { datasets: DATASETS },
      };
    }
  );

  const GetVariablesInputSchema = z
    .object({
      direction: z.enum(["exports", "imports"]).describe("Trade direction: 'exports' or 'imports'."),
      dataset: datasetSchema,
      response_format: responseFormatSchema,
    })
    .strict();

  server.registerTool(
    "census_trade_get_dataset_variables",
    {
      title: "Get Valid Variables for a Trade Dataset",
      description: `List every valid Census API variable (field) name for a specific dataset + trade direction, straight from the Census API's own metadata.

Use this before calling census_trade_query_exports/imports when you're unsure which variable names are valid to put in the "get" or "filters" parameters - the Census API rejects unknown variable names with a 400 error, and valid variables differ by dataset (e.g. "SITC" is only valid on the sitc dataset, not hs).

Args:
  - direction ('exports' | 'imports'): which trade direction's variable list to fetch
  - dataset (string): dataset code, e.g. 'hs', 'naics', 'statehs' (see census_trade_list_datasets for the full list)
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: For each variable - its name, human-readable label, whether it's required, and its type (string/int/datetime).

Examples:
  - Use when: "What fields can I request from the imports NAICS endpoint?"
  - Use when: You got a "unknown variable" error from census_trade_query_exports and need to find the correct name
  - Don't use when: You just want dataset descriptions, not field-level detail - use census_trade_list_datasets instead`,
      inputSchema: GetVariablesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const variables = await getVariablesForDataset(params.direction, params.dataset);
        variables.sort((a, b) => a.name.localeCompare(b.name));

        if (params.response_format === ResponseFormat.JSON) {
          const structuredContent = { direction: params.direction, dataset: params.dataset, count: variables.length, variables };
          return {
            content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
            structuredContent,
          };
        }

        const lines = [`# Variables for ${params.direction}/${params.dataset}`, "", "| Name | Required | Type | Label |", "| --- | --- | --- | --- |"];
        for (const v of variables) {
          lines.push(`| ${v.name} | ${v.required ?? ""} | ${v.predicateType ?? ""} | ${v.label.replace(/\|/g, "\\|")} |`);
        }
        let text = lines.join("\n");
        if (text.length > CHARACTER_LIMIT) text = text.slice(0, CHARACTER_LIMIT) + "\n\n_Truncated._";

        return { content: [{ type: "text" as const, text }] };
      } catch (error) {
        const message = error instanceof CensusApiError ? error.message : `Unexpected error: ${String(error)}`;
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }
    }
  );
}
