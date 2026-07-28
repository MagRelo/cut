import { formatInTimeZone } from "date-fns-tz";
import type {
  EmailAnnouncementContent,
  EmailAnnouncementSection,
  EmailEventShell,
  EmailEventSubtitleInput,
  SportEmailContent,
} from "@cut/sport-sdk";
import {
  formatEventCourseLine,
  getEventBlurb,
  getNormalizedQuotes,
  isQuotesSection,
  PGA_GOLF_SPORT_ID,
  QUOTES_SECTION_DISPLAY_TITLE,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";
import { resolveSummarySectionsForEvent } from "./tournamentSummaryIO.js";

const ET = "America/New_York";

function formatEventDateRange(startDate: Date, endDate: Date): string {
  const start = formatInTimeZone(startDate, ET, "MMM d");
  const end = formatInTimeZone(endDate, ET, "MMM d, yyyy");
  return `${start}–${end}`;
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

export function createPgaGolfEmailContent(): SportEmailContent {
  return {
    sportId: PGA_GOLF_SPORT_ID,

    formatEventSubtitle(input: EmailEventSubtitleInput): string {
      const courseLine = formatEventCourseLine(
        typeof input.course === "string" ? input.course : "",
        typeof input.city === "string" ? input.city : "",
        typeof input.state === "string" ? input.state : "",
      );
      const dates = formatEventDateRange(input.startDate, input.endDate);
      return [courseLine, dates].filter(Boolean).join(" — ");
    },

    async loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent> {
      const summarySections = await resolveSummarySectionsForEvent(
        event.externalId,
        event.summarySections,
      );
      const allSections = summarySections ? toEmailSections(summarySections) : [];
      const leadSections = allSections.filter((s) => s.kind === "quotes");
      const byKey = new Map(allSections.map((s) => [s.key.trim().toLowerCase(), s]));
      const bodySections = GOLF_BODY_SECTION_KEYS.map((key) => byKey.get(key.toLowerCase())).filter(
        (s): s is EmailAnnouncementSection => Boolean(s) && s!.kind !== "quotes",
      );

      return {
        courseLine: formatEventCourseLine(event.course, event.city, event.state),
        dateLine: formatEventDateRange(event.startDate, event.endDate),
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

export { formatEventCourseLine };
