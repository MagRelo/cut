export type TournamentSummaryItem = {
  label?: string;
  body: string;
  attribution?: string;
  color?: string;
};

export type TournamentSummarySection = {
  title: string;
  items: TournamentSummaryItem[];
};

export type TournamentSummarySections = TournamentSummarySection[];

export type NormalizedTournamentQuote = {
  body: string;
  attribution: string;
  color: string;
  colors: QuoteBlockColors;
};

export type QuoteBlockColors = {
  border: string;
  bg: string;
  text: string;
};

export const QUOTES_SECTION_DISPLAY_TITLE = "They Out Here Sayin:";
export const DEFAULT_QUOTE_COLOR = "#7cb68a";
export const DEFAULT_CUTBOT_ATTRIBUTION = "CutBot";

const QUOTES_SECTION_KEYS = new Set(["they out here sayin", "summary"]);

function isSummaryItem(value: unknown): value is TournamentSummaryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as TournamentSummaryItem;
  if (typeof item.body !== "string" || item.body.trim() === "") return false;
  if (item.label !== undefined && typeof item.label !== "string") return false;
  if (item.attribution !== undefined && typeof item.attribution !== "string") return false;
  if (item.color !== undefined && typeof item.color !== "string") return false;
  return true;
}

function isSummarySection(value: unknown): value is TournamentSummarySection {
  if (!value || typeof value !== "object") return false;
  const section = value as TournamentSummarySection;
  if (typeof section.title !== "string" || section.title.trim() === "") return false;
  if (!Array.isArray(section.items) || section.items.length === 0) return false;
  return section.items.every(isSummaryItem);
}

export function normalizeHexColor(color: string | undefined): string | null {
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
  const factor = 1 - amount;
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function quoteColorsFromHex(color: string): QuoteBlockColors {
  const border = normalizeHexColor(color) ?? DEFAULT_QUOTE_COLOR;
  return {
    border,
    bg: mixHexWithWhite(border, 0.9),
    text: darkenHex(border, 0.45),
  };
}

export function isQuotesSection(section: TournamentSummarySection): boolean {
  return QUOTES_SECTION_KEYS.has(section.title.trim().toLowerCase());
}

/** @deprecated Use isQuotesSection */
export function isSummaryLeadSection(section: TournamentSummarySection): boolean {
  return isQuotesSection(section);
}

export function findQuotesSection(
  sections: TournamentSummarySections,
): TournamentSummarySection | null {
  return sections.find(isQuotesSection) ?? null;
}

export function normalizeQuoteItem(
  item: TournamentSummaryItem,
  index: number,
): NormalizedTournamentQuote {
  const color = normalizeHexColor(item.color) ?? DEFAULT_QUOTE_COLOR;
  const attribution =
    item.attribution?.trim() ||
    (index === 0 ? DEFAULT_CUTBOT_ATTRIBUTION : "Anonymous");

  return {
    body: item.body.trim(),
    attribution,
    color,
    colors: quoteColorsFromHex(color),
  };
}

export function getNormalizedQuotes(
  sections: TournamentSummarySections | null | undefined,
): NormalizedTournamentQuote[] {
  if (!sections) return [];
  const quotesSection = findQuotesSection(sections);
  if (!quotesSection) return [];
  return quotesSection.items.map(normalizeQuoteItem);
}

export function parseSummarySections(json: unknown): TournamentSummarySections | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  if (!json.every(isSummarySection)) return null;
  return json;
}
