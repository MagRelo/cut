import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  parseEventLogs,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { getChainConfig } from "../../lib/chainConfig.js";

const contestAbi = ContestController.abi as Abi;
const RECEIPT_TIMEOUT_MS = 5_000;

const transferEvent = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

export type ReceiptLoadError = "receipt_not_found" | "receipt_failed" | "rpc_error";

export type Erc20Transfer = {
  tokenAddress: Address;
  from: Address;
  to: Address;
  amountWei: string;
};

export async function loadTransactionReceipt(params: {
  chainId: number;
  transactionHash: `0x${string}`;
}): Promise<{ ok: true; receipt: TransactionReceipt } | { ok: false; error: ReceiptLoadError }> {
  const chainConfig = getChainConfig(params.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl, { timeout: RECEIPT_TIMEOUT_MS }),
  });
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: params.transactionHash });
    if (receipt.status !== "success") return { ok: false, error: "receipt_failed" };
    return { ok: true, receipt };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (
      name === "TransactionReceiptNotFoundError" ||
      name === "WaitForTransactionReceiptTimeoutError"
    ) {
      return { ok: false, error: "receipt_not_found" };
    }
    console.error("payment receipt rpc error:", error);
    return { ok: false, error: "rpc_error" };
  }
}

export async function readContestPaymentToken(
  chainId: number,
  contestAddress: Address,
): Promise<{ ok: true; paymentToken: Address } | { ok: false; error: "rpc_error" }> {
  const chainConfig = getChainConfig(chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl, { timeout: RECEIPT_TIMEOUT_MS }),
  });
  try {
    const token = (await publicClient.readContract({
      address: contestAddress,
      abi: contestAbi,
      functionName: "paymentToken",
    })) as Address;
    return { ok: true, paymentToken: getAddress(token) };
  } catch (error) {
    console.error("contest payment token rpc error:", error);
    return { ok: false, error: "rpc_error" };
  }
}

export function erc20TransferAt(receipt: TransactionReceipt, logIndex: number): Erc20Transfer | null {
  const log = receipt.logs.find((entry) => entry.logIndex === logIndex);
  if (!log) return null;
  try {
    const decoded = decodeEventLog({
      abi: [transferEvent],
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });
    if (decoded.eventName !== "Transfer") return null;
    const args = decoded.args as { from: Address; to: Address; value: bigint };
    return {
      tokenAddress: getAddress(log.address),
      from: getAddress(args.from),
      to: getAddress(args.to),
      amountWei: args.value.toString(),
    };
  } catch {
    return null;
  }
}

export function payoutClaimFromReceipt(params: {
  receipt: TransactionReceipt;
  kind: "PRIMARY" | "SECONDARY";
  contestAddress: Address;
  walletAddress: Address;
  entryId: string;
  amountWei: string;
}): { amountWei: string; logIndex: number } | null {
  const contest = getAddress(params.contestAddress);
  const wallet = getAddress(params.walletAddress);
  let entry: bigint;
  let claimed: bigint;
  try {
    entry = BigInt(params.entryId);
    claimed = BigInt(params.amountWei);
  } catch {
    return null;
  }

  if (params.kind === "PRIMARY") {
    const logs = parseEventLogs({
      abi: contestAbi,
      eventName: "PrimaryPayoutClaimed",
      logs: params.receipt.logs,
    });
    for (const log of logs) {
      if (getAddress(log.address) !== contest || log.logIndex == null) continue;
      const args = log.args as { owner: Address; entryId: bigint; amount: bigint };
      if (getAddress(args.owner) !== wallet || args.entryId !== entry || args.amount !== claimed) {
        continue;
      }
      return { amountWei: args.amount.toString(), logIndex: log.logIndex };
    }
    return null;
  }

  const logs = parseEventLogs({
    abi: contestAbi,
    eventName: "SecondaryPayoutClaimed",
    logs: params.receipt.logs,
  });
  for (const log of logs) {
    if (getAddress(log.address) !== contest || log.logIndex == null) continue;
    const args = log.args as { participant: Address; entryId: bigint; payout: bigint };
    if (getAddress(args.participant) !== wallet || args.entryId !== entry || args.payout !== claimed) {
      continue;
    }
    return { amountWei: args.payout.toString(), logIndex: log.logIndex };
  }
  return null;
}
