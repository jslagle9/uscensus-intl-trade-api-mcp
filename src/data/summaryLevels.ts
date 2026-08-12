import type { TradeDataset, TradeDirection } from "../types.js";

/**
 * SUMMARY_LVL2 validation data, sourced directly from the Census International Trade Data API
 * User Guide: Appendix C (export summary levels, p.26) and Appendix D (import summary levels, p.27).
 *
 * A SUMMARY_LVL2 value is a concatenation of 2-letter tokens (e.g. "HSDTCY" = HS + DT + CY).
 * Only the exact combinations listed in the guide's appendices are valid - not every
 * mathematically possible token combination/ordering is accepted by the API.
 */

const DISTRICT_DATASETS: TradeDataset[] = ["hs", "naics", "enduse", "sitc", "usda", "hitech"];
const ALL_DATASETS: TradeDataset[] = [...DISTRICT_DATASETS, "statehs", "statenaics", "porths"];

/**
 * Which dataset(s) each 2-letter token is valid for, per direction - derived from the
 * "Endpoints" column of Appendix A (export parameters) / Appendix B (import parameters)
 * for the API field each token corresponds to (e.g. DF -> Appendix A's DF row lists only
 * hs/naics/enduse/usda/sitc/hitech; PT -> PORT is only a field on porths; CS -> CTY_SUBCODE
 * is only a field on the import hs dataset).
 */
const SUMMARY_LEVEL_TOKENS: Record<string, { meaning: string; datasets: Partial<Record<TradeDirection, TradeDataset[]>> }> = {
  TO: { meaning: "Total", datasets: { exports: ALL_DATASETS, imports: ALL_DATASETS } },
  DF: { meaning: "Domestic(1) or Foreign(2)", datasets: { exports: DISTRICT_DATASETS } }, // export-only field
  DT: { meaning: "District", datasets: { exports: DISTRICT_DATASETS, imports: DISTRICT_DATASETS } },
  PT: { meaning: "Port", datasets: { exports: ["porths"], imports: ["porths"] } },
  CY: { meaning: "Country", datasets: { exports: ALL_DATASETS, imports: ALL_DATASETS } },
  ST: { meaning: "State", datasets: { exports: ["statehs", "statenaics"], imports: ["statehs", "statenaics"] } },
  HS: { meaning: "HS/Schedule B Commodity Code", datasets: { exports: ["hs", "statehs", "porths"], imports: ["hs", "statehs", "porths"] } },
  NA: { meaning: "NAICS Code", datasets: { exports: ["naics", "statenaics"], imports: ["naics", "statenaics"] } },
  EU: { meaning: "End-use Code", datasets: { exports: ["enduse"], imports: ["enduse"] } },
  US: { meaning: "USDA Code", datasets: { exports: ["usda"], imports: ["usda"] } },
  SI: { meaning: "SITC Code", datasets: { exports: ["sitc"], imports: ["sitc"] } },
  HT: { meaning: "Hi-tech Code", datasets: { exports: ["hitech"], imports: ["hitech"] } },
  CS: { meaning: "Country Subcode", datasets: { imports: ["hs"] } }, // import-only field
  RP: { meaning: "Rate Provision", datasets: { imports: ["hs"] } }, // import-only field
};

/** Appendix C - the 66 valid export SUMMARY_LVL2 combinations. */
const EXPORT_SUMMARY_LVL2_CODES = new Set([
  "CY", "CYDF", "DF", "DT", "DTCY", "DTCYDF", "DTDF", "EU", "EUCY", "EUCYDF", "EUDF", "EUDT",
  "EUDTCY", "EUDTCYDF", "EUDTDF", "HS", "HSCY", "HSCYDF", "HSDF", "HSDT", "HSDTCY", "HSDTCYDF",
  "HSDTDF", "HSPT", "HSPTCY", "HSST", "HSSTCY", "HT", "HTCY", "HTCYDF", "HTDF", "HTDT", "HTDTCY",
  "HTDTCYDF", "HTDTDF", "NA", "NACY", "NACYDF", "NADF", "NADT", "NADTCY", "NADTCYDF", "NADTDF",
  "NAST", "NASTCY", "PT", "PTCY", "SI", "SICY", "SICYDF", "SIDF", "SIDT", "SIDTCY", "SIDTCYDF",
  "SIDTDF", "ST", "STCY", "TO", "US", "USCY", "USCYDF", "USDF", "USDT", "USDTCY", "USDTCYDF", "USDTDF",
]);

/** Appendix D - the 61 valid import SUMMARY_LVL2 combinations. */
const IMPORT_SUMMARY_LVL2_CODES = new Set([
  "CS", "CSDT", "CSDTRP", "CSRP", "CY", "CYCS", "CYCSDT", "CYCSDTRP", "CYCSRP", "CYDT", "CYDTRP",
  "CYRP", "DT", "DTRP", "EU", "EUCY", "EUCYDT", "EUDT", "HS", "HSCS", "HSCSDT", "HSCSRP",
  "HSCSRPDT", "HSCY", "HSCYCS", "HSCYCSDT", "HSCYCSDTRP", "HSCYCSRP", "HSCYDT", "HSCYRP", "HSDT",
  "HSPT", "HSPTCY", "HSRP", "HSRPDT", "HSST", "HSSTCY", "HT", "HTCY", "HTCYDT", "HTDT", "NA",
  "NACY", "NACYDT", "NADT", "NAST", "NASTCY", "PT", "PTCY", "RP", "SI", "SICY", "SICYDT", "SIDT",
  "ST", "STCY", "TO", "US", "USCY", "USCYDT", "USDT",
]);

/**
 * Validates a SUMMARY_LVL2 value against the Census API User Guide's Appendix C/D combinations
 * and checks it's compatible with the given dataset. Returns an error message string if invalid,
 * or null if valid.
 */
export function validateSummaryLevel2(direction: TradeDirection, dataset: TradeDataset, rawValue: string): string | null {
  const value = rawValue.toUpperCase();
  const canonicalSet = direction === "exports" ? EXPORT_SUMMARY_LVL2_CODES : IMPORT_SUMMARY_LVL2_CODES;
  const appendix = direction === "exports" ? "C" : "D";

  if (!canonicalSet.has(value)) {
    return (
      `"${rawValue}" is not a valid SUMMARY_LVL2 combination for ${direction} - see Appendix ${appendix} of the ` +
      `Census API User Guide for the full list (e.g. TO, CY, DT, HSDTCY, NACY, ...).`
    );
  }

  const tokens: string[] = [];
  for (let i = 0; i < value.length; i += 2) tokens.push(value.slice(i, i + 2));

  for (const token of tokens) {
    const meta = SUMMARY_LEVEL_TOKENS[token];
    const allowedDatasets = meta?.datasets[direction];
    if (!meta || !allowedDatasets?.includes(dataset)) {
      return (
        `SUMMARY_LVL2 "${rawValue}" includes "${token}"${meta ? ` (${meta.meaning})` : ""}, which is not valid for the ` +
        `"${dataset}" ${direction} dataset` +
        (allowedDatasets?.length ? ` - only valid on: ${allowedDatasets.join(", ")}.` : ".")
      );
    }
  }

  return null;
}
