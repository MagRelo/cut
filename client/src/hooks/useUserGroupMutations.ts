import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import {
  type CreateUserGroupInput,
  type UpdateUserGroupInput,
  type AddUserGroupMemberInput,
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

  return useMutation({
    mutationFn: async (params: CreateUserGroupInput) => {
      return await apiClient.post<UserGroupDetailResponse>("/userGroups", params);
    },

    onSuccess: () => {
      // Invalidate all user group queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
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

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserGroupInput }) => {
      return await apiClient.put<UserGroupDetailResponse>(`/userGroups/${id}`, data);
    },

    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userGroups.byId(id) });

      // Snapshot the previous value
      const previousGroup = queryClient.getQueryData<UserGroupDetailResponse>(
        queryKeys.userGroups.byId(id)
      );

      // Optimistically update
      if (previousGroup) {
        queryClient.setQueryData<UserGroupDetailResponse>(queryKeys.userGroups.byId(id), (old) => {
          if (!old) return old;
          return {
            ...old,
            name: data.name ?? old.name,
            description: data.description ?? old.description,
          };
        });
      }

      return { previousGroup };
    },

    onError: (err, { id }, context) => {
      console.error("Failed to update user group:", err);
      if (context?.previousGroup) {
        queryClient.setQueryData(queryKeys.userGroups.byId(id), context.previousGroup);
      }
    },

    onSuccess: (data, { id }) => {
      // Update cache with server data
      queryClient.setQueryData(queryKeys.userGroups.byId(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
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

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete<{ success: boolean; message: string }>(`/userGroups/${id}`);
    },

    onSuccess: () => {
      // Invalidate all user group queries
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
    },

    onError: (err) => {
      console.error("Failed to delete user group:", err);
    },
  });
}

/**
 * Mutation hook for adding a member to a user group
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation on success
 */
export function useAddUserGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddUserGroupMemberInput }) => {
      return await apiClient.post<UserGroupMemberResponse>(`/userGroups/${id}/members`, data);
    },

    onSuccess: (_data, { id }) => {
      // Invalidate members query
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.members(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.byId(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
    },

    onError: (err) => {
      console.error("Failed to add member to user group:", err);
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

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/userGroups/${id}/members/${userId}`
      );
    },

    onMutate: async ({ id, userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userGroups.members(id) });

      // Snapshot the previous value
      const previousMembers = queryClient.getQueryData<UserGroupMembersResponse>(
        queryKeys.userGroups.members(id)
      );

      // Optimistically remove the member
      if (previousMembers) {
        queryClient.setQueryData<UserGroupMembersResponse>(
          queryKeys.userGroups.members(id),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              members: old.members.filter((m) => m.userId !== userId),
            };
          }
        );
      }

      return { previousMembers };
    },

    onError: (err, { id }, context) => {
      console.error("Failed to remove member from user group:", err);
      if (context?.previousMembers) {
        queryClient.setQueryData(queryKeys.userGroups.members(id), context.previousMembers);
      }
    },

    onSuccess: (_data, { id }) => {
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.members(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.byId(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
    },
  });
}

// Type for the member response from add member endpoint
interface UserGroupMemberResponse {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  role: "ADMIN" | "MEMBER";
  joinedAt: Date;
}
