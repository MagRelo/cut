import { getAddress, isAddress, zeroAddress } from "viem";
import { getOpsOracleAddress } from "./opsOracle.js";

/**
 * Cold address-only organic referral-tree parent under REFERRAL_ROOT (public config).
 * Not a contest role. No private key is accepted by web or cron.
 */
export function getReferralPlatformRootAddressFromEnv(): `0x${string}` | null {
  const raw = process.env.REFERRAL_PLATFORM_ROOT_ADDRESS?.trim();
  if (!raw) return null;
  if (!isAddress(raw)) {
    throw new Error("REFERRAL_PLATFORM_ROOT_ADDRESS must be a valid EVM address");
  }
  return getAddress(raw) as `0x${string}`;
}

/**
 * Require a nonzero referral platform root that differs from the hot OPS_ORACLE.
 */
export function requireReferralPlatformRootAddress(): `0x${string}` {
  const addr = getReferralPlatformRootAddressFromEnv();
  if (!addr || addr === zeroAddress) {
    throw new Error("REFERRAL_PLATFORM_ROOT_ADDRESS must be a nonzero EVM address");
  }
  const operator = getAddress(getOpsOracleAddress());
  if (addr.toLowerCase() === operator.toLowerCase()) {
    throw new Error("REFERRAL_PLATFORM_ROOT_ADDRESS must differ from OPS_ORACLE");
  }
  return addr;
}
