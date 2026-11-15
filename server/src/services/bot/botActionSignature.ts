import {
  getAddress,
  recoverTypedDataAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const BOT_ACTION_TYPES = {
  BotAction: [
    { name: "action", type: "string" },
    { name: "smartWallet", type: "address" },
    { name: "contestId", type: "string" },
    { name: "lineupId", type: "string" },
    { name: "picksHash", type: "bytes32" },
    { name: "callsHash", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type BotActionName = "join" | "leave" | "update";

export type BotActionMessage = {
  action: BotActionName;
  smartWallet: Address;
  contestId: string;
  lineupId: string;
  picksHash: Hex;
  callsHash: Hex;
  deadline: bigint;
};

export function botActionDomain(chainId: number, smartWallet: Address) {
  return {
    name: "Cut Bot",
    version: "1",
    chainId,
    verifyingContract: smartWallet,
  } as const;
}

export async function signBotAction(
  privateKey: Hex,
  chainId: number,
  message: BotActionMessage,
): Promise<Hex> {
  const account = privateKeyToAccount(privateKey);
  return account.signTypedData({
    domain: botActionDomain(chainId, message.smartWallet),
    types: BOT_ACTION_TYPES,
    primaryType: "BotAction",
    message,
  });
}

export async function recoverBotActionSigner(
  chainId: number,
  message: BotActionMessage,
  signature: Hex,
): Promise<Address> {
  const recovered = await recoverTypedDataAddress({
    domain: botActionDomain(chainId, message.smartWallet),
    types: BOT_ACTION_TYPES,
    primaryType: "BotAction",
    message,
    signature,
  });
  return getAddress(recovered);
}

export const EMPTY_CALLS_HASH = zeroHash;

export const MAX_ACTION_TTL_SECONDS = 60 * 60;

export function assertDeadline(deadline: bigint, nowSeconds: number): void {
  const now = BigInt(nowSeconds);
  if (deadline < now) {
    throw new Error("Action signature has expired");
  }
  if (deadline > now + BigInt(MAX_ACTION_TTL_SECONDS)) {
    throw new Error("Action deadline is too far in the future");
  }
}
