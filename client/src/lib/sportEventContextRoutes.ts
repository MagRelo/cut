const SPORT_EVENT_CONTEXT_PATTERNS = [
  /^\/$/,
  /^\/sports\/[^/]+$/,
  /^\/contests(\/|$)/,
  /^\/contest\//,
  /^\/lineups(\/|$)/,
  /^\/leaderboard$/,
];

export function showSportEventContext(pathname: string): boolean {
  return SPORT_EVENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(pathname));
}
