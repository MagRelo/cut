import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import { useAccount } from "wagmi";
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
  return useQuery({
    queryKey: queryKeys.userGroups.all,
    queryFn: async () => {
      return await apiClient.get<UserGroupsListResponse>("/userGroups");
    },
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
  return useQuery({
    queryKey: queryKeys.userGroups.byId(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("User group ID is required");
      return await apiClient.get<UserGroupDetailResponse>(`/userGroups/${id}`);
    },
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Fetches members of a user group
 *
 * @param id - The user group ID
 */
export function useUserGroupContestsQuery(id: string | undefined) {
  const { chainId, isConnected } = useAccount();

  return useQuery({
    queryKey: queryKeys.userGroups.contests(id ?? "", chainId ?? "all"),
    queryFn: async () => {
      if (!id) throw new Error("User group ID is required");
      const params = new URLSearchParams();
      if (isConnected && chainId) {
        params.set("chainId", String(chainId));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const data = await apiClient.get<{ contests: LeagueContest[] }>(
        `/userGroups/${id}/contests${suffix}`,
      );
      return data.contests;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useUserGroupMembersQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userGroups.members(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("User group ID is required");
      return await apiClient.get<UserGroupMembersResponse>(`/userGroups/${id}/members`);
    },
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
