import type { ContestDirectoryResponse, ContestDirectoryScope } from "../types/contest";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";
import { CONTEST_LIST_STALE_MS } from "./queryTiming";

export function contestDirectoryQueryKey(
  scope: ContestDirectoryScope,
  userId: string | null | undefined,
) {
  return queryKeys.contests.directory(scope, userId);
}

export function contestDirectoryRequestPath(scope: ContestDirectoryScope): string {
  const params = new URLSearchParams({ scope });
  return `/contests/directory?${params.toString()}`;
}

export async function fetchContestDirectory(
  scope: ContestDirectoryScope,
): Promise<ContestDirectoryResponse> {
  return apiClient.get<ContestDirectoryResponse>(contestDirectoryRequestPath(scope));
}

export { CONTEST_LIST_STALE_MS as contestDirectoryStaleMs };
