import { base, baseSepolia } from "wagmi/chains";

/** Matches `VITE_TARGET_CHAIN` in env: Base mainnet vs Base Sepolia. */
export type TargetChainName = "mainnet" | "testnet";

export function getTargetChainIdFromEnv(): typeof base.id | typeof baseSepolia.id {
  const raw = import.meta.env.VITE_TARGET_CHAIN as string | undefined;
  const normalized = (raw ?? "testnet").toLowerCase();
  if (normalized === "mainnet") return base.id;
  return baseSepolia.id;
}

/** True when baked with `vite build --mode staging` (`pnpm run deploy:staging`). */
export function isStagingDeploy(): boolean {
  return import.meta.env.MODE === "staging";
}

/** True when the client targets Base Sepolia (testnet). */
export function isTargetTestnet(): boolean {
  return getTargetChainIdFromEnv() === baseSepolia.id;
}

/** Fallback payment-token ticker before the on-chain symbol loads. */
export function defaultPaymentTokenSymbol(): "USDC" | "xUSDC" {
  return isTargetTestnet() ? "xUSDC" : "USDC";
}
