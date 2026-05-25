import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type TournamentSummaryItem = {
  label?: string;
  body: string;
};

export type TournamentSummarySection = {
  title: string;
  items: TournamentSummaryItem[];
};

export type TournamentSummarySections = TournamentSummarySection[];

/** Lead section: title "Summary" — prose paragraph(s), not bullets (see R2026021.json). */
export function isSummaryLeadSection(section: TournamentSummarySection): boolean {
  return section.title.trim().toLowerCase() === "summary";
}

function isSummaryItem(value: unknown): value is TournamentSummaryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as TournamentSummaryItem;
  if (typeof item.body !== "string" || item.body.trim() === "") return false;
  if (item.label !== undefined && typeof item.label !== "string") return false;
  return true;
}

function isSummarySection(value: unknown): value is TournamentSummarySection {
  if (!value || typeof value !== "object") return false;
  const section = value as TournamentSummarySection;
  if (typeof section.title !== "string" || section.title.trim() === "") return false;
  if (!Array.isArray(section.items) || section.items.length === 0) return false;
  return section.items.every(isSummaryItem);
}

/** Parse `Tournament.summarySections` JSON (or tournamentSummaries/*.json file contents). */
export function parseSummarySections(json: unknown): TournamentSummarySections | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  if (!json.every(isSummarySection)) return null;
  return json;
}

const summariesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tournamentSummaries",
);

/** Load and parse `server/src/tournamentSummaries/{pgaTourId}.json`. */
export async function loadSummarySectionsFromFile(
  pgaTourId: string,
): Promise<TournamentSummarySections | null> {
  const filePath = path.join(summariesDir, `${pgaTourId}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseSummarySections(parsed);
  } catch {
    return null;
  }
}
