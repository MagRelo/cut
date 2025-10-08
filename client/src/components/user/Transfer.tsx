import { useState } from "react";
import { useSendCalls, useWaitForCallsStatus, useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits, parseEther } from "viem";
import PlatformToken from "../../utils/contracts/PlatformToken.json";
import { getContractAddress } from "../../utils/blockchainUtils.tsx";

export const Transfer = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const { data, isPending, sendCalls, error } = useSendCalls();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForCallsStatus({
    id: data?.id,
  });

  const platformTokenBalance = useBalance({
    address,
    token: platformTokenAddress as `0x${string}`,
  });

  const handleTransfer = async () => {
    if (!isConnected || !recipientAddress || !amount) {
      return;
    }

    try {
      const calls = [
        {
          abi: PlatformToken.abi,
          args: [recipientAddress, parseEther(amount)],
          functionName: "transfer",
          to: platformTokenAddress as `0x${string}`,
        },
      ];

      sendCalls({
        calls,
      });
    } catch (error) {
      console.error("Error sending transfer:", error);
    }
  };

  // round balance to 2 decimal points
  const formattedBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 18)).toFixed(2);
  };

  return (
    <>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Transfer CUT Tokens</h3>
          <p className="text-sm text-gray-600">
            Send CUT directly to another wallet address. This action cannot be undone.
          </p>
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
            disabled={!recipientAddress || !amount || isPending || isConfirming}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {isPending ? "Check Wallet..." : isConfirming ? "Processing..." : "Transfer CUT"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg mt-4">
          <div className="font-medium mb-1">
            {isConfirmed ? "Transfer Confirmed" : "Transaction failed"}
          </div>
          <div className="text-red-600">{error.message}</div>
        </div>
      )}

      {isConfirmed && !error && (
        <div className="text-sm bg-green-50 border border-green-200 p-4 rounded-lg mt-4">
          <div className="text-green-700 font-medium">Transfer completed successfully!</div>
        </div>
      )}
    </>
  );
};
