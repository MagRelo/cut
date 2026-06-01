import { useBlockchainTransaction, type UseBlockchainTransactionOptions } from "./useBlockchainTransaction";
import ContestContract from "../utils/contracts/ContestController.json";
import { ERC20_APPROVE_ABI } from "../lib/paymentTokenSpend";

/**
 * Add a secondary (winner pool) position: approve contest payment token, then addSecondaryPosition.
 */
export function useAddPrediction(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createAddPredictionCalls = (
    contestAddress: string,
    outcomeId: number,
    predictionAmount: bigint,
    contestPaymentToken: string,
  ) => {
    return [
      {
        abi: ERC20_APPROVE_ABI,
        args: [contestAddress as `0x${string}`, predictionAmount],
        functionName: "approve",
        to: contestPaymentToken as `0x${string}`,
      },
      {
        abi: ContestContract.abi,
        args: [outcomeId, predictionAmount, []],
        functionName: "addSecondaryPosition",
        to: contestAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createAddPredictionCalls,
  };
}

export function useWithdrawPrediction(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createWithdrawPredictionCalls = (
    contestAddress: string,
    outcomeId: number,
    tokenAmount: bigint,
  ) => {
    return [
      {
        abi: ContestContract.abi,
        args: [outcomeId, tokenAmount],
        functionName: "removeSecondaryPosition",
        to: contestAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createWithdrawPredictionCalls,
  };
}

export function useClaimPredictionPayout(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createClaimPredictionPayoutCalls = (contestAddress: string, outcomeId: number) => {
    return [
      {
        abi: ContestContract.abi,
        args: [outcomeId],
        functionName: "claimSecondaryPayout",
        to: contestAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createClaimPredictionPayoutCalls,
  };
}
