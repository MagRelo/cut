import { useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { getContractAddress, useTokenSymbol } from "../../utils/blockchainUtils.tsx";
import { useTransferTokens } from "../../hooks/useTokenOperations";

interface SendProps {
  tokenName?: "CUT" | "USDC";
}

export const Send = ({ tokenName = "CUT" }: SendProps) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically based on token type
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // Select the appropriate token address and decimals based on tokenName
  const tokenAddress = tokenName === "USDC" ? paymentTokenAddress : platformTokenAddress;
  const tokenDecimals = tokenName === "USDC" ? 6 : 18;

  // Get token symbol from contract
  const { data: tokenSymbol } = useTokenSymbol(tokenAddress as string);

  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  // Use centralized blockchain transaction hook
  const {
    execute,
    isProcessing,
    isSending,
    isConfirmed,
    isFailed,
    error: transactionError,
    createTransferCalls,
  } = useTransferTokens({
    tokenAddress: tokenAddress as string,
    tokenDecimals,
    onSuccess: () => {
      setRecipientAddress("");
      setAmount("");
    },
    // Don't set local error state - let the hook handle error display
    onError: () => {
      // Clear any existing local errors - let hook handle display
    },
  });

  const tokenBalance = useBalance({
    address,
    token: tokenAddress as `0x${string}`,
  });

  const handleMaxSend = () => {
    if (tokenBalance.data) {
      const maxAmount = formatUnits(tokenBalance.data.value, tokenDecimals);
      setAmount(maxAmount);
    }
  };

  const handleSend = async () => {
    if (!isConnected || !recipientAddress || !amount) {
      return;
    }

    const calls = createTransferCalls(recipientAddress, amount);
    await execute(calls);
  };

  // round balance to 2 decimal points
  const formattedBalance = (balance: bigint) => {
    return Number(formatUnits(balance, tokenDecimals)).toFixed(2);
  };

  const displaySymbol = tokenSymbol || tokenBalance.data?.symbol || tokenName;

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800 mb-3">Send {displaySymbol}</h3>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
          <div className="text-xs font-medium text-gray-600 mb-1">Available Balance</div>
          <div className="text-lg font-semibold text-gray-800">
            {formattedBalance(tokenBalance.data?.value ?? 0n)}
          </div>
          <div className="text-xs text-gray-500">{displaySymbol}</div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ({displaySymbol})
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                step="0.01"
                max={formattedBalance(tokenBalance.data?.value ?? 0n)}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={handleMaxSend}
                disabled={isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={!recipientAddress || !amount || isProcessing}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 px-4 rounded-lg inline-flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {isProcessing ? (
              <>
                <LoadingSpinnerSmall />
                {isSending ? "Confirming..." : "Processing..."}
              </>
            ) : (
              `Send ${displaySymbol}`
            )}
          </button>
        </div>
      </div>

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
          <div className="text-green-700 font-medium">Send completed successfully!</div>
        </div>
      )}
    </>
  );
};
