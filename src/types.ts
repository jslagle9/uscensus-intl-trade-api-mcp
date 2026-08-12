/** Shared TypeScript types for the Census International Trade Data MCP server. */

/** Trade direction: exports from the U.S., or imports into the U.S. */
export type TradeDirection = "exports" | "imports";

/**
 * Commodity classification / geography datasets available under each trade direction.
 * These map directly to the Census API path segment, e.g.
 * https://api.census.gov/data/timeseries/intltrade/exports/hs
 */
export type TradeDataset =
  | "hs"
  | "naics"
  | "enduse"
  | "sitc"
  | "usda"
  | "hitech"
  | "statehs"
  | "statenaics"
  | "porths";

/** A single row returned by the Census API, keyed by the requested variable names. */
export type CensusRow = Record<string, string | null>;

/** Raw Census API response shape: first row is headers, subsequent rows are values (all strings). */
export type CensusRawResponse = string[][];

/** Metadata describing one Census API variable (from the endpoint's variables.json). */
export interface CensusVariable {
  name: string;
  label: string;
  concept?: string;
  predicateType?: string;
  required?: string;
  group?: string;
}

/** A country entry from the Census Bureau's Schedule C country code list. */
export interface CountryEntry {
  code: string;
  name: string;
  iso: string;
  additionalInfo?: string;
}

/** A country grouping code (e.g. OPEC, European Union, regions). */
export interface CountryGroupEntry {
  code: string;
  name: string;
}

/** A U.S. Customs district entry from the Census Bureau's Schedule D district/port list. */
export interface DistrictEntry {
  code: string;
  name: string;
}

/** A U.S. Customs port entry from the Census Bureau's Schedule D district/port list, belonging to one district. */
export interface PortEntry {
  code: string;
  name: string;
  districtCode: string;
}
