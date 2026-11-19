import * as cheerio from "cheerio";

/** A scored row from the PGA leaderboard payload. Older pages tagged these `PlayerRowV3`. */
export interface ScrapedLeaderboardPlayer {
  player: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  scoringData: {
    position?: string;
    total?: string | number;
  };
}

export interface RawLeaderboard {
  tournamentId: string;
  tournamentName: string;
  players: ScrapedLeaderboardPlayer[];
}

interface CacheItem {
  data: RawLeaderboard;
  timestamp: number;
}

const cache: { [key: string]: CacheItem } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isScoredPlayer(row: unknown): row is ScrapedLeaderboardPlayer {
  if (!row || typeof row !== "object") return false;
  const record = row as Record<string, unknown>;
  const player = record.player;
  const scoringData = record.scoringData;
  if (!player || typeof player !== "object" || !scoringData || typeof scoringData !== "object") {
    return false;
  }
  const id = (player as Record<string, unknown>).id;
  return typeof id === "string" && id.length > 0;
}

/**
 * Pulls the scored leaderboard out of a PGA `__NEXT_DATA__` payload.
 * The page carries several `players` arrays (odds, standings, sponsors). The
 * leaderboard is the one whose rows have `player.id` and `scoringData`.
 */
export function parseLeaderboardPayload(parsedData: unknown): RawLeaderboard {
  const pageProps = (parsedData as { props?: { pageProps?: Record<string, unknown> } })?.props
    ?.pageProps;
  const queries = (pageProps?.dehydratedState as { queries?: unknown[] } | undefined)?.queries ?? [];
  const rawTournament = pageProps?.tournament as
    | { id?: unknown; tournamentId?: unknown; tournamentName?: unknown }
    | undefined;
  if (!rawTournament) {
    throw new Error("Could not find tournament data in pageProps");
  }

  const leaderboardQuery = queries.find((query) => {
    const players = (query as { state?: { data?: { players?: unknown } } })?.state?.data?.players;
    return Array.isArray(players) && players.some(isScoredPlayer);
  }) as { state?: { data?: { players?: unknown[] } } } | undefined;

  const players = (leaderboardQuery?.state?.data?.players ?? []).filter(isScoredPlayer);
  if (players.length === 0) {
    throw new Error("Could not find scored players in the PGA leaderboard payload");
  }

  const tournamentId = rawTournament.tournamentId ?? rawTournament.id;
  if (typeof tournamentId !== "string" || tournamentId.length === 0) {
    throw new Error("Could not find tournament id in pageProps");
  }

  return {
    tournamentId,
    tournamentName: typeof rawTournament.tournamentName === "string" ? rawTournament.tournamentName : "",
    players,
  };
}

/**
 * Fetches and parses the PGA leaderboard. Returns raw data only (no bonuses, icons, or display formatting).
 */
export async function fetchLeaderboardRaw(): Promise<RawLeaderboard> {
  const now = Date.now();
  if (cache.leaderboard && now - cache.leaderboard.timestamp < CACHE_DURATION) {
    return cache.leaderboard.data;
  }

  const response = await fetch("https://www.pgatour.com/leaderboard", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (!response.ok) {
    switch (response.status) {
      case 429:
        throw new Error("Rate limit exceeded. Please try again later.");
      case 403:
        throw new Error("Access forbidden. Please check your request headers.");
      case 404:
        throw new Error("Leaderboard data not found.");
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error("PGA Tour service is currently unavailable. Please try again later.");
      default:
        throw new Error(`Failed to fetch leaderboard data: ${response.statusText}`);
    }
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const nextDataScript = $("#__NEXT_DATA__").html();
  if (!nextDataScript) {
    throw new Error("Could not find __NEXT_DATA__ script");
  }

  const result = parseLeaderboardPayload(JSON.parse(nextDataScript));

  cache.leaderboard = { data: result, timestamp: now };
  return result;
}
