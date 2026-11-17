/**
 * Gas sponsorship is decided by POST /api/paymaster. The Pimlico policy id stays
 * on the server. Privy's dashboard paymaster URL points at that route.
 */
export function getSmartWalletsPaymasterConfig(): Record<string, never> {
  return {};
}

export function getSmartWalletsProviderKey(): string {
  return "default";
}
