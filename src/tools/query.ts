import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { queryCensusTrade, CensusApiError } from "../services/censusClient.js";
import { formatRows } from "../services/format.js";
import {
  datasetSchema,
  getFieldsSchema,
  filtersSchema,
  commLevelSchema,
  summaryLevelSchema,
  responseFormatSchema,
} from "../schemas/trade.js";
import type { TradeDirection } from "../types.js";

const QueryInputSchema = z
  .object({
    dataset: datasetSchema,
    get: getFieldsSchema,
    time: z
      .string()
      .min(6)
      .max(30)
      .optional()
      .describe(
        "Time period as 'YYYY-MM' (e.g. '2024-03') or a range 'from YYYY-MM to YYYY-MM'. " +
          "Either 'time' or both 'year' and 'months' is required."
      ),
    year: z
      .string()
      .regex(/^\d{4}$/)
      .optional()
      .describe("4-digit year, used with 'months' instead of 'time'."),
    months: z
      .array(z.string().regex(/^\d{2}$/))
      .min(1)
      .max(12)
      .optional()
      .describe("2-digit months (e.g. ['01','02']), used with 'year' instead of 'time'."),
    filters: filtersSchema,
    comm_level: commLevelSchema,
    summary_level: summaryLevelSchema,
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(100)
      .describe("Maximum number of rows to return (the tool fetches all matching rows from Census, then truncates to this limit client-side)."),
    response_format: responseFormatSchema,
  })
  .strict();

type QueryInput = z.infer<typeof QueryInputSchema>;

async function runQuery(direction: TradeDirection, params: QueryInput) {
  if (!params.time && !(params.year && params.months?.length)) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: "Error: either 'time' (e.g. \"2024-03\" or \"from 2023-01 to 2023-12\") or both 'year' and 'months' must be provided.",
        },
      ],
    };
  }

  try {
    const rows = await queryCensusTrade({
      direction,
      dataset: params.dataset,
      get: params.get,
      time: params.time,
      year: params.year,
      months: params.months,
      filters: params.filters,
      commLevel: params.comm_level,
      summaryLevel: params.summary_level,
    });

    const limited = rows.slice(0, params.limit);
    const { text, structuredContent } = formatRows(limited, params.response_format, `${direction}/${params.dataset}`);

    const suffix =
      rows.length > limited.length
        ? `\n\n_Showing ${limited.length} of ${rows.length} matching rows (limit=${params.limit}). Increase 'limit' or add filters to narrow results._`
        : "";

    return {
      content: [{ type: "text" as const, text: text + suffix }],
      ...(structuredContent ? { structuredContent: { ...structuredContent, totalMatching: rows.length } } : {}),
    };
  } catch (error) {
    const message = error instanceof CensusApiError ? error.message : `Unexpected error: ${String(error)}`;
    return { isError: true, content: [{ type: "text" as const, text: message }] };
  }
}

const SHARED_DESCRIPTION_TAIL = `
Best practices (per the Census API User Guide):
  - Prefer narrow queries: the Census API times out on very large requests (e.g. all countries x all HS10 codes). Add country/commodity/district filters, or split wildcard commodity queries (e.g. query "1*" then "2*" separately) and combine results yourself.
  - Descriptive text fields (CTY_NAME, DIST_NAME, E_COMMODITY_LDESC/I_COMMODITY_LDESC, NAICS_LDESC, SITC_LDESC, etc.) require their matching code field (CTY_CODE, DISTRICT, E_COMMODITY/I_COMMODITY, NAICS, SITC) to also be in "get", or the API errors.
  - Only use commodity-classification parameters that match the chosen dataset (e.g. don't filter by NAICS on the "hs" dataset) - use census_trade_get_dataset_variables to check.
  - Results are NOT sorted by value; if you need a ranked list (e.g. top trading partners), use census_trade_get_top_partners instead, or sort the returned rows yourself.
  - A request that returns zero rows is not necessarily an error - it may just mean there was no trade for that combination of filters and time period.

Returns: Rows as either a markdown table or JSON, each row containing the fields requested in "get" plus "time".`;

export function registerQueryTools(server: McpServer): void {
  server.registerTool(
    "census_trade_query_exports",
    {
      title: "Query U.S. Export Trade Data",
      description: `Query monthly U.S. export statistics (January 2010-present) from the Census International Trade Data API.

This is the general-purpose tool for pulling export data by commodity (HS/NAICS/End-Use/SITC/USDA/Hi-Tech), country, customs district, state, or port, for any combination of value/quantity/weight measures.

Args:
  - dataset (string): which classification/geography dataset, e.g. 'hs' for Harmonized System (see census_trade_list_datasets)
  - get (string[]): variable names to return as columns, e.g. ["CTY_CODE","CTY_NAME","ALL_VAL_MO"]
  - time (string, optional): 'YYYY-MM' or 'from YYYY-MM to YYYY-MM'
  - year (string, optional) + months (string[], optional): alternative to 'time', e.g. year="2024", months=["01","02","03"]
  - filters (object, optional): e.g. {"CTY_CODE":"1220"} for Canada, {"E_COMMODITY":"0805*"} for HS codes starting with 0805 (citrus fruit)
  - comm_level (string, optional): e.g. "HS2" to get 2-digit HS totals instead of full detail
  - summary_level (string, optional): "DET" for individual countries only, "CGP" for country groupings only
  - limit (number, default 100): max rows returned
  - response_format ('markdown' | 'json', default 'markdown')
${SHARED_DESCRIPTION_TAIL}

Examples:
  - Use when: "What did the U.S. export to Germany in HS code 8703 (cars) in 2024?" -> dataset="hs", get=["E_COMMODITY","E_COMMODITY_LDESC","ALL_VAL_MO"], time="2024-01", filters={"CTY_CODE":"4280","E_COMMODITY":"8703*"}
  - Use when: "Show monthly export value trend for all countries, Jan-Jun 2023" -> get=["ALL_VAL_MO"], time="from 2023-01 to 2023-06"
  - Don't use when: You need import data - use census_trade_query_imports.
  - Don't use when: You want a country trade balance or a sorted list of top partners - use census_trade_get_trade_balance or census_trade_get_top_partners.`,
      inputSchema: QueryInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QueryInput) => runQuery("exports", params)
  );

  server.registerTool(
    "census_trade_query_imports",
    {
      title: "Query U.S. Import Trade Data",
      description: `Query monthly U.S. import statistics (January 2010-present) from the Census International Trade Data API.

This is the general-purpose tool for pulling import data by commodity (HS/NAICS/End-Use/SITC/USDA/Hi-Tech), country, customs district, state, or port, for any combination of value/quantity/weight measures. Import value fields typically start with GEN_ (general imports) or CON_ (imports for consumption) rather than ALL_ (which is export-only).

Args:
  - dataset (string): which classification/geography dataset, e.g. 'hs' for Harmonized System (see census_trade_list_datasets)
  - get (string[]): variable names to return as columns, e.g. ["CTY_CODE","CTY_NAME","GEN_VAL_MO"]
  - time (string, optional): 'YYYY-MM' or 'from YYYY-MM to YYYY-MM'
  - year (string, optional) + months (string[], optional): alternative to 'time'
  - filters (object, optional): e.g. {"CTY_CODE":"5700"} for China, {"I_COMMODITY":"8471*"} for HS codes starting with 8471 (computers)
  - comm_level (string, optional): e.g. "HS2" to get 2-digit HS totals instead of full detail
  - summary_level (string, optional): "DET" for individual countries only, "CGP" for country groupings only
  - limit (number, default 100): max rows returned
  - response_format ('markdown' | 'json', default 'markdown')
${SHARED_DESCRIPTION_TAIL}

Examples:
  - Use when: "What did the U.S. import from China in HS 8471 (computers) in March 2024?" -> dataset="hs", get=["I_COMMODITY","I_COMMODITY_LDESC","GEN_VAL_MO"], time="2024-03", filters={"CTY_CODE":"5700","I_COMMODITY":"8471*"}
  - Use when: "Total general imports by state, Q1 2023" -> dataset="statehs", get=["STATE","GEN_VAL_MO"], time="from 2023-01 to 2023-03"
  - Don't use when: You need export data - use census_trade_query_exports.
  - Don't use when: You want a country trade balance or a sorted list of top partners - use census_trade_get_trade_balance or census_trade_get_top_partners.`,
      inputSchema: QueryInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QueryInput) => runQuery("imports", params)
  );
}
