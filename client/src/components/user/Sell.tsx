import { useState } from "react";
import { useSendCalls, useWaitForCallsStatus, useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits, parseUnits } from "viem";

import DepositManagerContract from "../../utils/contracts/DepositManager.json";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import {
  useTokenSymbol,
  createTransactionLinkJSX,
  getContractAddress,
} from "../../utils/blockchainUtils.tsx";

export const Sell = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically
  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

  // Sell form state
  const [sellAmount, setSellAmount] = useState("");
  const [sellError, setSellError] = useState<string | null>(null);

  // Transaction state
  const { data, isPending, sendCalls, error: sendError } = useSendCalls();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: statusData, // This contains the receipts with transaction hashes
  } = useWaitForCallsStatus({
    id: data?.id,
  });

  // Extract transaction hash from receipts when confirmed
  const transactionHash = isConfirmed && statusData?.receipts?.[0]?.transactionHash;

  // Get payment token symbol
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

  // Get platform token balance
  const { data: platformTokenBalance } = useBalance({
    address,
    token: platformTokenAddress as `0x${string}`,
  });

  const handleSell = async () => {
    if (!isConnected || !sellAmount) {
      setSellError("Please enter an amount");
      return;
    }

    try {
      setSellError(null);

      // Convert amount to platform token units (18 decimals)
      const platformTokenAmount = parseUnits(sellAmount, 18);

      // Check if user has enough platform tokens
      if (platformTokenBalance && platformTokenBalance.value < platformTokenAmount) {
        setSellError("Insufficient platform token balance");
        return;
      }

      // Execute the sell transaction
      sendCalls({
        calls: [
          {
            abi: DepositManagerContract.abi,
            args: [platformTokenAmount],
            functionName: "withdrawUSDC",
            to: depositManagerAddress as `0x${string}`,
          },
        ],
      });
    } catch (error) {
      console.error("Error selling CUT tokens:", error);
      setSellError("Failed to sell CUT tokens");
    }
  };

  // Calculate payment token amount (1:1 ratio)
  const calculatePaymentTokenAmount = () => {
    if (!sellAmount) return "0";
    return sellAmount; // 1:1 ratio, so same amount
  };

  // Format balance to 2 decimal points
  const formattedBalance = (balance: unknown, decimals: number) => {
    if (!balance || typeof balance !== "bigint") return "0.00";
    return Number(formatUnits(balance, decimals)).toFixed(2);
  };

  const isProcessing = isPending || isConfirming;

  return (
    <>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">Sell CUT for USDC</h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
              <div className="text-xs font-medium text-gray-600 mb-1">Available Balance</div>
              <div className="text-lg font-semibold text-gray-800">
                {formattedBalance(platformTokenBalance?.value ?? 0n, 18)}
              </div>
              <div className="text-xs text-gray-500">CUT</div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
              <div className="text-xs font-medium text-gray-600 mb-1">Exchange Rate</div>
              <div className="text-lg font-semibold text-gray-800">1:1</div>
              <div className="text-xs text-gray-500">CUT to {paymentTokenSymbol || "USDC"}</div>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="sell-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount (CUT)
          </label>
          <input
            id="sell-amount"
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            disabled={isProcessing}
          />
          {sellAmount && (
            <div className="text-sm text-gray-600 mt-2 flex items-center gap-1">
              <span className="text-gray-500">→</span>
              You will receive{" "}
              <span className="font-semibold text-green-700">
                ${calculatePaymentTokenAmount()} {paymentTokenSymbol || "USDC"}
              </span>
            </div>
          )}
        </div>

        {sellError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {sellError}
          </div>
        )}

        <button
          onClick={handleSell}
          disabled={!isConnected || !sellAmount || isProcessing}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 px-4 rounded-lg inline-flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <LoadingSpinnerSmall />
              {isPending ? "Confirming..." : "Processing..."}
            </>
          ) : (
            "Sell CUT Tokens"
          )}
        </button>
      </div>

      {/* Transaction Status */}
      {sendError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg mt-4">
          <div className="font-medium mb-1">Transaction failed</div>
          <div className="text-red-600">{sendError.message}</div>
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
