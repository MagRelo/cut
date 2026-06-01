import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useTransferTokens } from "../../hooks/useTokenOperations";
import { useAuth } from "../../contexts/AuthContext";
import { PAYMENT_TOKEN_DECIMALS } from "../../lib/paymentTokenSpend";

export type SendProps = {
  /** Pre-fill recipient (e.g. admin support: target user wallet). */
  initialRecipientAddress?: string;
  /** If true, recipient field is read-only. */
  lockRecipient?: boolean;
};

export const Send = ({ initialRecipientAddress, lockRecipient = false }: SendProps) => {
  const { isConnected } = useAccount();
  const {
    paymentTokenBalance,
    paymentTokenAddress,
    paymentTokenSymbol,
    paymentTokenDecimals,
    balancesUnavailable,
    refetchBalances,
  } = useAuth();

  const resolvedDecimals = paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS;
  const paymentBalance = paymentTokenBalance ?? 0n;
  const targetSymbol = paymentTokenSymbol ?? "xUSDC";

  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress ?? "");
  const [amount, setAmount] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecipientAddress !== undefined) {
      setRecipientAddress(initialRecipientAddress);
    }
  }, [initialRecipientAddress]);

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
      setSendError(null);
    },
    onError: () => {
      setSendError(null);
    },
  });

  const handleMaxSend = () => {
    if (balancesUnavailable) return;
    setAmount(formatUnits(paymentBalance, resolvedDecimals));
    setSendError(null);
  };

  const handleSend = async () => {
    if (balancesUnavailable) {
      setSendError("Could not load your balances. Check your connection and try again.");
      return;
    }

    if (!recipientAddress.trim()) {
      setSendError("Please enter a recipient address");
      return;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      setSendError("Please enter a valid amount");
      return;
    }

    let amountBigInt: bigint;
    try {
      amountBigInt = parseUnits(amount, resolvedDecimals);
    } catch {
      setSendError("Please enter a valid amount");
      return;
    }

    if (amountBigInt > paymentBalance) {
      setSendError("Insufficient balance");
      return;
    }

    if (!paymentTokenAddress) {
      setSendError("Payment token is not configured");
      return;
    }

    setSendError(null);

    try {
      const calls = createTransferCalls(recipientAddress.trim(), amount);
      await execute(calls);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const formattedBalance = (balance: bigint) =>
    Number(formatUnits(balance, resolvedDecimals)).toFixed(2);

  return (
    <div className="space-y-4 font-display">
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Available</span>
          <span className="font-semibold text-gray-900 tabular-nums">
            {balancesUnavailable ? "—" : `$${formattedBalance(paymentBalance)} ${targetSymbol}`}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
          Recipient address
        </label>
        <input
          id="recipient"
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          readOnly={lockRecipient}
          className="w-full p-2 border rounded-md font-mono text-sm disabled:bg-gray-100"
          placeholder="0x..."
        />
      </div>

      <div>
        <label htmlFor="send-amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount ({targetSymbol})
        </label>
        <div className="flex gap-2">
          <input
            id="send-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 p-2 border rounded-md"
          />
          <button
            type="button"
            onClick={handleMaxSend}
            className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Max
          </button>
        </div>
      </div>

      {(sendError || transactionError) && (
        <p className="text-sm text-red-600">{sendError || String(transactionError)}</p>
      )}

      {balancesUnavailable && (
        <p className="text-sm text-amber-800">
          Could not load balance.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void refetchBalances()}
          >
            Retry
          </button>
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={!isConnected || isProcessing || balancesUnavailable}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(isSending || isProcessing) && <LoadingSpinnerSmall />}
        {isConfirmed ? "Sent!" : isFailed ? "Failed — try again" : `Send ${targetSymbol}`}
      </button>
    </div>
  );
};
