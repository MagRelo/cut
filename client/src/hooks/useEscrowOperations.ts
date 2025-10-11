import { useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useBlockchainTransaction } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import EscrowContract from "../utils/contracts/Escrow.json";
import EscrowFactoryContract from "../utils/contracts/EscrowFactory.json";
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
 * Hook for depositing to an escrow contract
 * Handles automatic token swapping if needed (USDC -> CUT)
 */
export function useEscrowDeposit(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

  const createDepositCalls = (
    escrowAddress: string,
    depositAmount: bigint,
    platformTokenBalance: bigint = 0n,
    paymentTokenBalance: bigint = 0n
  ) => {
    const calls = [];

    // Calculate how many platform tokens we need to swap
    const platformTokensNeeded =
      depositAmount > platformTokenBalance ? depositAmount - platformTokenBalance : 0n;

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

    // Approve the escrow contract to spend platform tokens
    calls.push({
      abi: PlatformTokenContract.abi,
      args: [escrowAddress as `0x${string}`, depositAmount],
      functionName: "approve",
      to: platformTokenAddress as `0x${string}`,
    });

    // Deposit to the escrow contract
    calls.push({
      abi: EscrowContract.abi,
      args: [],
      functionName: "deposit",
      to: escrowAddress as `0x${string}`,
    });

    return calls;
  };

  return {
    ...transaction,
    createDepositCalls,
  };
}

/**
 * Hook for withdrawing from an escrow contract
 */
export function useEscrowWithdraw(options?: UseBlockchainTransactionOptions) {
  const transaction = useBlockchainTransaction(options);

  const createWithdrawCalls = (escrowAddress: string) => {
    return [
      {
        abi: EscrowContract.abi,
        args: [],
        functionName: "withdraw",
        to: escrowAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createWithdrawCalls,
  };
}

/**
 * Hook for creating a new escrow contract via EscrowFactory
 */
export function useCreateEscrow(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const escrowFactoryAddress = getContractAddress(chainId ?? 0, "escrowFactoryAddress");

  const createEscrowCalls = (
    depositAmount: bigint,
    endTime: bigint,
    paymentToken: string,
    decimals: number,
    oracle: string,
    oracleFee: number
  ) => {
    return [
      {
        abi: EscrowFactoryContract.abi,
        args: [
          depositAmount,
          endTime,
          paymentToken as `0x${string}`,
          decimals,
          oracle as `0x${string}`,
          oracleFee,
        ],
        functionName: "createEscrow",
        to: escrowFactoryAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createEscrowCalls,
  };
}
