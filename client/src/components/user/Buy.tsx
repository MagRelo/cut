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

export const Buy = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically
  const depositManagerAddress = getContractAddress(chainId ?? 0, "depositManagerAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

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
    <>
      <div className="space-y-5">
        {/* Available Balance */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Buy CUT using {paymentTokenSymbol || "USDC"}
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
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
              {isPending ? "Confirming..." : "Processing..."}
            </>
          ) : (
            "Buy CUT Tokens"
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

      {/* Full Receipt Details */}
      {/* {isConfirmed && statusData && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="text-lg font-semibold mb-3 text-gray-800">Transaction Receipt Details</h4>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Transaction ID:</span>
              <span className="ml-2 text-sm font-mono text-gray-600">{data?.id}</span>
            </div>
            {statusData.receipts?.map((receipt, index) => (
              <div key={index} className="border-t pt-3">
                <h5 className="font-medium text-gray-700 mb-2">Receipt {index + 1}:</h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Transaction Hash:</span>
                    <span className="ml-2 font-mono text-gray-500 break-all">
                      {receipt.transactionHash}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Block Number:</span>
                    <span className="ml-2 font-mono text-gray-500">
                      {receipt.blockNumber?.toString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Gas Used:</span>
                    <span className="ml-2 font-mono text-gray-500">
                      {receipt.gasUsed?.toString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <span
                      className={`ml-2 ${
                        receipt.status === "success" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {receipt.status === "success" ? "Success" : "Failed"}
                    </span>
                  </div>
                  {receipt.logs && receipt.logs.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-600">Logs:</span>
                      <div className="mt-1 ml-2">
                        {receipt.logs.map((log, logIndex) => (
                          <div key={logIndex} className="text-xs font-mono text-gray-500 mb-1">
                            <div>Address: {log.address}</div>
                            <div>Topics: {log.topics?.join(", ")}</div>
                            <div>Data: {log.data}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-4 p-3 bg-white rounded border">
              <h6 className="font-medium text-gray-700 mb-2">Raw Status Data:</h6>
              <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(
                  statusData,
                  (key, value) => (typeof value === "bigint" ? value.toString() : value),
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )} */}
    </>
  );
};
