import type { QueryClient } from "@tanstack/react-query";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import type {
  Contest,
  ContestDirectoryEvent,
  ContestDirectoryResponse,
  EventContestGroup,
} from "../types/contest";
import { normalizeContestAddress } from "../utils/contestRoutes";
import { queryKeys } from "../utils/queryKeys";

export type ContestLobbyNavigationState = {
  eventShell: CompetitionEventShell;
  contestPreview?: Partial<Contest>;
};

export type LeaderboardNavigationState = {
  eventShell: CompetitionEventShell;
};

export function eventShellFromDirectoryEvent(event: ContestDirectoryEvent): CompetitionEventShell {
  return {
    id: event.id,
    sportId: event.sportId,
    externalId: event.externalId,
    isActive: event.isActive,
    metadata: event.metadata ?? {
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
    },
  };
}

export function leaderboardPath(sportId: string, eventId: string): string {
  return `/sports/${sportId}/events/${eventId}/leaderboard`;
}

export function leaderboardLinkState(event: CompetitionEventShell): LeaderboardNavigationState {
  return { eventShell: event };
}

export function contestLobbyLinkState(
  eventShell: CompetitionEventShell,
  contest?: Contest,
): ContestLobbyNavigationState {
  return {
    eventShell,
    contestPreview: contest
      ? {
          id: contest.id,
          name: contest.name,
          address: contest.address,
          status: contest.status,
          eventId: contest.eventId,
          settings: contest.settings,
          contestLineups: contest.contestLineups,
        }
      : undefined,
  };
}

export function parseContestLobbyNavigationState(
  state: unknown,
): ContestLobbyNavigationState | null {
  if (!state || typeof state !== "object") return null;
  const candidate = state as ContestLobbyNavigationState;
  const shell = candidate.eventShell;
  if (!shell?.id || !shell.sportId) return null;
  return candidate;
}

export function parseLeaderboardNavigationState(state: unknown): LeaderboardNavigationState | null {
  if (!state || typeof state !== "object") return null;
  const candidate = state as LeaderboardNavigationState;
  const shell = candidate.eventShell;
  if (!shell?.id || !shell.sportId) return null;
  return candidate;
}

function directoryCacheEntries(
  queryClient: QueryClient,
): Array<[readonly unknown[], ContestDirectoryResponse | undefined]> {
  return queryClient.getQueriesData<ContestDirectoryResponse>({
    queryKey: [...queryKeys.contests.all, "directory"],
  });
}

const DIRECTORY_SECTIONS = ["upcoming", "live", "past"] as const satisfies ReadonlyArray<
  keyof ContestDirectoryResponse
>;

function findInDirectory(
  queryClient: QueryClient,
  predicate: (group: EventContestGroup) => boolean,
): ContestLobbyNavigationState | null {
  for (const [, data] of directoryCacheEntries(queryClient)) {
    if (!data) continue;
    for (const section of DIRECTORY_SECTIONS) {
      for (const group of data[section]) {
        if (predicate(group)) {
          return {
            eventShell: eventShellFromDirectoryEvent(group.event),
          };
        }
      }
    }
  }
  return null;
}

export function getDirectoryContextForContest(
  queryClient: QueryClient,
  contestAddress: string,
): ContestLobbyNavigationState | null {
  const normalized = normalizeContestAddress(contestAddress);
  for (const [, data] of directoryCacheEntries(queryClient)) {
    if (!data) continue;
    for (const section of DIRECTORY_SECTIONS) {
      for (const group of data[section]) {
        const contest = group.contests.find(
          (entry: Contest) => normalizeContestAddress(entry.address) === normalized,
        );
        if (contest) {
          return {
            eventShell: eventShellFromDirectoryEvent(group.event),
            contestPreview: contest,
          };
        }
      }
    }
  }
  return null;
}

export function getDirectoryEventById(
  queryClient: QueryClient,
  eventId: string,
): CompetitionEventShell | null {
  const match = findInDirectory(queryClient, (group) => group.event.id === eventId);
  return match?.eventShell ?? null;
}

export function contestEventFromShell(shell: CompetitionEventShell): Contest["event"] {
  return {
    id: shell.id,
    sportId: shell.sportId,
    externalId: shell.externalId,
    isActive: shell.isActive,
    metadata:
      shell.metadata && typeof shell.metadata === "object" && !Array.isArray(shell.metadata)
        ? (shell.metadata as Record<string, unknown>)
        : null,
    createdAt: "",
    updatedAt: "",
  };
}

export function placeholderContestFromNavigation(
  contestAddress: string,
  nav: ContestLobbyNavigationState,
): Contest {
  const preview = nav.contestPreview;
  const address = normalizeContestAddress(contestAddress);

  return {
    id: preview?.id ?? "",
    name: preview?.name ?? "",
    description: preview?.description ?? null,
    eventId: nav.eventShell.id,
    userGroupId: preview?.userGroupId ?? "",
    endTime: preview?.endTime ? new Date(preview.endTime) : new Date(0),
    address,
    chainId: preview?.chainId ?? 8453,
    status: preview?.status ?? "OPEN",
    settings: preview?.settings ?? {
      contestType: "PUBLIC",
      chainId: preview?.chainId ?? 8453,
      expiryTimestamp: 0,
      paymentTokenAddress: "",
      paymentTokenSymbol: "USDC",
      oracle: "",
      primaryDeposit: preview?.settings?.primaryDeposit ?? 0,
      primaryDepositSecondarySubsidyBps: 0,
    },
    results: preview?.results,
    createdAt: preview?.createdAt ? new Date(preview.createdAt) : new Date(0),
    updatedAt: preview?.updatedAt ? new Date(preview.updatedAt) : new Date(0),
    event: contestEventFromShell(nav.eventShell),
    contestLineups: preview?.contestLineups,
  };
}
