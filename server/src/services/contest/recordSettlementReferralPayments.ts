/**
 * Index referral-network payouts from the settleContest transaction receipt.
 * Referral fees are distributed at settlement (not on pushPrimary/Secondary).
 *
 * Indexes `RootsRewarded` recipients on ReferralGraph (ancestors above the primary
 * winner, including the cold platform root when it is on that chain). The contest
 * also emits `ReferralNetworkFeeDistributed` as a mirror; those amounts can be empty
 * if the follow-up calculator call reverts, so that event is not indexed.
 * `ReferralNetworkFeeToPrimary` spills an unallocated referral fee back into prize
 * pools — not a wallet payment. Push-batch dust is credited via
 * `UnallocatedBalanceAllocated` into winner pools and is not ledgered here.
 */

import type { Abi, TransactionReceipt } from "viem";
import { parseEventLogs } from "viem";
import ReferralGraph from "../../contracts/ReferralGraph.json" with { type: "json" };
import { insertOnchainPaymentRow, resolveUserIdForWallet } from "./onchainPayment.js";

const graphAbi = ReferralGraph.abi as Abi;

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
  const { contestId, chainId, paymentTokenAddress, settleReceipt } = input;

  let referralRowCount = 0;

  const rewardedLogs = parseEventLogs({
    abi: graphAbi,
    eventName: "RootsRewarded",
    logs: settleReceipt.logs,
  });

  for (const log of rewardedLogs) {
    const args = log.args as {
      groupId: `0x${string}`;
      rewardId: `0x${string}`;
      triggerUser: `0x${string}`;
      distributedAmount: bigint;
      recipients: readonly `0x${string}`[];
      amounts: readonly bigint[];
    };
    const recipients = args.recipients ?? [];
    const amounts = args.amounts ?? [];
    const len = Math.min(recipients.length, amounts.length);
    const payoutAnchor = recipients[0];

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
          winner: args.triggerUser,
          ...(payoutAnchor ? { payoutAnchor } : {}),
          recipientIndex: i,
          totalFee: args.distributedAmount.toString(),
          rewardId: args.rewardId,
          groupId: args.groupId,
        },
      });
      referralRowCount += 1;
    }
  }

  return { referralRowCount };
}
