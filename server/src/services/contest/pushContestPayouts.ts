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
import type { SecondaryPayoutResult } from "../shared/types.js";

const contestAbi = ContestController.abi as Abi;

const DEFAULT_USER_COLOR = "#9CA3AF";

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

type OwnerDisplay = { userId: string | null; username: string; userColor: string };

async function loadTicketOwnersDisplay(
  chainId: number,
  walletAddresses: readonly `0x${string}`[],
): Promise<Map<string, OwnerDisplay>> {
  const map = new Map<string, OwnerDisplay>();
  const unique = [...new Set(walletAddresses.map((w) => w.toLowerCase()))];
  for (const addr of unique) {
    map.set(addr, { userId: null, username: "Unknown", userColor: DEFAULT_USER_COLOR });
  }
  if (unique.length === 0) return map;

  const wallets = await prisma.userWallet.findMany({
    where: {
      chainId,
      OR: unique.map((pk) => ({ publicKey: { equals: pk, mode: "insensitive" as const } })),
    },
    select: {
      publicKey: true,
      userId: true,
      user: { select: { name: true, settings: true } },
    },
  });
  for (const w of wallets) {
    const key = w.publicKey.toLowerCase();
    const settings = w.user.settings as { color?: string } | null | undefined;
    const color = isValidHexColor(settings?.color) ? settings.color : DEFAULT_USER_COLOR;
    map.set(key, {
      userId: w.userId,
      username: w.user.name || "Unknown",
      userColor: color,
    });
  }
  return map;
}

async function loadTicketBackingContext(contestId: string, entryId: string) {
  const cl = await prisma.contestLineup.findUnique({
    where: { contestId_entryId: { contestId, entryId } },
    include: {
      tournamentLineup: {
        include: {
          players: {
            include: { tournamentPlayer: { include: { player: true } } },
          },
        },
      },
    },
  });
  const defaultName = "Unnamed Lineup";
  if (!cl?.tournamentLineup) {
    return { ticketLineupName: defaultName, ticketPlayerLastNames: [] as string[] };
  }
  const ticketLineupName = cl.tournamentLineup.name || defaultName;
  const ticketPlayerLastNames = (cl.tournamentLineup.players ?? [])
    .slice()
    .sort((a, b) => {
      const aTotal = a?.tournamentPlayer?.total ?? 0;
      const bTotal = b?.tournamentPlayer?.total ?? 0;
      return bTotal - aTotal;
    })
    .map((p) => p?.tournamentPlayer?.player?.pga_lastName)
    .filter((name): name is string => Boolean(name));
  return { ticketLineupName, ticketPlayerLastNames };
}

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
  /** Populated from `SecondaryPayoutClaimed` logs (partial if push fails mid-way). */
  secondaryPayouts: SecondaryPayoutResult[];
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
  const secondaryPayouts: SecondaryPayoutResult[] = [];

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
      return { primaryTxHashes, secondaryTxHashes, secondaryPayouts };
    }
    const secondaryEntryId = BigInt(winningEntryStr);
    const netPositionWord = (await contract.read.netPosition!([secondaryEntryId])) as bigint;
    const supply = sharesForSecondaryPricing(netPositionWord);
    if (supply === 0n) {
      return { primaryTxHashes, secondaryTxHashes, secondaryPayouts };
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
      return { primaryTxHashes, secondaryTxHashes, secondaryPayouts };
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
      return { primaryTxHashes, secondaryTxHashes, secondaryPayouts };
    }

    const ticketBacking = await loadTicketBackingContext(contestId, winningEntryStr);
    const ownerDisplayByWallet = await loadTicketOwnersDisplay(chainId, addresses);

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
        const walletLower = participant.toLowerCase();
        const display = ownerDisplayByWallet.get(walletLower) ?? {
          userId: null,
          username: "Unknown",
          userColor: DEFAULT_USER_COLOR,
        };
        secondaryPayouts.push({
          walletAddress: walletLower,
          amountWei: payout.toString(),
          entryId: args.entryId.toString(),
          userId,
          username: display.username,
          userColor: display.userColor,
          ticketLineupName: ticketBacking.ticketLineupName,
          ticketPlayerLastNames: ticketBacking.ticketPlayerLastNames,
        });
      }
    }

    return { primaryTxHashes, secondaryTxHashes, secondaryPayouts };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pushContestPayouts] contest ${contestId}:`, e);
    return { primaryTxHashes, secondaryTxHashes, secondaryPayouts, error: msg };
  }
}
