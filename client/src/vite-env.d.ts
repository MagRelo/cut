/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public API base URL (include `/api`). Defaults to `http://localhost:3000/api`. */
  readonly VITE_API_URL?: string;
  /** Privy app ID (Dashboard → App settings). */
  readonly VITE_PRIVY_APP_ID?: string;
  /** Public OPS_ORACLE address; must match server `OPS_ORACLE_PK` / on-chain contest oracle. */
  readonly VITE_ORACLE_ADDRESS?: string;
  /** Must match server `REFERRAL_GROUP_ID` (32-byte hex). */
  readonly VITE_REFERRAL_GROUP_ID?: string;
  /** Side-bet stake recipient (USDC). */
  readonly VITE_SIDE_BET_STAKE_RECIPIENT?: string;
  /** `mainnet` (Base) or `testnet` (Base Sepolia). Defaults to testnet if unset. */
  readonly VITE_TARGET_CHAIN?: string;
  /** Optional Base Sepolia JSON-RPC URL. Falls back to the chain default if unset. */
  readonly VITE_BASE_SEPOLIA_RPC_URL?: string;
  /** PostHog project key (client; used when Vite `PROD`). */
  readonly VITE_POSTHOG_KEY?: string;
  /** Referral network fee BPS on contest create. Default 500. */
  readonly VITE_REFERRAL_NETWORK_BPS?: string;
  /** Primary-deposit secondary subsidy BPS. Default 0. */
  readonly VITE_PRIMARY_DEPOSIT_SECONDARY_SUBSIDY_BPS?: string;
  /** Pimlico dashboard sponsorship policy id (`sp_…`) for smart-wallet gas sponsorship. */
  readonly VITE_PIMLICO_SPONSORSHIP_POLICY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
