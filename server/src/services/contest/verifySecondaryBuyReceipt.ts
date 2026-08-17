import {
  createPublicClient,
  getAddress,
  http,
  parseEventLogs,
  type Abi,
  type TransactionReceipt,
} from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { getChainConfig } from "../../lib/chainConfig.js";

const contestAbi = ContestController.abi as Abi;
const RECEIPT_TIMEOUT_MS = 5_000;

export type VerifySecondaryBuyResult =
  | { ok: true; amountWei: string }
  | {
      ok: false;
      error:
        | "receipt_not_found"
        | "receipt_failed"
        | "no_matching_buy"
        | "amount_mismatch"
        | "rpc_error";
    };

function matchingBuyAmount(
  receipt: TransactionReceipt,
  contestAddress: string,
  walletAddress: string,
  entryId: string,
): bigint | null {
  const contest = getAddress(contestAddress);
  const wallet = getAddress(walletAddress as `0x${string}`);
  const entry = BigInt(entryId);

  const logs = parseEventLogs({
    abi: contestAbi,
    eventName: "SecondaryPositionAdded",
    logs: receipt.logs,
  });

  for (const log of logs) {
    if (getAddress(log.address) !== contest) continue;
    const args = log.args as {
      participant: `0x${string}`;
      entryId: bigint;
      amount: bigint;
    };
    if (getAddress(args.participant) !== wallet) continue;
    if (args.entryId !== entry) continue;
    return args.amount;
  }
  return null;
}

export function isReplaySecondaryBuy(
  lastTransactionHash: string | null | undefined,
  transactionHash: string,
): boolean {
  return (
    Boolean(lastTransactionHash) &&
    lastTransactionHash!.toLowerCase() === transactionHash.toLowerCase()
  );
}

export function amountFromSecondaryBuyReceipt(
  receipt: TransactionReceipt,
  contestAddress: string,
  walletAddress: string,
  entryId: string,
): bigint | null {
  return matchingBuyAmount(receipt, contestAddress, walletAddress, entryId);
}

export async function verifySecondaryBuyReceipt(params: {
  chainId: number;
  contestAddress: string;
  transactionHash: `0x${string}`;
  walletAddress: string;
  entryId: string;
  claimedAmountWei?: string;
}): Promise<VerifySecondaryBuyResult> {
  const chainConfig = getChainConfig(params.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl, { timeout: RECEIPT_TIMEOUT_MS }),
  });

  let receipt: TransactionReceipt;
  try {
    receipt = await publicClient.getTransactionReceipt({
      hash: params.transactionHash,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TransactionReceiptNotFoundError" || name === "WaitForTransactionReceiptTimeoutError") {
      return { ok: false, error: "receipt_not_found" };
    }
    console.error("verifySecondaryBuyReceipt rpc error:", error);
    return { ok: false, error: "rpc_error" };
  }

  if (receipt.status !== "success") {
    return { ok: false, error: "receipt_failed" };
  }

  const amount = matchingBuyAmount(
    receipt,
    params.contestAddress,
    params.walletAddress,
    params.entryId,
  );
  if (amount == null) {
    return { ok: false, error: "no_matching_buy" };
  }

  if (params.claimedAmountWei != null && BigInt(params.claimedAmountWei) !== amount) {
    return { ok: false, error: "amount_mismatch" };
  }

  return { ok: true, amountWei: amount.toString() };
}
