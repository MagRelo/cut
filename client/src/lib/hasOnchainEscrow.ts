/** Paid contests have a factory-deployed controller; $0 contests do not. */
export function hasOnchainEscrow<T extends { address?: string | null }>(
  contest: T,
): contest is T & { address: string } {
  return Boolean(contest.address);
}

/** Lobby URL / query-cache identity: contract address when present, otherwise database id. */
export function contestRouteKey(contest: { id: string; address?: string | null }): string {
  return contest.address ? contest.address.toLowerCase() : contest.id;
}
