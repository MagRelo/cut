import { type Player } from './player';
import { type League } from './league';
interface RoundData {
  putts: number;
  strokes: number;
  fairwaysHit: number;
  greensInRegulation: number;
}

export interface TeamPlayer {
  id: string;
  teamId: string;
  playerId: string;
  active: boolean;
  player: Player;
  leaderboardPosition?: string;
  r1?: RoundData;
  r2?: RoundData;
  r3?: RoundData;
  r4?: RoundData;
  cut?: number;
  bonus?: number;
  total?: number;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  players: TeamPlayer[];
  isUserTeam?: boolean;
  leagueId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  leagues: League[];
}

export interface TeamUpdatePayload {
  name?: string;
  players?: string[]; // Array of player IDs
}
