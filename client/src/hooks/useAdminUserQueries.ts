import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";
import type { AdminUserDetailResponse, AdminUsersListResponse } from "../types/admin";

const LIST_LIMIT = 100;

export function useAdminUsersQuery(userType: string = "USER") {
  const chainId = useChainId();
  return useQuery({
    queryKey: queryKeys.admin.userList(chainId ?? 0, userType),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(LIST_LIMIT),
        offset: "0",
        userType,
      });
      return await apiClient.get<AdminUsersListResponse>(
        `/admin/users?${params.toString()}`,
        { requiresAuth: true },
      );
    },
    enabled: typeof chainId === "number",
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useAdminUserDetailQuery(userId: string | undefined) {
  const chainId = useChainId();
  return useQuery({
    queryKey: queryKeys.admin.userDetail(userId ?? "", chainId ?? 0),
    queryFn: async () => {
      if (!userId) throw new Error("User id required");
      return await apiClient.get<AdminUserDetailResponse>(`/admin/users/${userId}`, {
        requiresAuth: true,
      });
    },
    enabled: !!userId && typeof chainId === "number",
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
