/** Shared freshness for contest contract reads. */
export const CONTEST_CHAIN_READ_QUERY = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
} as const;
