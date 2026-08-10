/**
 * Live integration test: calls the real Census API (metadata + a real query). Requires
 * network access to api.census.gov and a real CENSUS_API_KEY for the query tool to
 * succeed (the variables tool works even with a placeholder key, since Census's
 * variables.json metadata endpoint doesn't require a key).
 *
 *   CENSUS_API_KEY=<your real key> node scripts/live-test.mjs
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, CENSUS_API_KEY: process.env.CENSUS_API_KEY ?? "placeholder-for-metadata-only-test" },
});
const client = new Client({ name: "live-test-client", version: "1.0.0" });
await client.connect(transport);

function printResult(label, result) {
  console.log(`\n=== ${label} (isError: ${Boolean(result.isError)}) ===`);
  console.log(result.content[0].text.slice(0, 500));
}

const v = await client.callTool({
  name: "census_trade_get_dataset_variables",
  arguments: { direction: "imports", dataset: "hs", response_format: "json" },
});
printResult("get_dataset_variables (no API key required)", v);

const q = await client.callTool({
  name: "census_trade_query_exports",
  arguments: { dataset: "hs", get: ["CTY_CODE", "CTY_NAME", "ALL_VAL_MO"], time: "2023-01", filters: { CTY_CODE: "1220" }, limit: 5 },
});
printResult("query_exports Canada Jan 2023 (requires a real CENSUS_API_KEY)", q);

const tp = await client.callTool({
  name: "census_trade_get_top_partners",
  arguments: { direction: "exports", time: "2023-01", top_n: 5 },
});
printResult("get_top_partners exports Jan 2023 (requires a real CENSUS_API_KEY)", tp);

await client.close();
process.exit(0);
