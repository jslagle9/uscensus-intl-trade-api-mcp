import { z } from "zod";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export const responseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for a human-readable table, or 'json' for machine-readable structured data.");

const DATASET_VALUES = [
  "hs",
  "naics",
  "enduse",
  "sitc",
  "usda",
  "hitech",
  "statehs",
  "statenaics",
  "porths",
] as const;

export const datasetSchema = z
  .enum(DATASET_VALUES)
  .describe(
    "Which commodity classification / geography dataset to query: " +
      "'hs' (Harmonized System, most detailed commodity codes, by country+district), " +
      "'naics' (industry classification, by country+district), " +
      "'enduse' (broad economic-use categories, by country+district), " +
      "'sitc' (Standard International Trade Classification, by country+district), " +
      "'usda' (agricultural vs. non-agricultural, by country+district), " +
      "'hitech' (Advanced Technology Products, by country+district), " +
      "'statehs' (HS codes by U.S. state instead of district, 2/4/6-digit only), " +
      "'statenaics' (NAICS by U.S. state instead of district, 2/3/4-digit only), " +
      "'porths' (HS codes by U.S. port instead of district, 2/4/6-digit only). " +
      "Use list_trade_datasets for full descriptions."
  );

const timeDescription =
  "Time period to query, as 'YYYY-MM' for a single month (e.g. '2024-03'), or " +
  "'from YYYY-MM to YYYY-MM' for a range (e.g. 'from 2023-01 to 2023-12'). " +
  "Either 'time' or both 'year' and 'months' must be provided. 'year'+'months' is useful for a " +
  "non-contiguous set of months within one year (e.g. months=['01','03','07']); a 'time' range " +
  "is simpler for a contiguous span. Both return one row per month with equivalent results.";

export const timeParamsSchema = z.object({
  time: z.string().min(6).max(30).optional().describe(timeDescription),
  year: z
    .string()
    .regex(/^\d{4}$/, "year must be a 4-digit string, e.g. '2024'")
    .optional()
    .describe("4-digit year, used together with 'months' as an alternative to 'time'."),
  months: z
    .array(z.string().regex(/^\d{2}$/, "each month must be 2 digits, e.g. '03'"))
    .min(1)
    .max(12)
    .optional()
    .describe("One or more 2-digit months (e.g. ['01','02','03']), used together with 'year'."),
});

export const filtersSchema = z
  .record(z.union([z.string(), z.array(z.string())]))
  .optional()
  .describe(
    "Additional filter predicates as {VARIABLE_NAME: value}, e.g. " +
      '{"CTY_CODE": "1220"} to filter to Canada, or {"CTY_CODE": ["1220","2010"]} for Canada OR Mexico. ' +
      "Commodity code filters accept a trailing '*' wildcard, e.g. {\"E_COMMODITY\": \"01*\"} for all HS codes " +
      "starting with 01. Only use variable names valid for the chosen dataset/direction " +
      "(check with get_dataset_variables). Do not mix commodity-classification parameters from different " +
      "datasets in one call (e.g. do not filter by NAICS on the 'hs' dataset)."
  );

export const getFieldsSchema = z
  .array(z.string().min(1))
  .min(1)
  .max(30)
  .describe(
    "Census API variable names to return as columns, e.g. ['CTY_CODE','CTY_NAME','ALL_VAL_MO']. " +
      "Must be valid for the chosen dataset/direction - use get_dataset_variables to look them up. " +
      "Descriptive text fields (e.g. CTY_NAME, DIST_NAME, E_COMMODITY_LDESC) require their matching code " +
      "field (CTY_CODE, DISTRICT, E_COMMODITY) to also be included, or the API will error. " +
      "Quantity fields (QTY_1_MO, QTY_2_MO, GEN_QY1_MO, GEN_QY2_MO, CON_QY1_MO, CON_QY2_MO, and their *_YR " +
      "year-to-date variants) report \"0\" for both true zeros and missing/unavailable data - always also " +
      "request the matching *_FLAG field (e.g. QTY_1_MO_FLAG) alongside any quantity field: \"M\" means the " +
      "value is missing, blank means it is a true zero."
  );

export const commLevelSchema = z
  .string()
  .optional()
  .describe(
    "Commodity aggregation level, used with E_COMMODITY/I_COMMODITY, NAICS, or E_ENDUSE/I_ENDUSE fields. " +
      "One of: HS2, HS4, HS6, HS10 (Harmonized System digit levels), NA2-NA6 (NAICS digit levels), " +
      "MAN (total manufactured commodities, naics only), EU1, EU5 (End-Use digit levels)."
  );

export const summaryLevelSchema = z
  .enum(["DET", "CGP"])
  .optional()
  .describe(
    "'DET' restricts results to individual trading partners; 'CGP' restricts results to country groupings " +
      "(regions, trade blocs, e.g. \"4XXX\" Europe, \"0001\" OPEC) instead of individual countries. Omit to " +
      "receive both mixed together in one response - if you then sum a value field across all returned rows " +
      "to compute a total, you will double-count (once for the individual country, again for any grouping it " +
      "belongs to). Always set this to 'DET' when you plan to sum/aggregate CTY_CODE rows yourself."
  );

export const summaryLevel2Schema = z
  .string()
  .optional()
  .describe(
    "SUMMARY_LVL2: restricts results to rows summarized by a specific combination of variables, built from " +
      "2-letter codes concatenated together, e.g. 'HSDTCY' for HS-by-district-by-country rows only. " +
      "Codes shared by both directions: TO (total), DT (district), CY (country), HS/NA/EU/US/SI/HT " +
      "(commodity by classification system - HS, NAICS, End-use, USDA, SITC, Hi-tech). " +
      "Exports only: DF (domestic/foreign), PT (port), ST (state of origin). " +
      "Imports only: CS (country subcode), RP (rate provision), PT (port), ST (state of destination). " +
      "See the Census API User Guide Appendix C (export codes) / Appendix D (import codes) for the full list " +
      "of valid combinations. Validated locally against the direction (exports/imports) and the chosen " +
      "'dataset' before the request is sent - an invalid or dataset-incompatible combination is rejected " +
      "immediately with an explanation, instead of a Census API 400 error."
  );
