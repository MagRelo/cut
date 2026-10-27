import type {
  EmailAnnouncementContent,
  EmailAnnouncementSection,
  EmailEventShell,
  SportEmailContent,
} from "@cut/sport-sdk";
import {
  formatEventCourseLine,
  getEventBlurb,
  getNormalizedQuotes,
  isQuotesSection,
  parseGolfEventMetadata,
  PGA_GOLF_SPORT_ID,
  QUOTES_SECTION_DISPLAY_TITLE,
  splitPlayerOddsLabel,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { EMAIL_TZ_ET, formatEmailDateRange, parseEmailDate } from "../emailDateFormat.js";
import { resolveSummarySectionsForEvent } from "./tournamentSummaryIO.js";

const BEST_PLAYERS_TITLE = /best players and odds/i;

type PlayerPortrait = { imageUrl?: string; country?: string };

function portraitFromMetadata(metadata: unknown): PlayerPortrait {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const record = metadata as Record<string, unknown>;
  const imageUrl =
    typeof record.imageUrl === "string" && record.imageUrl.trim().startsWith("https://")
      ? record.imageUrl.trim()
      : undefined;
  const country =
    typeof record.country === "string" && record.country.trim() ? record.country.trim() : undefined;
  return {
    ...(imageUrl ? { imageUrl } : {}),
    ...(country ? { country } : {}),
  };
}

async function loadPlayerPortraits(eventId: string): Promise<Map<string, PlayerPortrait>> {
  const rows = await prisma.eventParticipant.findMany({
    where: { eventId },
    select: {
      participant: { select: { displayName: true, metadata: true } },
    },
  });
  const directory = new Map<string, PlayerPortrait>();
  for (const row of rows) {
    const name = row.participant.displayName?.trim();
    if (!name) continue;
    directory.set(name.toLowerCase(), portraitFromMetadata(row.participant.metadata));
  }
  return directory;
}

/** Fill avatar and country on the best-odds list from the event field. */
export async function attachGolfPlayerPortraits(
  eventId: string,
  announcement: EmailAnnouncementContent,
): Promise<EmailAnnouncementContent> {
  const needsPortraits = announcement.bodySections.some(
    (section) => BEST_PLAYERS_TITLE.test(section.key) || BEST_PLAYERS_TITLE.test(section.title),
  );
  if (!needsPortraits) return announcement;

  let directory: Map<string, PlayerPortrait>;
  try {
    directory = await loadPlayerPortraits(eventId);
  } catch (error) {
    console.warn(
      "[pga-golf] Player portraits unavailable:",
      error instanceof Error ? error.message : error,
    );
    return announcement;
  }

  return {
    ...announcement,
    bodySections: announcement.bodySections.map((section) => {
      if (!BEST_PLAYERS_TITLE.test(section.key) && !BEST_PLAYERS_TITLE.test(section.title)) {
        return section;
      }
      return {
        ...section,
        items: section.items.map((item) => {
          const { name } = splitPlayerOddsLabel(item.label);
          const portrait = directory.get(name.toLowerCase());
          if (!portrait) return item;
          return {
            ...item,
            ...(portrait.imageUrl ? { imageUrl: portrait.imageUrl } : {}),
            ...(portrait.country ? { subtitle: portrait.country } : {}),
          };
        }),
      };
    }),
  };
}

function toEmailSections(sections: TournamentSummarySections): EmailAnnouncementSection[] {
  return sections.map((section) => {
    if (isQuotesSection(section)) {
      const quotes = getNormalizedQuotes([section]);
      return {
        key: section.title,
        title: QUOTES_SECTION_DISPLAY_TITLE,
        kind: "quotes" as const,
        items: quotes.map((q) => ({
          body: q.body,
          attribution: q.attribution,
          color: q.color,
        })),
      };
    }
    return {
      key: section.title,
      title: section.title,
      kind: "bullets" as const,
      items: section.items.map((item) => ({
        body: item.body,
        ...(item.label ? { label: item.label } : {}),
        ...(item.attribution ? { attribution: item.attribution } : {}),
        ...(item.color ? { color: item.color } : {}),
      })),
    };
  });
}

const GOLF_BODY_SECTION_KEYS = [
  "Best Players and Odds",
  "Course and Format",
  "Broadcast Information",
] as const;

function golfHeader(event: EmailEventShell): { courseLine: string; dateLine: string } {
  const golf = parseGolfEventMetadata(event.metadata);
  const courseLine = formatEventCourseLine(golf?.course, golf?.city, golf?.state);
  const dateLine = formatEmailDateRange(
    parseEmailDate(golf?.startDate),
    parseEmailDate(golf?.endDate),
    EMAIL_TZ_ET,
  );
  return { courseLine, dateLine };
}

export function createPgaGolfEmailContent(): SportEmailContent {
  return {
    sportId: PGA_GOLF_SPORT_ID,

    formatEventSubtitle(event: EmailEventShell): string {
      const { courseLine, dateLine } = golfHeader(event);
      return [courseLine, dateLine].filter(Boolean).join(" — ");
    },

    async loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent> {
      const golf = parseGolfEventMetadata(event.metadata);
      const summarySections = await resolveSummarySectionsForEvent(
        event.externalId,
        golf?.summarySections ?? null,
      );
      const allSections = summarySections ? toEmailSections(summarySections) : [];
      const leadSections = allSections.filter((s) => s.kind === "quotes");
      const byKey = new Map(allSections.map((s) => [s.key.trim().toLowerCase(), s]));
      const bodySections = GOLF_BODY_SECTION_KEYS.map((key) => byKey.get(key.toLowerCase())).filter(
        (s): s is EmailAnnouncementSection => Boolean(s) && s!.kind !== "quotes",
      );
      const { courseLine, dateLine } = golfHeader(event);

      return {
        courseLine,
        dateLine,
        blurb: getEventBlurb(summarySections),
        leadSections,
        bodySections,
      };
    },

    welcomeProductBlurb(ctx: { eventName?: string }): string | null {
      if (ctx.eventName) {
        return `${ctx.eventName} is the active tournament on Play The Cut. The field is set, lineups are open, and contests are filling up. Build your four-player team, then browse open contests when you are ready to compete.`;
      }
      return "When a new tournament week opens, you will see previews, the field, and open contests right on the home page. Your first move is always the same: build a four-player lineup for the week.";
    },
  };
}
