import * as cheerio from "cheerio";
import type { PlayerRowV3 } from "../schemas/leaderboard.js";

export interface RawLeaderboard {
  tournamentId: string;
  tournamentName: string;
  players: PlayerRowV3[];
}

interface CacheItem {
  data: RawLeaderboard;
  timestamp: number;
}

const cache: { [key: string]: CacheItem } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  const parsedData = JSON.parse(nextDataScript);
  const queries = parsedData.props?.pageProps?.dehydratedState?.queries || [];
  const leaderboardQuery = queries.find((q: any) => Array.isArray(q.state?.data?.players));
  if (!leaderboardQuery) {
    throw new Error("Could not find leaderboard data in dehydratedState.queries");
  }
  const rawPlayers = leaderboardQuery.state.data.players;
  const rawTournament = parsedData.props?.pageProps?.tournament;
  if (!rawTournament) {
    throw new Error("Could not find tournament data in pageProps");
  }

  const players = (rawPlayers as any[]).filter(
    (p): p is PlayerRowV3 => p?.__typename === "PlayerRowV3" && p?.scoringData && p?.player
  );

  const result: RawLeaderboard = {
    tournamentId: rawTournament.id,
    tournamentName: rawTournament.tournamentName,
    players,
  };

  cache.leaderboard = { data: result, timestamp: now };
  return result;
}
