import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import {
  type CreateUserGroupInput,
  type UpdateUserGroupInput,
  type JoinUserGroupInput,
  type LeagueInviteResponse,
  type UserGroupDetailResponse,
  type UserGroupMembersResponse,
} from "../types/userGroup";

/**
 * Mutation hook for creating a user group
 *
 * Features:
 * - Automatic cache invalidation on success
 * - Error handling
 * - Better UX with instant feedback
 */
export function useCreateUserGroup() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateUserGroupInput) => {
      return await apiClient.post<UserGroupDetailResponse>("/userGroups", params);
    },

    onSuccess: () => {
      // Invalidate all user group queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
      void refreshUser();
    },

    onError: (err) => {
      console.error("Failed to create user group:", err);
    },
  });
}

/**
 * Mutation hook for updating a user group
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation on success
 */
export function useUpdateUserGroup() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserGroupInput }) => {
      return await apiClient.put<UserGroupDetailResponse>(`/userGroups/${id}`, data);
    },

    onMutate: async ({ id, data }) => {
      const viewerId = user?.id;
      if (!viewerId) return;
      const key = queryKeys.userGroups.byId(viewerId, id);
      await queryClient.cancelQueries({ queryKey: key });

      const previousGroup = queryClient.getQueryData<UserGroupDetailResponse>(key);

      if (previousGroup) {
        queryClient.setQueryData<UserGroupDetailResponse>(key, (old) => {
          if (!old) return old;
          return {
            ...old,
            name: data.name ?? old.name,
            description: data.description ?? old.description,
          };
        });
      }

      return { previousGroup, key };
    },

    onError: (err, _vars, context) => {
      console.error("Failed to update user group:", err);
      if (context?.previousGroup && context.key) {
        queryClient.setQueryData(context.key, context.previousGroup);
      }
    },

    onSuccess: (data, _vars, context) => {
      if (context?.key) queryClient.setQueryData(context.key, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
      void refreshUser();
    },
  });
}

/**
 * Mutation hook for deleting a user group
 *
 * Features:
 * - Automatic cache invalidation on success
 */
export function useDeleteUserGroup() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete<{ success: boolean; message: string }>(`/userGroups/${id}`);
    },

    onSuccess: () => {
      // Invalidate all user group queries
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
      void refreshUser();
    },

    onError: (err) => {
      console.error("Failed to delete user group:", err);
    },
  });
}

/**
 * Mutation hook for removing a member from a user group
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation on success
 */
export function useRemoveUserGroupMember() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/userGroups/${id}/members/${userId}`,
      );
    },

    onMutate: async ({ id, userId: memberId }) => {
      const viewerId = user?.id;
      if (!viewerId) return;
      const key = queryKeys.userGroups.members(viewerId, id);
      await queryClient.cancelQueries({ queryKey: key });

      const previousMembers = queryClient.getQueryData<UserGroupMembersResponse>(key);

      if (previousMembers) {
        queryClient.setQueryData<UserGroupMembersResponse>(key, (old) => {
          if (!old) return old;
          return {
            ...old,
            members: old.members.filter((m) => m.userId !== memberId),
          };
        });
      }

      return { previousMembers, key };
    },

    onError: (err, _vars, context) => {
      console.error("Failed to remove member from user group:", err);
      if (context?.previousMembers && context.key) {
        queryClient.setQueryData(context.key, context.previousMembers);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
      void refreshUser();
    },
  });
}

export function useGenerateLeagueInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (userGroupId: string) => {
      return await apiClient.post<LeagueInviteResponse>(`/userGroups/${userGroupId}/invite`);
    },
    onSuccess: (data, userGroupId) => {
      const viewerId = user?.id;
      if (!viewerId) return;
      const key = queryKeys.userGroups.byId(viewerId, userGroupId);
      queryClient.setQueryData<UserGroupDetailResponse>(key, (old) =>
        old
          ? {
              ...old,
              inviteCode: data.inviteCode,
              inviteUrl: data.inviteUrl,
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err) => {
      console.error("Failed to generate league invite:", err);
    },
  });
}

export function useJoinLeague() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (params: JoinUserGroupInput) => {
      return await apiClient.post<UserGroupDetailResponse>("/userGroups/join", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contests.all });
      void refreshUser();
    },
    onError: (err) => {
      console.error("Failed to join league:", err);
    },
  });
}
