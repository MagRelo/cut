import { useCallback, useMemo } from 'react';
import apiClient from '../utils/apiClient';

interface User {
  id: string;
  name: string;
}

interface UserGroupMember {
  user: User;
  role: 'MEMBER' | 'ADMIN';
}

interface UserGroup {
  id: string;
  name: string;
  members: UserGroupMember[];
}

export const useUserGroupApi = () => {
  const getAllGroups = useCallback(
    () => apiClient.get<UserGroup[]>('/user/groups'),
    []
  );

  const getGroupById = useCallback(
    (groupId: string) => apiClient.get<UserGroup>(`/user/groups/${groupId}`),
    []
  );

  const joinGroup = useCallback(
    (groupId: string, userId: string) =>
      apiClient.post<UserGroupMember>(`/user/groups/${groupId}/join`, {
        userId,
      }),
    []
  );

  const leaveGroup = useCallback(
    (groupId: string, userId: string) =>
      apiClient.delete<{ message: string }>(`/user/groups/${groupId}/leave`, {
        data: { userId },
      }),
    []
  );

  const deleteGroup = useCallback(
    (groupId: string, userId: string) =>
      apiClient.delete<{ message: string }>(`/user/groups/${groupId}`, {
        data: { userId },
      }),
    []
  );

  return useMemo(
    () => ({
      getAllGroups,
      getGroupById,
      joinGroup,
      leaveGroup,
      deleteGroup,
    }),
    [getAllGroups, getGroupById, joinGroup, leaveGroup, deleteGroup]
  );
};

// Export type definitions
export type { UserGroup, UserGroupMember, User };
