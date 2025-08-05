import { useState } from "react";
import { useSendCalls, useWaitForCallsStatus, useAccount, useBalance } from "wagmi";
import { formatUnits, parseEther } from "viem";
import { platformTokenAddress } from "../../utils/contracts/sepolia.json";
import PlatformToken from "../../utils/contracts/PlatformToken.json";

export const Transfer = () => {
  const { address, isConnected } = useAccount();

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
    <div className="">
      <p className="text-sm text-gray-700 mb-2">
        Use this form to transfer CUT directly to another user. This cannot be undone.
      </p>

      <hr className="my-4" />

      <div className="space-y-4">
        <div>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div className="font-medium">Available:</div>

            <div>
              {formattedBalance(platformTokenBalance.data?.value ?? 0n)}{" "}
              {platformTokenBalance.data?.symbol}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              step="0.01"
              max={formattedBalance(platformTokenBalance.data?.value ?? 0n)}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={handleTransfer}
              disabled={!recipientAddress || !amount || isPending || isConfirming}
              className="min-w-[120px] bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
            >
              {isPending ? "Check prompt" : isConfirming ? "Completing transfer" : "Transfer"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-gray-500 p-4 bg-white rounded-md border border-gray-200 mt-4">
          Status: {isConfirmed ? "Transfer Confirmed" : "Not Confirmed"} {error.message}
        </div>
      )}
    </div>
  );
};
