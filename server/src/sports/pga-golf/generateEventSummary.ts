import { Prisma } from "@prisma/client";
import {
  DEFAULT_CUTBOT_ATTRIBUTION,
  DEFAULT_QUOTE_COLOR,
  findEventBlurbSection,
  findQuotesSection,
  isQuotesSection,
  parseGolfEventMetadata,
  parseSummarySections,
  PGA_GOLF_SPORT_ID,
  type TournamentSummaryItem,
  type TournamentSummarySection,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { prepareEventAnnouncementEmailSafe } from "../../lib/email/prepareEventAnnouncement.js";
import { tryWithCommentaryLlmLock } from "../../lib/commentaryLlmMutex.js";
import {
  CursorCommentaryTextGenerator,
  type CommentaryTextGenerator,
} from "../../services/contest/commentaryTextGenerator.js";
import { extractJsonArray } from "./extractJson.js";
import {
  americanToDecimal,
  fetchDataGolfOutrightWinOdds,
  findPlayerOdds,
  formatAmericanOdds,
  formatPlayerOddsLabel,
  matchOutrightsToEvent,
  type DataGolfOutrightsBoard,
  type SourcedPlayerOdds,
} from "./datagolf/outrightOdds.js";
import {
  buildGolfEventSummaryPrompt,
  buildMarketShape,
  datesFromGolfMetadata,
  overviewUrlForPgaTourId,
  type EventSummaryContext,
  type EventSummaryPlayer,
} from "./eventSummaryPrompt.js";

const ODDS_TOKEN = /[+-]\d{2,}/g;
const BEST_PLAYERS_TITLE = /^best players and odds$/i;
const SUMMARY_ATTEMPT_BACKOFF_MS = 3 * 60 * 60 * 1000;
const PLAYER_LIMIT = 10;

export type GenerateGolfEventSummaryOptions = {
  generator?: CommentaryTextGenerator;
  fetchOdds?: () => Promise<DataGolfOutrightsBoard | null>;
  force?: boolean;
};

function metadataRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function defaultGenerator(): CommentaryTextGenerator | null {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) return null;
  return new CursorCommentaryTextGenerator({ apiKey });
}

function formatFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).format;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function attemptIsRecent(metadata: Record<string, unknown>, now = Date.now()): boolean {
  const raw = metadata.summaryAttemptAt;
  if (typeof raw !== "string") return false;
  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return false;
  return now - at < SUMMARY_ATTEMPT_BACKOFF_MS;
}

function requiredSections(sections: TournamentSummarySections): string | null {
  if (!findQuotesSection(sections)) return 'Missing "From the 19th Hole" section.';
  if (!findEventBlurbSection(sections)) return 'Missing "Event Blurb" section.';
  return null;
}

function playerNameFromLabel(label: string | undefined, body: string): string {
  const source = (label ?? body).trim();
  const cut = source.split(":")[0] ?? source;
  return cut.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function sourcedTokensForPlayer(odds: SourcedPlayerOdds | null): Set<string> {
  const tokens = new Set<string>();
  if (!odds) return tokens;
  for (const quote of odds.quotes) {
    tokens.add(formatAmericanOdds(quote));
  }
  if (odds.quotes.length > 0) {
    tokens.add(formatAmericanOdds(odds.low));
    tokens.add(formatAmericanOdds(odds.high));
  }
  return tokens;
}

export function unsourcedOddsReason(
  sections: TournamentSummarySections,
  players: EventSummaryPlayer[],
): string | null {
  const byName = new Map(players.map((player) => [player.displayName.toLowerCase(), player]));
  for (const section of sections) {
    if (!BEST_PLAYERS_TITLE.test(section.title.trim())) continue;
    for (const item of section.items) {
      const label = item.label ?? "";
      const tokens = label.match(ODDS_TOKEN) ?? [];
      if (tokens.length === 0) continue;
      const name = playerNameFromLabel(item.label, item.body);
      const player = byName.get(name.toLowerCase());
      const allowed = sourcedTokensForPlayer(player?.odds ?? null);
      for (const token of tokens) {
        if (!allowed.has(token)) {
          return `Invented or mismatched odds ${token} for ${name || "unknown player"}.`;
        }
      }
    }
  }
  return null;
}

function dropEmptyPlayerItems(parsed: unknown): unknown {
  if (!Array.isArray(parsed)) return parsed;
  return parsed.flatMap((section) => {
    if (!section || typeof section !== "object") return [section];
    const record = section as { title?: unknown; items?: unknown };
    if (typeof record.title !== "string" || !BEST_PLAYERS_TITLE.test(record.title.trim())) {
      return [section];
    }
    if (!Array.isArray(record.items)) return [];
    const items = record.items.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const body = (item as { body?: unknown }).body;
      return typeof body === "string" && body.trim() !== "";
    });
    if (items.length === 0) return [];
    return [{ ...record, items }];
  });
}

function validateSummary(
  parsed: unknown,
  players: EventSummaryPlayer[],
): { sections: TournamentSummarySections; reason: string | null } {
  const sections = parseSummarySections(dropEmptyPlayerItems(parsed));
  if (!sections) {
    return {
      sections: [],
      reason: "Invalid summary JSON — expected a non-empty array of sections with body items.",
    };
  }
  const missing = requiredSections(sections);
  if (missing) return { sections, reason: missing };
  const odds = unsourcedOddsReason(sections, players);
  return { sections, reason: odds };
}

function normalizeQuotes(sections: TournamentSummarySections): TournamentSummarySections {
  return sections.map((section) => {
    if (!isQuotesSection(section)) return section;
    const first = section.items[0];
    if (!first) return section;
    return {
      ...section,
      items: [
        {
          ...first,
          attribution: first.attribution?.trim() || DEFAULT_CUTBOT_ATTRIBUTION,
          color: first.color?.trim() || DEFAULT_QUOTE_COLOR,
        },
      ],
    };
  });
}

function finishSections(
  sections: TournamentSummarySections,
  players: EventSummaryPlayer[],
): TournamentSummarySections {
  const existing = sections.find((section) => BEST_PLAYERS_TITLE.test(section.title.trim()));
  const byName = new Map(
    (existing?.items ?? []).map((item) => [playerNameFromLabel(item.label, item.body).toLowerCase(), item]),
  );
  const items: TournamentSummaryItem[] = players.flatMap((player) => {
    const prior = byName.get(player.displayName.toLowerCase());
    if (prior == null || !prior.body.trim()) return [];
    return [
      {
        label: formatPlayerOddsLabel(player.displayName, player.odds?.quotes ?? []),
        body: prior.body,
      },
    ];
  });
  const without = sections.filter((section) => !BEST_PLAYERS_TITLE.test(section.title.trim()));
  if (items.length === 0) return normalizeQuotes(without);
  const next: TournamentSummarySection = { title: "Best Players and Odds", items };
  const blurbIndex = without.findIndex((section) => findEventBlurbSection([section]));
  const insertAt = blurbIndex >= 0 ? blurbIndex + 1 : without.length;
  without.splice(insertAt, 0, next);
  return normalizeQuotes(without);
}

async function loadSummaryContext(
  eventId: string,
  externalId: string,
  metadata: unknown,
  fetchOdds: () => Promise<DataGolfOutrightsBoard | null>,
): Promise<EventSummaryContext> {
  const golf = parseGolfEventMetadata(metadata);
  const eventName = golf?.name?.trim() || "PGA Tour event";
  const pgaTourId = golf?.pgaTourId?.trim() || externalId;

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId },
    include: {
      participant: { select: { displayName: true } },
    },
  });

  let board: DataGolfOutrightsBoard | null = null;
  try {
    board = matchOutrightsToEvent(await fetchOdds(), eventName);
  } catch (error) {
    console.warn(
      "[pga-golf] Outright odds fetch failed:",
      error instanceof Error ? error.message : error,
    );
  }

  const players: EventSummaryPlayer[] = rows.flatMap((row) => {
    const displayName = row.participant.displayName?.trim() || "Unknown";
    const odds = findPlayerOdds(board, displayName);
    if (!odds || odds.quotes.length === 0) return [];
    return [{ displayName, odds }];
  });

  players.sort((a, b) => {
    const aOdds = a.odds?.quotes.length ? americanToDecimal(a.odds.low) : Number.POSITIVE_INFINITY;
    const bOdds = b.odds?.quotes.length ? americanToDecimal(b.odds.low) : Number.POSITIVE_INFINITY;
    if (aOdds !== bOdds) return aOdds - bOdds;
    return a.displayName.localeCompare(b.displayName);
  });

  const priced = players.slice(0, PLAYER_LIMIT);
  return {
    eventName,
    pgaTourId,
    overviewUrl: overviewUrlForPgaTourId(pgaTourId),
    course: golf?.course,
    city: golf?.city,
    state: golf?.state,
    displayDates: datesFromGolfMetadata(golf),
    purse: golf?.purse ?? null,
    format: formatFromMetadata(metadata),
    fieldSize: rows.length,
    players: priced,
    oddsEventName: board?.eventName ?? null,
    marketShape: buildMarketShape(priced),
  };
}

async function persistSummary(
  eventId: string,
  existing: Record<string, unknown>,
  sections: TournamentSummarySections,
) {
  const next: Record<string, unknown> = { ...existing, summarySections: sections };
  delete next.summaryAttemptAt;
  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: { metadata: next as Prisma.InputJsonValue },
  });
  await prepareEventAnnouncementEmailSafe(eventId);
}

async function recordSummaryAttempt(eventId: string, existing: Record<string, unknown>) {
  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: {
      metadata: {
        ...existing,
        summaryAttemptAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
}

async function draftSummary(
  generator: CommentaryTextGenerator,
  context: EventSummaryContext,
): Promise<TournamentSummarySections> {
  let reason: string | undefined;
  let parsedSections: TournamentSummarySections | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await generator.generate(buildGolfEventSummaryPrompt(context, reason));
    let parsed: unknown;
    try {
      parsed = extractJsonArray(raw);
    } catch (error) {
      reason = error instanceof Error ? error.message : "Output was not valid JSON.";
      continue;
    }
    const validated = validateSummary(parsed, context.players);
    if (!validated.sections.length || (validated.reason && !validated.reason.includes("odds"))) {
      reason = validated.reason ?? "Summary validation failed";
      continue;
    }
    parsedSections = validated.sections;
    break;
  }
  if (!parsedSections) throw new Error(reason ?? "Summary validation failed");
  return finishSections(parsedSections, context.players);
}

export async function generateGolfEventSummary(
  eventId: string,
  options: GenerateGolfEventSummaryOptions = {},
): Promise<"wrote" | "skipped" | "failed"> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });
  if (!event) {
    console.warn(`[pga-golf] Summary skipped — no event ${eventId}`);
    return "skipped";
  }

  const existing = metadataRecord(event.metadata);
  if (!options.force && parseSummarySections(existing.summarySections)) {
    console.log(`[pga-golf] Summary skipped — copy already exists on ${eventId}`);
    return "skipped";
  }
  if (!options.force && attemptIsRecent(existing)) {
    console.log(`[pga-golf] Summary skipped — last attempt on ${eventId} is still inside the backoff`);
    return "skipped";
  }

  const generator = options.generator ?? defaultGenerator();
  if (!generator) {
    console.log("[pga-golf] Summary skipped — CURSOR_API_KEY is not configured");
    return "skipped";
  }

  const fetchOdds = options.fetchOdds ?? fetchDataGolfOutrightWinOdds;
  const context = await loadSummaryContext(event.id, event.externalId, event.metadata, fetchOdds);
  if (!context.oddsEventName || context.players.length === 0) {
    console.log(
      `[pga-golf] Summary skipped — DataGolf win board does not match ${context.eventName}`,
    );
    return "skipped";
  }

  let attempted = false;
  try {
    const locked = await tryWithCommentaryLlmLock(async () => {
      attempted = true;
      const draft = await draftSummary(generator, context);
      await persistSummary(event.id, existing, draft);
      return draft;
    });

    if (locked == null) {
      console.log("[pga-golf] Summary skipped — commentary LLM is busy");
      return "skipped";
    }

    console.log(
      `[pga-golf] Wrote summarySections (${(locked as TournamentSummarySection[]).length} sections) to event ${event.id}`,
    );
    return "wrote";
  } catch (error) {
    if (attempted) {
      try {
        await recordSummaryAttempt(event.id, existing);
      } catch (recordError) {
        console.error(
          `[pga-golf] Failed to record summary attempt for ${eventId}:`,
          recordError instanceof Error ? recordError.message : recordError,
        );
      }
    }
    throw error;
  }
}

export async function generateGolfEventSummarySafe(
  eventId: string,
  options?: GenerateGolfEventSummaryOptions,
): Promise<void> {
  try {
    await generateGolfEventSummary(eventId, options);
  } catch (error) {
    console.error(
      `[pga-golf] Summary generation failed for ${eventId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/** Overview retry: write a preview for the active golf event when copy is missing. */
export async function refreshMissingGolfEventSummary(): Promise<void> {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
    select: { id: true, metadata: true },
  });
  if (!event) return;
  if (parseSummarySections(metadataRecord(event.metadata).summarySections)) return;
  await generateGolfEventSummarySafe(event.id);
}
