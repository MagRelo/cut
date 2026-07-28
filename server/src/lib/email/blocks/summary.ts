import { escapeHtml } from "../escape.js";
import {
  EMPTY_SUMMARY_STYLE,
  FONT_QUOTE,
  SECTION_TITLE_STYLE,
  SUMMARY_ITEM_STYLE,
} from "../styles.js";
import type { EmailAnnouncementSection } from "@cut/sport-sdk";

export { normalizeSummarySectionKey } from "./summaryKeys.js";

const DEFAULT_QUOTE_COLOR = "#3b82f6";

type QuoteColors = { border: string; bg: string; text: string };

function normalizeHexColor(color: string | undefined): string | null {
  if (!color) return null;
  const cleaned = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex)!;
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexWithWhite(hex: string, whiteRatio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * whiteRatio,
    g + (255 - g) * whiteRatio,
    b + (255 - b) * whiteRatio,
  );
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function quoteColorsFromHex(color: string | undefined): QuoteColors {
  const border = normalizeHexColor(color) ?? DEFAULT_QUOTE_COLOR;
  return {
    border,
    bg: mixHexWithWhite(border, 0.9),
    text: darkenHex(border, 0.45),
  };
}

function quoteTextStyle(color: string, weight: 500 | 600 = 500): string {
  return `font-family:${FONT_QUOTE};font-size:14px;font-weight:${weight};font-style:italic;line-height:1.5;color:${color};margin:0;`;
}

function renderQuoteBlockHtml(
  quote: string,
  attribution: string,
  colors: QuoteColors,
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

export function renderLeadSummarySectionsHtml(
  sections: EmailAnnouncementSection[] | null | undefined,
): string {
  const quotes = (sections ?? []).filter((s) => s.kind === "quotes");
  if (quotes.length === 0) return "";

  const quoteBlocksHtml = quotes
    .flatMap((section) =>
      section.items.map((item) =>
        renderQuoteBlockHtml(
          item.body,
          item.attribution?.trim() || "Anonymous",
          quoteColorsFromHex(item.color),
        ),
      ),
    )
    .join("");

  const title = quotes[0]?.title ?? "Quotes";
  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(title)}</h2>
${quoteBlocksHtml}
</div>`;
}

function renderBulletSectionHtml(section: EmailAnnouncementSection): string {
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

export function renderBodySummarySectionsHtml(
  sections: EmailAnnouncementSection[] | null | undefined,
): string {
  return (sections ?? [])
    .filter((s) => s.kind !== "quotes")
    .map(renderBulletSectionHtml)
    .join("");
}

export function renderSummarySectionsEmailHtml(
  sections: EmailAnnouncementSection[] | null | undefined,
): string {
  if (!sections || sections.length === 0) {
    return `<p style="${EMPTY_SUMMARY_STYLE}">No event summary available.</p>`;
  }

  const leadHtml = renderLeadSummarySectionsHtml(sections.filter((s) => s.kind === "quotes"));
  const bulletHtml = renderBodySummarySectionsHtml(sections);
  return `${leadHtml}${bulletHtml}`;
}

/** @deprecated Use renderLeadSummarySectionsHtml */
export function renderLeadSummarySectionHtml(
  sections: EmailAnnouncementSection[] | null | undefined,
): string {
  return renderLeadSummarySectionsHtml(sections);
}

/** @deprecated Prefer renderBodySummarySectionsHtml with pre-ordered sections */
export function renderSummarySectionByKeyHtml(
  sections: EmailAnnouncementSection[] | null | undefined,
  key: string,
): string {
  if (!sections || sections.length === 0) return "";
  const normalized = key.trim().toLowerCase();
  const section =
    sections.find(
      (entry) =>
        entry.key.trim().toLowerCase() === normalized ||
        entry.title.trim().toLowerCase() === normalized,
    ) ?? null;
  if (!section) return "";
  if (section.kind === "quotes") {
    return renderLeadSummarySectionsHtml([section]);
  }
  return renderBulletSectionHtml(section);
}
