import { useState } from "react";
import {
  useSendCalls,
  useWaitForCallsStatus,
  useAccount,
  useBalance,
  useReadContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";

import {
  platformTokenAddress,
  tokenManagerAddress,
  paymentTokenAddress,
} from "../../utils/contracts/sepolia.json";
import TokenManagerContract from "../../utils/contracts/TokenManager.json";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

export const TokenManagerWithdraw = () => {
  const { address, isConnected } = useAccount();

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositError, setDepositError] = useState<string | null>(null);

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

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: paymentTokenAddress as `0x${string}`,
  });

  // Get token manager exchange rate
  const {
    data: exchangeRate,
    // error: exchangeRateError,
    // isLoading: exchangeRateLoading,
  } = useReadContract({
    address: tokenManagerAddress as `0x${string}`,
    abi: TokenManagerContract.abi,
    functionName: "getExchangeRate",
  });

  // Get token manager balance
  // const {
  //   data: tokenManagerBalance,
  //   error: tokenManagerBalanceError,
  //   isLoading: tokenManagerBalanceLoading,
  // } = useReadContract({
  //   address: tokenManagerAddress as `0x${string}`,
  //   abi: TokenManagerContract.abi,
  //   functionName: "getTokenManagerBalance",
  // });

  const handleDeposit = async () => {
    if (!isConnected || !depositAmount) {
      setDepositError("Please enter an amount");
      return;
    }

    try {
      setDepositError(null);

      // Convert amount to USDC units (6 decimals)
      const usdcAmount = parseUnits(depositAmount, 6);

      // Check if user has enough USDC
      if (usdcBalance && usdcBalance.value < usdcAmount) {
        setDepositError("Insufficient USDC balance");
        return;
      }

      // Execute the deposit transaction with approval
      sendCalls({
        calls: [
          // First approve the Token Manager to spend USDC
          {
            abi: [
              {
                type: "function",
                name: "approve",
                inputs: [
                  { name: "spender", type: "address" },
                  { name: "amount", type: "uint256" },
                ],
                outputs: [{ name: "", type: "bool" }],
                stateMutability: "nonpayable",
              },
            ],
            args: [tokenManagerAddress as `0x${string}`, usdcAmount],
            functionName: "approve",
            to: paymentTokenAddress as `0x${string}`,
          },
          // Then deposit USDC to Token Manager
          {
            abi: TokenManagerContract.abi,
            args: [usdcAmount],
            functionName: "depositUSDC",
            to: tokenManagerAddress as `0x${string}`,
          },
        ],
      });
    } catch (error) {
      console.error("Error depositing to token manager:", error);
      setDepositError("Failed to deposit to token manager");
    }
  };

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

      // Execute the withdrawal transaction
      sendCalls({
        calls: [
          {
            abi: TokenManagerContract.abi,
            args: [platformTokenAmount],
            functionName: "withdrawUSDC",
            to: tokenManagerAddress as `0x${string}`,
          },
        ],
      });
    } catch (error) {
      console.error("Error withdrawing from token manager:", error);
      setWithdrawError("Failed to withdraw from token manager");
    }
  };

  // Calculate platform token amount based on exchange rate (for deposit)
  const calculatePlatformTokenAmount = () => {
    if (!depositAmount || !exchangeRate) return "0";
    try {
      // Since exchange rate is 1, 1 USDC = 1 CUT
      // But we need to account for different decimals: USDC (6) vs CUT (18)
      const usdcAmount = parseUnits(depositAmount, 6);
      // Convert USDC amount to CUT amount (multiply by 10^12 to account for decimal difference)
      const platformTokenAmount = usdcAmount * parseUnits("1", 12); // 18 - 6 = 12
      return formatUnits(platformTokenAmount, 18);
    } catch {
      return "0";
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
  const formattedBalance = (balance: bigint, decimals: number) => {
    return Number(formatUnits(balance, decimals)).toFixed(2);
  };

  const isProcessing = isPending || isConfirming;

  return (
    <div className="space-y-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Column */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600">Deposit USDC → Get CUT</h3>

          <div className="space-y-4">
            {/* Available Balance */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Available USDC Balance</div>
              <div className="text-lg font-semibold text-green-600">
                {formattedBalance(usdcBalance?.value ?? 0n, 6)} USDC
                <div className="text-sm text-gray-600 mt-1">
                  <a
                    href={`https://stg.id.porto.sh/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <div className="flex items-center gap-1">
                      Add Funds
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
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
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="deposit-amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                USDC Amount to Deposit
              </label>
              <input
                id="deposit-amount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter USDC amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isProcessing}
              />
              {depositAmount && (
                <div className="text-sm text-gray-600 mt-1">
                  You will receive approximately {calculatePlatformTokenAmount()} CUT
                </div>
              )}
            </div>

            {depositError && <div className="text-red-600 text-sm">{depositError}</div>}

            <button
              onClick={handleDeposit}
              disabled={!isConnected || !depositAmount || isProcessing}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded inline-flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinnerSmall />
                  {isPending ? "Confirming..." : "Processing..."}
                </>
              ) : (
                "Deposit USDC"
              )}
            </button>
          </div>
        </div>

        {/* Withdraw Column */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">Withdraw CUT → Get USDC</h3>

          <div className="space-y-4">
            {/* Available Balance */}
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Available CUT Balance</div>
              <div className="text-lg font-semibold text-blue-600">
                {formattedBalance(platformTokenBalance?.value ?? 0n, 18)} CUT
              </div>
            </div>

            <div>
              <label
                htmlFor="withdraw-amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                CUT Amount to Withdraw
              </label>
              <input
                id="withdraw-amount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter CUT amount"
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
        </div>
      </div>

      {/* Transaction Status */}
      {sendError && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
          Transaction failed: {sendError.message}
        </div>
      )}

      {isConfirmed && (
        <div className="text-green-600 text-sm bg-green-50 p-3 rounded">
          Transaction completed successfully!
        </div>
      )}
    </div>
  );
};
