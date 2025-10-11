import { useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits, parseUnits } from "viem";

import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import {
  useTokenSymbol,
  createTransactionLinkJSX,
  getContractAddress,
} from "../../utils/blockchainUtils.tsx";
import { useBuyTokens } from "../../hooks/useTokenOperations";

export const Buy = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // Buy form state
  const [buyAmount, setBuyAmount] = useState("");
  const [buyError, setBuyError] = useState<string | null>(null);

  // Use centralized blockchain transaction hook
  const {
    execute,
    isProcessing,
    isSending,
    isConfirmed,
    isFailed,
    transactionHash,
    error: transactionError,
    createBuyCalls,
  } = useBuyTokens({
    onSuccess: () => {
      setBuyAmount("");
      setBuyError(null);
    },
    // Don't set local error state - let the hook handle error display
    onError: () => {
      setBuyError(null); // Clear any existing local errors
    },
  });

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: paymentTokenAddress as `0x${string}`,
  });

  // Get payment token symbol
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

  const handleBuy = async () => {
    if (!isConnected || !buyAmount) {
      setBuyError("Please enter an amount");
      return;
    }

    setBuyError(null);

    // Convert amount to USDC units (6 decimals)
    const usdcAmount = parseUnits(buyAmount, 6);

    // Check if user has enough USDC
    if (usdcBalance && usdcBalance.value < usdcAmount) {
      setBuyError("Insufficient USDC balance");
      return;
    }

    // Execute the buy transaction with approval
    const calls = createBuyCalls(buyAmount);
    await execute(calls);
  };

  // Calculate platform token amount (1:1 ratio)
  const calculatePlatformTokenAmount = () => {
    if (!buyAmount) return "0";
    return buyAmount; // 1:1 ratio, so same amount
  };

  // Format balance to 2 decimal points
  const formattedBalance = (balance: unknown, decimals: number) => {
    if (!balance || typeof balance !== "bigint") return "0.00";
    return Number(formatUnits(balance, decimals)).toFixed(2);
  };

  return (
    <>
      <div className="space-y-5">
        {/* Available Balance */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Buy CUT using {paymentTokenSymbol || "USDC"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
              <div className="text-xs font-medium text-gray-600 mb-1">Available Balance</div>
              <div className="text-lg font-semibold text-gray-800">
                ${formattedBalance(usdcBalance?.value ?? 0n, 6)}
              </div>
              <div className="text-xs text-gray-500">{paymentTokenSymbol || "USDC"}</div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
              <div className="text-xs font-medium text-gray-600 mb-1">Exchange Rate</div>
              <div className="text-lg font-semibold text-gray-800">1:1</div>
              <div className="text-xs text-gray-500">CUT to {paymentTokenSymbol || "USDC"}</div>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="buy-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount ({paymentTokenSymbol || "USDC"})
          </label>
          <input
            id="buy-amount"
            type="number"
            inputMode="decimal"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            disabled={isProcessing}
          />
          {buyAmount && (
            <div className="text-sm text-gray-600 mt-2 flex items-center gap-1">
              <span className="text-gray-500">→</span>
              You will receive{" "}
              <span className="font-semibold text-green-700">
                {calculatePlatformTokenAmount()} CUT
              </span>
            </div>
          )}
        </div>

        {buyError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {buyError}
          </div>
        )}

        <button
          onClick={handleBuy}
          disabled={!isConnected || !buyAmount || isProcessing}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 px-4 rounded-lg inline-flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <LoadingSpinnerSmall />
              {isSending ? "Confirming..." : "Processing..."}
            </>
          ) : (
            "Buy CUT Tokens"
          )}
        </button>
      </div>

      {/* Transaction Status */}
      {(transactionError || isFailed) && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg mt-4">
          <div className="font-medium mb-1">Transaction failed</div>
          <div className="text-red-600">
            {transactionError ||
              "The transaction was rejected or failed to execute. Please try again."}
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="text-sm bg-green-50 border border-green-200 p-4 rounded-lg mt-4">
          <div className="text-green-700 font-medium mb-2">Transaction completed successfully!</div>
          {transactionHash &&
            chainId &&
            createTransactionLinkJSX(
              transactionHash,
              chainId,
              "View Transaction",
              "text-green-600 hover:text-green-800 font-medium"
            )}
        </div>
      )}
    </>
  );
};
