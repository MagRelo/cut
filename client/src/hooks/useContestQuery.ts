import { useEffect, useMemo } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type ContestStatus } from "../types/contest";
import { normalizeContestAddress } from "../utils/contestRoutes";
import { useAuth } from "../contexts/AuthContext";
import { eventStatusForSport } from "../sports/eventPresentation";
import {
  getDirectoryContextForContest,
  parseContestLobbyNavigationState,
  placeholderContestFromNavigation,
} from "../lib/contestNavigation";
import { CONTEST_LOBBY_GC_MS, SERVER_SYNC_INTERVAL_MS } from "../lib/queryTiming";

const LIVE_TRACKED_CONTEST_STATUSES: ContestStatus[] = ["ACTIVE", "LOCKED"];

const SECTION_CLOCK_STATUSES: ContestStatus[] = ["OPEN", "ACTIVE", "LOCKED"];

/** Board and commentary share the page clock, including while the contest is still open. */
export function isContestSectionClock(contest: Contest | undefined): boolean {
  if (!contest) return false;
  if (!SECTION_CLOCK_STATUSES.includes(contest.status)) return false;
  if (eventStatusForSport(contest.event?.sportId, contest.event?.metadata) === "COMPLETE") return false;
  return true;
}

/** Poll lobby/timeline while scores are moving; OPEN lists rarely change. */
export function isContestLiveTracked(contest: Contest | undefined): boolean {
  if (!contest) return false;
  if (!LIVE_TRACKED_CONTEST_STATUSES.includes(contest.status)) return false;
  if (eventStatusForSport(contest.event?.sportId, contest.event?.metadata) === "COMPLETE") return false;
  return true;
}

/**
 * Loads the contest lobby from a contract address in the URL.
 * API calls after the initial fetch use the database id; only this hook accepts an address.
 * Waits for auth to resolve so a league URL does not fetch anonymously first and 404.
 */
export function useContestQuery(contestAddress: string | undefined) {
  const routeKey = contestAddress ? normalizeContestAddress(contestAddress) : "";
  const location = useLocation();
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();

  const placeholderData = useMemo((): Contest | undefined => {
    if (!routeKey) return undefined;
    const navState = parseContestLobbyNavigationState(location.state);
    if (navState) {
      return placeholderContestFromNavigation(routeKey, navState);
    }
    const directoryContext = getDirectoryContextForContest(queryClient, routeKey);
    if (directoryContext) {
      return placeholderContestFromNavigation(routeKey, directoryContext);
    }
    return undefined;
  }, [routeKey, location.state, queryClient]);

  return useQuery({
    queryKey: queryKeys.contests.byLobbyRoute(routeKey),
    queryFn: async () => {
      if (!routeKey) throw new Error("Contest address is required");
      const [identity, board] = await Promise.all([
        apiClient.get<Contest>(`/contests/${routeKey}`),
        apiClient.get<Contest>(`/contests/${routeKey}/board`),
      ]);
      const event = board.event ?? identity.event;
      return { ...identity, ...board, ...(event ? { event } : {}) };
    },
    enabled: !!routeKey && !authLoading,
    placeholderData,
    staleTime: (query) =>
      isContestLiveTracked(query.state.data) ? SERVER_SYNC_INTERVAL_MS : Infinity,
    refetchInterval: false,
    gcTime: CONTEST_LOBBY_GC_MS,
    // Safe with 5-min staleTime — wallet popups return before data goes stale.
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useContestCommentaryQuery(contestAddress: string | undefined, enabled: boolean) {
  const routeKey = contestAddress ? normalizeContestAddress(contestAddress) : "";
  const { loading: authLoading } = useAuth();
  return useQuery({
    queryKey: queryKeys.contests.commentary(routeKey),
    queryFn: () =>
      apiClient.get<{
        commentary: string | null;
        commentaryGeneratedAt: string | null;
        commentaryFeed: Array<{ id: string; text: string; generatedAt: string; priority?: number }>;
      }>(`/contests/${routeKey}/commentary`),
    enabled: !!routeKey && enabled && !authLoading,
    staleTime: SERVER_SYNC_INTERVAL_MS,
    refetchInterval: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** One timer for the live board, timeline, and commentary, aligned just after the score cron. */
export function useContestLiveClock(enabled: boolean, keys: QueryKey[]) {
  const queryClient = useQueryClient();
  const keySignature = JSON.stringify(keys);
  useEffect(() => {
    if (!enabled) return;
    const offsetMs = 15_000;
    let timer = 0;
    const schedule = () => {
      const phase = (Date.now() - offsetMs) % SERVER_SYNC_INTERVAL_MS;
      const wait = phase === 0 ? SERVER_SYNC_INTERVAL_MS : SERVER_SYNC_INTERVAL_MS - phase;
      timer = window.setTimeout(() => {
        const parsed = JSON.parse(keySignature) as QueryKey[];
        void Promise.all(
          parsed.map((queryKey) => queryClient.refetchQueries({ queryKey })),
        );
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled, keySignature, queryClient]);
}
