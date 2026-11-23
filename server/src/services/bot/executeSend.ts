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
import { kernelOwnerWallet, classifySigner } from "./accountKey.js";
import { unpackApproval } from "./approvalEnvelope.js";
import { sessionKeyRefusal } from "./sessionKeyEnabled.js";
import type { BotCall } from "./botCalls.js";
import type { BotActionDeps, BotDelegateRow } from "./executeBotAction.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";
import { recordValueTransfer, ValueTransferError } from "../contest/onchainPayment.js";
import { loadTransactionReceipt } from "../contest/verifyValueTransferReceipt.js";

const USDC_DECIMALS = 6;
const RESEND_WARNING = "The transfer was submitted. Do not send it again.";

export type SendDeps = Pick<
  BotActionDeps,
  | "findDelegate"
  | "findOwner"
  | "rememberOwner"
  | "sessionEnabled"
  | "prepareUserOp"
  | "prepareOwnerUserOp"
  | "submitOwnerUserOp"
  | "submitCalls"
  | "log"
> & {
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
  signer: Address;
  to: string;
  amount: string;
  userOpSignature?: Hex;
  userOp?: SerializedUserOp;
};

export type ExecuteSendResult =
  | { ok: true; preparedUserOp: true; userOpHash: Hex; userOp: SerializedUserOp }
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

async function enabledApproval(
  delegate: BotDelegateRow,
  chainId: number,
  deps: SendDeps,
): Promise<{ ok: true; approval: string } | { ok: false; status: number; error: string }> {
  let permissionId: Hex;
  let approval: string;
  try {
    const envelope = unpackApproval(delegate.approval);
    permissionId = envelope.permissionId;
    approval = envelope.approval;
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Invalid delegate approval",
    };
  }
  const enabled = await deps.sessionEnabled(getAddress(delegate.smartWallet), permissionId, chainId);
  const refusal = sessionKeyRefusal(enabled);
  if (refusal) {
    await deps.log(delegate.userId, "error", refusal);
    return { ok: false, status: 403, error: refusal };
  }
  return { ok: true, approval };
}

export async function executeSend(input: ExecuteSendInput, deps: SendDeps): Promise<ExecuteSendResult> {
  if (!isAddress(input.smartWallet) || !isAddress(input.signer) || !isAddress(input.to)) {
    return { ok: false, status: 400, error: "Invalid wallet address" };
  }
  const smartWallet = getAddress(input.smartWallet);
  const signer = getAddress(input.signer);
  const to = getAddress(input.to);
  if (to === smartWallet) return { ok: false, status: 400, error: "Cannot send to the same wallet" };
  const amountWei = parseSendAmount(input.amount);
  if (amountWei == null) return { ok: false, status: 400, error: "Invalid amount" };
  const token = getPaymentTokenAddress(input.chainId);
  if (!token) return { ok: false, status: 503, error: "Payment token is not configured" };

  const ownerRow = await deps.findOwner(smartWallet, input.chainId);
  const signerRole = classifySigner(signer, smartWallet, input.chainId, ownerRow?.ownerAddress);
  let userId: string;
  let delegate: BotDelegateRow | null;
  if (signerRole === "owner" || signerRole === "wallet") {
    if (!ownerRow) return { ok: false, status: 403, error: "No account for this wallet" };
    if (
      signerRole === "owner" &&
      !ownerRow.ownerAddress &&
      kernelOwnerWallet(signer, input.chainId) === smartWallet
    ) {
      await deps.rememberOwner?.(smartWallet, input.chainId, signer);
    }
    userId = ownerRow.userId;
    delegate = null;
  } else {
    delegate = await deps.findDelegate(smartWallet, signer);
    if (!delegate) return { ok: false, status: 403, error: "No active delegate for this signature" };
    userId = delegate.userId;
  }

  let approval = "";
  if (delegate) {
    const enabled = await enabledApproval(delegate, input.chainId, deps);
    if (!enabled.ok) return enabled;
    approval = enabled.approval;
  }

  const calls = [transferCall(token, to, amountWei)];
  const amount = input.amount.trim();

  if (!delegate) {
    if (signerRole !== "owner") {
      return { ok: false, status: 403, error: "On-chain actions from this wallet are signed by its owner key" };
    }
    if (!input.userOpSignature || !input.userOp) {
      const prepared = await deps.prepareOwnerUserOp({ chainId: input.chainId, owner: signer, smartWallet, calls });
      if (!prepared.ok) {
        await deps.log(userId, "error", prepared.error);
        return { ok: false, status: 502, error: prepared.error };
      }
      return { ok: true, preparedUserOp: true, userOpHash: prepared.userOpHash, userOp: prepared.userOp };
    }
    const submitted = await deps.submitOwnerUserOp({
      chainId: input.chainId,
      owner: signer,
      smartWallet,
      calls,
      userOpSignature: input.userOpSignature,
      userOp: input.userOp,
    });
    if (!submitted.ok) {
      await deps.log(userId, "error", submitted.error);
      return { ok: false, status: 502, error: submitted.error };
    }
    return finish(deps, { userId, chainId: input.chainId, from: smartWallet, to, amountWei, amount, txHash: submitted.txHash });
  }

  if (!input.userOpSignature || !input.userOp) {
    const prepared = await deps.prepareUserOp({
      chainId: input.chainId,
      approval,
      calls,
      delegateAddress: getAddress(delegate.delegateAddress),
      smartWallet,
    });
    if (!prepared.ok) {
      await deps.log(userId, "error", prepared.error);
      return { ok: false, status: 502, error: prepared.error };
    }
    return { ok: true, preparedUserOp: true, userOpHash: prepared.userOpHash, userOp: prepared.userOp };
  }

  const submitted = await deps.submitCalls({
    chainId: input.chainId,
    approval,
    calls,
    delegateAddress: getAddress(delegate.delegateAddress),
    smartWallet,
    userOpSignature: input.userOpSignature,
    userOp: input.userOp,
  });
  if (!submitted.ok || !submitted.txHash) {
    const error = submitted.ok ? "User operation failed" : submitted.error;
    await deps.log(userId, "error", error);
    return { ok: false, status: 502, error };
  }
  return finish(deps, {
    userId,
    chainId: input.chainId,
    from: smartWallet,
    to,
    amountWei,
    amount,
    txHash: submitted.txHash,
  });
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
