/** Lowercase `0x` address for stable URLs and cache keys. */
export function normalizeContestAddress(address: string): string {
  return address.toLowerCase();
}

export function contestLobbyPath(address: string): string {
  return `/contest/${normalizeContestAddress(address)}`;
}
