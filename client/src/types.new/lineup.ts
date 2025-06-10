import { type User } from './user';
import { type TournamentLineup } from './player';

export interface ContestLineup {
  id: string;
  contestId: string;
  tournamentLineupId: string;
  userId: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  tournamentLineup?: TournamentLineup;
}
