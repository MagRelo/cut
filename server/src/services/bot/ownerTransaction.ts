import {
  getAddress,
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  type Address,
  type Hex,
  type TransactionSerialized,
} from "viem";
import { getPublicClient } from "../shared/contractClient.js";
import type { BotCall } from "./botCalls.js";

export type OwnerTransaction = {
  to: Address;
  data: Hex;
  value: string;
  chainId: number;
  nonce: string;
  gas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
};

const MISMATCH = "Transaction does not match this action";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function alreadyBroadcast(error: unknown): boolean {
  const message = errorMessage(error, "");
  return /already known|nonce too low|already imported|known transaction/i.test(message);
}

/** The signed transaction is one of `calls`, sent by `from` on `chainId`. */
export async function matchOwnerTransaction(
  signedTransaction: Hex,
  calls: BotCall[],
  from: Address,
  chainId: number,
): Promise<{ ok: true; index: number } | { ok: false; error: string }> {
  let tx: ReturnType<typeof parseTransaction>;
  let signer: Address;
  try {
    const serialized = signedTransaction as TransactionSerialized;
    tx = parseTransaction(serialized);
    signer = getAddress(await recoverTransactionAddress({ serializedTransaction: serialized }));
  } catch {
    return { ok: false, error: MISMATCH };
  }
  if (signer !== from || tx.chainId !== chainId || !tx.to) {
    return { ok: false, error: MISMATCH };
  }
  const data = (tx.data ?? "0x").toLowerCase();
  const value = tx.value ?? 0n;
  const to = getAddress(tx.to);
  const index = calls.findIndex(
    (call) => getAddress(call.to) === to && call.data.toLowerCase() === data && call.value === value,
  );
  if (index < 0) return { ok: false, error: MISMATCH };
  return { ok: true, index };
}

export async function prepareOwnerTransaction(input: {
  chainId: number;
  from: Address;
  call: BotCall;
}): Promise<{ ok: true; transaction: OwnerTransaction } | { ok: false; error: string }> {
  try {
    const client = getPublicClient(input.chainId);
    const [nonce, fees, gas] = await Promise.all([
      client.getTransactionCount({ address: input.from, blockTag: "pending" }),
      client.estimateFeesPerGas(),
      client.estimateGas({
        account: input.from,
        to: input.call.to,
        data: input.call.data,
        value: input.call.value,
      }),
    ]);
    if (fees.maxFeePerGas == null || fees.maxPriorityFeePerGas == null) {
      return { ok: false, error: "Chain fee estimate is unavailable" };
    }
    return {
      ok: true,
      transaction: {
        to: input.call.to,
        data: input.call.data,
        value: input.call.value.toString(),
        chainId: input.chainId,
        nonce: nonce.toString(),
        gas: ((gas * 12n) / 10n).toString(),
        maxFeePerGas: fees.maxFeePerGas.toString(),
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString(),
      },
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Could not prepare the transaction") };
  }
}

export async function submitOwnerTransaction(input: {
  chainId: number;
  from: Address;
  signedTransaction: Hex;
  call: BotCall;
}): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  const matched = await matchOwnerTransaction(
    input.signedTransaction,
    [input.call],
    input.from,
    input.chainId,
  );
  if (!matched.ok) return matched;
  const client = getPublicClient(input.chainId);
  let hash: Hex;
  try {
    hash = await client.sendRawTransaction({ serializedTransaction: input.signedTransaction });
  } catch (error) {
    if (!alreadyBroadcast(error)) {
      return { ok: false, error: errorMessage(error, "Could not broadcast the transaction") };
    }
    hash = keccak256(input.signedTransaction);
  }
  try {
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== "success") return { ok: false, error: "Transaction reverted" };
    if (getAddress(receipt.from) !== input.from) {
      return { ok: false, error: MISMATCH };
    }
    return { ok: true, txHash: hash };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Transaction was not confirmed") };
  }
}

export async function advanceOwnerTransaction(input: {
  chainId: number;
  from: Address;
  calls: BotCall[];
  signedTransaction?: Hex;
  prepareOwnerTransaction: (input: {
    chainId: number;
    from: Address;
    call: BotCall;
  }) => Promise<{ ok: true; transaction: OwnerTransaction } | { ok: false; error: string }>;
  submitOwnerTransaction: (input: {
    chainId: number;
    from: Address;
    signedTransaction: Hex;
    call: BotCall;
  }) => Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }>;
}): Promise<
  | { ok: true; step: "prepared"; transaction: OwnerTransaction }
  | { ok: true; step: "submitted"; txHash: Hex }
  | { ok: false; status: number; error: string }
> {
  const first = input.calls[0];
  if (!first) return { ok: false, status: 400, error: MISMATCH };
  if (!input.signedTransaction) {
    const prepared = await input.prepareOwnerTransaction({
      chainId: input.chainId,
      from: input.from,
      call: first,
    });
    if (!prepared.ok) return { ok: false, status: 502, error: prepared.error };
    return { ok: true, step: "prepared", transaction: prepared.transaction };
  }
  const matched = await matchOwnerTransaction(
    input.signedTransaction,
    input.calls,
    input.from,
    input.chainId,
  );
  if (!matched.ok) return { ok: false, status: 400, error: matched.error };
  const call = input.calls[matched.index];
  if (!call) return { ok: false, status: 400, error: MISMATCH };
  const submitted = await input.submitOwnerTransaction({
    chainId: input.chainId,
    from: input.from,
    signedTransaction: input.signedTransaction,
    call,
  });
  if (!submitted.ok) return { ok: false, status: 502, error: submitted.error };
  const next = input.calls[matched.index + 1];
  if (!next) return { ok: true, step: "submitted", txHash: submitted.txHash };
  const prepared = await input.prepareOwnerTransaction({
    chainId: input.chainId,
    from: input.from,
    call: next,
  });
  if (!prepared.ok) return { ok: false, status: 502, error: prepared.error };
  return { ok: true, step: "prepared", transaction: prepared.transaction };
}
