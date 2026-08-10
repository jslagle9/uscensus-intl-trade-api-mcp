import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { COUNTRIES, COUNTRY_GROUPS } from "../data/countries.js";
import { responseFormatSchema, ResponseFormat } from "../schemas/trade.js";

const LookupInputSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .max(100)
      .describe("Country, region, or trade-bloc name (or partial name) to search for, e.g. 'korea', 'european union', 'canada'. Case-insensitive substring match."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum number of matches to return."),
    response_format: responseFormatSchema,
  })
  .strict();

type LookupInput = z.infer<typeof LookupInputSchema>;

export function registerCountryTools(server: McpServer): void {
  server.registerTool(
    "census_trade_lookup_country_code",
    {
      title: "Look Up Census Trade CTY_CODE",
      description: `Look up the Census Bureau Schedule C CTY_CODE (and country groupings like OPEC, NAFTA, European Union, or world regions) needed to filter census_trade_query_exports/imports by country.

The Census API filters trade data by a numeric CTY_CODE, not by country name (CTY_NAME can only be requested as a descriptive field alongside CTY_CODE, not used as a filter by itself). Use this tool to translate a country name into the code you need.

Args:
  - query (string): country/region/bloc name or partial name, e.g. "korea", "vietnam", "european union"
  - limit (number, default 10): max matches to return
  - response_format ('markdown' | 'json', default 'markdown')

Returns: Matching entries with their CTY_CODE, name, and ISO alpha-2 code (for individual countries) or just code+name (for groupings). Note South Korea is listed as "South Korea (Republic of Korea)" and North Korea as "North Korea (Democratic People's Republic of Korea)".

Examples:
  - Use when: "What's the country code for Vietnam?" -> query="vietnam" -> returns CTY_CODE 5520
  - Use when: "I want export data for all EU countries as a group" -> query="european union" -> returns CTY_CODE 0003, then pass that as CTY_CODE in census_trade_query_exports filters
  - Don't use when: You already have the CTY_CODE - go straight to census_trade_query_exports/imports.`,
      inputSchema: LookupInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: LookupInput) => {
      const q = params.query.trim().toLowerCase();

      const countryMatches = COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.code === q
      );
      const groupMatches = COUNTRY_GROUPS.filter((g) => g.name.toLowerCase().includes(q) || g.code === q);

      // Exact name matches first, then substring matches, alphabetical thereafter.
      countryMatches.sort((a, b) => {
        const aExact = a.name.toLowerCase() === q ? 0 : 1;
        const bExact = b.name.toLowerCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.name.localeCompare(b.name);
      });

      const countries = countryMatches.slice(0, params.limit);
      const groups = groupMatches.slice(0, params.limit);

      if (countries.length === 0 && groups.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No country, region, or grouping found matching "${params.query}". Try a shorter or differently-spelled search term.`,
            },
          ],
        };
      }

      if (params.response_format === ResponseFormat.JSON) {
        const structuredContent = { query: params.query, countries, groups };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent,
        };
      }

      const lines = [`# Matches for "${params.query}"`, ""];
      if (countries.length) {
        lines.push("## Countries", "", "| CTY_CODE | Name | ISO |", "| --- | --- | --- |");
        for (const c of countries) lines.push(`| ${c.code} | ${c.name} | ${c.iso} |`);
        lines.push("");
      }
      if (groups.length) {
        lines.push("## Groupings (regions / trade blocs)", "", "| CTY_CODE | Name |", "| --- | --- |");
        for (const g of groups) lines.push(`| ${g.code} | ${g.name} |`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
