import { getISOWeek, getISOWeekYear } from "date-fns";
import {
  formatCommoditiesWeekExternalId,
  resolveWeekAnchorDates,
} from "./externalId.js";

export const COMMODITIES_SIGN_OFF =
  "Those stories—and a few surprises—this week on Planet Earth.";
export const EVENT_BLURB_TITLE = "Event Blurb";
export const LAST_WEEK_TITLE = "Last week";
export const TOP_STORIES_TITLE = "Top Stories";

const TOP_STORIES_MIN = 5;
const TOP_STORIES_MAX = 8;

export type WeekBriefItem = {
  body: string;
  label?: string;
};

export type WeekBriefSection = {
  title: string;
  items: WeekBriefItem[];
};

export type WeekBriefSections = WeekBriefSection[];

export type LastWeekCandidate = {
  displayName: string;
  total: number;
  pctReturn?: number | null;
};

export type NewsBriefValidation = {
  sections: WeekBriefSections;
  reason: string | null;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function isWeekBriefItem(value: unknown): value is WeekBriefItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as WeekBriefItem;
  if (typeof item.body !== "string" || item.body.trim() === "") return false;
  if (item.label !== undefined && typeof item.label !== "string") return false;
  return true;
}

export function previousCommoditiesWeekExternalId(weekKey: string): string {
  const { weekYear, weekNumber } = resolveWeekAnchorDates(weekKey);
  if (weekNumber > 1) {
    return formatCommoditiesWeekExternalId(weekYear, weekNumber - 1);
  }
  const anchor = new Date(Date.UTC(weekYear - 1, 11, 28, 12));
  return formatCommoditiesWeekExternalId(getISOWeekYear(anchor), getISOWeek(anchor));
}

export function summarySectionsFromMetadata(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return (metadata as { summarySections?: unknown }).summarySections ?? null;
}

/** Well-formed sections already stored on the event. Invalid copy returns null. */
export function parseWeekBriefSections(raw: unknown): WeekBriefSections | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const sections: WeekBriefSection[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const record = entry as { title?: unknown; items?: unknown };
    if (typeof record.title !== "string" || record.title.trim() === "") return null;
    if (!Array.isArray(record.items) || record.items.length === 0) return null;
    if (!record.items.every(isWeekBriefItem)) return null;
    sections.push({
      title: record.title.trim(),
      items: record.items.map((item) => ({
        body: item.body.trim(),
        ...(item.label?.trim() ? { label: item.label.trim() } : {}),
      })),
    });
  }
  return sections;
}

export function findWeekBriefSection(
  sections: WeekBriefSections | null | undefined,
  title: string,
): WeekBriefSection | null {
  if (!sections) return null;
  const key = normalizeTitle(title);
  return sections.find((section) => normalizeTitle(section.title) === key) ?? null;
}

export function eventBlurbText(sections: WeekBriefSections | null | undefined): string | null {
  const blurb = findWeekBriefSection(sections, EVENT_BLURB_TITLE);
  if (!blurb) return null;
  const text = blurb.items
    .map((item) => item.body.trim())
    .filter(Boolean)
    .join(" ");
  return text || null;
}

function formatSignedNumber(value: number, digits: number | null): string {
  const text = digits == null ? String(Math.trunc(value)) : value.toFixed(digits);
  if (value > 0 && !text.startsWith("+")) return `+${text}`;
  return text;
}

function formatLastWeekBody(rank: "Best" | "Worst", candidate: LastWeekCandidate): string {
  const points = `${formatSignedNumber(candidate.total, null)} pts`;
  const pct = candidate.pctReturn;
  if (pct == null || !Number.isFinite(pct)) return `${rank} — ${points}`;
  return `${rank} — ${points}, ${formatSignedNumber(pct, 1)}% on the week`;
}

/**
 * Best and worst from the prior session. A field that all ties is listed once, as Best.
 * Ties at the high end and the low end are all included.
 */
export function buildLastWeekSection(candidates: LastWeekCandidate[]): WeekBriefSection | null {
  const scored = candidates
    .map((candidate) => ({
      displayName: candidate.displayName.trim(),
      total: candidate.total,
      pctReturn: candidate.pctReturn,
    }))
    .filter((candidate) => candidate.displayName !== "" && Number.isFinite(candidate.total));
  if (scored.length === 0) return null;

  const max = Math.max(...scored.map((candidate) => candidate.total));
  const min = Math.min(...scored.map((candidate) => candidate.total));
  const byName = (a: LastWeekCandidate, b: LastWeekCandidate) =>
    a.displayName.localeCompare(b.displayName);
  const best = scored.filter((candidate) => candidate.total === max).sort(byName);
  const worst =
    max === min ? [] : scored.filter((candidate) => candidate.total === min).sort(byName);

  return {
    title: LAST_WEEK_TITLE,
    items: [
      ...best.map((candidate) => ({
        label: candidate.displayName,
        body: formatLastWeekBody("Best", candidate),
      })),
      ...worst.map((candidate) => ({
        label: candidate.displayName,
        body: formatLastWeekBody("Worst", candidate),
      })),
    ],
  };
}

export function assembleWeekBrief(
  news: WeekBriefSections,
  lastWeek: WeekBriefSection | null,
): WeekBriefSections {
  const blurb = findWeekBriefSection(news, EVENT_BLURB_TITLE);
  const stories = findWeekBriefSection(news, TOP_STORIES_TITLE);
  return [blurb, lastWeek, stories].filter((section): section is WeekBriefSection => section != null);
}

function sectionItems(raw: unknown, title: string): WeekBriefItem[] | null {
  if (!Array.isArray(raw)) return null;
  const match = raw.find((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const record = entry as { title?: unknown };
    return typeof record.title === "string" && normalizeTitle(record.title) === normalizeTitle(title);
  }) as { items?: unknown } | undefined;
  if (!match || !Array.isArray(match.items)) return null;
  const items: WeekBriefItem[] = [];
  for (const item of match.items) {
    if (!isWeekBriefItem(item)) return null;
    items.push({
      body: item.body.trim(),
      ...(typeof item.label === "string" && item.label.trim() ? { label: item.label.trim() } : {}),
    });
  }
  return items;
}

/** Model output: Event Blurb and Top Stories only. */
export function validateNewsBrief(raw: unknown): NewsBriefValidation {
  const blurbItems = sectionItems(raw, EVENT_BLURB_TITLE);
  const storyItems = sectionItems(raw, TOP_STORIES_TITLE);
  if (!blurbItems || blurbItems.length !== 1) {
    return { sections: [], reason: 'Event Blurb must be exactly one item.' };
  }
  const blurb = blurbItems[0]?.body ?? "";
  if (!blurb.endsWith(`\n${COMMODITIES_SIGN_OFF}`)) {
    return {
      sections: [],
      reason: `Event Blurb must end on its own line with "${COMMODITIES_SIGN_OFF}".`,
    };
  }
  if (blurb === COMMODITIES_SIGN_OFF) {
    return { sections: [], reason: "Event Blurb needs the week's news before the sign-off." };
  }
  if (!storyItems) {
    return { sections: [], reason: 'Missing "Top Stories" section.' };
  }
  if (storyItems.length < TOP_STORIES_MIN || storyItems.length > TOP_STORIES_MAX) {
    return {
      sections: [],
      reason: `Top Stories must have ${TOP_STORIES_MIN}–${TOP_STORIES_MAX} items (got ${storyItems.length}).`,
    };
  }
  for (const [index, item] of storyItems.entries()) {
    if (!item.label) {
      return { sections: [], reason: `Top Stories item ${index + 1} is missing a label.` };
    }
    if (item.body.includes(COMMODITIES_SIGN_OFF) || item.body === blurb) {
      return {
        sections: [],
        reason: `Top Stories item ${index + 1} repeats the teaser.`,
      };
    }
  }

  return {
    sections: [
      { title: EVENT_BLURB_TITLE, items: [{ body: blurb }] },
      { title: TOP_STORIES_TITLE, items: storyItems },
    ],
    reason: null,
  };
}

export function pctReturnFromScoreData(scoreData: unknown): number | null {
  if (!scoreData || typeof scoreData !== "object" || Array.isArray(scoreData)) return null;
  const raw = (scoreData as { pctReturn?: unknown }).pctReturn;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}
