/**
 * Oracle-only push payouts after settleContest: primary then secondary.
 */

import type { Abi } from "viem";
import { parseEventLogs } from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { getContestContract, getPublicClient } from "../shared/contractClient.js";
import { prisma } from "../../lib/prisma.js";
import { sharesForSecondaryPricing } from "@cut/secondary-pricing";
import { insertOnchainPaymentRow, resolveUserIdForWallet } from "./onchainPayment.js";

const contestAbi = ContestController.abi as Abi;

const PRIMARY_PUSH_CHUNK = Number(process.env.CONTEST_PRIMARY_PUSH_CHUNK ?? "40");
const SECONDARY_PUSH_CHUNK = Number(process.env.CONTEST_SECONDARY_PUSH_CHUNK ?? "50");

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export interface PushContestPayoutsResult {
  primaryTxHashes: string[];
  secondaryTxHashes: string[];
  error?: string;
}

export async function executeContestPayoutPushes(params: {
  contestId: string;
  contestAddress: string;
  chainId: number;
  winningEntries: string[];
  paymentTokenAddress: `0x${string}`;
}): Promise<PushContestPayoutsResult> {
  const { contestId, contestAddress, chainId, winningEntries, paymentTokenAddress } = params;
  const primaryTxHashes: string[] = [];
  const secondaryTxHashes: string[] = [];

  const contract = getContestContract(contestAddress, chainId);
  const publicClient = getPublicClient(chainId);

  try {
    const entryIdsBigInt = winningEntries.map((id) => BigInt(id));
    const pushPrimary = contract.write.pushPrimaryPayouts;
    if (!pushPrimary) {
      throw new Error("ContestController ABI missing pushPrimaryPayouts");
    }
    for (const chunk of chunkArray(entryIdsBigInt, PRIMARY_PUSH_CHUNK)) {
      if (chunk.length === 0) continue;
      const hash = (await pushPrimary([chunk])) as `0x${string}`;
      primaryTxHashes.push(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: contestAbi,
        eventName: "PrimaryPayoutClaimed",
        logs: receipt.logs,
      });
      for (const log of logs) {
        const args = log.args as {
          owner: `0x${string}`;
          entryId: bigint;
          amount: bigint;
        };
        const owner = args.owner;
        const amount = args.amount;
        const userId = await resolveUserIdForWallet(chainId, owner);
        await insertOnchainPaymentRow({
          kind: "PRIMARY",
          walletAddress: owner,
          userId,
          contestId,
          chainId,
          tokenAddress: paymentTokenAddress,
          amountWei: amount.toString(),
          transactionHash: receipt.transactionHash,
          logIndex: Number(log.logIndex),
          metadata: { entryId: args.entryId.toString() },
        });
      }
    }

    const winningEntryStr = winningEntries[0];
    if (!winningEntryStr) {
      return { primaryTxHashes, secondaryTxHashes };
    }
    const secondaryEntryId = BigInt(winningEntryStr);
    const netPositionWord = (await contract.read.netPosition!([secondaryEntryId])) as bigint;
    const supply = sharesForSecondaryPricing(netPositionWord);
    if (supply === 0n) {
      return { primaryTxHashes, secondaryTxHashes };
    }

    const rows = await prisma.contestSecondaryParticipant.findMany({
      where: {
        contestId,
        entryId: winningEntryStr,
        chainId,
      },
      select: { walletAddress: true },
    });
    let addresses = [...new Set(rows.map((r) => r.walletAddress.toLowerCase() as `0x${string}`))].sort(
      (a, b) => a.localeCompare(b),
    );

    if (addresses.length === 0) {
      console.warn(
        `[pushContestPayouts] No ContestSecondaryParticipant rows for contest ${contestId} entry ${winningEntryStr}; skipping secondary push`,
      );
      return { primaryTxHashes, secondaryTxHashes };
    }

    const balanceOf = contract.read.balanceOf;
    if (!balanceOf) {
      throw new Error("ContestController ABI missing balanceOf");
    }
    const balances = await Promise.all(
      addresses.map((addr) => balanceOf([addr, secondaryEntryId]) as Promise<bigint>),
    );
    addresses = addresses.filter((_, i) => (balances[i] ?? 0n) > 0n);

    if (addresses.length === 0) {
      return { primaryTxHashes, secondaryTxHashes };
    }

    const pushSecondary = contract.write.pushSecondaryPayouts;
    if (!pushSecondary) {
      throw new Error("ContestController ABI missing pushSecondaryPayouts");
    }
    for (const addrChunk of chunkArray(addresses, SECONDARY_PUSH_CHUNK)) {
      if (addrChunk.length === 0) continue;
      const hash = (await pushSecondary([addrChunk, secondaryEntryId])) as `0x${string}`;
      secondaryTxHashes.push(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: contestAbi,
        eventName: "SecondaryPayoutClaimed",
        logs: receipt.logs,
      });
      for (const log of logs) {
        const args = log.args as {
          participant: `0x${string}`;
          entryId: bigint;
          payout: bigint;
        };
        const payout = args.payout;
        if (payout === 0n) continue;
        const participant = args.participant;
        const userId = await resolveUserIdForWallet(chainId, participant);
        await insertOnchainPaymentRow({
          kind: "SECONDARY",
          walletAddress: participant,
          userId,
          contestId,
          chainId,
          tokenAddress: paymentTokenAddress,
          amountWei: payout.toString(),
          transactionHash: receipt.transactionHash,
          logIndex: Number(log.logIndex),
          metadata: { entryId: args.entryId.toString() },
        });
      }
    }

    return { primaryTxHashes, secondaryTxHashes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pushContestPayouts] contest ${contestId}:`, e);
    return { primaryTxHashes, secondaryTxHashes, error: msg };
  }
}
