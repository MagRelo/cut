/**
 * Settle a contest: ACTIVE/LOCKED → SETTLED
 *
 * Calculates winners and payouts, then calls contract settleContest() to store
 * payouts on-chain. This is pure accounting - no transfers happen in settlement.
 */

import { prisma } from "../../lib/prisma.js";
import { getContestContract, verifyOracle, readContestState } from "../shared/contractClient.js";
import {
  ContestState,
  type OperationResult,
  type ContestResults,
  type DetailedResult,
  type ContestSnapshot,
} from "../shared/types.js";
import { getContract, createPublicClient, http, erc20Abi } from "viem";
import { getChainConfig } from "../../lib/chainConfig.js";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex
const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

export async function settleContest(contestId: string): Promise<OperationResult> {
  try {
    // console.log(`[settleContest] Starting settlement for contest ${contestId}`);

    // Fetch contest from database with all lineup data
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        tournament: true,
        contestLineups: {
          include: {
            user: {
              include: {
                wallets: true,
              },
            },
            tournamentLineup: {
              include: {
                players: {
                  include: {
                    tournamentPlayer: {
                      include: {
                        player: true,
                      },
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
      return {
        success: false,
        contestId,
        error: "Contest not found",
      };
    }

    // Validate contest status
    if (contest.status !== "ACTIVE" && contest.status !== "LOCKED") {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected ACTIVE or LOCKED`,
      };
    }

    // Validate tournament is completed
    if (contest.tournament.status !== "COMPLETED") {
      return {
        success: false,
        contestId,
        error: `Tournament status is ${contest.tournament.status}, expected COMPLETED`,
      };
    }

    // Validate has lineups
    if (!contest.contestLineups || contest.contestLineups.length === 0) {
      return {
        success: false,
        contestId,
        error: "Contest has no lineups to settle",
      };
    }

    // Verify oracle
    const isValidOracle = await verifyOracle(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: "Oracle address mismatch",
      };
    }

    // Check contract state
    const contractState = await readContestState(contest.address, contest.chainId);
    if (contractState !== ContestState.ACTIVE && contractState !== ContestState.LOCKED) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.ACTIVE} (ACTIVE) or ${ContestState.LOCKED} (LOCKED)`,
      };
    }

    // Calculate winners and payouts
    const { winningEntries, payoutBps, detailedResults } = await calculatePayouts(
      contest.contestLineups
    );

    if (winningEntries.length === 0) {
      return {
        success: false,
        contestId,
        error: "No winners calculated",
      };
    }

    // Validate payouts sum to 10000 (100%)
    const totalBps = payoutBps.reduce((sum, bp) => sum + bp, 0);
    if (totalBps !== 10000) {
      return {
        success: false,
        contestId,
        error: `Payouts sum to ${totalBps}, expected 10000`,
      };
    }

    console.log(
      `[settleContest] Winners: ${winningEntries.length}, Payouts: ${payoutBps.join(", ")} BP`
    );

    // Get contract instance for reading values
    const contract = getContestContract(contest.address, contest.chainId);

    // Capture snapshot values BEFORE settlement
    console.log(`[settleContest] Capturing snapshot values...`);
    const [
      primaryPrizePool,
      primaryPrizePoolSubsidy,
      primarySideBalance,
      secondaryPrizePool,
      secondaryPrizePoolSubsidy,
      secondarySideBalance,
      currentPrimaryShareBps,
      totalPrimaryPositionSubsidies,
      paymentTokenAddress,
    ] = await Promise.all([
      contract.read.primaryPrizePool!() as Promise<bigint>,
      contract.read.primaryPrizePoolSubsidy!() as Promise<bigint>,
      contract.read.getPrimarySideBalance!() as Promise<bigint>,
      contract.read.secondaryPrizePool!() as Promise<bigint>,
      contract.read.secondaryPrizePoolSubsidy!() as Promise<bigint>,
      contract.read.getSecondarySideBalance!() as Promise<bigint>,
      contract.read.getPrimarySideShareBps!() as Promise<bigint>,
      contract.read.totalPrimaryPositionSubsidies!() as Promise<bigint>,
      contract.read.paymentToken!() as Promise<`0x${string}`>,
    ]);

    // Get contract token balance using ERC20 contract
    const chainConfig = getChainConfig(contest.chainId);
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl),
    });
    const tokenContract = getContract({
      address: paymentTokenAddress,
      abi: erc20Abi,
      client: publicClient,
    });
    const contractBalance = (await tokenContract.read.balanceOf([
      contest.address as `0x${string}`,
    ])) as bigint;

    // Create snapshot
    const snapshot: ContestSnapshot = {
      contractBalance: contractBalance.toString(),
      primaryPrizePool: primaryPrizePool.toString(),
      primaryPrizePoolSubsidy: primaryPrizePoolSubsidy.toString(),
      primarySideBalance: primarySideBalance.toString(),
      secondaryPrizePool: secondaryPrizePool.toString(),
      secondaryPrizePoolSubsidy: secondaryPrizePoolSubsidy.toString(),
      secondarySideBalance: secondarySideBalance.toString(),
      currentPrimaryShareBps: Number(currentPrimaryShareBps),
      totalPrimaryPositionSubsidies: totalPrimaryPositionSubsidies.toString(),
    };

    console.log(`[settleContest] Snapshot captured:`, {
      primarySideBalance: snapshot.primarySideBalance,
      secondarySideBalance: snapshot.secondarySideBalance,
      currentPrimaryShareBps: snapshot.currentPrimaryShareBps,
    });

    // Preserve payout/bonus totals at settlement time.
    // These on-chain values may be zeroed after users claim, but we want to
    // keep the UI display consistent by storing them in `contest.results`.
    const layer1PoolWei = BigInt(snapshot.primaryPrizePool) + BigInt(snapshot.primaryPrizePoolSubsidy);
    const uniqueEntryIds = Array.from(new Set(detailedResults.map((r) => r.entryId)));
    const uniqueEntryIdsBigInt = uniqueEntryIds.map((id) => BigInt(id));

    const positionBonusByEntryId = new Map<string, bigint>();
    const positionBonusResults = await Promise.all(
      uniqueEntryIdsBigInt.map(
        (entryBigInt) => contract.read.primaryPositionSubsidy!([entryBigInt]) as Promise<bigint>,
      ),
    );
    uniqueEntryIds.forEach((id, i) => {
      positionBonusByEntryId.set(id, positionBonusResults[i] ?? 0n);
    });

    detailedResults.forEach((r) => {
      const payoutAmountWei = (layer1PoolWei * BigInt(r.payoutBasisPoints)) / 10000n;
      const positionBonusAmountWei = positionBonusByEntryId.get(r.entryId) ?? 0n;
      r.payoutAmountWei = payoutAmountWei.toString();
      r.positionBonusAmountWei = positionBonusAmountWei.toString();
    });

    // Convert entryIds to BigInt for contract call
    const winningEntriesBigInt = winningEntries.map((id) => BigInt(id));
    const payoutBpsBigInt = payoutBps.map((bp) => BigInt(bp));

    // Call contract to settle
    const hash = (await contract.write.settleContest!([
      winningEntriesBigInt,
      payoutBpsBigInt,
    ])) as string;

    console.log(`[settleContest] Transaction hash: ${hash}`);

    // Prepare results for database
    const results: ContestResults = {
      winningEntries,
      payoutBps,
      detailedResults,
      settleTx: { hash },
      snapshot,
    };

    // Update database
    await prisma.contest.update({
      where: { id: contestId },
      data: {
        status: "SETTLED",
        results: JSON.parse(JSON.stringify(results)),
      },
    });

    console.log(`[settleContest] Successfully settled contest ${contestId}`);

    return {
      success: true,
      contestId,
      transactionHash: hash,
    };
  } catch (error) {
    console.error(`[settleContest] Error settling contest ${contestId}:`, error);
    return {
      success: false,
      contestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Calculate winners and payouts based on lineup scores
 */
async function calculatePayouts(lineups: any[]): Promise<{
  winningEntries: string[];
  payoutBps: number[];
  detailedResults: DetailedResult[];
}> {
  // Validate lineups have required data
  const validLineups = lineups.filter((lineup) => {
    if (!lineup?.user) {
      throw new Error("Lineup missing user field");
    }
    if (lineup?.score === undefined || lineup?.score === null) {
      throw new Error("Lineup missing score field");
    }
    if (!lineup?.entryId) {
      throw new Error("Lineup missing entryId field");
    }
    return true;
  });

  if (validLineups.length === 0) {
    throw new Error("No valid lineups found");
  }

  // Sort lineups by score (descending - highest score wins)
  const sortedLineups = [...validLineups].sort((a, b) => b.score - a.score);

  // Define payout structure based on lineup count
  const isLargeContest = validLineups.length >= 10;
  const payoutStructure = isLargeContest
    ? [7000, 2000, 1000] // 70%, 20%, 10% for positions 1, 2, 3
    : [10000]; // 100% for position 1 only

  // Result arrays
  const winningEntries: string[] = [];
  const payoutBps: number[] = [];
  const detailedResults: DetailedResult[] = [];

  // Process lineups by score groups (handle ties)
  let currentPosition = 1;
  let i = 0;
  let totalDistributed = 0;

  while (i < sortedLineups.length) {
    const currentScore = sortedLineups[i].score;
    const tiedLineups: any[] = [];

    // Collect all lineups with the same score
    while (i < sortedLineups.length && sortedLineups[i].score === currentScore) {
      tiedLineups.push(sortedLineups[i]);
      i++;
    }

    const tieCount = tiedLineups.length;

    // Calculate pooled payout for positions this tied group occupies
    let pooledPayout = 0;
    for (let pos = currentPosition; pos < currentPosition + tieCount; pos++) {
      const posIndex = pos - 1;
      if (posIndex < payoutStructure.length) {
        pooledPayout += payoutStructure[posIndex] || 0;
      }
    }

    // Split pooled payout evenly among tied players
    const basePayoutPerPlayer = pooledPayout > 0 ? Math.floor(pooledPayout / tieCount) : 0;
    const totalBaseForGroup = basePayoutPerPlayer * tieCount;
    const remainderBasisPoints = pooledPayout - totalBaseForGroup;

    // Process each tied lineup
    for (let j = 0; j < tiedLineups.length; j++) {
      const lineup = tiedLineups[j];

      const playerLastNames = (lineup.tournamentLineup?.players ?? [])
        .slice()
        .sort((a: any, b: any) => {
          const aTotal = a?.tournamentPlayer?.total ?? 0;
          const bTotal = b?.tournamentPlayer?.total ?? 0;
          return bTotal - aTotal;
        })
        .map((p: any) => p?.tournamentPlayer?.player?.pga_lastName)
        .filter((name: unknown): name is string => Boolean(name));

      const userSettings = lineup.user?.settings as any | undefined;
      const userColor = userSettings?.color;
      const resolvedUserColor = isValidHexColor(userColor) ? userColor : DEFAULT_USER_COLOR;

      // Distribute remainder to first players in tie
      const payout = basePayoutPerPlayer + (j < remainderBasisPoints ? 1 : 0);

      // Add to winners arrays if they receive a payout
      if (payout > 0) {
        winningEntries.push(lineup.entryId);
        payoutBps.push(payout);
        totalDistributed += payout;
      }

      // Add to detailed results for all players
      detailedResults.push({
        username: lineup.user?.name || "Unknown",
        lineupName: lineup.tournamentLineup?.name || "Unnamed Lineup",
        entryId: lineup.entryId,
        position: currentPosition,
        score: currentScore,
        payoutBasisPoints: payout,
        playerLastNames,
        userColor: resolvedUserColor,
      });
    }

    currentPosition += tieCount;
  }

  // Add any dust to first winner to ensure total = 10000
  if (totalDistributed < 10000 && payoutBps.length > 0 && payoutBps[0] !== undefined) {
    const dust = 10000 - totalDistributed;
    payoutBps[0] += dust;
    if (detailedResults[0]) {
      detailedResults[0].payoutBasisPoints += dust;
    }
  }

  return { winningEntries, payoutBps, detailedResults };
}
