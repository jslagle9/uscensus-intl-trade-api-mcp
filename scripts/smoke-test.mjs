/**
 * Lightweight smoke test: spawns the built server over stdio, lists its tools, and
 * exercises the two tools that don't require a live Census API call (list_datasets and
 * lookup_country_code). Run after `npm run build`:
 *
 *   node scripts/smoke-test.mjs
 *
 * A real CENSUS_API_KEY is only needed to exercise the query/analysis tools end-to-end;
 * any non-empty string is enough for this smoke test since it never calls the live API.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, CENSUS_API_KEY: process.env.CENSUS_API_KEY ?? "placeholder-for-smoke-test" },
});

const client = new Client({ name: "smoke-test-client", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOL COUNT:", tools.tools.length);
for (const t of tools.tools) {
  console.log("-", t.name, "| readOnly:", t.annotations?.readOnlyHint, "| title:", t.title);
}

// Validate a couple of schemas by calling a tool that needs no network (list_datasets) and one static lookup
const r1 = await client.callTool({ name: "census_trade_list_datasets", arguments: {} });
console.log("\n--- list_datasets result (first 300 chars) ---");
console.log(r1.content[0].text.slice(0, 300));

const r2 = await client.callTool({ name: "census_trade_lookup_country_code", arguments: { query: "korea" } });
console.log("\n--- lookup_country_code(korea) result ---");
console.log(r2.content[0].text);

await client.close();
process.exit(0);
