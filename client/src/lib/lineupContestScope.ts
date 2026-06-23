import type { PlatformLineupListItem } from "../types/lineup";
import { platformLineupEventParticipantIds } from "./lineupUtils";

/** Lineups shown in a contest lobby for this contest. */
export function lineupsForContestPanel(
  lineups: PlatformLineupListItem[],
  contestId: string,
): PlatformLineupListItem[] {
  return lineups.filter(
    (row) =>
      row.contestId === contestId ||
      row.contestLineups.some((entry) => entry.contestId === contestId),
  );
}

/** Lineups from other contests that can be copied into this contest's panel. */
export function lineupsCopyableIntoContest(
  lineups: PlatformLineupListItem[],
  contestId: string,
): PlatformLineupListItem[] {
  return lineups.filter(
    (row) =>
      row.contestId != null &&
      row.contestId !== contestId &&
      platformLineupEventParticipantIds(row).length > 0,
  );
}

/** Lineups in the same contest scope for duplicate roster checks. */
export function lineupsInSameContestScope(
  lineups: PlatformLineupListItem[],
  contestId: string | null | undefined,
  excludeLineupId?: string,
): PlatformLineupListItem[] {
  return lineups.filter((row) => {
    if (excludeLineupId && row.id === excludeLineupId) return false;
    if (contestId) return row.contestId === contestId;
    return row.contestId == null;
  });
}
