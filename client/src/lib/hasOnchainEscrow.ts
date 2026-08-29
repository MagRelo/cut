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

/** On-chain entry id when present; ContestLineup.id for free/off-chain entries. */
export function contestLineupEntryKey(lineup: {
  id: string;
  entryId?: string | null;
}): string {
  return lineup.entryId ?? lineup.id;
}

/** Both identities, so feed mention matching works for paid and free contests. */
export function contestLineupIdentityKeys(lineup: {
  id: string;
  entryId?: string | null;
}): string[] {
  const keys = new Set<string>([lineup.id]);
  if (lineup.entryId) keys.add(lineup.entryId);
  return [...keys];
}
