import { getAddress, isAddress, type Hex } from "viem";
import baseContracts from "../contracts/base.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };

type ChainContractJson = {
  referralGraphAddress?: string;
  rewardDistributorAddress?: string;
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

export function isReferralRequiredForSignup(): boolean {
  const v = process.env.REFERRAL_REQUIRED_FOR_SIGNUP?.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes" || v === "on";
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
  if (!raw || !isAddress(raw)) return null;
  return raw as `0x${string}`;
}

/** RewardDistributor address for the chain (from `server/src/contracts/{base,sepolia}.json`). */
export function getRewardDistributorAddress(chainId: number): `0x${string}` | null {
  const cfg = chainContractsForId(chainId);
  const raw = cfg?.rewardDistributorAddress?.trim();
  if (!raw || !isAddress(raw)) return null;
  return raw as `0x${string}`;
}

/** REFERRAL_ROOT sentinel on ReferralGraph / RewardDistributor (no payable chain). */
export const REFERRAL_ROOT = "0x0000000000000000000000000000000000000001" as const;

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
 * Oracle wallet used as ultimate tree root under REFERRAL_ROOT (Option B).
 * Prefers REFERRAL_ORACLE_ROOT_ADDRESS, then ORACLE_ADDRESS.
 */
export function getReferralOracleRootAddress(chainId: number): `0x${string}` {
  const fromEnv =
    process.env.REFERRAL_ORACLE_ROOT_ADDRESS?.trim() ||
    process.env.ORACLE_ADDRESS?.trim();
  if (!fromEnv || !isAddress(fromEnv)) {
    throw new Error(
      "REFERRAL_ORACLE_ROOT_ADDRESS or ORACLE_ADDRESS must be a valid EVM address",
    );
  }
  const normalized = getAddress(fromEnv).toLowerCase() as `0x${string}`;
  if (chainId !== 8453 && chainId !== 84532) {
    throw new Error(`Unsupported referral chain id: ${chainId}`);
  }
  return normalized;
}

export function requireReferralGroupId(): Hex {
  const id = parseReferralGroupIdFromEnv();
  if (!id) {
    throw new Error("REFERRAL_GROUP_ID is required for referral graph operations");
  }
  return id;
}
