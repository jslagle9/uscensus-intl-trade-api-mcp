# census-trade-mcp-server

An MCP (Model Context Protocol) server for the U.S. Census Bureau's [International Trade Data API](https://www.census.gov/data/developers/data-sets/international-trade.html) — monthly U.S. export and import statistics, January 2010–present, by Harmonized System (HS), NAICS, End-Use, SITC, USDA (Ag/Non-Ag), and Advanced Technology classifications, plus state- and port-level detail.

## Setup

1. **Get a free Census API key**: https://api.census.gov/data/key_signup.html (you'll get an email with an activation link — click it before using the key).
2. **Install dependencies and build**:
   ```bash
   npm install
   npm run build
   ```
3. **Set your API key**:
   ```bash
   cp .env.example .env
   # edit .env and set CENSUS_API_KEY
   ```
4. **Add to your MCP client** (e.g. Claude Desktop / Claude Code config):
   ```json
   {
     "mcpServers": {
       "census-trade": {
         "command": "node",
         "args": ["/absolute/path/to/census-trade-mcp-server/dist/index.js"],
         "env": { "CENSUS_API_KEY": "your_40_character_key_here" }
       }
     }
   }
   ```

By default the server runs over stdio. Set `TRANSPORT=http` (and optionally `PORT`) to run it as a local streamable-HTTP server instead (binds to `127.0.0.1` only).

## Tools

| Tool | Purpose |
| --- | --- |
| `census_trade_list_datasets` | Describes the 9 available datasets (hs, naics, enduse, sitc, usda, hitech, statehs, statenaics, porths) and what geography/detail each supports. |
| `census_trade_get_dataset_variables` | Fetches the valid field names for a given dataset + direction straight from Census's own metadata, to avoid "unknown variable" errors. |
| `census_trade_query_exports` | General-purpose query tool for U.S. export data — any dataset, country/commodity/district/state/port filters, time range. |
| `census_trade_query_imports` | Same, for U.S. import data. |
| `census_trade_get_trade_balance` | Workflow tool: computes exports − imports for one or more countries/groupings over a period in a single call. |
| `census_trade_get_top_partners` | Workflow tool: ranks countries by export/import value for a period — the Census API itself doesn't sort results, so this does it for you. |
| `census_trade_lookup_country_code` | Looks up the numeric CTY_CODE (Schedule C) needed to filter by country, region, or trade bloc (e.g. NAFTA, EU, OPEC). Works offline, no API key needed. |

## Testing

- `node scripts/smoke-test.mjs` — starts the server, lists tools, and exercises the two tools that don't require a live Census API call. No real API key needed.
- `CENSUS_API_KEY=<real key> node scripts/live-test.mjs` — exercises real Census API calls end-to-end (needs a real key and outbound network access to `api.census.gov`).

## Evaluations

`evaluation/questions.xml` has 10 verified Q&A pairs for testing how well an LLM can use this server, built on the `mcp-builder` evaluation harness (`evaluation/evaluation.py`). All questions use January/June 2013 data — final, long-settled figures chosen so the answers never change.

```bash
pip install -r evaluation/requirements.txt
export ANTHROPIC_API_KEY=your_api_key
python evaluation/evaluation.py \
  -t stdio -c node -a dist/index.js \
  -e CENSUS_API_KEY=<your census key> \
  -o evaluation/report.md \
  evaluation/questions.xml
```

## Notes on the underlying API

- Filtering by country uses a numeric `CTY_CODE` (Schedule C), not the country name — use `census_trade_lookup_country_code` to translate.
- Descriptive text fields (`CTY_NAME`, `DIST_NAME`, `*_LDESC`, etc.) require their matching code field also be requested, or the API errors.
- Don't mix commodity-classification parameters across datasets (e.g. don't filter by `NAICS` on the `hs` dataset).
- Large, unfiltered queries (e.g. all countries × all 10-digit HS codes) commonly time out — narrow with filters or split wildcard queries (`E_COMMODITY=1*`, then `2*`, etc.) and combine client-side.
- A response with zero rows isn't necessarily an error — it can just mean no trade occurred for that filter combination.

Full reference: [Census International Trade Data API User Guide (PDF)](https://www.census.gov/foreign-trade/reference/guides/Guide%20to%20International%20Trade%20Datasets.pdf).
