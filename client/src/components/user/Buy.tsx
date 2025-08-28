import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSendCalls, useWaitForCallsStatus, useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits, parseUnits } from "viem";

import { depositManagerAddress, paymentTokenAddress } from "../../utils/contracts/sepolia.json";
import DepositManagerContract from "../../utils/contracts/DepositManager.json";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useTokenSymbol } from "../../utils/tokenUtils";
import { createTransactionLinkJSX } from "../../utils/blockchain";

export const Buy = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const navigate = useNavigate();

  // Buy form state
  const [buyAmount, setBuyAmount] = useState("");
  const [buyError, setBuyError] = useState<string | null>(null);

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

    try {
      setBuyError(null);

      // Convert amount to USDC units (6 decimals)
      const usdcAmount = parseUnits(buyAmount, 6);

      // Check if user has enough USDC
      if (usdcBalance && usdcBalance.value < usdcAmount) {
        setBuyError("Insufficient USDC balance");
        return;
      }

      // Execute the buy transaction with approval
      sendCalls({
        calls: [
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
        ],
      });
    } catch (error) {
      console.error("Error buying CUT tokens:", error);
      setBuyError("Failed to buy CUT tokens");
    }
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

  const isProcessing = isPending || isConfirming;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="space-y-4">
        {/* Available Balance */}
        <h3 className="text-lg font-semibold mb-4 text-green-600">
          Buy CUT Tokens using {paymentTokenSymbol || "USDC"}
        </h3>
        <div className="text-sm text-gray-600 mt-1">
          {/* USDC explanation */}
          <div className="text-sm font-medium text-gray-700">
            {paymentTokenSymbol || "USDC"} is a digital coin that is always worth one U.S. dollar.{" "}
            {paymentTokenSymbol || "USDC"} can be purchased using credit cards, bank transfers, and
            crypto options.{" "}
            <a
              href={`https://stg.id.porto.sh/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              Purchase USDC
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 inline ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Available {paymentTokenSymbol || "USDC"} Balance
          </div>
          <div className="text-lg font-semibold text-green-600 mb-2">
            ${formattedBalance(usdcBalance?.value ?? 0n, 6)} {paymentTokenSymbol || "USDC"}
          </div>

          <div className="text-sm font-medium text-gray-700 mb-1">Exchange Rate</div>
          <div className="text-lg font-semibold text-green-600 mb-2">
            1 CUT = 1 {paymentTokenSymbol || "USDC"} (1:1 ratio)
          </div>
        </div>
        <div>
          <label htmlFor="buy-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Buy ({paymentTokenSymbol || "USDC"})
          </label>
          <input
            id="buy-amount"
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder={`Enter ${paymentTokenSymbol || "USDC"} amount`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isProcessing}
          />
          {buyAmount && (
            <div className="text-sm text-gray-600 mt-1">
              You will receive {calculatePlatformTokenAmount()} CUT tokens
            </div>
          )}
        </div>
        {buyError && <div className="text-red-600 text-sm">{buyError}</div>}
        <button
          onClick={handleBuy}
          disabled={!isConnected || !buyAmount || isProcessing}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded inline-flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <LoadingSpinnerSmall />
              {isPending ? "Confirming..." : "Processing..."}
            </>
          ) : (
            "Buy CUT Tokens"
          )}
        </button>
      </div>

      {/* Transaction Status */}
      {sendError && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded mt-4">
          Transaction failed: {sendError.message}
        </div>
      )}

      {isConfirmed && (
        <div className="text-green-600 text-sm bg-green-50 p-3 rounded mt-4">
          <div className="mb-3">
            Transaction completed successfully!
            {transactionHash &&
              chainId &&
              createTransactionLinkJSX(transactionHash, chainId, "View Transaction", "mt-2 block")}
          </div>
          <button
            onClick={() => navigate("/user")}
            className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Back to Account
          </button>
        </div>
      )}
    </div>
  );
};
