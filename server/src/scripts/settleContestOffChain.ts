/**
 * Testnet-only manual contest settlement: simulate results, mint/burn xUSDC, patch DB.
 *
 * Usage:
 *   cd server && node --import tsx src/scripts/settleContestOffChain.ts \
 *     --contest-id <id> --dry-run
 *
 *   cd server && node --import tsx src/scripts/settleContestOffChain.ts \
 *     --contest-id <id> --execute
 *
 * Env: DATABASE_URL, ORACLE_PRIVATE_KEY, ORACLE_ADDRESS, BASE_SEPOLIA_RPC_URL
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PaymentKind } from "@prisma/client";
import { sharesForSecondaryPricing } from "@cut/secondary-pricing";
import {
  createWalletClient,
  formatUnits,
  getContract,
  http,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import MockUSDC from "../contracts/MockUSDC.json" with { type: "json" };
import { prisma } from "../lib/prisma.js";
import { getContestContract, getPublicClient } from "../services/shared/contractClient.js";
import type {
  ContestResults,
  ContestSnapshot,
  DetailedResult,
} from "../services/shared/types.js";
import { getContestWinningScore, sortContestLineups } from "../utils/lineupTiebreaker.js";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const TX_DELAY_MS = 2000;
const DEFAULT_USER_COLOR = "#9CA3AF";
const TOKEN_DECIMALS = 6;

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSepoliaPaymentTokenAddress(): Address {
  const raw = JSON.parse(
    readFileSync(join(__dirname, "../contracts/sepolia.json"), "utf8"),
  ).paymentTokenAddress as string;
  if (!raw?.startsWith("0x")) {
    throw new Error("Invalid paymentTokenAddress in sepolia.json");
  }
  return raw as Address;
}

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function parseArgs(): { contestId: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let contestId: string | undefined;
  let dryRun = false;
  let execute = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--contest-id") {
      contestId = args[++i]?.trim();
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--execute") {
      execute = true;
    }
  }

  if (!contestId) {
    throw new Error("Missing --contest-id <contestId>");
  }
  if (dryRun === execute) {
    throw new Error("Specify exactly one of --dry-run or --execute");
  }

  return { contestId, dryRun };
}

function formatXusdc(wei: bigint): string {
  return formatUnits(wei, TOKEN_DECIMALS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PrimaryPayoutRow = {
  entryId: string;
  wallet: Address;
  amountWei: bigint;
  shareBps: number;
};

type SecondaryPayoutRow = {
  wallet: Address;
  amountWei: bigint;
  shareBps: number;
  entryId: string;
};

type MintTransfer = {
  kind: PaymentKind;
  wallet: Address;
  amountWei: bigint;
  entryId?: string;
  shareBps?: number;
};

type SimulationResult = {
  contestId: string;
  contestName: string;
  warnings: string[];
  grossWei: bigint;
  referralFeeWei: bigint;
  netPoolWei: bigint;
  referralNetworkBps: number;
  winningEntries: string[];
  payoutBps: number[];
  detailedResults: DetailedResult[];
  snapshot: ContestSnapshot;
  paymentTokenAddress: Address;
  primaryPayouts: PrimaryPayoutRow[];
  secondaryPayouts: SecondaryPayoutRow[];
  referralWallet: Address;
  contestAddress: Address;
  chainId: number;
  contractTokenBalanceWei: bigint;
};

function calculatePayouts(lineups: any[]): {
  winningEntries: string[];
  payoutBps: number[];
  detailedResults: DetailedResult[];
} {
  const validLineups = lineups.filter((lineup) => {
    if (!lineup?.user) throw new Error("Lineup missing user field");
    if (lineup.score === undefined || lineup.score === null) {
      throw new Error("Lineup missing score field");
    }
    if (!lineup.entryId) throw new Error("Lineup missing entryId field");
    return true;
  });

  if (validLineups.length === 0) {
    throw new Error("No valid lineups found");
  }

  const contestWinningScore = getContestWinningScore(validLineups);
  const sortedLineups = sortContestLineups(validLineups, contestWinningScore);
  const isLargeContest = validLineups.length >= 10;
  const payoutStructure = isLargeContest ? [7000, 2000, 1000] : [10000];

  const winningEntries: string[] = [];
  const payoutBps: number[] = [];
  const detailedResults: DetailedResult[] = [];
  let totalDistributed = 0;

  sortedLineups.forEach((lineup, index) => {
    const position = index + 1;
    const payout = payoutStructure[position - 1] ?? 0;

    const playerLastNames = (lineup.tournamentLineup?.players ?? [])
      .slice()
      .sort((a: any, b: any) => {
        const aTotal = a?.tournamentPlayer?.total ?? 0;
        const bTotal = b?.tournamentPlayer?.total ?? 0;
        return bTotal - aTotal;
      })
      .map((p: any) => p?.tournamentPlayer?.player?.pga_lastName)
      .filter((name: unknown): name is string => Boolean(name));

    const userSettings = lineup.user?.settings as { color?: string } | undefined;
    const userColor = isValidHexColor(userSettings?.color)
      ? userSettings.color
      : DEFAULT_USER_COLOR;

    if (payout > 0) {
      winningEntries.push(lineup.entryId);
      payoutBps.push(payout);
      totalDistributed += payout;
    }

    detailedResults.push({
      username: lineup.user?.name || "Unknown",
      lineupName: lineup.tournamentLineup?.name || "Unnamed Lineup",
      entryId: lineup.entryId,
      position,
      score: lineup.score,
      payoutBasisPoints: payout,
      playerLastNames,
      userColor,
    });
  });

  if (totalDistributed < 10000 && payoutBps.length > 0 && payoutBps[0] !== undefined) {
    const dust = 10000 - totalDistributed;
    payoutBps[0] += dust;
    if (detailedResults[0]) {
      detailedResults[0].payoutBasisPoints += dust;
    }
  }

  return { winningEntries, payoutBps, detailedResults };
}

function allocateNetPool(netPoolWei: bigint, payoutBps: number[]): bigint[] {
  const amounts: bigint[] = [];
  let allocated = 0n;
  for (let i = 0; i < payoutBps.length; i++) {
    const bps = payoutBps[i] ?? 0;
    if (i === payoutBps.length - 1) {
      amounts.push(netPoolWei - allocated);
    } else {
      const slice = (netPoolWei * BigInt(bps)) / 10000n;
      amounts.push(slice);
      allocated += slice;
    }
  }
  return amounts;
}

async function resolveUserId(chainId: number, wallet: string): Promise<string | null> {
  const row = await prisma.userWallet.findFirst({
    where: {
      chainId,
      publicKey: { equals: wallet, mode: "insensitive" },
    },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

async function simulateSettlement(contestId: string): Promise<SimulationResult> {
  const warnings: string[] = [];

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      tournament: true,
      contestLineups: {
        include: {
          user: true,
          tournamentLineup: {
            include: {
              players: {
                include: {
                  tournamentPlayer: {
                    include: { player: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!contest) {
    throw new Error(`Contest not found: ${contestId}`);
  }

  if (contest.chainId !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(`Off-chain settlement only supported on Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`);
  }

  if (contest.status === "SETTLED" || contest.status === "CLOSED") {
    throw new Error(`Contest DB status is ${contest.status}; refusing to settle again`);
  }

  if (contest.status !== "ACTIVE" && contest.status !== "LOCKED") {
    throw new Error(`Contest DB status is ${contest.status}; expected ACTIVE or LOCKED`);
  }

  if (contest.tournament.status !== "COMPLETED") {
    throw new Error(`Tournament status is ${contest.tournament.status}; expected COMPLETED`);
  }

  if (!contest.contestLineups.length) {
    throw new Error("Contest has no lineups");
  }

  warnings.push("On-chain contest state will remain ACTIVE; DB will be patched to SETTLED.");

  const contract = getContestContract(contest.address, contest.chainId);
  const publicClient = getPublicClient(contest.chainId);

  const [
    primarySideBalance,
    secondarySideBalance,
    referralNetworkBpsRaw,
    paymentTokenAddress,
    primaryPrizePool,
    totalSecondaryLiquidity,
    primaryDepositSecondarySubsidyBps,
  ] = await Promise.all([
    contract.read.getPrimarySideBalance!() as Promise<bigint>,
    contract.read.getSecondarySideBalance!() as Promise<bigint>,
    contract.read.referralNetworkBps!() as Promise<bigint>,
    contract.read.paymentToken!() as Promise<Address>,
    contract.read.primaryPrizePool!() as Promise<bigint>,
    contract.read.totalSecondaryLiquidity!() as Promise<bigint>,
    contract.read.primaryDepositSecondarySubsidyBps!() as Promise<bigint>,
  ]);

  const expectedToken = loadSepoliaPaymentTokenAddress();
  if (paymentTokenAddress.toLowerCase() !== expectedToken.toLowerCase()) {
    throw new Error(
      `Contest payment token ${paymentTokenAddress} does not match sepolia MockUSDC ${expectedToken}`,
    );
  }

  const paymentTokenContract = getContract({
    address: paymentTokenAddress,
    abi: MockUSDC.abi,
    client: publicClient,
  });
  const contractTokenBalanceWei = (await paymentTokenContract.read.balanceOf!([
    contest.address as Address,
  ])) as bigint;

  const grossWei = primarySideBalance + secondarySideBalance;
  const referralNetworkBps = Number(referralNetworkBpsRaw);
  const referralFeeWei = (grossWei * referralNetworkBpsRaw) / 10000n;
  const netBps = 10000n - referralNetworkBpsRaw;
  const netPrimaryWei = (primarySideBalance * netBps) / 10000n;
  const netSecondaryWei = (secondarySideBalance * netBps) / 10000n;
  const netPoolWei = netPrimaryWei + netSecondaryWei;

  const { winningEntries, payoutBps, detailedResults } = calculatePayouts(
    contest.contestLineups,
  );

  const primaryAmounts = allocateNetPool(netPrimaryWei, payoutBps);
  const primaryPayouts: PrimaryPayoutRow[] = [];

  for (let i = 0; i < winningEntries.length; i++) {
    const entryId = winningEntries[i]!;
    const amountWei = primaryAmounts[i] ?? 0n;
    const wallet = (await contract.read.entryOwner!([BigInt(entryId)])) as Address;
    if (wallet === "0x0000000000000000000000000000000000000000") {
      throw new Error(`No entry owner for winning entry ${entryId}`);
    }
    primaryPayouts.push({
      entryId,
      wallet,
      amountWei,
      shareBps: payoutBps[i] ?? 0,
    });

    const detail = detailedResults.find((r) => r.entryId === entryId);
    if (detail) {
      detail.payoutAmountWei = amountWei.toString();
      detail.positionBonusAmountWei = "0";
    }
  }

  const secondaryPayouts: SecondaryPayoutRow[] = [];
  const winningEntryStr = winningEntries[0];

  if (secondarySideBalance > 0n && winningEntryStr) {
    const netSecondaryPool = netSecondaryWei;
    const secondaryEntryId = BigInt(winningEntryStr);
    const netPositionWord = (await contract.read.netPosition!([secondaryEntryId])) as bigint;
    const supply = sharesForSecondaryPricing(netPositionWord);

    if (supply > 0n && netSecondaryPool > 0n) {
      const rows = await prisma.contestSecondaryParticipant.findMany({
        where: { contestId, entryId: winningEntryStr, chainId: contest.chainId },
        select: { walletAddress: true },
      });
      const addresses = [
        ...new Set(rows.map((r) => r.walletAddress.toLowerCase() as Address)),
      ].sort((a, b) => a.localeCompare(b));

      const balanceOf = contract.read.balanceOf!;
      const balances = await Promise.all(
        addresses.map((addr) => balanceOf([addr, secondaryEntryId]) as Promise<bigint>),
      );

      const participants = addresses
        .map((addr, idx) => ({ addr, balance: balances[idx] ?? 0n }))
        .filter((p) => p.balance > 0n);

      let secondaryAllocated = 0n;
      for (let i = 0; i < participants.length; i++) {
        const { addr, balance } = participants[i]!;
        const shareBps =
          supply === 0n ? 0 : Number((balance * 10000n) / supply);
        const amountWei =
          i === participants.length - 1
            ? netSecondaryPool - secondaryAllocated
            : (netSecondaryPool * balance) / supply;
        secondaryAllocated += amountWei;
        secondaryPayouts.push({
          wallet: addr,
          amountWei,
          shareBps,
          entryId: winningEntryStr,
        });
      }
    }
  }

  const oracleAddress = process.env.ORACLE_ADDRESS?.trim();
  if (!oracleAddress?.startsWith("0x")) {
    throw new Error("ORACLE_ADDRESS must be set for referral mint");
  }
  const referralWallet = oracleAddress as Address;

  if (contractTokenBalanceWei < grossWei) {
    warnings.push(
      `Contest token balance ${formatXusdc(contractTokenBalanceWei)} is less than gross ${formatXusdc(grossWei)}; burn may fail.`,
    );
  }

  const snapshot: ContestSnapshot = {
    contractBalance: contractTokenBalanceWei.toString(),
    primaryPrizePool: primaryPrizePool.toString(),
    primarySideBalance: primarySideBalance.toString(),
    secondarySideBalance: secondarySideBalance.toString(),
    totalSecondaryLiquidity: totalSecondaryLiquidity.toString(),
    primaryDepositSecondarySubsidyBps: Number(primaryDepositSecondarySubsidyBps),
  };

  return {
    contestId,
    contestName: contest.name,
    warnings,
    grossWei,
    referralFeeWei,
    netPoolWei,
    referralNetworkBps,
    winningEntries,
    payoutBps,
    detailedResults,
    snapshot,
    paymentTokenAddress,
    primaryPayouts,
    secondaryPayouts,
    referralWallet,
    contestAddress: contest.address as Address,
    chainId: contest.chainId,
    contractTokenBalanceWei,
  };
}

function buildMintTransfers(sim: SimulationResult): MintTransfer[] {
  const transfers: MintTransfer[] = [];

  for (const row of sim.primaryPayouts) {
    if (row.amountWei > 0n) {
      transfers.push({
        kind: PaymentKind.PRIMARY,
        wallet: row.wallet,
        amountWei: row.amountWei,
        entryId: row.entryId,
      });
    }
  }

  for (const row of sim.secondaryPayouts) {
    if (row.amountWei > 0n) {
      transfers.push({
        kind: PaymentKind.SECONDARY,
        wallet: row.wallet,
        amountWei: row.amountWei,
        entryId: row.entryId,
        shareBps: row.shareBps,
      });
    }
  }

  if (sim.referralFeeWei > 0n) {
    transfers.push({
      kind: PaymentKind.REFERRAL,
      wallet: sim.referralWallet,
      amountWei: sim.referralFeeWei,
    });
  }

  return transfers;
}

function printPreview(sim: SimulationResult): void {
  const minted = buildMintTransfers(sim);
  const mintedSum = minted.reduce((s, t) => s + t.amountWei, 0n);

  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        contestId: sim.contestId,
        contestName: sim.contestName,
        warnings: sim.warnings,
        pool: {
          grossWei: sim.grossWei.toString(),
          grossXusdc: formatXusdc(sim.grossWei),
          referralFeeWei: sim.referralFeeWei.toString(),
          referralFeeXusdc: formatXusdc(sim.referralFeeWei),
          referralWallet: sim.referralWallet,
          netPoolWei: sim.netPoolWei.toString(),
          netPoolXusdc: formatXusdc(sim.netPoolWei),
          burnFromContestWei: sim.grossWei.toString(),
          burnFromContestXusdc: formatXusdc(sim.grossWei),
          contestTokenBalanceWei: sim.contractTokenBalanceWei.toString(),
          mintedSumWei: mintedSum.toString(),
          accountingOk: mintedSum === sim.grossWei,
        },
        winners: sim.primaryPayouts.map((p) => ({
          position: sim.detailedResults.find((d) => d.entryId === p.entryId)?.position,
          entryId: p.entryId,
          wallet: p.wallet,
          amountWei: p.amountWei.toString(),
          amountXusdc: formatXusdc(p.amountWei),
          shareBps: p.shareBps,
          username: sim.detailedResults.find((d) => d.entryId === p.entryId)?.username,
        })),
        secondaryPayouts: sim.secondaryPayouts.map((p) => ({
          wallet: p.wallet,
          amountWei: p.amountWei.toString(),
          amountXusdc: formatXusdc(p.amountWei),
          shareBps: p.shareBps,
        })),
        detailedResults: sim.detailedResults,
      },
      null,
      2,
    ),
  );
}

async function executeTransfers(
  sim: SimulationResult,
): Promise<Array<MintTransfer & { transactionHash: Hash }>> {
  const privateKey = process.env.ORACLE_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("ORACLE_PRIVATE_KEY is required for --execute");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  const publicClient = getPublicClient(sim.chainId);

  const paymentToken = getContract({
    address: sim.paymentTokenAddress,
    abi: MockUSDC.abi,
    client: walletClient,
  });

  const mintTransfers = buildMintTransfers(sim);
  const mintedSum = mintTransfers.reduce((s, t) => s + t.amountWei, 0n);
  if (mintedSum !== sim.grossWei) {
    throw new Error(
      `Accounting mismatch: minted ${mintedSum} !== gross ${sim.grossWei}`,
    );
  }

  if (sim.contractTokenBalanceWei < sim.grossWei) {
    throw new Error(
      `Contest balance ${sim.contractTokenBalanceWei} < gross burn ${sim.grossWei}`,
    );
  }

  const completed: Array<MintTransfer & { transactionHash: Hash }> = [];

  for (const transfer of mintTransfers) {
    console.log(
      `[mint] ${transfer.kind} ${formatXusdc(transfer.amountWei)} xUSDC → ${transfer.wallet}`,
    );
    const hash = (await paymentToken.write.mint!([
      transfer.wallet,
      transfer.amountWei,
    ])) as Hash;
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`Mint tx reverted: ${hash}`);
    }
    console.log(`[mint] confirmed ${hash}`);
    completed.push({ ...transfer, transactionHash: hash });
    await sleep(TX_DELAY_MS);
  }

  console.log(
    `[burn] ${formatXusdc(sim.grossWei)} xUSDC from contest ${sim.contestAddress}`,
  );
  const burnHash = (await paymentToken.write.burn!([
    sim.contestAddress,
    sim.grossWei,
  ])) as Hash;
  const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });
  if (burnReceipt.status !== "success") {
    throw new Error(`Burn tx reverted: ${burnHash}`);
  }
  console.log(`[burn] confirmed ${burnHash}`);

  return completed;
}

async function patchDatabase(
  sim: SimulationResult,
  mintReceipts: Array<MintTransfer & { transactionHash: Hash }>,
): Promise<void> {
  const results: ContestResults & { settlementMode?: string } = {
    winningEntries: sim.winningEntries,
    payoutBps: sim.payoutBps,
    detailedResults: sim.detailedResults,
    settleTx: { hash: "off-chain" },
    snapshot: sim.snapshot,
    settlementMode: "off_chain",
  };

  await prisma.contest.update({
    where: { id: sim.contestId },
    data: {
      status: "SETTLED",
      results: JSON.parse(JSON.stringify(results)),
    },
  });

  const paymentRows = await Promise.all(
    mintReceipts.map(async (row, index) => ({
      kind: row.kind,
      walletAddress: row.wallet.toLowerCase(),
      userId: await resolveUserId(sim.chainId, row.wallet),
      contestId: sim.contestId,
      chainId: sim.chainId,
      tokenAddress: sim.paymentTokenAddress.toLowerCase(),
      amountWei: row.amountWei.toString(),
      transactionHash: row.transactionHash,
      logIndex: index,
      metadata: {
        entryId: row.entryId,
        shareBps: row.shareBps,
        settlementMode: "off_chain",
      },
    })),
  );

  if (paymentRows.length > 0) {
    await prisma.onchainPayment.createMany({
      data: paymentRows,
      skipDuplicates: true,
    });
  }

  console.log(`[db] contest ${sim.contestId} → SETTLED`);
  console.log(`[db] wrote ${paymentRows.length} OnchainPayment row(s)`);
}

async function main(): Promise<void> {
  const { contestId, dryRun } = parseArgs();
  const sim = await simulateSettlement(contestId);

  if (dryRun) {
    printPreview(sim);
    return;
  }

  console.log(`[execute] settling ${sim.contestName} (${sim.contestId}) off-chain...`);
  for (const w of sim.warnings) {
    console.warn(`[warn] ${w}`);
  }

  const mintReceipts = await executeTransfers(sim);
  await patchDatabase(sim, mintReceipts);

  console.log("[done] Off-chain settlement complete.");
  console.log("Note: on-chain contest contract state is still ACTIVE.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
