/**
 * Retry oracle pushPrimaryPayouts / pushSecondaryPayouts after on-chain settleContest.
 *
 * Requires the contest to already be settled on-chain (contract state SETTLED) and
 * `contest.results` in the DB (from settlement) so we have `winningEntries`.
 *
 * Run:
 *   pnpm --filter server run service:push-contest-payouts -- <contestId>
 * or:
 *   CONTEST_ID=<contestId> pnpm --filter server run service:push-contest-payouts
 *
 * Env (same as other oracle services): ORACLE_PRIVATE_KEY, ORACLE_ADDRESS, chain RPC via chainConfig.
 */

import { prisma } from "../lib/prisma.js";
import { executeContestPayoutPushes } from "../services/contest/pushContestPayouts.js";
import {
  getContestContract,
  readContestState,
  verifyOracle,
} from "../services/shared/contractClient.js";
import { ContestState, type ContestResults } from "../services/shared/types.js";

async function main() {
  const contestId = process.argv[2] ?? process.env.CONTEST_ID;
  if (!contestId || contestId.trim() === "") {
    console.error("Missing contest id. Usage: ... -- <contestId>  or  CONTEST_ID=<contestId>");
    process.exit(1);
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId.trim() },
  });

  if (!contest) {
    console.error(`Contest not found: ${contestId}`);
    process.exit(1);
  }

  const results = contest.results as ContestResults | null;
  if (!results?.winningEntries?.length) {
    console.error(
      "Contest has no results.winningEntries. Run settlement first (on-chain settleContest + DB results).",
    );
    process.exit(1);
  }

  const contractState = await readContestState(contest.address, contest.chainId);
  if (contractState !== ContestState.SETTLED) {
    console.error(
      `Contract state is ${contractState} (expected SETTLED=${ContestState.SETTLED}). Push payouts only run after on-chain settlement.`,
    );
    process.exit(1);
  }

  const isValidOracle = await verifyOracle(contest.address, contest.chainId);
  if (!isValidOracle) {
    console.error("Oracle address mismatch (ORACLE_ADDRESS vs contract oracle).");
    process.exit(1);
  }

  const contract = getContestContract(contest.address, contest.chainId);
  const paymentTokenAddress = (await contract.read.paymentToken!()) as `0x${string}`;

  const pushResult = await executeContestPayoutPushes({
    contestId: contest.id,
    contestAddress: contest.address,
    chainId: contest.chainId,
    winningEntries: results.winningEntries,
    paymentTokenAddress,
  });

  const { pushPayoutsError: _prevErr, ...resultsBase } = results;
  const updatedResults: ContestResults = {
    ...resultsBase,
    pushPrimaryTxs: pushResult.primaryTxHashes.map((h) => ({ hash: h })),
    pushSecondaryTxs: pushResult.secondaryTxHashes.map((h) => ({ hash: h })),
    secondaryPayouts: pushResult.secondaryPayouts,
  };
  if (pushResult.error) {
    updatedResults.pushPayoutsError = pushResult.error;
  }

  await prisma.contest.update({
    where: { id: contest.id },
    data: {
      results: JSON.parse(JSON.stringify(updatedResults)),
    },
  });

  console.log("pushContestPayouts result:", {
    primaryTxHashes: pushResult.primaryTxHashes,
    secondaryTxHashes: pushResult.secondaryTxHashes,
    secondaryPayoutCount: pushResult.secondaryPayouts.length,
    error: pushResult.error,
  });

  if (pushResult.error) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
