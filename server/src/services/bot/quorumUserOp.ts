import { verifyPayload } from "@playthecut/agent";
import { isHex, type Address, type Hex } from "viem";
import { getPrivyClient } from "../../lib/privyClient.js";
import { clientSafeErrorMessage } from "../../utils/clientSafeError.js";
import type { BotCall } from "./botCalls.js";
import {
  hashSerializedUserOp,
  prepareOwnerUserOp,
  submitOwnerUserOp,
  userOpMatchesAccountCalls,
} from "./ownerUserOp.js";
import { readQuorumApproval } from "./quorumApproval.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";

const PRIVY_API = "https://api.privy.io";

export type QuorumRelayResult =
  | { kind: "skip" }
  | {
      kind: "prepared";
      userOpHash: Hex;
      userOp: SerializedUserOp;
      authorization: Record<string, unknown>;
    }
  | { kind: "submitted"; txHash: Hex }
  | { kind: "error"; status: number; error: string };

export function privyAuthorization(embeddedWalletId: string, userOpHash: Hex, appId: string) {
  return {
    version: 1 as const,
    method: "POST" as const,
    url: `${PRIVY_API}/v1/wallets/${embeddedWalletId}/rpc`,
    body: {
      method: "secp256k1_sign",
      params: { hash: userOpHash },
    },
    headers: { "privy-app-id": appId },
  };
}

export async function relayQuorumUserOp(input: {
  approval: string;
  chainId: number;
  smartWallet: Address;
  calls: BotCall[];
  userOp?: SerializedUserOp;
  authorizationSignature?: string;
  signer: string;
}): Promise<QuorumRelayResult> {
  const quorum = readQuorumApproval(input.approval);
  if (!quorum) return { kind: "skip" };
  if (quorum.publicKey !== input.signer) {
    return { kind: "error", status: 401, error: "Invalid action signature" };
  }
  const appId = process.env.PRIVY_APP_ID?.trim();
  if (!appId) return { kind: "error", status: 503, error: "Privy is not configured" };

  if (!input.userOp || !input.authorizationSignature) {
    const prepared = await prepareOwnerUserOp({
      chainId: input.chainId,
      owner: quorum.embeddedAddress,
      smartWallet: input.smartWallet,
      calls: input.calls,
      boundAccount: true,
    });
    if (!prepared.ok) return { kind: "error", status: 502, error: prepared.error };
    return {
      kind: "prepared",
      userOpHash: prepared.userOpHash,
      userOp: prepared.userOp,
      authorization: privyAuthorization(quorum.embeddedWalletId, prepared.userOpHash, appId),
    };
  }

  let userOpHash: Hex;
  try {
    userOpHash = hashSerializedUserOp(input.chainId, input.userOp);
  } catch {
    return { kind: "error", status: 400, error: "Invalid user operation" };
  }
  const allowed = await userOpMatchesAccountCalls({
    chainId: input.chainId,
    owner: quorum.embeddedAddress,
    smartWallet: input.smartWallet,
    calls: input.calls,
    boundAccount: true,
    userOp: input.userOp,
  });
  if (!allowed.ok) return { kind: "error", status: 400, error: allowed.error };
  const authorization = privyAuthorization(quorum.embeddedWalletId, userOpHash, appId);
  if (!verifyPayload(quorum.publicKey, authorization, input.authorizationSignature)) {
    return { kind: "error", status: 401, error: "Invalid action signature" };
  }

  let signature: Hex;
  try {
    const signed = await getPrivyClient().wallets().rpc(quorum.embeddedWalletId, {
      method: "secp256k1_sign",
      params: { hash: userOpHash },
      authorization_context: { signatures: [input.authorizationSignature] },
    });
    const raw = signed.data.signature;
    const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
    if (!isHex(hex)) return { kind: "error", status: 502, error: "Privy did not return a signature" };
    signature = hex;
  } catch (error) {
    return {
      kind: "error",
      status: 502,
      error: clientSafeErrorMessage(error, "Privy did not sign the user operation"),
    };
  }

  const submitted = await submitOwnerUserOp({
    chainId: input.chainId,
    owner: quorum.embeddedAddress,
    smartWallet: input.smartWallet,
    calls: input.calls,
    boundAccount: true,
    userOp: input.userOp,
    userOpSignature: signature,
  });
  if (!submitted.ok) return { kind: "error", status: 502, error: submitted.error };
  return { kind: "submitted", txHash: submitted.txHash };
}
