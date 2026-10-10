import type {
  EmailAnnouncementContent,
  EmailAnnouncementSection,
  EmailEventShell,
  SportEmailContent,
} from "@cut/sport-sdk";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { getEmailAssetUrl } from "../../lib/email/templates.js";
import { EMAIL_TZ_ET, formatEmailDateRange, parseEmailDate } from "../emailDateFormat.js";

const COMMODITIES_HEADER_IMAGE = "/CommodityBG3.png";
import {
  LAST_WEEK_TITLE,
  TOP_STORIES_TITLE,
  eventBlurbText,
  findWeekBriefSection,
  parseWeekBriefSections,
  summarySectionsFromMetadata,
  type WeekBriefSection,
} from "./weekBrief.js";

function commoditiesDateLine(event: EmailEventShell): string {
  const commodities = parseCommoditiesEventMetadata(event.metadata);
  if (!commodities) return "";
  return formatEmailDateRange(
    parseEmailDate(commodities.sessionOpen),
    parseEmailDate(commodities.sessionClose),
    EMAIL_TZ_ET,
  );
}

function toEmailSection(
  section: WeekBriefSection,
  kind: EmailAnnouncementSection["kind"],
): EmailAnnouncementSection {
  return {
    key: section.title,
    title: section.title,
    kind,
    items: section.items.map((item) => ({
      body: item.body,
      ...(item.label ? { label: item.label } : {}),
    })),
  };
}

export function createCommoditiesEmailContent(): SportEmailContent {
  return {
    sportId: COMMODITIES_SPORT_ID,

    formatEventSubtitle(event: EmailEventShell): string {
      return commoditiesDateLine(event);
    },

    async loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent> {
      const sections = parseWeekBriefSections(summarySectionsFromMetadata(event.metadata));
      const lastWeek = findWeekBriefSection(sections, LAST_WEEK_TITLE);
      const topStories = findWeekBriefSection(sections, TOP_STORIES_TITLE);
      const bodySections = [
        lastWeek ? toEmailSection(lastWeek, "bullets") : null,
        topStories ? toEmailSection(topStories, "prose") : null,
      ].filter((section): section is EmailAnnouncementSection => section != null);

      return {
        courseLine: "",
        dateLine: commoditiesDateLine(event),
        blurb: eventBlurbText(sections),
        leadSections: [],
        bodySections,
        headerImageUrl: getEmailAssetUrl(COMMODITIES_HEADER_IMAGE),
      };
    },
  };
}
