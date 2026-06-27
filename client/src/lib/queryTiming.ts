/** Matches server cron every 5 minutes — see spec/server/cron.md */
export const SERVER_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Lobby cache kept warm across brief navigation away from the contest page. */
export const CONTEST_LOBBY_GC_MS = 30 * 60 * 1000;
