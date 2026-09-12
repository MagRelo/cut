import {
  parseSummarySections,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";

export {
  DEFAULT_CUTBOT_ATTRIBUTION,
  DEFAULT_QUOTE_COLOR,
  EVENT_BLURB_SECTION_TITLE,
  findEventBlurbSection,
  findQuotesSection,
  formatEventCourseLine,
  formatEventPlace,
  getEventBlurb,
  getNormalizedQuotes,
  isEventBlurbSection,
  isQuotesSection,
  isSummaryLeadSection,
  normalizeHexColor,
  normalizeQuoteItem,
  parseSummarySections,
  quoteColorsFromHex,
  QUOTES_SECTION_DISPLAY_TITLE,
  type NormalizedTournamentQuote,
  type QuoteBlockColors,
  type TournamentSummaryItem,
  type TournamentSummarySection,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";

/** Summary sections for emails and previews from CompetitionEvent.metadata. */
export async function resolveSummarySectionsForEvent(
  _externalId: string,
  dbSummarySections: unknown,
): Promise<TournamentSummarySections | null> {
  return parseSummarySections(dbSummarySections);
}
