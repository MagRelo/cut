const SPORT_EVENT_CONTEXT_PATTERNS = [
  /^\/$/,
  /^\/sports\/[^/]+$/,
  /^\/sports\/[^/]+\/leaderboard$/,
  /^\/contests\/.+/,
  /^\/contest\//,
  /^\/lineups(\/|$)/,
  /^\/leaderboard$/,
];

export function showSportEventContext(pathname: string): boolean {
  if (pathname === "/contests") return false;
  return SPORT_EVENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(pathname));
}
