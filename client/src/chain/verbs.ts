import { useChainId } from "wagmi";
import { parseUnits } from "viem";
import { getContractAddress } from "../utils/blockchainUtils";
import ContestContract from "../utils/contracts/ContestController.json";
import ContestFactoryContract from "../utils/contracts/ContestFactory.json";
import MockUSDC from "../utils/contracts/MockUSDC.json";
import { ERC20_APPROVE_ABI, PAYMENT_TOKEN_DECIMALS } from "../lib/paymentTokenSpend";
import {
  useBlockchainTransaction,
  type UseBlockchainTransactionOptions,
} from "./transaction";

/** Join a paid contest: approve the contest's payment token, then addPrimaryPosition. */
export function useChainJoinContest(options?: UseBlockchainTransactionOptions) {
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

export function useChainLeaveContest(options?: UseBlockchainTransactionOptions) {
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

export function useClaimPrimaryPayout(options?: UseBlockchainTransactionOptions) {
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

/** Buy winner-pool shares: approve, then addSecondaryPosition. */
export function useBuyPool(options?: UseBlockchainTransactionOptions) {
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

export function useSellPool(options?: UseBlockchainTransactionOptions) {
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

export function useClaimSecondaryPayout(options?: UseBlockchainTransactionOptions) {
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

/** Deploy a paid contest through ContestFactory. */
export function useChainCreateContest(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);
  const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

  const createContestCalls = (
    primaryDepositAmount: bigint,
    referralNetworkBps: number,
    expiryTimestamp: bigint,
    primaryDepositSecondarySubsidyBps: number,
  ) => {
    return [
      {
        abi: ContestFactoryContract.abi,
        args: [
          primaryDepositAmount,
          BigInt(referralNetworkBps),
          expiryTimestamp,
          BigInt(primaryDepositSecondarySubsidyBps),
        ],
        functionName: "createContest",
        to: contestFactoryAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createContestCalls,
  };
}

interface UseSendUsdcOptions extends UseBlockchainTransactionOptions {
  tokenDecimals?: number;
}

/** Transfer the app payment token. */
export function useSendUsdc(options?: UseSendUsdcOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const tokenDecimals = options?.tokenDecimals ?? PAYMENT_TOKEN_DECIMALS;

  const createTransferCalls = (recipient: string, amount: string) => {
    const tokenAmount = parseUnits(amount, tokenDecimals);

    return [
      {
        abi: MockUSDC.abi,
        args: [recipient, tokenAmount],
        functionName: "transfer",
        to: paymentTokenAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createTransferCalls,
  };
}
