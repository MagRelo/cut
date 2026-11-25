import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import {
  type UserGroupsListResponse,
  type UserGroupDetailResponse,
  type UserGroupMembersResponse,
} from "../types/userGroup";
import type { LeagueContest } from "../types/contest";

/**
 * Fetches all user groups for the current user
 *
 * Benefits:
 * - Automatic caching
 * - Shared data across components
 * - Automatic refetching when data becomes stale
 * - Built-in loading and error states
 */
export function useUserGroupsQuery() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.userGroups.list(userId ?? "anon"),
    queryFn: async () => {
      return await apiClient.get<UserGroupsListResponse>("/userGroups");
    },
    enabled: !loading && userId !== null,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Fetches a single user group by ID with members
 *
 * @param id - The user group ID
 */
export function useUserGroupQuery(id: string | undefined) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? "anon";
  return useQuery({
    queryKey: queryKeys.userGroups.byId(userId, id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("User group ID is required");
      return await apiClient.get<UserGroupDetailResponse>(`/userGroups/${id}`);
    },
    enabled: !!id && !loading,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Fetches all contests for a league across events.
 * Not filtered by wallet chain — same as the contest directory.
 */
export function useUserGroupContestsQuery(id: string | undefined) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? "anon";
  return useQuery({
    queryKey: queryKeys.userGroups.contests(userId, id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("User group ID is required");
      const data = await apiClient.get<{ contests: LeagueContest[] }>(
        `/userGroups/${id}/contests`,
      );
      return data.contests;
    },
    enabled: !!id && !loading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useUserGroupMembersQuery(id: string | undefined) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? "anon";
  return useQuery({
    queryKey: queryKeys.userGroups.members(userId, id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("User group ID is required");
      return await apiClient.get<UserGroupMembersResponse>(`/userGroups/${id}/members`);
    },
    enabled: !!id && !loading,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
