import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { queryCensusTrade, CensusApiError } from "../services/censusClient.js";
import { COUNTRIES } from "../data/countries.js";
import { datasetSchema, filtersSchema, responseFormatSchema, ResponseFormat } from "../schemas/trade.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { TradeDirection } from "../types.js";

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const timeFields = {
  time: z
    .string()
    .min(6)
    .max(30)
    .optional()
    .describe("Time period as 'YYYY-MM' or a range 'from YYYY-MM to YYYY-MM'. Either 'time' or both 'year'+'months' is required."),
  year: z.string().regex(/^\d{4}$/).optional().describe("4-digit year, used with 'months' instead of 'time'."),
  months: z
    .array(z.string().regex(/^\d{2}$/))
    .min(1)
    .max(12)
    .optional()
    .describe("2-digit months, used with 'year' instead of 'time'."),
};

function missingTimeError() {
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

// ---------------------------------------------------------------------------
// census_trade_get_trade_balance
// ---------------------------------------------------------------------------

const TradeBalanceInputSchema = z
  .object({
    countries: z
      .array(z.string().min(1).max(6))
      .min(1)
      .max(25)
      .describe(
        "One or more Census CTY_CODE values to compute a trade balance for (use census_trade_lookup_country_code to find codes), e.g. ['1220','2010'] for Canada and Mexico. " +
          "A grouping code (e.g. '0003' for European Union) also works."
      ),
    ...timeFields,
    hs_code: z
      .string()
      .min(2)
      .max(10)
      .optional()
      .describe(
        "Optional HS commodity code (or prefix, e.g. '87' for vehicles) to restrict the balance to a specific product " +
          "instead of total trade. Applied as E_COMMODITY on the export side and I_COMMODITY on the import side."
      ),
    import_basis: z
      .enum(["general", "consumption"])
      .default("general")
      .describe("Which import total to use: 'general' imports (GEN_VAL_MO, the standard headline figure) or 'consumption' imports (CON_VAL_MO)."),
    response_format: responseFormatSchema,
  })
  .strict();

type TradeBalanceInput = z.infer<typeof TradeBalanceInputSchema>;

async function getTradeBalance(params: TradeBalanceInput) {
  if (!params.time && !(params.year && params.months?.length)) return missingTimeError();

  const importValueField = params.import_basis === "consumption" ? "CON_VAL_MO" : "GEN_VAL_MO";

  try {
    const [exportRows, importRows] = await Promise.all([
      queryCensusTrade({
        direction: "exports",
        dataset: "hs",
        get: ["CTY_CODE", "ALL_VAL_MO"],
        time: params.time,
        year: params.year,
        months: params.months,
        filters: {
          CTY_CODE: params.countries,
          ...(params.hs_code ? { E_COMMODITY: params.hs_code } : {}),
        },
      }),
      queryCensusTrade({
        direction: "imports",
        dataset: "hs",
        get: ["CTY_CODE", importValueField],
        time: params.time,
        year: params.year,
        months: params.months,
        filters: {
          CTY_CODE: params.countries,
          ...(params.hs_code ? { I_COMMODITY: params.hs_code } : {}),
        },
      }),
    ]);

    type Agg = { code: string; name: string; exports: number; imports: number };
    const byCountry = new Map<string, Agg>();
    for (const code of params.countries) {
      byCountry.set(code, { code, name: countryName(code), exports: 0, imports: 0 });
    }

    for (const row of exportRows) {
      const code = row.CTY_CODE ?? "";
      if (!byCountry.has(code)) byCountry.set(code, { code, name: countryName(code), exports: 0, imports: 0 });
      byCountry.get(code)!.exports += toNumber(row.ALL_VAL_MO);
    }
    for (const row of importRows) {
      const code = row.CTY_CODE ?? "";
      if (!byCountry.has(code)) byCountry.set(code, { code, name: countryName(code), exports: 0, imports: 0 });
      byCountry.get(code)!.imports += toNumber(row[importValueField]);
    }

    const results = Array.from(byCountry.values()).map((a) => ({
      cty_code: a.code,
      country: a.name,
      exports_usd: a.exports,
      imports_usd: a.imports,
      balance_usd: a.exports - a.imports,
    }));

    const totals = results.reduce(
      (acc, r) => ({
        exports_usd: acc.exports_usd + r.exports_usd,
        imports_usd: acc.imports_usd + r.imports_usd,
        balance_usd: acc.balance_usd + r.balance_usd,
      }),
      { exports_usd: 0, imports_usd: 0, balance_usd: 0 }
    );

    if (params.response_format === ResponseFormat.JSON) {
      const structuredContent = { period: params.time ?? `${params.year}-[${params.months?.join(",")}]`, import_basis: params.import_basis, hs_code: params.hs_code, results, totals };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
        structuredContent,
      };
    }

    const lines = [
      `# U.S. Trade Balance${params.hs_code ? ` — HS ${params.hs_code}` : ""}`,
      "",
      `Period: ${params.time ?? `${params.year} (months ${params.months?.join(", ")})`} | Import basis: ${params.import_basis}`,
      "",
      "| Country | Exports (USD) | Imports (USD) | Balance (USD) |",
      "| --- | ---: | ---: | ---: |",
    ];
    for (const r of results) {
      lines.push(`| ${r.country} (${r.cty_code}) | ${r.exports_usd.toLocaleString()} | ${r.imports_usd.toLocaleString()} | ${r.balance_usd.toLocaleString()} |`);
    }
    lines.push(`| **TOTAL** | **${totals.exports_usd.toLocaleString()}** | **${totals.imports_usd.toLocaleString()}** | **${totals.balance_usd.toLocaleString()}** |`);
    lines.push(
      "",
      `_A positive balance means the U.S. exported more than it imported (trade surplus) with that country/group; negative means a trade deficit._`
    );

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (error) {
    const message = error instanceof CensusApiError ? error.message : `Unexpected error: ${String(error)}`;
    return { isError: true, content: [{ type: "text" as const, text: message }] };
  }
}

// ---------------------------------------------------------------------------
// census_trade_get_top_partners
// ---------------------------------------------------------------------------

const TopPartnersInputSchema = z
  .object({
    direction: z.enum(["exports", "imports"]).describe("'exports' to rank countries by U.S. export value, 'imports' to rank by import value."),
    dataset: datasetSchema.default("hs"),
    ...timeFields,
    value_field: z
      .string()
      .optional()
      .describe(
        "Which value field to rank by, e.g. 'ALL_VAL_MO' (exports) or 'GEN_VAL_MO' (imports). " +
          "Defaults to ALL_VAL_MO for exports and GEN_VAL_MO for imports if omitted. Use a *_YR variant for year-to-date figures."
      ),
    filters: filtersSchema,
    top_n: z.number().int().min(1).max(50).default(10).describe("How many top trading partners to return."),
    response_format: responseFormatSchema,
  })
  .strict();

type TopPartnersInput = z.infer<typeof TopPartnersInputSchema>;

async function getTopPartners(params: TopPartnersInput) {
  if (!params.time && !(params.year && params.months?.length)) return missingTimeError();

  const valueField = params.value_field ?? (params.direction === "exports" ? "ALL_VAL_MO" : "GEN_VAL_MO");

  try {
    const rows = await queryCensusTrade({
      direction: params.direction as TradeDirection,
      dataset: params.dataset,
      get: ["CTY_CODE", "CTY_NAME", valueField],
      time: params.time,
      year: params.year,
      months: params.months,
      filters: { ...params.filters, SUMMARY_LVL: "DET" },
    });

    type Agg = { code: string; name: string; value: number };
    const byCountry = new Map<string, Agg>();
    for (const row of rows) {
      const code = row.CTY_CODE ?? "";
      if (code === "-" || code === "") continue; // skip total row
      const name = row.CTY_NAME ?? countryName(code);
      if (!byCountry.has(code)) byCountry.set(code, { code, name, value: 0 });
      byCountry.get(code)!.value += toNumber(row[valueField]);
    }

    const ranked = Array.from(byCountry.values()).sort((a, b) => b.value - a.value);
    const grandTotal = ranked.reduce((sum, r) => sum + r.value, 0);
    const top = ranked.slice(0, params.top_n).map((r, i) => ({
      rank: i + 1,
      cty_code: r.code,
      country: r.name,
      value_usd: r.value,
      share_pct: grandTotal > 0 ? Number(((r.value / grandTotal) * 100).toFixed(2)) : 0,
    }));

    if (params.response_format === ResponseFormat.JSON) {
      const structuredContent = {
        direction: params.direction,
        dataset: params.dataset,
        value_field: valueField,
        period: params.time ?? `${params.year}-[${params.months?.join(",")}]`,
        total_countries: ranked.length,
        grand_total_usd: grandTotal,
        top_partners: top,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
        structuredContent,
      };
    }

    const lines = [
      `# Top ${top.length} ${params.direction === "exports" ? "Export Destinations" : "Import Sources"} (${params.dataset}, ${valueField})`,
      "",
      `Period: ${params.time ?? `${params.year} (months ${params.months?.join(", ")})`} | Countries with trade: ${ranked.length} | Total: ${grandTotal.toLocaleString()} USD`,
      "",
      "| Rank | Country | Value (USD) | Share |",
      "| ---: | --- | ---: | ---: |",
    ];
    for (const r of top) {
      lines.push(`| ${r.rank} | ${r.country} (${r.cty_code}) | ${r.value_usd.toLocaleString()} | ${r.share_pct}% |`);
    }
    let text = lines.join("\n");
    if (text.length > CHARACTER_LIMIT) text = text.slice(0, CHARACTER_LIMIT) + "\n\n_Truncated._";

    return { content: [{ type: "text" as const, text }] };
  } catch (error) {
    const message = error instanceof CensusApiError ? error.message : `Unexpected error: ${String(error)}`;
    return { isError: true, content: [{ type: "text" as const, text: message }] };
  }
}

export function registerAnalysisTools(server: McpServer): void {
  server.registerTool(
    "census_trade_get_trade_balance",
    {
      title: "Compute U.S. Trade Balance With Countries",
      description: `Compute the U.S. trade balance (exports minus imports) with one or more countries or country groupings, for a given time period, in one call.

This is a workflow tool that combines an exports/hs query and an imports/hs query (which census_trade_query_exports/imports would otherwise require two separate calls to do), sums values across the requested period, and computes the balance per country plus a combined total.

Args:
  - countries (string[]): one or more CTY_CODE values, e.g. ["1220","2010"] for Canada and Mexico (use census_trade_lookup_country_code to find codes)
  - time (string, optional) or year+months (optional): time period, e.g. time="2024" is invalid - use time="from 2024-01 to 2024-12" or year="2024", months=["01",...,"12"]
  - hs_code (string, optional): restrict to a specific HS commodity code/prefix instead of total trade, e.g. "87" for vehicles
  - import_basis ('general' | 'consumption', default 'general'): which import total to use
  - response_format ('markdown' | 'json', default 'markdown')

Returns: Per-country exports, imports, and balance in USD, plus a combined total row. Positive balance = U.S. trade surplus with that country; negative = deficit.

Examples:
  - Use when: "What's the U.S. trade balance with China in 2024?" -> countries=["5700"], year="2024", months=["01",...,"12"]
  - Use when: "Compare our vehicle trade balance with Japan, Germany, and South Korea last year" -> countries=["5880","4280","5800"], hs_code="87", year="2023", months=[...]
  - Don't use when: You just need one direction's raw data - use census_trade_query_exports or census_trade_query_imports.`,
      inputSchema: TradeBalanceInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: TradeBalanceInput) => getTradeBalance(params)
  );

  server.registerTool(
    "census_trade_get_top_partners",
    {
      title: "Rank Top Trading Partners",
      description: `Return the top N countries ranked by U.S. export or import value for a given period and (optionally) a specific commodity - the Census API itself does not sort results, so this tool fetches the full country breakdown and sorts it for you.

Args:
  - direction ('exports' | 'imports'): rank by export destinations or import sources
  - dataset (string, default 'hs'): which classification dataset to pull from (see census_trade_list_datasets)
  - time (string, optional) or year+months (optional): time period
  - value_field (string, optional): value field to rank by, e.g. 'ALL_VAL_YR' for year-to-date exports. Defaults to ALL_VAL_MO (exports) or GEN_VAL_MO (imports).
  - filters (object, optional): extra filters, e.g. {"E_COMMODITY":"2709*"} to rank partners for crude oil exports only
  - top_n (number, default 10, max 50): how many partners to return
  - response_format ('markdown' | 'json', default 'markdown')

Returns: Ranked list with country, value in USD, and percentage share of total trade across all countries in the response, plus the grand total and count of countries with any trade.

Examples:
  - Use when: "Who are our top 5 export markets in 2024?" -> direction="exports", top_n=5, year="2024", months=[...]
  - Use when: "Which countries do we import the most crude oil from?" -> direction="imports", filters={"I_COMMODITY":"2709*"}, time="2024-06"
  - Don't use when: You want a two-way trade balance calculation - use census_trade_get_trade_balance instead.`,
      inputSchema: TopPartnersInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: TopPartnersInput) => getTopPartners(params)
  );
}
