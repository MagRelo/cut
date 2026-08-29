import { contestLineupEntryKey } from "../../utils/hasOnchainEscrow.js";
import { commentaryOwnerDisplayName } from "./commentaryOwnerDisplayName.js";

export type CommentaryLineupSource = {
  id: string;
  entryId: string | null;
  userId: string;
  createdAt: Date;
  user: { name: string | null };
  lineup: {
    name: string;
    prediction: unknown;
    picks: Array<{ eventParticipantId: string }>;
  };
};

export type CommentaryEntryIdentity = {
  entryId: string;
  displayName: string;
  prediction: unknown;
  createdAt: Date;
  eventParticipantIds: string[];
};

/**
 * Every contest lineup is an entered ticket. Free contests never mint an
 * on-chain entryId; identity falls back to ContestLineup.id.
 */
export function commentaryEntriesFromLineups(
  contestLineups: CommentaryLineupSource[],
): CommentaryEntryIdentity[] {
  const entryCountByUserId = new Map<string, number>();
  for (const lineup of contestLineups) {
    entryCountByUserId.set(
      lineup.userId,
      (entryCountByUserId.get(lineup.userId) ?? 0) + 1,
    );
  }

  return contestLineups.map((lineup) => ({
    entryId: contestLineupEntryKey(lineup),
    displayName: commentaryOwnerDisplayName({
      userName: lineup.user.name,
      lineupName: lineup.lineup.name,
      userEntryCount: entryCountByUserId.get(lineup.userId) ?? 1,
    }),
    prediction: lineup.lineup.prediction,
    createdAt: lineup.createdAt,
    eventParticipantIds: lineup.lineup.picks.map(
      (pick) => pick.eventParticipantId,
    ),
  }));
}
