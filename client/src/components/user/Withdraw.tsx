import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useSendCalls,
  useWaitForCallsStatus,
  useAccount,
  useBalance,
  useReadContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";

import { platformTokenAddress, treasuryAddress } from "../../utils/contracts/sepolia.json";
import TreasuryContract from "../../utils/contracts/Treasury.json";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

export const Withdraw = () => {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Transaction state
  const { data, isPending, sendCalls, error: sendError } = useSendCalls();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForCallsStatus({
    id: data?.id,
  });

  // Get platform token balance
  const { data: platformTokenBalance } = useBalance({
    address,
    token: platformTokenAddress as `0x${string}`,
  });

  // Get treasury exchange rate
  const { data: exchangeRate } = useReadContract({
    address: treasuryAddress as `0x${string}`,
    abi: TreasuryContract.abi,
    functionName: "getExchangeRate",
  });

  const handleWithdraw = async () => {
    if (!isConnected || !withdrawAmount) {
      setWithdrawError("Please enter an amount");
      return;
    }

    try {
      setWithdrawError(null);

      // Convert amount to platform token units (18 decimals)
      const platformTokenAmount = parseUnits(withdrawAmount, 18);

      // Check if user has enough platform tokens
      if (platformTokenBalance && platformTokenBalance.value < platformTokenAmount) {
        setWithdrawError("Insufficient platform token balance");
        return;
      }

      // Execute the withdraw transaction
      sendCalls({
        calls: [
          {
            abi: TreasuryContract.abi,
            args: [platformTokenAmount],
            functionName: "withdrawUSDC",
            to: treasuryAddress as `0x${string}`,
          },
        ],
      });
    } catch (error) {
      console.error("Error withdrawing from treasury:", error);
      setWithdrawError("Failed to withdraw from treasury");
    }
  };

  // Calculate USDC amount based on exchange rate (for withdraw)
  const calculateUSDCAmount = () => {
    if (!withdrawAmount || !exchangeRate) return "0";
    try {
      // Since exchange rate is 1, 1 CUT = 1 USDC
      // But we need to account for different decimals: CUT (18) vs USDC (6)
      const platformTokenAmount = parseUnits(withdrawAmount, 18);
      // Convert CUT amount to USDC amount (divide by 10^12 to account for decimal difference)
      const usdcAmount = platformTokenAmount / parseUnits("1", 12); // 18 - 6 = 12
      return formatUnits(usdcAmount, 6); // USDC has 6 decimals
    } catch {
      return "0";
    }
  };

  // Format balance to 2 decimal points
  const formattedBalance = (balance: unknown, decimals: number) => {
    if (!balance || typeof balance !== "bigint") return "0.00";
    return Number(formatUnits(balance, decimals)).toFixed(2);
  };

  const isProcessing = isPending || isConfirming;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-blue-600">Withdraw</h3>

      <div className="space-y-4">
        {/* Available Balance */}
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-700 mb-1">Available Balance</div>
          <div className="text-lg font-semibold text-blue-600 mb-2">
            ${formattedBalance(platformTokenBalance?.value ?? 0n, 18)}
          </div>
        </div>

        <div>
          <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Withdraw
          </label>
          <input
            id="withdraw-amount"
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          {withdrawAmount && (
            <div className="text-sm text-gray-600 mt-1">
              You will receive approximately ${calculateUSDCAmount()} USDC
            </div>
          )}
        </div>

        {withdrawError && <div className="text-red-600 text-sm">{withdrawError}</div>}

        <button
          onClick={handleWithdraw}
          disabled={!isConnected || !withdrawAmount || isProcessing}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded inline-flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <LoadingSpinnerSmall />
              {isPending ? "Confirming..." : "Processing..."}
            </>
          ) : (
            "Withdraw USDC"
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
          Transaction completed successfully!
          <button
            onClick={() => navigate("/user")}
            className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Back to User
          </button>
        </div>
      )}
    </div>
  );
};
