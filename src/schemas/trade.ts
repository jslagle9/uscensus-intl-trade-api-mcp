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
  "Either 'time' or both 'year' and 'months' must be provided. For large queries, " +
  "prefer 'year'+'months' over a 'time' range - it is processed more efficiently by the Census API.";

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
      "field (CTY_CODE, DISTRICT, E_COMMODITY) to also be included, or the API will error."
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
      "(regions, trade blocs) instead of individual countries. Omit to receive both mixed together."
  );
