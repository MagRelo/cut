import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { type Contest, type ContestStatus, type TimelineData } from "../types/contest";
import { normalizeContestAddress } from "../utils/contestRoutes";
import { useAuth } from "../contexts/AuthContext";
import { eventStatusFromMetadata } from "../lib/eventMetadata";
import { CONTEST_LOBBY_GC_MS, SERVER_SYNC_INTERVAL_MS } from "../lib/queryTiming";

const TERMINAL_CONTEST_STATUSES: ContestStatus[] = ["SETTLED", "CLOSED", "CANCELLED"];

function isContestLiveTracked(contest: Contest | undefined): boolean {
  if (!contest) return false;
  if (TERMINAL_CONTEST_STATUSES.includes(contest.status)) return false;
  if (eventStatusFromMetadata(contest.event?.metadata) === "COMPLETE") return false;
  return true;
}

/**
 * Loads the contest lobby from a contract address in the URL.
 * API calls after the initial fetch use the database id; only this hook accepts an address.
 */
export function useContestQuery(contestAddress: string | undefined) {
  const routeKey = contestAddress ? normalizeContestAddress(contestAddress) : "";

  return useQuery({
    queryKey: queryKeys.contests.byLobbyRoute(routeKey),
    queryFn: async () => {
      if (!routeKey) throw new Error("Contest address is required");
      const contest = await apiClient.get<Contest>(`/contests/${routeKey}`);
      const timeline = await apiClient.get<TimelineData>(`/contests/${contest.id}/timeline`);
      return { ...contest, timeline };
    },
    enabled: !!routeKey,
    staleTime: (query) =>
      isContestLiveTracked(query.state.data) ? SERVER_SYNC_INTERVAL_MS : Infinity,
    refetchInterval: (query) =>
      isContestLiveTracked(query.state.data) ? SERVER_SYNC_INTERVAL_MS : false,
    gcTime: CONTEST_LOBBY_GC_MS,
    // Safe with 5-min staleTime — wallet popups return before data goes stale.
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

interface UseContestsQueryOptions {
  userGroupId?: string;
}

/**
 * Fetches contests for a tournament. When signed in, the server merges public contests
 * with league contests for groups the user belongs to.
 */
export function useContestsQuery(
  eventId: string | undefined,
  chainId: number | undefined,
  options?: UseContestsQueryOptions,
) {
  const { user } = useAuth();
  const { isConnected } = useAccount();
  const userGroupId = options?.userGroupId;
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: queryKeys.contests.byEvent(
      eventId ?? "",
      chainId ?? "all",
      userId,
      userGroupId,
    ),
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID is required");
      const params = new URLSearchParams({ eventId });
      if (isConnected && chainId) {
        params.set("chainId", String(chainId));
      }
      if (userGroupId) {
        params.set("userGroupId", userGroupId);
      }
      return await apiClient.get<Contest[]>(`/contests?${params.toString()}`);
    },
    enabled: !!eventId,
    staleTime: userGroupId ? 2 * 60 * 1000 : Infinity,
    gcTime: 12 * 60 * 60 * 1000,
    refetchOnWindowFocus: !!userGroupId,
    retry: 1,
    placeholderData: userGroupId ? undefined : (previousData) => previousData,
  });
}
