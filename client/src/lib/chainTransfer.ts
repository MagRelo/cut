import { decodeEventLog, type Hex } from "viem";

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

export type ChainTransferKind =
  | "ENTRY"
  | "WAGER"
  | "WITHDRAW"
  | "REFUND"
  | "SEND"
  | "PRIMARY"
  | "SECONDARY";

/** Token movement to record after a mined receipt. Contest creation is not one of these. */
export interface ChainTransfer {
  kind: ChainTransferKind;
  tokenAddress: `0x${string}`;
  /** When omitted, the receipt must contain exactly one matching from/to transfer. */
  amountWei?: string;
  from: `0x${string}`;
  to: `0x${string}`;
  contestId?: string;
  entryId?: string;
  lineupId?: string;
}

export interface TransferReceiptLog {
  address: `0x${string}`;
  topics: readonly Hex[];
  data: Hex;
  logIndex: number | null;
}

export interface FoundTransfer {
  logIndex: number;
  amountWei: string;
}

export function findTransferLog(
  logs: readonly TransferReceiptLog[],
  transfer: Pick<ChainTransfer, "tokenAddress" | "from" | "to" | "amountWei">,
): FoundTransfer | null {
  const token = transfer.tokenAddress.toLowerCase();
  const from = transfer.from.toLowerCase();
  const to = transfer.to.toLowerCase();
  let expected: bigint | null = null;
  if (transfer.amountWei != null) {
    try {
      expected = BigInt(transfer.amountWei);
    } catch {
      return null;
    }
  }

  const matches: FoundTransfer[] = [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== token || log.logIndex == null) continue;
    try {
      const decoded = decodeEventLog({
        abi: [TRANSFER_EVENT],
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (decoded.eventName !== "Transfer") continue;
      const args = decoded.args as { from: string; to: string; value: bigint };
      if (args.from.toLowerCase() !== from || args.to.toLowerCase() !== to) continue;
      if (expected != null && args.value !== expected) continue;
      matches.push({ logIndex: log.logIndex, amountWei: args.value.toString() });
    } catch {
      continue;
    }
  }

  if (expected != null) return matches[0] ?? null;
  return matches.length === 1 ? matches[0]! : null;
}
