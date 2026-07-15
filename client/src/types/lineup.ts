import type { Contest } from "./contest";
import { type User } from "./user";
import type { PlatformLineup } from "./event";

/** Per-player popularity for a locked contest (keyed by eventParticipantId). */
export interface PickPopularityEntry {
  pickRate: number;
  bonus: number;
  adjustedScore: number;
}

export type PickPopularityMap = Record<string, PickPopularityEntry>;

export interface ContestLineup {
  id: string;
  contestId: string;
  status: "ACTIVE" | "INACTIVE";
  position: number;
  score: number;
  /** Sum of unadjusted pick totals. */
  baseScore?: number | null;
  /** score - baseScore (popularity bonus aggregate). */
  popularityBonus?: number | null;
  lineup?: PlatformLineup | Pick<PlatformLineup, "id" | "name">;
  lineupId: string;
  entryId?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  userId: string;
}

export interface ContestLineupWithContest extends ContestLineup {
  contest: Contest;
}

export interface PlatformLineupListItem extends PlatformLineup {
  contestLineups: ContestLineupWithContest[];
}
