import { type User } from './user';
import { type TournamentLineup } from './player';

export interface ContestLineup {
  id: string;
  contestId: string;
  status: 'ACTIVE' | 'INACTIVE';
  position: number;
  score: number;
  tournamentLineup?: TournamentLineup;
  tournamentLineupId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  userId: string;
}
