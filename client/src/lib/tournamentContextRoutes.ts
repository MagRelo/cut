const TOURNAMENT_CONTEXT_PATTERNS = [
  /^\/contests(\/|$)/,
  /^\/contest\//,
  /^\/lineups(\/|$)/,
  /^\/leaderboard$/,
];

export function showTournamentContext(pathname: string): boolean {
  return TOURNAMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(pathname));
}
