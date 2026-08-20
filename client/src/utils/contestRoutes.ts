const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEthereumAddress(value: string): boolean {
  return ETH_ADDRESS_RE.test(value);
}

/** Lowercase `0x` address for stable URLs and cache keys. Cuids are returned unchanged. */
export function normalizeContestAddress(address: string): string {
  return isEthereumAddress(address) ? address.toLowerCase() : address;
}

export function contestLobbyPath(
  contestOrKey: string | { id: string; address?: string | null },
): string {
  const key =
    typeof contestOrKey === "string"
      ? normalizeContestAddress(contestOrKey)
      : contestOrKey.address
        ? contestOrKey.address.toLowerCase()
        : contestOrKey.id;
  return `/contest/${key}`;
}
