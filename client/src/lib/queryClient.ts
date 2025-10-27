import { QueryClient } from "@tanstack/react-query";

/**
 * Configure React Query with sensible defaults for the Cut
 *
 * Key configurations:
 * - staleTime: Data is fresh for 1 minute before refetching
 * - gcTime: Keep unused data cached for 5 minutes
 * - refetchOnWindowFocus: Update data when user returns to tab
 * - refetchOnReconnect: Refetch when internet reconnects
 * - retry: Retry failed requests once
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute - data is fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - cache time
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: true, // Refetch when component mounts if data is stale
    },
    mutations: {
      retry: 0, // Don't retry mutations (user actions)
    },
  },
});
