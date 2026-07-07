import { escapeHtml } from "../escape.js";
import {
  EMPTY_SUMMARY_STYLE,
  FONT_QUOTE,
  SECTION_TITLE_STYLE,
  SUMMARY_ITEM_STYLE,
} from "../styles.js";
import {
  getNormalizedQuotes,
  isQuotesSection,
  QUOTES_SECTION_DISPLAY_TITLE,
  type TournamentSummarySection,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";

export { normalizeSummarySectionKey } from "./summaryKeys.js";

function quoteTextStyle(color: string, weight: 500 | 600 = 500): string {
  return `font-family:${FONT_QUOTE};font-size:14px;font-weight:${weight};font-style:italic;line-height:1.5;color:${color};margin:0;`;
}

function renderQuoteBlockHtml(
  quote: string,
  attribution: string,
  colors: { border: string; bg: string; text: string },
): string {
  const textStyle = quoteTextStyle(colors.text);
  const attributionStyle = quoteTextStyle(colors.text, 600);
  const cellStyle = `border-left:3px solid ${colors.border};background-color:${colors.bg};padding:14px 16px;`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
  <tr>
    <td style="${cellStyle}">
      <p style="${textStyle}">&ldquo;${escapeHtml(quote)}&rdquo;</p>
      <p style="${attributionStyle}margin:10px 0 0;text-align:right;">&mdash; ${escapeHtml(attribution)}</p>
    </td>
  </tr>
</table>`;
}

export function renderLeadSummarySectionHtml(
  sections: TournamentSummarySections | null | undefined,
): string {
  const quotes = getNormalizedQuotes(sections);
  if (quotes.length === 0) return "";

  const quoteBlocksHtml = quotes
    .map((quote) => renderQuoteBlockHtml(quote.body, quote.attribution, quote.colors))
    .join("");

  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}">${QUOTES_SECTION_DISPLAY_TITLE}</h2>
${quoteBlocksHtml}
</div>`;
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
  const normalized = key.trim().toLowerCase();
  const section =
    sections.find((entry) => entry.title.trim().toLowerCase() === normalized) ?? null;
  if (!section) return "";
  if (isQuotesSection(section)) {
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
    .filter((section) => !isQuotesSection(section))
    .map(renderBulletSectionHtml)
    .join("");

  return `${leadHtml}${bulletHtml}`;
}
