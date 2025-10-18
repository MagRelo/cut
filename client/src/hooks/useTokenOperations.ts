import { useChainId } from "wagmi";
import { parseUnits } from "viem";
import { useBlockchainTransaction } from "./useBlockchainTransaction";
import { getContractAddress } from "../utils/blockchainUtils";
import DepositManagerContract from "../utils/contracts/DepositManager.json";
import PlatformTokenContract from "../utils/contracts/PlatformToken.json";

interface UseBlockchainTransactionOptions {
  onSuccess?: (data: any) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  onSettled?: () => void;
}

/**
 * Hook for buying platform tokens (CUT) using payment tokens (USDC)
 * Handles approval and deposit in a single transaction
 */
export function useBuyTokens(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  const createBuyCalls = (amount: string) => {
    const usdcAmount = parseUnits(amount, 6); // Payment token has 6 decimals

    return [
      // First approve the DepositManager to spend USDC
      {
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
        args: [depositManagerAddress as `0x${string}`, usdcAmount],
        functionName: "approve",
        to: paymentTokenAddress as `0x${string}`,
      },
      // Then buy CUT tokens with USDC (1:1 ratio)
      {
        abi: DepositManagerContract.abi,
        args: [usdcAmount],
        functionName: "depositUSDC",
        to: depositManagerAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createBuyCalls,
  };
}

/**
 * Hook for selling platform tokens (CUT) for payment tokens (USDC)
 */
export function useSellTokens(options?: UseBlockchainTransactionOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");

  const createSellCalls = (amount: string) => {
    const platformTokenAmount = parseUnits(amount, 18); // Platform token has 18 decimals

    return [
      {
        abi: DepositManagerContract.abi,
        args: [platformTokenAmount],
        functionName: "withdrawUSDC",
        to: depositManagerAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createSellCalls,
  };
}

interface UseTransferTokensOptions extends UseBlockchainTransactionOptions {
  tokenAddress?: string;
  tokenDecimals?: number;
}

/**
 * Hook for transferring tokens (CUT or USDC) to another address
 */
export function useTransferTokens(options?: UseTransferTokensOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

  // Use provided token address/decimals or default to platform token
  const tokenAddress = options?.tokenAddress || platformTokenAddress;
  const tokenDecimals = options?.tokenDecimals ?? 18;

  const createTransferCalls = (recipient: string, amount: string) => {
    const tokenAmount = parseUnits(amount, tokenDecimals);

    return [
      {
        abi: PlatformTokenContract.abi,
        args: [recipient, tokenAmount],
        functionName: "transfer",
        to: tokenAddress as `0x${string}`,
      },
    ];
  };

  return {
    ...transaction,
    createTransferCalls,
  };
}
