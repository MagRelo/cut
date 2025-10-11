import { useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { getContractAddress } from "../../utils/blockchainUtils.tsx";
import { useTransferTokens } from "../../hooks/useTokenOperations";

export const Transfer = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

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
    onSuccess: () => {
      setRecipientAddress("");
      setAmount("");
    },
    // Don't set local error state - let the hook handle error display
    onError: () => {
      // Clear any existing local errors - let hook handle display
    },
  });

  const platformTokenBalance = useBalance({
    address,
    token: platformTokenAddress as `0x${string}`,
  });

  const handleTransfer = async () => {
    if (!isConnected || !recipientAddress || !amount) {
      return;
    }

    const calls = createTransferCalls(recipientAddress, amount);
    await execute(calls);
  };

  // round balance to 2 decimal points
  const formattedBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 18)).toFixed(2);
  };

  return (
    <>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Transfer CUT</h3>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 rounded-lg border border-gray-200/50">
          <div className="text-xs font-medium text-gray-600 mb-1">Available Balance</div>
          <div className="text-lg font-semibold text-gray-800">
            {formattedBalance(platformTokenBalance.data?.value ?? 0n)}
          </div>
          <div className="text-xs text-gray-500">{platformTokenBalance.data?.symbol}</div>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (CUT)</label>
            <input
              type="number"
              value={amount}
              step="0.01"
              max={formattedBalance(platformTokenBalance.data?.value ?? 0n)}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={handleTransfer}
            disabled={!recipientAddress || !amount || isProcessing}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {isSending ? "Check Wallet..." : isProcessing ? "Processing..." : "Transfer CUT"}
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
          <div className="text-green-700 font-medium">Transfer completed successfully!</div>
        </div>
      )}
    </>
  );
};
