import { Team, TeamPlayer } from '@prisma/client';

interface TeamWithPlayers extends Team {
  players: (TeamPlayer & {
    total: number | null;
  })[];
}

export function calculateTeamScore(team: TeamWithPlayers): number {
  return team.players
    .filter((player) => player.active)
    .reduce((sum, player) => sum + (player.total ?? 0), 0);
}
