/**
 * Index referral-network payouts from the settleContest transaction receipt.
 * Referral fees are distributed at settlement (not on pushPrimary/Secondary).
 *
 * Indexes `ReferralNetworkFeeDistributed` recipients (including cold emergency recovery
 * when it appears in the payout chain). `ReferralNetworkFeeToPrimary` spills unallocated
 * referral fee back into primary — not a wallet payment. `UnallocatedBalanceCleared` dust
 * to the hot oracle is ignored for ledger rows.
 */

import type { Abi, TransactionReceipt } from "viem";
import { getAddress, parseEventLogs } from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { parseReferralGroupIdFromEnv } from "../../lib/referralConfig.js";
import { insertOnchainPaymentRow, resolveUserIdForWallet } from "./onchainPayment.js";

const contestAbi = ContestController.abi as Abi;

export type RecordSettlementReferralPaymentsInput = {
  contestId: string;
  chainId: number;
  contestAddress: string;
  paymentTokenAddress: string;
  settleReceipt: TransactionReceipt;
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
  } = input;

  const contestAddr = getAddress(contestAddress);
  const groupIdFromEnv = parseReferralGroupIdFromEnv();

  let referralRowCount = 0;

  const distributedLogs = parseEventLogs({
    abi: contestAbi,
    eventName: "ReferralNetworkFeeDistributed",
    logs: settleReceipt.logs,
  });

  for (const log of distributedLogs) {
    if (getAddress(log.address) !== contestAddr) continue;
    const args = log.args as {
      winner: `0x${string}`;
      payoutAnchor: `0x${string}`;
      amount: bigint;
      recipients: readonly `0x${string}`[];
      amounts: readonly bigint[];
    };
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
          winner: args.winner,
          payoutAnchor: args.payoutAnchor,
          recipientIndex: i,
          totalFee: args.amount.toString(),
          ...(groupIdFromEnv ? { groupId: groupIdFromEnv } : {}),
        },
      });
      referralRowCount += 1;
    }
  }

  // ReferralNetworkFeeToPrimary: fee spilled to primary pool (not a wallet transfer).
  // UnallocatedBalanceCleared: dust to hot oracle — intentionally not ledgered as REFERRAL.

  return { referralRowCount };
}
