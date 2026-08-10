import axios, { AxiosError } from "axios";
import { CENSUS_API_BASE_URL, REQUEST_TIMEOUT_MS } from "../constants.js";
import type { CensusRawResponse, CensusRow, CensusVariable, TradeDataset, TradeDirection } from "../types.js";

/** Thrown when the Census API returns a well-formed error message we can surface to the agent. */
export class CensusApiError extends Error {}

function getApiKey(): string {
  const key = process.env.CENSUS_API_KEY;
  if (!key) {
    throw new CensusApiError(
      "CENSUS_API_KEY environment variable is not set. Request a free key at " +
        "https://api.census.gov/data/key_signup.html and set it before starting the server."
    );
  }
  return key;
}

/** Parameters accepted by a raw Census International Trade Data API query. */
export interface CensusQueryParams {
  direction: TradeDirection;
  dataset: TradeDataset;
  /** Variable names to return, e.g. ["CTY_CODE", "CTY_NAME", "ALL_VAL_MO"]. */
  get: string[];
  /** Single month "YYYY-MM", or a range expressed as "from YYYY-MM to YYYY-MM". Mutually exclusive with year/months. */
  time?: string;
  /** 4-digit year, used together with `months` instead of `time`. */
  year?: string;
  /** One or more 2-digit months, used together with `year`. */
  months?: string[];
  /**
   * Additional filter predicates, e.g. { CTY_CODE: "1220", E_COMMODITY: "0101210000" }.
   * A value can be a single string or an array of strings (repeated query param = OR filter).
   * Wildcards are supported by ending a value with "*", e.g. "01*".
   */
  filters?: Record<string, string | string[]>;
  commLevel?: string;
  summaryLevel?: string;
  summaryLevel2?: string;
  outputFormat?: "json" | "csv";
}

/** Builds the query string for a Census API call without making the request (useful for debugging/tests). */
export function buildCensusUrl(params: CensusQueryParams): string {
  const apiKey = getApiKey();
  const url = new URL(`${CENSUS_API_BASE_URL}/${params.direction}/${params.dataset}`);

  url.searchParams.set("get", params.get.join(","));

  if (params.time) {
    url.searchParams.set("time", params.time);
  } else if (params.year) {
    url.searchParams.set("YEAR", params.year);
    for (const month of params.months ?? []) {
      url.searchParams.append("MONTH", month);
    }
  }

  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
  }

  if (params.commLevel) url.searchParams.set("COMM_LVL", params.commLevel);
  if (params.summaryLevel) url.searchParams.set("SUMMARY_LVL", params.summaryLevel);
  if (params.summaryLevel2) url.searchParams.set("SUMMARY_LVL2", params.summaryLevel2);
  if (params.outputFormat === "csv") url.searchParams.set("outputFormat", "csv");

  url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * Executes a query against the Census International Trade Data API and returns rows as
 * an array of objects keyed by the requested variable names (plus "time" when applicable).
 *
 * Returns an empty array (not an error) when the Census API responds with HTTP 204,
 * which means the request was valid but no data matched (see Census API User Guide).
 */
export async function queryCensusTrade(params: CensusQueryParams): Promise<CensusRow[]> {
  const url = buildCensusUrl(params);

  try {
    const response = await axios.get<CensusRawResponse | string>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: (status) => status === 200 || status === 204,
    });

    if (response.status === 204 || !response.data) {
      return [];
    }

    // outputFormat=csv returns a raw CSV string; json (default) returns [header[], ...rows[]]
    if (params.outputFormat === "csv") {
      return parseCsv(response.data as string);
    }

    const raw = response.data;

    // The Census API sometimes responds 200 OK with an HTML error page (e.g. missing/invalid
    // API key) instead of a JSON error or non-2xx status, which would otherwise be silently
    // swallowed as "no results". Detect and surface that explicitly.
    if (typeof raw === "string") {
      throw new CensusApiError(describeNonJsonResponse(raw));
    }

    if (!Array.isArray(raw) || raw.length === 0) return [];

    const [header, ...rows] = raw;
    return rows.map((row) => {
      const obj: CensusRow = {};
      header.forEach((col, i) => {
        obj[col] = row[i] ?? null;
      });
      return obj;
    });
  } catch (error) {
    if (error instanceof CensusApiError) throw error;
    throw new CensusApiError(describeCensusError(error, params));
  }
}

/** Interprets a non-JSON (typically HTML) response body from the Census API, which it uses for key errors. */
function describeNonJsonResponse(body: string): string {
  if (/invalid key/i.test(body)) {
    return (
      "Census API rejected the request: Invalid Key. The CENSUS_API_KEY environment variable is set but not " +
      "a valid Census API key. Request a free key at https://api.census.gov/data/key_signup.html, make sure " +
      "you clicked the activation link in the confirmation email, and update CENSUS_API_KEY."
    );
  }
  if (/missing key/i.test(body)) {
    return (
      "Census API rejected the request: Missing Key. No API key was sent. Set the CENSUS_API_KEY environment " +
      "variable to a valid key (request one at https://api.census.gov/data/key_signup.html) and restart the server."
    );
  }
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 300);
  return `Census API returned an unexpected non-JSON response instead of trade data: "${snippet}"`;
}

function parseCsv(csv: string): CensusRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.replace(/^"|"$/g, ""));
    const obj: CensusRow = {};
    header.forEach((col, i) => {
      obj[col] = values[i] ?? null;
    });
    return obj;
  });
}

function describeCensusError(error: unknown, params: CensusQueryParams): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const body = error.response?.data;
    const bodyText = typeof body === "string" ? body : JSON.stringify(body);

    if (typeof body === "string" && (/invalid key/i.test(body) || /missing key/i.test(body))) {
      return describeNonJsonResponse(body);
    }

    if (status === 400) {
      return (
        `Census API rejected the request (400 Bad Request): ${bodyText || "no details returned"}. ` +
        `Common causes: an unknown variable name in "get", a variable from the wrong dataset, ` +
        `a missing required "time" (or YEAR/MONTH) parameter, or mixing commodity-classification ` +
        `parameters from two different datasets (e.g. NAICS filters on the "hs" dataset). ` +
        `Use the get_dataset_variables tool to confirm valid variable names for ` +
        `"${params.direction}/${params.dataset}".`
      );
    }
    if (status === 404) {
      return `Census API endpoint not found (404): ${params.direction}/${params.dataset} may not be a valid dataset.`;
    }
    if (status === 429) {
      return "Census API rate limit exceeded (429). Wait before retrying, or reduce the number/size of concurrent requests.";
    }
    if (error.code === "ECONNABORTED") {
      return (
        "Census API request timed out. Large queries (e.g. all countries x all HS codes) often time out. " +
        "Narrow the request with more filters (country, commodity code, district) or a shorter time range, " +
        "and consider splitting wildcard commodity queries (e.g. query \"1*\", then \"2*\", etc.)."
      );
    }
    return `Census API request failed with status ${status ?? "unknown"}: ${bodyText || error.message}`;
  }
  return `Unexpected error querying the Census API: ${error instanceof Error ? error.message : String(error)}`;
}

/** Fetches and normalizes the list of valid variables for a given dataset/direction from Census's own metadata endpoint. */
export async function getVariablesForDataset(direction: TradeDirection, dataset: TradeDataset): Promise<CensusVariable[]> {
  const url = `${CENSUS_API_BASE_URL}/${direction}/${dataset}/variables.json`;
  try {
    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    const variables = response.data?.variables ?? {};
    return Object.entries(variables).map(([name, meta]: [string, any]) => ({
      name,
      label: meta.label ?? "",
      concept: meta.concept,
      predicateType: meta.predicateType,
      required: meta.required,
      group: meta.group,
    }));
  } catch (error) {
    throw new CensusApiError(
      `Failed to fetch variable metadata for ${direction}/${dataset}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
