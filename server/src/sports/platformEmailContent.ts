import type {
  EmailAnnouncementContent,
  EmailAnnouncementSection,
  EmailEventShell,
  SportEmailContent,
} from "@cut/sport-sdk";
import {
  EMAIL_TZ_ET,
  formatEmailDateRange,
  topLevelEmailDate,
} from "./emailDateFormat.js";

function itemBody(item: unknown): { body: string; label?: string; attribution?: string; color?: string } | null {
  if (typeof item === "string" && item.trim()) {
    return { body: item.trim() };
  }
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const record = item as Record<string, unknown>;
  const body =
    typeof record.body === "string"
      ? record.body
      : typeof record.text === "string"
        ? record.text
        : "";
  if (!body.trim()) return null;
  return {
    body: body.trim(),
    ...(typeof record.label === "string" ? { label: record.label } : {}),
    ...(typeof record.attribution === "string" ? { attribution: record.attribution } : {}),
    ...(typeof record.color === "string" ? { color: record.color } : {}),
  };
}

export function sectionsFromUnknownSummary(summarySections: unknown): EmailAnnouncementSection[] {
  if (!Array.isArray(summarySections)) return [];

  const sections: EmailAnnouncementSection[] = [];
  for (const section of summarySections) {
    if (!section || typeof section !== "object" || Array.isArray(section)) continue;
    const record = section as Record<string, unknown>;
    const title =
      typeof record.title === "string"
        ? record.title
        : typeof record.heading === "string"
          ? record.heading
          : "";
    const itemsRaw = Array.isArray(record.items)
      ? record.items
      : typeof record.body === "string"
        ? [{ body: record.body }]
        : [];
    const items = itemsRaw
      .map(itemBody)
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (!title.trim() && items.length === 0) continue;
    sections.push({
      key: title.trim() || "Preview",
      title: title.trim() || "Preview",
      kind: "bullets",
      items,
    });
  }
  return sections;
}

function platformDateLine(event: EmailEventShell): string {
  const start = topLevelEmailDate(event.metadata, "startDate");
  const end = topLevelEmailDate(event.metadata, "endDate");
  if (!start || !end) return "";
  return formatEmailDateRange(start, end, EMAIL_TZ_ET);
}

function summarySectionsFromMetadata(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return (metadata as { summarySections?: unknown }).summarySections ?? null;
}

export function createPlatformEmailContent(sportId: string): SportEmailContent {
  return {
    sportId,

    formatEventSubtitle(event: EmailEventShell): string {
      return platformDateLine(event);
    },

    async loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent> {
      return {
        courseLine: "",
        dateLine: platformDateLine(event),
        blurb: null,
        leadSections: [],
        bodySections: sectionsFromUnknownSummary(summarySectionsFromMetadata(event.metadata)),
      };
    },
  };
}
