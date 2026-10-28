export interface ContestCommentaryFeedItemSubjects {
  entryIds?: string[];
}

/** Display row from a contest commentary JSON fallback. Sport-specific snapshots are ignored. */
export interface ContestCommentaryFeedItem {
  id: string;
  text: string;
  generatedAt: string;
  storyType?: string;
  subjects?: ContestCommentaryFeedItemSubjects;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  return items.length > 0 ? items : undefined;
}

function parseFeedItem(value: unknown): ContestCommentaryFeedItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id.trim()) return null;
  if (typeof value.text !== "string") return null;
  if (typeof value.generatedAt !== "string" || !value.generatedAt.trim()) return null;

  const item: ContestCommentaryFeedItem = {
    id: value.id,
    text: value.text,
    generatedAt: value.generatedAt,
  };
  if (typeof value.storyType === "string" && value.storyType.trim()) {
    item.storyType = value.storyType;
  }
  const subjects = isRecord(value.subjects) ? stringList(value.subjects.entryIds) : undefined;
  if (subjects) {
    item.subjects = { entryIds: subjects };
  }
  return item;
}

/**
 * Items from a contest commentary feed document.
 * Ignores sport-specific fields such as hole state and analysis context.
 */
export function parseContestCommentaryFeedItems(raw: unknown): ContestCommentaryFeedItem[] {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return [];
  return raw.items
    .map(parseFeedItem)
    .filter((item): item is ContestCommentaryFeedItem => item != null);
}
