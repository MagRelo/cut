import { escapeHtml } from "../escape.js";
import { FONT_BODY, SECTION_TITLE_STYLE, SUMMARY_ITEM_STYLE } from "../styles.js";

export type ResultsRow = {
  label: string;
  value: string;
};

export function renderResultsTableBlock(title: string, rows: ResultsRow[]): string {
  if (rows.length === 0) return "";

  const rowsHtml = rows
    .map(
      (row) =>
        `<p style="${SUMMARY_ITEM_STYLE}"><span style="font-weight:600;color:#18181b;">${escapeHtml(row.label)}</span> ${escapeHtml(row.value)}</p>`,
    )
    .join("");

  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(title)}</h2>
${rowsHtml}
</div>`;
}

export function renderProseBlock(text: string): string {
  return `<p style="font-family:${FONT_BODY};font-size:14px;line-height:1.55;color:#3f3f46;margin:0 0 16px;">${escapeHtml(text)}</p>`;
}
