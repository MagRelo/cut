import { isAddress, type Hex } from "viem";
import baseContracts from "../contracts/base.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };

type ChainContractJson = {
  referralGraphAddress?: string;
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
