import type { Contest } from "./contest";
import { type User } from "./user";
import { type TournamentLineup } from "./player";

export interface ContestLineup {
  id: string;
  contestId: string;
  status: "ACTIVE" | "INACTIVE";
  position: number;
  score: number;
  tournamentLineup?: TournamentLineup;
  tournamentLineupId: string;
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

/** Response item for GET /lineup/:tournamentId — roster plus optional contest entries per lineup. */
export interface TournamentLineupListItem extends TournamentLineup {
  contestLineups: ContestLineupWithContest[];
}
