import { CHARACTER_LIMIT } from "../constants.js";
import type { CensusRow } from "../types.js";
import { ResponseFormat } from "../schemas/trade.js";

/** Renders rows as a markdown table, truncating to stay under CHARACTER_LIMIT. */
export function rowsToMarkdownTable(rows: CensusRow[], title?: string): string {
  if (rows.length === 0) {
    return "No results.";
  }

  const columns = Object.keys(rows[0]);
  const lines: string[] = [];
  if (title) lines.push(`## ${title}`, "");

  lines.push(`| ${columns.join(" | ")} |`);
  lines.push(`| ${columns.map(() => "---").join(" | ")} |`);

  let truncated = false;
  let includedCount = 0;
  for (const row of rows) {
    const line = `| ${columns.map((c) => formatCell(row[c])).join(" | ")} |`;
    const candidate = [...lines, line].join("\n");
    if (candidate.length > CHARACTER_LIMIT) {
      truncated = true;
      break;
    }
    lines.push(line);
    includedCount++;
  }

  if (truncated) {
    lines.push("", `_Truncated: showing ${includedCount} of ${rows.length} rows. Narrow your query with more filters (country, commodity code, time range) or a smaller "get" field list to see more._`);
  }

  return lines.join("\n");
}

function formatCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\|/g, "\\|");
}

/** Renders rows as JSON, truncating to stay under CHARACTER_LIMIT. */
export function rowsToJson(rows: CensusRow[]): { text: string; structuredContent: Record<string, unknown> } {
  let includedRows = rows;
  let truncated = false;

  let text = JSON.stringify({ count: includedRows.length, total: rows.length, rows: includedRows }, null, 2);
  while (text.length > CHARACTER_LIMIT && includedRows.length > 1) {
    includedRows = includedRows.slice(0, Math.max(1, Math.floor(includedRows.length / 2)));
    truncated = true;
    text = JSON.stringify({ count: includedRows.length, total: rows.length, rows: includedRows, truncated: true }, null, 2);
  }

  const structuredContent = {
    count: includedRows.length,
    total: rows.length,
    truncated,
    rows: includedRows,
  };

  return { text: JSON.stringify(structuredContent, null, 2), structuredContent };
}

/** Formats a set of rows in the requested response format. */
export function formatRows(rows: CensusRow[], format: ResponseFormat, title?: string): { text: string; structuredContent?: Record<string, unknown> } {
  if (format === ResponseFormat.JSON) {
    return rowsToJson(rows);
  }
  return { text: rowsToMarkdownTable(rows, title) };
}
