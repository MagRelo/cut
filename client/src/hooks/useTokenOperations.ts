import { useChainId } from "wagmi";
import { parseUnits } from "viem";
import { useBlockchainTransaction, type TransactionCall } from "./useBlockchainTransaction";
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

interface UseModeAwareTransferOptions extends UseBlockchainTransactionOptions {
  platformTokenAddress?: string;
  paymentTokenAddress?: string;
  platformTokenDecimals?: number;
  paymentTokenDecimals?: number;
}

type TransferMode = "internal" | "external";

/**
 * Build mode-aware transfer calls:
 * - internal: always send platform token (optionally convert payment token first)
 * - external: always send payment token (optionally convert platform token first)
 */
export function useModeAwareTransfer(options?: UseModeAwareTransferOptions) {
  const chainId = useChainId();
  const transaction = useBlockchainTransaction(options);

  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const platformTokenAddress =
    options?.platformTokenAddress || getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress =
    options?.paymentTokenAddress || getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const platformTokenDecimals = options?.platformTokenDecimals ?? 18;
  const paymentTokenDecimals = options?.paymentTokenDecimals ?? 6;

  const createModeAwareTransferCalls = ({
    mode,
    recipient,
    amount,
    platformTokenBalance,
    paymentTokenBalance,
  }: {
    mode: TransferMode;
    recipient: string;
    amount: string;
    platformTokenBalance: bigint;
    paymentTokenBalance: bigint;
  }): TransactionCall[] => {
    const calls: TransactionCall[] = [];

    if (mode === "internal") {
      const amountInPlatformUnits = parseUnits(amount, platformTokenDecimals);
      const platformDeficit =
        amountInPlatformUnits > platformTokenBalance ? amountInPlatformUnits - platformTokenBalance : 0n;

      if (platformDeficit > 0n) {
        // Convert just enough payment token (USDC) into platform token (CUT) at 1:1 value.
        const decimalScale = 10n ** BigInt(platformTokenDecimals - paymentTokenDecimals);
        const requiredPaymentAmount = (platformDeficit + decimalScale - 1n) / decimalScale;

        if (requiredPaymentAmount > paymentTokenBalance) {
          throw new Error("Insufficient combined balance");
        }

        calls.push(
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
            args: [depositManagerAddress as `0x${string}`, requiredPaymentAmount],
            functionName: "approve",
            to: paymentTokenAddress as `0x${string}`,
          },
          {
            abi: DepositManagerContract.abi,
            args: [requiredPaymentAmount],
            functionName: "depositUSDC",
            to: depositManagerAddress as `0x${string}`,
          },
        );
      }

      calls.push({
        abi: PlatformTokenContract.abi,
        args: [recipient, amountInPlatformUnits],
        functionName: "transfer",
        to: platformTokenAddress as `0x${string}`,
      });

      return calls;
    }

    const amountInPaymentUnits = parseUnits(amount, paymentTokenDecimals);
    const paymentDeficit =
      amountInPaymentUnits > paymentTokenBalance ? amountInPaymentUnits - paymentTokenBalance : 0n;

    if (paymentDeficit > 0n) {
      // Convert just enough platform token (CUT) into payment token (USDC) at 1:1 value.
      const requiredPlatformAmount = paymentDeficit * 10n ** BigInt(platformTokenDecimals - paymentTokenDecimals);

      if (requiredPlatformAmount > platformTokenBalance) {
        throw new Error("Insufficient combined balance");
      }

      calls.push({
        abi: DepositManagerContract.abi,
        args: [requiredPlatformAmount],
        functionName: "withdrawUSDC",
        to: depositManagerAddress as `0x${string}`,
      });
    }

    calls.push({
      abi: PlatformTokenContract.abi,
      args: [recipient, amountInPaymentUnits],
      functionName: "transfer",
      to: paymentTokenAddress as `0x${string}`,
    });

    return calls;
  };

  return {
    ...transaction,
    createModeAwareTransferCalls,
  };
}
