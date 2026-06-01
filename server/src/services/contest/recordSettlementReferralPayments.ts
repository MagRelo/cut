/**
 * Index referral-network payouts from the settleContest transaction receipt.
 * Referral fees are distributed at settlement (not on pushPrimary/Secondary).
 */

import type { Abi, TransactionReceipt } from "viem";
import { getAddress, parseEventLogs } from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import RewardDistributor from "../../contracts/RewardDistributor.json" with { type: "json" };
import { getContestContract } from "../shared/contractClient.js";
import { parseReferralGroupIdFromEnv } from "../../lib/referralConfig.js";
import { insertOnchainPaymentRow, resolveUserIdForWallet } from "./onchainPayment.js";

const contestAbi = ContestController.abi as Abi;
const rewardDistributorAbi = RewardDistributor.abi as Abi;

export type RecordSettlementReferralPaymentsInput = {
  contestId: string;
  chainId: number;
  contestAddress: string;
  paymentTokenAddress: string;
  settleReceipt: TransactionReceipt;
  rewardDistributorAddress: `0x${string}`;
};

export async function recordSettlementReferralPayments(
  input: RecordSettlementReferralPaymentsInput,
): Promise<{ referralRowCount: number }> {
  const {
    contestId,
    chainId,
    contestAddress,
    paymentTokenAddress,
    settleReceipt,
    rewardDistributorAddress,
  } = input;

  const contestAddr = getAddress(contestAddress);
  const distributorAddr = getAddress(rewardDistributorAddress);
  const groupIdFromEnv = parseReferralGroupIdFromEnv();

  let referralRowCount = 0;

  const chainLogs = parseEventLogs({
    abi: rewardDistributorAbi,
    eventName: "ChainRewardsDistributed",
    logs: settleReceipt.logs,
  });

  for (const log of chainLogs) {
    if (getAddress(log.address) !== distributorAddr) continue;
    const args = log.args as {
      user: `0x${string}`;
      totalAmount: bigint;
      eventId: `0x${string}`;
      recipients: readonly `0x${string}`[];
      amounts: readonly bigint[];
    };
    const payoutAnchor = args.user;
    const eventId = args.eventId;
    const recipients = args.recipients ?? [];
    const amounts = args.amounts ?? [];
    const len = Math.min(recipients.length, amounts.length);

    for (let i = 0; i < len; i++) {
      const recipient = recipients[i];
      const amount = amounts[i];
      if (!recipient || amount === undefined || amount === 0n) continue;
      const userId = await resolveUserIdForWallet(chainId, recipient);
      await insertOnchainPaymentRow({
        kind: "REFERRAL",
        walletAddress: recipient,
        userId,
        contestId,
        chainId,
        tokenAddress: paymentTokenAddress,
        amountWei: amount.toString(),
        transactionHash: settleReceipt.transactionHash,
        logIndex: Number(log.logIndex),
        metadata: {
          eventId,
          payoutAnchor,
          recipientIndex: i,
          ...(groupIdFromEnv ? { groupId: groupIdFromEnv } : {}),
        },
      });
      referralRowCount += 1;
    }
  }

  const oracleFeeLogs = parseEventLogs({
    abi: contestAbi,
    eventName: "ReferralNetworkFeeToOracle",
    logs: settleReceipt.logs,
  });

  if (oracleFeeLogs.length > 0) {
    const contract = getContestContract(contestAddress, chainId);
    const oracle = (await contract.read.oracle!()) as `0x${string}`;

    for (const log of oracleFeeLogs) {
      if (getAddress(log.address) !== contestAddr) continue;
      const args = log.args as { winner: `0x${string}`; amount: bigint };
      const amount = args.amount;
      if (amount === 0n) continue;
      const userId = await resolveUserIdForWallet(chainId, oracle);
      await insertOnchainPaymentRow({
        kind: "REFERRAL",
        walletAddress: oracle,
        userId,
        contestId,
        chainId,
        tokenAddress: paymentTokenAddress,
        amountWei: amount.toString(),
        transactionHash: settleReceipt.transactionHash,
        logIndex: Number(log.logIndex),
        metadata: {
          payoutAnchorWinner: args.winner,
          path: "oracle",
          ...(groupIdFromEnv ? { groupId: groupIdFromEnv } : {}),
        },
      });
      referralRowCount += 1;
    }
  }

  return { referralRowCount };
}
