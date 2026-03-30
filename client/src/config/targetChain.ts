import { base, baseSepolia } from "wagmi/chains";

/** Matches `VITE_TARGET_CHAIN` in env: Base mainnet vs Base Sepolia. */
export type TargetChainName = "mainnet" | "testnet";

export function getTargetChainIdFromEnv(): typeof base.id | typeof baseSepolia.id {
  const raw = import.meta.env.VITE_TARGET_CHAIN as string | undefined;
  const normalized = (raw ?? "testnet").toLowerCase();
  if (normalized === "mainnet") return base.id;
  return baseSepolia.id;
}
