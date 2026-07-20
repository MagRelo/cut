import { getAddress, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * OPS_ORACLE — the single operational oracle role.
 *
 * One EOA acts as both the **contest oracle** (create / activate / lock / settle / close /
 * push payouts) and the **referral oracle** (register / batchRegister and tree root under
 * REFERRAL_ROOT). Configure it once via `OPS_ORACLE_PK`; the address is derived from the key
 * unless `OPS_ORACLE_ADDRESS` is set explicitly.
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** OPS_ORACLE signing key (contest + referral). */
export function getOpsOraclePrivateKey(): Hex {
  const raw = readEnv("OPS_ORACLE_PK");
  if (!raw || !raw.startsWith("0x") || raw.length !== 66) {
    throw new Error("OPS_ORACLE_PK must be a 32-byte hex string starting with 0x");
  }
  return raw as Hex;
}

/** OPS_ORACLE address — explicit env if set, otherwise derived from OPS_ORACLE_PK. */
export function getOpsOracleAddress(): `0x${string}` {
  const explicit = readEnv("OPS_ORACLE_ADDRESS");
  if (explicit) {
    if (!isAddress(explicit)) {
      throw new Error("OPS_ORACLE_ADDRESS must be a valid EVM address");
    }
    return getAddress(explicit);
  }
  return privateKeyToAccount(getOpsOraclePrivateKey()).address;
}

/** True when OPS_ORACLE_PK is configured. */
export function hasOpsOracleKey(): boolean {
  return Boolean(readEnv("OPS_ORACLE_PK"));
}
