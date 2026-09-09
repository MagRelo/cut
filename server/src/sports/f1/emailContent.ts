import type {
  EmailAnnouncementContent,
  EmailEventShell,
  SportEmailContent,
} from "@cut/sport-sdk";
import { F1_SPORT_ID, parseF1EventMetadata } from "@cut/sport-f1";
import { EMAIL_TZ_UTC, formatEmailDateRange, parseEmailDate } from "../emailDateFormat.js";

function humanizeCircuitId(circuitId: string): string {
  return circuitId
    .trim()
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function f1Header(event: EmailEventShell): { courseLine: string; dateLine: string } {
  const f1 = parseF1EventMetadata(event.metadata);
  if (!f1) {
    return { courseLine: "", dateLine: "" };
  }
  return {
    courseLine: humanizeCircuitId(f1.circuitId),
    dateLine: formatEmailDateRange(
      parseEmailDate(f1.raceStart),
      parseEmailDate(f1.raceEnd),
      EMAIL_TZ_UTC,
    ),
  };
}

function thinAnnouncement(courseLine: string, dateLine: string): EmailAnnouncementContent {
  return {
    courseLine,
    dateLine,
    blurb: null,
    leadSections: [],
    bodySections: [],
  };
}

export function createF1EmailContent(): SportEmailContent {
  return {
    sportId: F1_SPORT_ID,

    formatEventSubtitle(event: EmailEventShell): string {
      const { courseLine, dateLine } = f1Header(event);
      return [courseLine, dateLine].filter(Boolean).join(" — ");
    },

    async loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent> {
      const { courseLine, dateLine } = f1Header(event);
      return thinAnnouncement(courseLine, dateLine);
    },
  };
}
