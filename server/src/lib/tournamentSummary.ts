import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSummarySections,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";

export {
  DEFAULT_CUTBOT_ATTRIBUTION,
  DEFAULT_QUOTE_COLOR,
  findQuotesSection,
  getNormalizedQuotes,
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

const summariesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tournamentSummaries",
);

/** Load and parse `server/src/tournamentSummaries/{pgaTourId}.json`. */
export async function loadSummarySectionsFromFile(
  pgaTourId: string,
): Promise<TournamentSummarySections | null> {
  const filePath = path.join(summariesDir, `${pgaTourId}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseSummarySections(parsed);
  } catch {
    return null;
  }
}

/**
 * Summary sections for emails and previews: prefer `tournamentSummaries/{id}.json`
 * so copy can be finalized before `service:init-event` syncs metadata to the DB.
 */
export async function resolveSummarySectionsForEvent(
  externalId: string,
  dbSummarySections: unknown,
): Promise<TournamentSummarySections | null> {
  const fromFile = await loadSummarySectionsFromFile(externalId);
  if (fromFile) return fromFile;
  return parseSummarySections(dbSummarySections);
}
