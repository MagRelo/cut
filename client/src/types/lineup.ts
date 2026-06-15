import type { Contest } from "./contest";
import { type User } from "./user";
import { type TournamentLineup } from "./player";
import type { PlatformLineup } from "./event";

export interface ContestLineup {
  id: string;
  contestId: string;
  status: "ACTIVE" | "INACTIVE";
  position: number;
  score: number;
  lineup?: TournamentLineup;
  lineupId?: string;
  /** @deprecated Use lineup */
  tournamentLineup?: TournamentLineup;
  /** @deprecated Use lineupId */
  tournamentLineupId?: string;
  entryId?: string; // Blockchain entry ID (uint256 as string)
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  userId: string;
}

/** Contest lineup row from GET /lineup/:tournamentId including nested contest (list shape). */
export interface ContestLineupWithContest extends ContestLineup {
  contest: Contest;
}

/** Response item for GET /lineups/:eventId — roster plus optional contest entries per lineup. */
export interface PlatformLineupListItem extends PlatformLineup {
  contestLineups: ContestLineupWithContest[];
}

/** @deprecated Use PlatformLineupListItem — transitional shape with legacy player array. */
export interface TournamentLineupListItem extends TournamentLineup {
  contestLineups: ContestLineupWithContest[];
}
