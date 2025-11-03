import { useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useBlockchainTransaction } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import ContestContract from "../utils/contracts/Contest.json";
import DepositManagerContract from "../utils/contracts/DepositManager.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";

interface UseBlockchainTransactionOptions {
  onSuccess?: (data: any) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  onSettled?: () => void;
}

// Helper functions for decimal conversion
const PAYMENT_TOKEN_DECIMALS = 6;
const PLATFORM_TOKEN_DECIMALS = 18;

const convertPlatformToPaymentTokens = (platformTokenAmount: bigint): bigint => {
  const humanReadableAmount = formatUnits(platformTokenAmount, PLATFORM_TOKEN_DECIMALS);
  return parseUnits(humanReadableAmount, PAYMENT_TOKEN_DECIMALS);
};

/**
 * Hook for adding a prediction on a contestant (Layer 2 spectator operation)
 * Handles automatic token swapping if needed (USDC -> CUT)
 */
export function useAddPrediction(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

  const createAddPredictionCalls = (
    contestAddress: string,
    outcomeId: number,
    predictionAmount: bigint,
    platformTokenBalance: bigint = 0n,
    paymentTokenBalance: bigint = 0n
  ) => {
    const calls = [];

    // Calculate how many platform tokens we need to swap
    const platformTokensNeeded =
      predictionAmount > platformTokenBalance ? predictionAmount - platformTokenBalance : 0n;

    // Convert platform tokens needed to payment token equivalent (accounting for decimals)
    const paymentTokensNeeded = convertPlatformToPaymentTokens(platformTokensNeeded);

    // If we need to swap payment tokens for platform tokens, do it
    if (platformTokensNeeded > 0n && paymentTokenBalance >= paymentTokensNeeded) {
      // First approve the DepositManager to spend payment tokens
      calls.push({
        abi: [
          {
            type: "function",
            name: "approve",
            inputs: [
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
          },
        ],
        args: [depositManagerAddress as `0x${string}`, paymentTokensNeeded],
        functionName: "approve",
        to: paymentTokenAddress as `0x${string}`,
      });

      // Then buy platform tokens with payment tokens (1:1 ratio)
      calls.push({
        abi: DepositManagerContract.abi,
        args: [paymentTokensNeeded],
        functionName: "depositUSDC",
        to: depositManagerAddress as `0x${string}`,
      });
    }

    // Approve the contest contract to spend platform tokens
    calls.push({
      abi: PlatformTokenContract.abi,
      args: [contestAddress as `0x${string}`, predictionAmount],
      functionName: "approve",
      to: platformTokenAddress as `0x${string}`,
    });

    // Add prediction (LMSR pricing, receives ERC1155 tokens) - now addSecondaryPosition
    calls.push({
      abi: ContestContract.abi,
      args: [outcomeId, predictionAmount, []],
      functionName: "addSecondaryPosition",
      to: contestAddress as `0x${string}`,
    });

    return calls;
  };

  return {
    ...transaction,
    createAddPredictionCalls,
  };
}

/**
 * Hook for withdrawing a prediction before settlement
 * Provides 100% refund including entry fees
 */
export function useWithdrawPrediction(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createWithdrawPredictionCalls = (
    contestAddress: string,
    outcomeId: number,
    tokenAmount: bigint
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

/**
 * Hook for claiming prediction payout after settlement
 * Winner-take-all: only winners receive payout
 */
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
