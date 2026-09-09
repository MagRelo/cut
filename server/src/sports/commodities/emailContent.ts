import type {
  EmailAnnouncementContent,
  EmailEventShell,
  SportEmailContent,
} from "@cut/sport-sdk";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { EMAIL_TZ_ET, formatEmailDateRange, parseEmailDate } from "../emailDateFormat.js";

function commoditiesDateLine(event: EmailEventShell): string {
  const commodities = parseCommoditiesEventMetadata(event.metadata);
  if (!commodities) return "";
  return formatEmailDateRange(
    parseEmailDate(commodities.sessionOpen),
    parseEmailDate(commodities.sessionClose),
    EMAIL_TZ_ET,
  );
}

export function createCommoditiesEmailContent(): SportEmailContent {
  return {
    sportId: COMMODITIES_SPORT_ID,

    formatEventSubtitle(event: EmailEventShell): string {
      return commoditiesDateLine(event);
    },

    async loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent> {
      return {
        courseLine: "",
        dateLine: commoditiesDateLine(event),
        blurb: null,
        leadSections: [],
        bodySections: [],
      };
    },
  };
}
