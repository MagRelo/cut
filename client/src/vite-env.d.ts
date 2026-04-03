/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mainnet` (Base) or `testnet` (Base Sepolia). Defaults to testnet if unset. */
  readonly VITE_TARGET_CHAIN?: string;
  /** Pimlico dashboard sponsorship policy id (`sp_…`) for smart-wallet gas sponsorship. */
  readonly VITE_PIMLICO_SPONSORSHIP_POLICY_ID?: string;
  /** Alias for `VITE_PIMLICO_SPONSORSHIP_POLICY_ID`. */
  readonly VITE_SPONSORSHIP_POLICY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
