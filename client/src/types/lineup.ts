import type { Contest } from "./contest";
import { type User } from "./user";
import type { PlatformLineup } from "./event";

export interface ContestLineup {
  id: string;
  contestId: string;
  status: "ACTIVE" | "INACTIVE";
  position: number;
  score: number;
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
