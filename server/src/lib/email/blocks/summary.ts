import { splitPlayerOddsLabel } from "@cut/sport-pga-golf";
import type { EmailAnnouncementSection, EmailAnnouncementSectionItem } from "@cut/sport-sdk";
import { escapeHtml } from "../escape.js";
import {
  EMPTY_SUMMARY_STYLE,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_QUOTE,
  SECTION_TITLE_STYLE,
  STORY_BODY_STYLE,
  STORY_HEADLINE_STYLE,
  SUMMARY_ITEM_STYLE,
} from "../styles.js";

export { normalizeSummarySectionKey } from "./summaryKeys.js";

const DEFAULT_QUOTE_COLOR = "#3b82f6";

type QuoteColors = { border: string; hairline: string; bg: string; text: string };

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
    hairline: mixHexWithWhite(border, 0.45),
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
  const cellStyle = `border-top:1px solid ${colors.hairline};border-right:1px solid ${colors.hairline};border-bottom:1px solid ${colors.hairline};border-left:3px solid ${colors.border};background-color:${colors.bg};padding:14px 16px;`;

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

function renderStorySectionHtml(section: EmailAnnouncementSection): string {
  const rows = section.items
    .map((item, index) => {
      const label = item.label?.trim();
      const headline = label
        ? `<p style="${STORY_HEADLINE_STYLE}">${escapeHtml(label)}</p>`
        : "";
      const rule = index === 0 ? "" : "border-top:1px solid #e4e4e7;";
      const padding = index === 0 ? "4px 0 16px" : "16px 0";
      return `<tr>
    <td style="padding:${padding};${rule}">
      ${headline}
      <p style="${STORY_BODY_STYLE}">${escapeHtml(item.body)}</p>
    </td>
  </tr>`;
    })
    .join("");

  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(section.title)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${rows}
</table>
</div>`;
}

const BEST_PLAYERS_TITLE = /best players and odds/i;

function isBestPlayersSection(section: EmailAnnouncementSection): boolean {
  return BEST_PLAYERS_TITLE.test(section.key) || BEST_PLAYERS_TITLE.test(section.title);
}

function portraitSrc(url: string | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  if (!trimmed.startsWith("https://")) return null;
  return trimmed;
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

function renderPlayerOddsRowHtml(item: EmailAnnouncementSectionItem, index: number): string {
  const { name, odds } = splitPlayerOddsLabel(item.label);
  const displayName = name || "Player";
  const src = portraitSrc(item.imageUrl);
  const avatar = src
    ? `<img src="${escapeHtml(src)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:20px;object-fit:cover;" />`
    : `<div style="width:40px;height:40px;border-radius:20px;background-color:#f4f4f5;font-family:${FONT_DISPLAY};font-size:13px;font-weight:600;line-height:40px;text-align:center;color:#71717a;">${escapeHtml(initials(displayName))}</div>`;
  const country = item.subtitle?.trim()
    ? `<p style="margin:2px 0 0;font-family:${FONT_BODY};font-size:12px;line-height:1.3;color:#52525b;">${escapeHtml(item.subtitle.trim())}</p>`
    : "";
  const oddsHtml = odds
    ? `<p style="margin:0;font-family:${FONT_DISPLAY};font-size:14px;font-weight:600;line-height:1.3;color:#18181b;text-align:right;">${escapeHtml(odds)}</p>`
    : "";
  const top = index === 0 ? "0" : "16px";
  const rule = index === 0 ? "" : "border-top:1px solid #e4e4e7;";

  return `<tr>
    <td width="40" valign="middle" style="padding:${top} 12px 0 0;${rule}width:40px;">${avatar}</td>
    <td valign="middle" style="padding:${top} 12px 0 0;${rule}">
      <p style="margin:0;font-family:${FONT_DISPLAY};font-size:15px;font-weight:600;line-height:1.25;color:#18181b;">${escapeHtml(displayName)}</p>
      ${country}
    </td>
    <td width="72" valign="middle" align="right" style="padding:${top} 0 0 16px;${rule}width:72px;">${oddsHtml}</td>
  </tr>
  <tr>
    <td colspan="3" style="padding:8px 0 0;">
      <p style="margin:0;font-family:${FONT_BODY};font-size:14px;line-height:1.45;color:#3f3f46;">${escapeHtml(item.body)}</p>
    </td>
  </tr>`;
}

function renderPlayerOddsSectionHtml(section: EmailAnnouncementSection): string {
  const rows = section.items.map((item, index) => renderPlayerOddsRowHtml(item, index)).join("");
  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}margin-bottom:24px;">Best bets</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${rows}
</table>
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
    .map((section) => renderOneBodySectionHtml(section))
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
  return renderOneBodySectionHtml(section);
}

function renderOneBodySectionHtml(section: EmailAnnouncementSection): string {
  if (section.kind === "prose") return renderStorySectionHtml(section);
  if (isBestPlayersSection(section)) return renderPlayerOddsSectionHtml(section);
  return renderBulletSectionHtml(section);
}
