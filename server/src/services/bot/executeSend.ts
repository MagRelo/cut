import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  isAddress,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { isDelegatePublicKey } from "@playthecut/agent";
import { relayQuorumUserOp } from "./quorumUserOp.js";
import { readQuorumApproval } from "./quorumApproval.js";
import { serializeBotCalls, type BotCall, type SerializedBotCall } from "./botCalls.js";
import type { BotActionDeps, BotDelegateRow } from "./executeBotAction.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";
import { recordValueTransfer, ValueTransferError } from "../contest/onchainPayment.js";
import { loadTransactionReceipt } from "../contest/verifyValueTransferReceipt.js";

const USDC_DECIMALS = 6;
const RESEND_WARNING = "The transfer was submitted. Do not send it again.";

export type SendDeps = Pick<BotActionDeps, "findDelegate" | "log"> & {
  recordSend: (input: {
    userId: string;
    chainId: number;
    from: Address;
    to: Address;
    amountWei: string;
    txHash: Hex;
  }) => Promise<void>;
};

export type ExecuteSendInput = {
  chainId: number;
  smartWallet: string;
  signer: string;
  to: string;
  amount: string;
  authorizationSignature?: string;
  userOp?: SerializedUserOp;
};

export type ExecuteSendResult =
  | {
      ok: true;
      preparedUserOp: true;
      userOpHash: Hex;
      userOp: SerializedUserOp;
      calls: SerializedBotCall[];
      authorization?: unknown;
    }
  | { ok: true; txHash: Hex; to: Address; amount: string; preparedUserOp?: undefined }
  | { ok: false; status: number; error: string; txHash?: Hex };

export function parseSendAmount(amount: string): bigint | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) return null;
  try {
    const wei = parseUnits(trimmed, USDC_DECIMALS);
    return wei > 0n ? wei : null;
  } catch {
    return null;
  }
}

export function findPaymentTransfer(
  receipt: TransactionReceipt,
  token: Address,
  from: Address,
  to: Address,
  amountWei: bigint,
): { logIndex: number } | null {
  const logs = parseEventLogs({
    abi: erc20Abi,
    logs: receipt.logs,
    eventName: "Transfer",
  });
  for (const log of logs) {
    if (getAddress(log.address) !== token) continue;
    if (getAddress(log.args.from) !== from) continue;
    if (getAddress(log.args.to) !== to) continue;
    if (log.args.value !== amountWei) continue;
    if (log.logIndex == null) continue;
    return { logIndex: log.logIndex };
  }
  return null;
}

function transferCall(token: Address, to: Address, amountWei: bigint): BotCall {
  return {
    to: token,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, amountWei],
    }),
  };
}

function enabledApproval(
  delegate: BotDelegateRow,
): { ok: true; approval: string } | { ok: false; status: number; error: string } {
  if (!readQuorumApproval(delegate.approval)) {
    return { ok: false, status: 400, error: "Invalid delegate approval" };
  }
  return { ok: true, approval: delegate.approval };
}

export async function executeSend(input: ExecuteSendInput, deps: SendDeps): Promise<ExecuteSendResult> {
  if (!isAddress(input.smartWallet) || !isAddress(input.to)) {
    return { ok: false, status: 400, error: "Invalid wallet address" };
  }
  const smartWallet = getAddress(input.smartWallet);
  const to = getAddress(input.to);
  if (to === smartWallet) return { ok: false, status: 400, error: "Cannot send to the same wallet" };
  const amountWei = parseSendAmount(input.amount);
  if (amountWei == null) return { ok: false, status: 400, error: "Invalid amount" };
  const token = getPaymentTokenAddress(input.chainId);
  if (!token) return { ok: false, status: 503, error: "Payment token is not configured" };

  if (!isDelegatePublicKey(input.signer)) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }
  const delegate = await deps.findDelegate(smartWallet, input.signer);
  if (!delegate) return { ok: false, status: 403, error: "No active delegate for this signature" };
  const userId = delegate.userId;
  const enabled = enabledApproval(delegate);
  if (!enabled.ok) return enabled;
  const approval = enabled.approval;

  const calls = [transferCall(token, to, amountWei)];
  const amount = input.amount.trim();

  const relayed = await relayQuorumUserOp({
    approval,
    chainId: input.chainId,
    smartWallet,
    calls,
    ...(input.userOp ? { userOp: input.userOp } : {}),
    ...(input.authorizationSignature ? { authorizationSignature: input.authorizationSignature } : {}),
    signer: input.signer,
  });
  if (relayed.kind === "prepared") {
    return {
      ok: true,
      preparedUserOp: true,
      userOpHash: relayed.userOpHash,
      userOp: relayed.userOp,
      calls: serializeBotCalls(calls),
      authorization: relayed.authorization,
    };
  }
  if (relayed.kind === "submitted") {
    return finish(deps, {
      userId,
      chainId: input.chainId,
      from: smartWallet,
      to,
      amountWei,
      amount,
      txHash: relayed.txHash,
    });
  }
  if (relayed.kind === "skip") {
    return { ok: false, status: 400, error: "Invalid delegate approval" };
  }
  await deps.log(userId, "error", relayed.error);
  return { ok: false, status: relayed.status, error: relayed.error };
}

async function finish(
  deps: SendDeps,
  input: {
    userId: string;
    chainId: number;
    from: Address;
    to: Address;
    amountWei: bigint;
    amount: string;
    txHash: Hex;
  },
): Promise<ExecuteSendResult> {
  try {
    await deps.recordSend({
      userId: input.userId,
      chainId: input.chainId,
      from: input.from,
      to: input.to,
      amountWei: input.amountWei.toString(),
      txHash: input.txHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : RESEND_WARNING;
    await deps.log(input.userId, "error", message);
    return { ok: false, status: 502, error: RESEND_WARNING, txHash: input.txHash };
  }
  return { ok: true, txHash: input.txHash, to: input.to, amount: input.amount };
}

export async function recordSubmittedSend(input: {
  userId: string;
  chainId: number;
  from: Address;
  to: Address;
  amountWei: string;
  txHash: Hex;
}): Promise<void> {
  const token = getPaymentTokenAddress(input.chainId);
  if (!token) throw new ValueTransferError("Payment token is not configured", 502);
  const loaded = await loadTransactionReceipt({ chainId: input.chainId, transactionHash: input.txHash });
  if (!loaded.ok) throw new ValueTransferError(RESEND_WARNING, 502);
  const found = findPaymentTransfer(loaded.receipt, token, input.from, input.to, BigInt(input.amountWei));
  if (!found) throw new ValueTransferError(RESEND_WARNING, 502);
  await recordValueTransfer({
    userId: input.userId,
    walletAddress: input.from,
    chainId: input.chainId,
    kind: "SEND",
    tokenAddress: token,
    amountWei: input.amountWei,
    from: input.from,
    to: input.to,
    transactionHash: input.txHash,
    logIndex: found.logIndex,
  });
}
