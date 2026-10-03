import { Prisma } from "@prisma/client";
import {
  findEventBlurbSection,
  findQuotesSection,
  parseGolfEventMetadata,
  parseSummarySections,
  PGA_GOLF_SPORT_ID,
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
  matchOutrightsToEvent,
  type DataGolfOutrightsBoard,
  type SourcedPlayerOdds,
} from "./datagolf/outrightOdds.js";
import {
  buildGolfEventSummaryPrompt,
  datesFromGolfMetadata,
  type EventSummaryContext,
  type EventSummaryPlayer,
} from "./eventSummaryPrompt.js";

const ODDS_TOKEN = /[+-]\d{2,}/g;
const BEST_PLAYERS_TITLE = /^best players and odds$/i;

export type GenerateGolfEventSummaryOptions = {
  generator?: CommentaryTextGenerator;
  fetchOdds?: () => Promise<DataGolfOutrightsBoard | null>;
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

function owgrFromMeta(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).owgr;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
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
  const byName = new Map(players.map((p) => [p.displayName.toLowerCase(), p]));
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

function stripOddsFromBestPlayers(sections: TournamentSummarySections): TournamentSummarySections {
  return sections.map((section) => {
    if (!BEST_PLAYERS_TITLE.test(section.title.trim())) return section;
    return {
      ...section,
      items: section.items.map((item) => {
        if (!item.label) return item;
        const name = playerNameFromLabel(item.label, item.body);
        return { ...item, label: name ? `${name}:` : item.label };
      }),
    };
  });
}

function validateSummary(
  parsed: unknown,
  players: EventSummaryPlayer[],
): { sections: TournamentSummarySections; reason: string | null } {
  const sections = parseSummarySections(parsed);
  if (!sections) {
    return { sections: [], reason: "Invalid summary JSON — expected a non-empty array of sections with body items." };
  }
  const missing = requiredSections(sections);
  if (missing) return { sections, reason: missing };
  const odds = unsourcedOddsReason(sections, players);
  return { sections, reason: odds };
}

async function loadSummaryContext(
  eventId: string,
  metadata: unknown,
  fetchOdds: () => Promise<DataGolfOutrightsBoard | null>,
): Promise<EventSummaryContext> {
  const golf = parseGolfEventMetadata(metadata);
  const eventName = golf?.name?.trim() || "PGA Tour event";
  const format = formatFromMetadata(metadata);

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId },
    include: {
      participant: { select: { displayName: true, metadata: true } },
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

  const players: EventSummaryPlayer[] = rows.map((row) => {
    const displayName = row.participant.displayName?.trim() || "Unknown";
    return {
      displayName,
      owgr: owgrFromMeta(row.participant.metadata),
      odds: findPlayerOdds(board, displayName),
    };
  });

  players.sort((a, b) => {
    const aOdds = a.odds?.quotes.length ? americanToDecimal(a.odds.low) : Number.POSITIVE_INFINITY;
    const bOdds = b.odds?.quotes.length ? americanToDecimal(b.odds.low) : Number.POSITIVE_INFINITY;
    if (aOdds !== bOdds) return aOdds - bOdds;
    const aRank = a.owgr ?? 9999;
    const bRank = b.owgr ?? 9999;
    if (aRank !== bRank) return aRank - bRank;
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    eventName,
    course: golf?.course,
    city: golf?.city,
    state: golf?.state,
    displayDates: datesFromGolfMetadata(golf),
    purse: golf?.purse ?? null,
    format,
    fieldSize: rows.length,
    players: players.slice(0, 10),
    oddsEventName: board?.eventName ?? null,
  };
}

async function persistSummary(eventId: string, existing: Record<string, unknown>, sections: TournamentSummarySections) {
  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: {
      metadata: {
        ...existing,
        summarySections: sections,
      } as Prisma.InputJsonValue,
    },
  });
  await prepareEventAnnouncementEmailSafe(eventId);
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
  if (parseSummarySections(existing.summarySections)) {
    console.log(`[pga-golf] Summary skipped — copy already exists on ${eventId}`);
    return "skipped";
  }

  const generator = options.generator ?? defaultGenerator();
  if (!generator) {
    console.log("[pga-golf] Summary skipped — CURSOR_API_KEY is not configured");
    return "skipped";
  }

  const fetchOdds = options.fetchOdds ?? fetchDataGolfOutrightWinOdds;
  const context = await loadSummaryContext(event.id, event.metadata, fetchOdds);

  const locked = await tryWithCommentaryLlmLock(async () => {
    let raw = await generator.generate(buildGolfEventSummaryPrompt(context));
    let parsed: unknown;
    try {
      parsed = extractJsonArray(raw);
    } catch (error) {
      raw = await generator.generate(
        buildGolfEventSummaryPrompt(
          context,
          error instanceof Error ? error.message : "Output was not valid JSON.",
        ),
      );
      parsed = extractJsonArray(raw);
    }

    let { sections, reason } = validateSummary(parsed, context.players);
    if (reason) {
      raw = await generator.generate(buildGolfEventSummaryPrompt(context, reason));
      parsed = extractJsonArray(raw);
      ({ sections, reason } = validateSummary(parsed, context.players));
    }
    if (reason?.includes("odds")) {
      sections = stripOddsFromBestPlayers(sections);
      reason = validateSummary(sections, context.players).reason;
    }
    if (reason || sections.length === 0) {
      throw new Error(reason ?? "Summary validation failed");
    }
    await persistSummary(event.id, existing, sections);
    return sections;
  });

  if (locked == null) {
    console.log("[pga-golf] Summary skipped — commentary LLM is busy");
    return "skipped";
  }

  console.log(
    `[pga-golf] Wrote summarySections (${(locked as TournamentSummarySection[]).length} sections) to event ${event.id}`,
  );
  return "wrote";
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
