/** Shared constants for the Census International Trade Data MCP server. */

/** Base URL for the Census Bureau's timeseries International Trade Data API. */
export const CENSUS_API_BASE_URL = "https://api.census.gov/data/timeseries/intltrade";

/** Maximum characters returned in a single tool response before truncation. */
export const CHARACTER_LIMIT = 25000;

/** Default number of rows returned by query tools when the caller doesn't specify a limit. */
export const DEFAULT_ROW_LIMIT = 100;

/** Hard ceiling on rows returned in one call, to keep responses agent-friendly and avoid Census API timeouts. */
export const MAX_ROW_LIMIT = 1000;

/** Request timeout for calls to the Census API, in milliseconds. */
export const REQUEST_TIMEOUT_MS = 30000;
