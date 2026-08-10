import type { TradeDataset } from "../types.js";

/** Static description of one Census International Trade dataset (per direction). */
export interface DatasetInfo {
  dataset: TradeDataset;
  name: string;
  description: string;
  /** Geography/detail levels available for this dataset. */
  detailExports: string;
  detailImports: string;
  /** Notes on which commodity-code parameter(s) this dataset accepts. */
  exportCodeParams: string[];
  importCodeParams: string[];
}

/**
 * The 9 dataset types available under both /exports and /imports.
 * Source: Census "Guide to International Trade Datasets" (International Trade Data API User Guide).
 */
export const DATASETS: DatasetInfo[] = [
  {
    dataset: "hs",
    name: "Harmonized System (HS)",
    description:
      "The most detailed commodity classification available (2, 4, 6, or 10-digit HS codes), broken out by country and customs district. This is the best starting point for most commodity-level questions.",
    detailExports: "2-,4-,6-,&10-digit HS by Country by District by Domestic/Foreign (DF)",
    detailImports: "2-,4-,6-,&10-digit HS by Country by District by Rate Provision by Country Subcode",
    exportCodeParams: ["E_COMMODITY", "E_COMMODITY_LDESC", "E_COMMODITY_SDESC"],
    importCodeParams: ["I_COMMODITY", "I_COMMODITY_LDESC", "I_COMMODITY_SDESC"],
  },
  {
    dataset: "naics",
    name: "North American Industry Classification System (NAICS)",
    description:
      "Trade data aggregated by NAICS industry code (2-6 digits), broken out by country and customs district.",
    detailExports: "2-,3-,4-,5-&6-digit NAICS by Country by District by DF",
    detailImports: "2-,3-,4-,5-&6-digit NAICS by Country by District",
    exportCodeParams: ["NAICS", "NAICS_LDESC", "NAICS_SDESC"],
    importCodeParams: ["NAICS", "NAICS_LDESC", "NAICS_SDESC"],
  },
  {
    dataset: "enduse",
    name: "End-Use",
    description:
      "Trade data aggregated by Bureau of Economic Analysis End-Use code (1 or 5 digits), useful for broad economic-category analysis (e.g. capital goods, consumer goods, foods/feeds/beverages).",
    detailExports: "1-&5-digit End-Use by Country by District by DF",
    detailImports: "1-&5-digit End-Use by Country by District",
    exportCodeParams: ["E_ENDUSE", "E_ENDUSE_LDESC", "E_ENDUSE_SDESC"],
    importCodeParams: ["I_ENDUSE", "I_ENDUSE_LDESC", "I_ENDUSE_SDESC"],
  },
  {
    dataset: "sitc",
    name: "Standard International Trade Classification (SITC)",
    description: "Trade data aggregated by SITC code, useful for comparing U.S. trade data to other countries' UN-standardized trade statistics.",
    detailExports: "SITC by Country by District by DF",
    detailImports: "SITC by Country by District",
    exportCodeParams: ["SITC", "SITC_LDESC", "SITC_SDESC"],
    importCodeParams: ["SITC", "SITC_LDESC", "SITC_SDESC"],
  },
  {
    dataset: "usda",
    name: "USDA (Agricultural / Non-Agricultural)",
    description: "Trade data split into two broad USDA-defined categories: agricultural and non-agricultural commodities.",
    detailExports: "USDA by Country by District by DF",
    detailImports: "USDA by Country by District",
    exportCodeParams: ["USDA"],
    importCodeParams: ["USDA"],
  },
  {
    dataset: "hitech",
    name: "Advanced Technology (Hi-Tech)",
    description: "Trade data for Advanced Technology Products, broken out by 2-character Hi-Tech category code (e.g. biotechnology, aerospace, electronics).",
    detailExports: "Hi-tech by Country by District by DF",
    detailImports: "Hi-tech by Country by District",
    exportCodeParams: ["HITECH", "HITECH_DESC"],
    importCodeParams: ["HITECH", "HITECH_DESC"],
  },
  {
    dataset: "statehs",
    name: "HS by State",
    description:
      "HS commodity trade data broken out by U.S. state of origin (exports) or destination (imports) instead of customs district. Limited to 2-, 4-, and 6-digit HS codes to protect respondent confidentiality (no 10-digit detail).",
    detailExports: "2-,4-,&6-digit HS by Country by State",
    detailImports: "2-,4-,&6-digit HS by Country by State",
    exportCodeParams: ["E_COMMODITY", "E_COMMODITY_LDESC", "E_COMMODITY_SDESC"],
    importCodeParams: ["I_COMMODITY", "I_COMMODITY_LDESC", "I_COMMODITY_SDESC"],
  },
  {
    dataset: "statenaics",
    name: "NAICS by State",
    description:
      "NAICS trade data broken out by U.S. state of origin (exports) or destination (imports). Limited to 2-, 3-, and 4-digit NAICS codes (no 5- or 6-digit detail).",
    detailExports: "2-,3-,&4-digit NAICS by Country by State",
    detailImports: "2-,3-,&4-digit NAICS by Country by State",
    exportCodeParams: ["NAICS", "NAICS_LDESC", "NAICS_SDESC"],
    importCodeParams: ["NAICS", "NAICS_LDESC", "NAICS_SDESC"],
  },
  {
    dataset: "porths",
    name: "HS by Port",
    description:
      "HS commodity trade data broken out by U.S. Customs port of entry/exit instead of district. Limited to 2-, 4-, and 6-digit HS codes to protect respondent confidentiality.",
    detailExports: "2-,4-,&6-digit HS by Country by Port",
    detailImports: "2-,4-,&6-digit HS by Country by Port",
    exportCodeParams: ["E_COMMODITY", "E_COMMODITY_LDESC", "E_COMMODITY_SDESC"],
    importCodeParams: ["I_COMMODITY", "I_COMMODITY_LDESC", "I_COMMODITY_SDESC"],
  },
];

export function getDatasetInfo(dataset: TradeDataset): DatasetInfo {
  const info = DATASETS.find((d) => d.dataset === dataset);
  if (!info) {
    throw new Error(`Unknown dataset: ${dataset}`);
  }
  return info;
}
