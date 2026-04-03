/**
 * Pimlico verifying paymaster expects `sponsorshipPolicyId` in paymaster context (ERC-7677).
 * Pass the result to `<SmartWalletsProvider config={...} />`.
 *
 * @see https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/setup/configuring-sdk#overriding-paymaster-context
 */
function getSponsorshipPolicyIdFromEnv(): string {
  const raw =
    import.meta.env.VITE_PIMLICO_SPONSORSHIP_POLICY_ID ??
    import.meta.env.VITE_SPONSORSHIP_POLICY_ID;
  return typeof raw === "string" ? raw.trim() : "";
}

export function getSmartWalletsPaymasterConfig():
  | { paymasterContext: { sponsorshipPolicyId: string } }
  | Record<string, never> {
  const sponsorshipPolicyId = getSponsorshipPolicyIdFromEnv();
  if (!sponsorshipPolicyId) return {};
  return { paymasterContext: { sponsorshipPolicyId } };
}

/**
 * Remount SmartWalletsProvider when policy id changes (Privy's inner client may not update from `config` alone).
 */
export function getSmartWalletsProviderKey(): string {
  return getSponsorshipPolicyIdFromEnv() || "default";
}
