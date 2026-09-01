import { getAddress, isAddress, type Hex } from "viem";
import baseContracts from "../contracts/base.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };
import {
  assertPlatformRootNotOperator,
  getReferralPlatformRootAddressFromEnv,
  parseNonzeroEvmAddress,
} from "./referralPlatformRoot.js";

type ChainContractJson = {
  referralGraphAddress?: string;
  rewardCalculatorAddress?: string;
  referralPlatformRootAddress?: string;
};

function chainContractsForId(chainId: number): ChainContractJson | null {
  switch (chainId) {
    case 8453:
      return baseContracts as ChainContractJson;
    case 84532:
      return sepoliaContracts as ChainContractJson;
    default:
      return null;
  }
}

/** Returns null if unset; throws if set but not a valid 32-byte hex string. */
export function parseReferralGroupIdFromEnv(): Hex | null {
  const raw = process.env.REFERRAL_GROUP_ID?.trim();
  if (!raw) return null;
  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("REFERRAL_GROUP_ID must be 32-byte hex (0x + 64 hex characters)");
  }
  return normalized as Hex;
}

export function requireReferralGroupIdForSignup(): Hex {
  const id = parseReferralGroupIdFromEnv();
  if (!id) {
    throw new Error("REFERRAL_GROUP_ID is required when referrals are used");
  }
  return id;
}

/** ReferralGraph proxy address for the chain (from `server/src/contracts/{base,sepolia}.json`). */
export function getReferralGraphAddress(chainId: number): `0x${string}` | null {
  const cfg = chainContractsForId(chainId);
  const raw = cfg?.referralGraphAddress?.trim();
  if (
    !raw ||
    !isAddress(raw) ||
    getAddress(raw) === getAddress("0x0000000000000000000000000000000000000000")
  ) {
    return null;
  }
  return raw as `0x${string}`;
}

/** RewardCalculator address for the chain (from `server/src/contracts/{base,sepolia}.json`). */
export function getRewardCalculatorAddress(chainId: number): `0x${string}` | null {
  const cfg = chainContractsForId(chainId);
  const raw = cfg?.rewardCalculatorAddress?.trim();
  if (
    !raw ||
    !isAddress(raw) ||
    getAddress(raw) === getAddress("0x0000000000000000000000000000000000000000")
  ) {
    return null;
  }
  return raw as `0x${string}`;
}

/** REFERRAL_ROOT sentinel on ReferralGraph (no payable chain). */
export const REFERRAL_ROOT = "0x0000000000000000000000000000000000000001" as const;

/** Display name for the cold platform-root wallet in referral payout UI. */
export const PLATFORM_ROOT_DISPLAY_NAME = "🏌️ Rich Bouquet";

/** Left-border highlight for platform-root referral payouts (Tailwind slate-500). */
export const PLATFORM_ROOT_DISPLAY_COLOR = "#64748b";

const DEFAULT_REFERRAL_SYNC_CHAIN_ID = 84532;

/** Chain id for referral graph sync scripts (default Base Sepolia). */
export function getReferralSyncChainIdFromEnv(): number {
  const raw = process.env.REFERRAL_SYNC_CHAIN_ID?.trim();
  if (!raw) return DEFAULT_REFERRAL_SYNC_CHAIN_ID;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || ![8453, 84532].includes(n)) {
    throw new Error("REFERRAL_SYNC_CHAIN_ID must be 8453 or 84532");
  }
  return n;
}

/**
 * Cold referral platform root registered under REFERRAL_ROOT; organics descend from it.
 * Source of truth is chain JSON written at contract deploy. Env is an optional
 * fallback for rematerialize scripts before JSON is updated — not a web/cron startup var.
 */
export function getReferralPlatformRootAddress(chainId: number): `0x${string}` {
  if (chainId !== 8453 && chainId !== 84532) {
    throw new Error(`Unsupported referral chain id: ${chainId}`);
  }
  const fromJson = parseNonzeroEvmAddress(
    chainContractsForId(chainId)?.referralPlatformRootAddress,
    "referralPlatformRootAddress",
  );
  const addr = fromJson ?? getReferralPlatformRootAddressFromEnv();
  if (!addr) {
    throw new Error(
      `referralPlatformRootAddress missing for chain ${chainId}. Set it in server/src/contracts JSON at deploy, or REFERRAL_PLATFORM_ROOT_ADDRESS for scripts.`,
    );
  }
  assertPlatformRootNotOperator(addr);
  return addr.toLowerCase() as `0x${string}`;
}

export function requireReferralGroupId(): Hex {
  const id = parseReferralGroupIdFromEnv();
  if (!id) {
    throw new Error("REFERRAL_GROUP_ID is required for referral graph operations");
  }
  return id;
}
