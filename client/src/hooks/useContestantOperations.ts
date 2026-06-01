import { useBlockchainTransaction, type UseBlockchainTransactionOptions } from "./useBlockchainTransaction";
import ContestContract from "../utils/contracts/ContestController.json";
import { ERC20_APPROVE_ABI } from "../lib/paymentTokenSpend";

/**
 * Join a contest: approve the contest's payment token, then addPrimaryPosition.
 */
export function useJoinContest(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createJoinContestCalls = (
    contestAddress: string,
    entryId: number,
    primaryDepositAmount: bigint,
    contestPaymentToken: string,
  ) => {
    return [
      {
        abi: ERC20_APPROVE_ABI,
        args: [contestAddress as `0x${string}`, primaryDepositAmount],
        functionName: "approve",
        to: contestPaymentToken as `0x${string}`,
      },
      {
        abi: ContestContract.abi,
        args: [entryId, []],
        functionName: "addPrimaryPosition",
        to: contestAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createJoinContestCalls,
  };
}

export function useLeaveContest(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createLeaveContestCalls = (contestAddress: string, entryId: number) => {
    return [
      {
        abi: ContestContract.abi,
        args: [entryId],
        functionName: "removePrimaryPosition",
        to: contestAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createLeaveContestCalls,
  };
}

export function useClaimEntryPayout(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createClaimEntryPayoutCalls = (contestAddress: string, entryId: number) => {
    return [
      {
        abi: ContestContract.abi,
        args: [entryId],
        functionName: "claimPrimaryPayout",
        to: contestAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createClaimEntryPayoutCalls,
  };
}
