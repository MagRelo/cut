/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mainnet` (Base) or `testnet` (Base Sepolia). Defaults to testnet if unset. */
  readonly VITE_TARGET_CHAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
