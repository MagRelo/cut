import { getAddress, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Cut Bot's session-key EOA. Empty when Cut Bot signing is disabled. */
export function getCutBotPrivateKey(): Hex | null {
  const raw = readEnv("CUT_BOT_DELEGATE_PRIVATE_KEY");
  if (!raw) return null;
  if (!raw.startsWith("0x") || raw.length !== 66) {
    throw new Error("CUT_BOT_DELEGATE_PRIVATE_KEY must be a 32-byte hex string starting with 0x");
  }
  return raw as Hex;
}

/** Address derived from CUT_BOT_DELEGATE_PRIVATE_KEY, or null when unset. */
export function getCutBotAddress(): `0x${string}` | null {
  const key = getCutBotPrivateKey();
  if (!key) return null;
  return getAddress(privateKeyToAccount(key).address);
}

export function isCutBotAddress(address: string): boolean {
  if (!isAddress(address)) return false;
  const cutBot = getCutBotAddress();
  return cutBot !== null && getAddress(address) === cutBot;
}
