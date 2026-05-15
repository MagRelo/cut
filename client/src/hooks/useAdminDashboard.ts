import { useQuery } from "@tanstack/react-query";
import apiClient from "../utils/apiClient";
import type { AdminDashboardResponse, AdminSideBetTournamentReportResponse } from "../types/admin";
import { queryKeys } from "../utils/queryKeys";

export function useAdminDashboardQuery(tournamentId?: string) {
  const tid = tournamentId?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.admin.dashboard(tid),
    queryFn: async () => {
      const qs = tid ? `?tournamentId=${encodeURIComponent(tid)}` : "";
      return apiClient.get<AdminDashboardResponse>(`/admin/dashboard${qs}`, {
        requiresAuth: true,
      });
    },
    staleTime: 30_000,
  });
}

export function useAdminSideBetReportQuery(tournamentId?: string, enabled = true) {
  const tid = tournamentId?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.admin.sideBetReport(tid),
    queryFn: async () => {
      const qs = tid ? `?tournamentId=${encodeURIComponent(tid)}` : "";
      return apiClient.get<AdminSideBetTournamentReportResponse>(
        `/admin/bets/side/tournament-report${qs}`,
        { requiresAuth: true },
      );
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
