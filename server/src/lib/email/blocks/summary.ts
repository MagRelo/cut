import { escapeHtml } from "../escape.js";
import {
  EMPTY_SUMMARY_STYLE,
  QUOTE_CELL_STYLE,
  QUOTE_TEXT_STYLE,
  SECTION_TITLE_STYLE,
  SUMMARY_ITEM_STYLE,
} from "../styles.js";
import {
  isSummaryLeadSection,
  type TournamentSummarySection,
  type TournamentSummarySections,
} from "../../tournamentSummary.js";

export function normalizeSummarySectionKey(key: string): string {
  return key.trim().toLowerCase();
}

function findSummarySectionByKey(
  sections: TournamentSummarySections,
  key: string,
): TournamentSummarySection | null {
  const normalized = normalizeSummarySectionKey(key);
  return (
    sections.find((section) => normalizeSummarySectionKey(section.title) === normalized) ?? null
  );
}

export function renderLeadSummarySectionHtml(
  sections: TournamentSummarySections | null | undefined,
): string {
  if (!sections || sections.length === 0) return "";
  const leadItems = sections.filter(isSummaryLeadSection).flatMap((s) => s.items);
  if (leadItems.length === 0) return "";

  const paragraphsHtml = leadItems
    .map((item, index) => {
      const margin = index < leadItems.length - 1 ? "margin:0 0 12px;" : "margin:0;";
      return `<p style="${QUOTE_TEXT_STYLE}${margin}">&ldquo;${escapeHtml(item.body.trim())}&rdquo;</p>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr>
    <td style="${QUOTE_CELL_STYLE}">${paragraphsHtml}</td>
  </tr>
</table>`;
}

function renderBulletSectionHtml(section: TournamentSummarySection): string {
  const itemsHtml = section.items
    .map((item) => {
      const label = item.label?.trim();
      const labelHtml = label
        ? `<span style="font-weight:600;color:#18181b;">${escapeHtml(label)}</span> `
        : "";
      return `<p style="${SUMMARY_ITEM_STYLE}">&#8226;&nbsp;${labelHtml}${escapeHtml(item.body)}</p>`;
    })
    .join("");

  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(section.title)}</h2>
${itemsHtml}
</div>`;
}

export function renderSummarySectionByKeyHtml(
  sections: TournamentSummarySections | null | undefined,
  key: string,
): string {
  if (!sections || sections.length === 0) return "";
  const section = findSummarySectionByKey(sections, key);
  if (!section) return "";
  if (isSummaryLeadSection(section)) {
    return renderLeadSummarySectionHtml([section]);
  }
  return renderBulletSectionHtml(section);
}

export function renderSummarySectionsEmailHtml(
  sections: TournamentSummarySections | null | undefined,
): string {
  if (!sections || sections.length === 0) {
    return `<p style="${EMPTY_SUMMARY_STYLE}">No tournament summary available.</p>`;
  }

  const leadHtml = renderLeadSummarySectionHtml(sections);
  const bulletHtml = sections
    .filter((section) => !isSummaryLeadSection(section))
    .map(renderBulletSectionHtml)
    .join("");

  return `${leadHtml}${bulletHtml}`;
}
