/**
 * Settle a contest: ACTIVE/LOCKED → SETTLED
 *
 * Calculates winners and payouts via the sport plugin, then calls settleContest()
 * on-chain. Pure accounting — no transfers happen in settlement.
 */

import { defaultPayoutVector } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import {
  getContestContract,
  getPublicClient,
  verifyOracle,
  readContestState,
} from "../shared/contractClient.js";
import { executeContestPayoutPushes } from "./pushContestPayouts.js";
import { buildSettlementReferralArgs } from "./buildSettlementReferralArgs.js";
import { assertWinnerRegisteredOnReferralGraph } from "../referral/assertWinnerRegisteredOnGraph.js";
import { recordSettlementReferralPayments } from "./recordSettlementReferralPayments.js";
import { getRewardDistributorAddress } from "../../lib/referralConfig.js";
import {
  ContestState,
  type OperationResult,
  type ContestResults,
  type DetailedResult,
  type ContestSnapshot,
} from "../shared/types.js";
import { getContract, erc20Abi } from "viem";
import { captureContestWinPayoutRecorded } from "../analytics/posthog.js";
import { contestLineupsInclude } from "../../utils/prismaIncludes.js";
import { sortedPlayerLastNamesFromPicks } from "../../utils/lineupPickPresentation.js";

const DEFAULT_USER_COLOR = "#9CA3AF";
const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

type ContestLineupForSettlement = {
  entryId: string | null;
  score: number | null;
  createdAt: Date;
  user: {
    name: string | null;
    settings: unknown;
  } | null;
  lineup: {
    name: string;
    prediction: unknown;
    picks: Array<{
      eventParticipant: {
        total: number | null;
        participant: { metadata: unknown };
      };
    }>;
  };
};

export async function settleContest(contestId: string): Promise<OperationResult> {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: true,
        contestLineups: contestLineupsInclude,
      },
    });

    if (!contest) {
      return {
        success: false,
        contestId,
        error: "Contest not found",
      };
    }

    if (contest.status !== "ACTIVE" && contest.status !== "LOCKED") {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected ACTIVE or LOCKED`,
      };
    }

    const sportModule = requireSportModule(contest.event.sportId);
    const eventStatus = await sportModule.getEventStatus(contest.eventId);
    if (!sportModule.shouldSettleContest(eventStatus)) {
      return {
        success: false,
        contestId,
        error: `Event status is ${eventStatus}, expected COMPLETE before settlement`,
      };
    }

    if (!contest.contestLineups || contest.contestLineups.length === 0) {
      return {
        success: false,
        contestId,
        error: "Contest has no lineups to settle",
      };
    }

    const isValidOracle = await verifyOracle(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: "Oracle address mismatch",
      };
    }

    const contractState = await readContestState(contest.address, contest.chainId);
    if (contractState !== ContestState.ACTIVE && contractState !== ContestState.LOCKED) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.ACTIVE} (ACTIVE) or ${ContestState.LOCKED} (LOCKED)`,
      };
    }

    const { winningEntries, payoutBps, detailedResults } = calculatePayouts(
      contest.contestLineups,
      contest.event.sportId,
    );

    if (winningEntries.length === 0) {
      return {
        success: false,
        contestId,
        error: "No winners calculated",
      };
    }

    const totalBps = payoutBps.reduce((sum, bp) => sum + bp, 0);
    if (totalBps !== 10000) {
      return {
        success: false,
        contestId,
        error: `Payouts sum to ${totalBps}, expected 10000`,
      };
    }

    console.log(
      `[settleContest] Winners: ${winningEntries.length}, Payouts: ${payoutBps.join(", ")} BP`,
    );

    const contract = getContestContract(contest.address, contest.chainId);

    console.log(`[settleContest] Capturing snapshot values...`);
    const [
      primaryPrizePool,
      primarySideBalance,
      secondarySideBalance,
      totalSecondaryLiquidity,
      primaryDepositSecondarySubsidyBps,
      paymentTokenAddress,
    ] = await Promise.all([
      contract.read.primaryPrizePool!() as Promise<bigint>,
      contract.read.getPrimarySideBalance!() as Promise<bigint>,
      contract.read.getSecondarySideBalance!() as Promise<bigint>,
      contract.read.totalSecondaryLiquidity!() as Promise<bigint>,
      contract.read.primaryDepositSecondarySubsidyBps!() as Promise<bigint>,
      contract.read.paymentToken!() as Promise<`0x${string}`>,
    ]);
    const publicClient = getPublicClient(contest.chainId);
    const tokenContract = getContract({
      address: paymentTokenAddress,
      abi: erc20Abi,
      client: publicClient,
    });
    const contractBalance = (await tokenContract.read.balanceOf([
      contest.address as `0x${string}`,
    ])) as bigint;

    const snapshot: ContestSnapshot = {
      contractBalance: contractBalance.toString(),
      primaryPrizePool: primaryPrizePool.toString(),
      primarySideBalance: primarySideBalance.toString(),
      secondarySideBalance: secondarySideBalance.toString(),
      totalSecondaryLiquidity: totalSecondaryLiquidity.toString(),
      primaryDepositSecondarySubsidyBps: Number(primaryDepositSecondarySubsidyBps),
    };

    const winningEntryStr = winningEntries[0];
    if (!winningEntryStr) {
      return {
        success: false,
        contestId,
        error: "No winning entry for settlement",
      };
    }

    const referralNetworkBps = (await contract.read.referralNetworkBps!()) as bigint;
    const referralGroupId = (await contract.read.referralGroupId!()) as `0x${string}`;
    const winnerOwner = (await contract.read.entryOwner!([
      BigInt(winningEntryStr),
    ])) as `0x${string}`;

    const winnerCheck = await assertWinnerRegisteredOnReferralGraph({
      chainId: contest.chainId,
      winnerWallet: winnerOwner,
      referralGroupId,
      referralNetworkBps,
    });
    if (!winnerCheck.ok) {
      return {
        success: false,
        contestId,
        error: winnerCheck.error,
      };
    }

    const referralArgs = await buildSettlementReferralArgs({
      contestAddress: contest.address,
      chainId: contest.chainId,
      winningEntryId: winningEntryStr,
    });

    const winningEntriesBigInt = winningEntries.map((id) => BigInt(id));
    const payoutBpsBigInt = payoutBps.map((bp) => BigInt(bp));

    const hash = (await contract.write.settleContest!([
      winningEntriesBigInt,
      payoutBpsBigInt,
      referralArgs.referralReward,
      referralArgs.referralSignature,
    ])) as `0x${string}`;

    console.log(`[settleContest] Transaction submitted: ${hash}`);
    const settleReceipt = await publicClient.waitForTransactionReceipt({ hash });
    if (settleReceipt.status !== "success") {
      throw new Error(`settleContest transaction reverted: ${hash}`);
    }
    const onChainState = await readContestState(contest.address, contest.chainId);
    if (onChainState !== ContestState.SETTLED) {
      throw new Error(
        `Contract state is ${onChainState} after settle tx ${hash}; expected SETTLED (${ContestState.SETTLED})`,
      );
    }
    console.log(`[settleContest] Settlement confirmed on-chain: ${hash}`);

    for (const row of detailedResults) {
      if (row.payoutBasisPoints <= 0) {
        row.payoutAmountWei = "0";
        row.positionBonusAmountWei = "0";
        continue;
      }
      const stored = (await contract.read.primaryPrizePoolPayouts!([
        BigInt(row.entryId),
      ])) as bigint;
      row.payoutAmountWei = stored.toString();
      row.positionBonusAmountWei = "0";
    }

    const rewardDistributorAddress = getRewardDistributorAddress(contest.chainId);
    if (rewardDistributorAddress) {
      await recordSettlementReferralPayments({
        contestId,
        chainId: contest.chainId,
        contestAddress: contest.address,
        paymentTokenAddress,
        settleReceipt,
        rewardDistributorAddress,
      });
    } else {
      console.warn(
        `[settleContest] No rewardDistributorAddress for chain ${contest.chainId}; skipping referral payment indexing`,
      );
    }

    const pushResult = await executeContestPayoutPushes({
      contestId,
      contestAddress: contest.address,
      chainId: contest.chainId,
      winningEntries,
      paymentTokenAddress,
    });

    const results: ContestResults = {
      winningEntries,
      payoutBps,
      detailedResults,
      settleTx: { hash },
      snapshot,
      pushPrimaryTxs: pushResult.primaryTxHashes.map((h) => ({ hash: h })),
      pushSecondaryTxs: pushResult.secondaryTxHashes.map((h) => ({ hash: h })),
      ...(pushResult.error ? { pushPayoutsError: pushResult.error } : {}),
    };

    await prisma.contest.update({
      where: { id: contestId },
      data: {
        status: "SETTLED",
        results: JSON.parse(JSON.stringify(results)),
      },
    });

    const entryIdToUserId = new Map<string, string>();
    for (const cl of contest.contestLineups) {
      if (cl.entryId && cl.userId) {
        entryIdToUserId.set(String(cl.entryId), cl.userId);
      }
    }
    for (const row of detailedResults) {
      const payoutWei = BigInt(row.payoutAmountWei ?? "0");
      if (payoutWei <= 0n) continue;
      const userId = entryIdToUserId.get(String(row.entryId));
      if (!userId) continue;
      captureContestWinPayoutRecorded({
        distinctId: userId,
        contest_id: contestId,
        tournament_id: contest.eventId,
        entry_id: String(row.entryId),
        user_id: userId,
        chain_id: contest.chainId,
        payout_amount_wei: String(row.payoutAmountWei ?? "0"),
        settlement_tx_hash: hash,
      });
    }

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

function calculatePayouts(
  lineups: ContestLineupForSettlement[],
  sportId: string,
): {
  winningEntries: string[];
  payoutBps: number[];
  detailedResults: DetailedResult[];
} {
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

  const sportModule = requireSportModule(sportId);
  const lineupByEntryId = new Map(
    validLineups.map((lineup) => [lineup.entryId as string, lineup]),
  );

  const ranked = sportModule.rankEntries(
    validLineups.map((lineup) => ({
      entryId: lineup.entryId!,
      score: lineup.score,
      prediction: lineup.lineup.prediction,
      createdAt: lineup.createdAt,
    })),
  );

  const payoutStructure =
    sportModule.derivePayoutVector?.(ranked, ranked.length) ??
    defaultPayoutVector(ranked.length);

  const winningEntries: string[] = [];
  const payoutBps: number[] = [];
  const detailedResults: DetailedResult[] = [];
  let totalDistributed = 0;

  for (const row of ranked) {
    const lineup = lineupByEntryId.get(row.entryId);
    if (!lineup) {
      continue;
    }

    const payout = payoutStructure[row.position - 1] ?? 0;
    const playerLastNames = sortedPlayerLastNamesFromPicks(lineup.lineup.picks);
    const userSettings = lineup.user?.settings as { color?: string } | undefined;
    const userColor = userSettings?.color;
    const resolvedUserColor = isValidHexColor(userColor) ? userColor : DEFAULT_USER_COLOR;

    if (payout > 0) {
      winningEntries.push(row.entryId);
      payoutBps.push(payout);
      totalDistributed += payout;
    }

    detailedResults.push({
      username: lineup.user?.name || "Unknown",
      lineupName: lineup.lineup.name || "Unnamed Lineup",
      entryId: row.entryId,
      position: row.position,
      score: row.score,
      payoutBasisPoints: payout,
      playerLastNames,
      userColor: resolvedUserColor,
    });
  }

  if (totalDistributed < 10000 && payoutBps.length > 0 && payoutBps[0] !== undefined) {
    const dust = 10000 - totalDistributed;
    payoutBps[0] += dust;
    if (detailedResults[0]) {
      detailedResults[0].payoutBasisPoints += dust;
    }
  }

  return { winningEntries, payoutBps, detailedResults };
}
