import { getAddress, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Hot operational operator.
 *
 * One EOA is ContestFactory `operator` (activate / lock / settle / cancel / push)
 * and the ReferralGraph authorized oracle for `REFERRAL_GROUP_ID` (`register` / `batchRegister`).
 * It is not a referral-tree ancestor — organics hang under the cold platform root
 * recorded in chain JSON as `referralPlatformRootAddress` at contract deploy.
 * Address is derived from `OPERATOR_PK` unless `OPERATOR_ADDRESS` is set.
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Operator signing key (contest + referral graph). */
export function getOperatorPrivateKey(): Hex {
  const raw = readEnv("OPERATOR_PK");
  if (!raw || !raw.startsWith("0x") || raw.length !== 66) {
    throw new Error("OPERATOR_PK must be a 32-byte hex string starting with 0x");
  }
  return raw as Hex;
}

/** Operator address — explicit env if set, otherwise derived from OPERATOR_PK. */
export function getOperatorAddress(): `0x${string}` {
  const explicit = readEnv("OPERATOR_ADDRESS");
  if (explicit) {
    if (!isAddress(explicit)) {
      throw new Error("OPERATOR_ADDRESS must be a valid EVM address");
    }
    return getAddress(explicit);
  }
  return privateKeyToAccount(getOperatorPrivateKey()).address;
}

/** True when OPERATOR_PK is configured. */
export function hasOperatorKey(): boolean {
  return Boolean(readEnv("OPERATOR_PK"));
}
