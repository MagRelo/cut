import { getAddress, isAddress, zeroAddress } from "viem";
import { getOperatorAddress, hasOperatorKey } from "./operator.js";

const REFERRAL_ROOT = "0x0000000000000000000000000000000000000001";

const HOT_WALLET_FEE_SINK_ERROR =
  "Referral platform root must differ from the operator. Referral-network fees settle to the platform root; the operator is a hot signing key and must not receive those funds.";

export function parseNonzeroEvmAddress(
  raw: string | undefined | null,
  label: string,
): `0x${string}` | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (!isAddress(trimmed)) {
    throw new Error(`${label} must be a valid EVM address`);
  }
  const addr = getAddress(trimmed) as `0x${string}`;
  if (addr === zeroAddress || addr.toLowerCase() === REFERRAL_ROOT) {
    throw new Error(`${label} cannot be zero or REFERRAL_ROOT`);
  }
  return addr;
}

/**
 * Optional env fallback for scripts. Web and cron should read the address from
 * chain JSON (`referralPlatformRootAddress`), not this variable.
 */
export function getReferralPlatformRootAddressFromEnv(): `0x${string}` | null {
  return parseNonzeroEvmAddress(
    process.env.REFERRAL_PLATFORM_ROOT_ADDRESS,
    "REFERRAL_PLATFORM_ROOT_ADDRESS",
  );
}

/** Reject a platform root that is the hot operator when the operator is configured. */
export function assertPlatformRootNotOperator(addr: `0x${string}`): void {
  if (!hasOperatorKey() && !process.env.OPERATOR_ADDRESS?.trim()) return;
  const operator = getAddress(getOperatorAddress());
  if (addr.toLowerCase() === operator.toLowerCase()) {
    throw new Error(HOT_WALLET_FEE_SINK_ERROR);
  }
}
