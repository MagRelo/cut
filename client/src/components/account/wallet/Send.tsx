import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits, isAddress, parseUnits } from "viem";
import { LoadingSpinnerSmall } from "../../common/LoadingSpinnerSmall";
import { useTransferTokens } from "../../../hooks/useTokenOperations";
import { useAuth } from "../../../contexts/AuthContext";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../../config/targetChain";
import { PAYMENT_TOKEN_DECIMALS } from "../../../lib/paymentTokenSpend";
import { BLOCKCHAIN_NETWORK } from "../../../lib/legalPlaceholders";
import { getSmartWalletsPaymasterConfig } from "../../../lib/privySmartWalletPaymaster";

export type SendProps = {
  /** Pre-fill recipient (e.g. admin support: target user wallet). */
  initialRecipientAddress?: string;
  /** If true, recipient field is read-only. */
  lockRecipient?: boolean;
};

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const fieldClassName =
  "min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100";

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
  const targetSymbol = paymentTokenSymbol ?? defaultPaymentTokenSymbol();
  const showCexOfframp = !isTargetTestnet();
  const networkLabel = showCexOfframp ? BLOCKCHAIN_NETWORK : "Base Sepolia";
  const gasSponsored = "paymasterContext" in getSmartWalletsPaymasterConfig();

  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress ?? "");
  const [amount, setAmount] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

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
      setIsReviewing(false);
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

  const validateSend = (): boolean => {
    if (balancesUnavailable) {
      setSendError("Could not load your balances. Check your connection and try again.");
      return false;
    }

    if (!recipientAddress.trim()) {
      setSendError("Please enter a wallet address");
      return false;
    }

    if (!isAddress(recipientAddress.trim())) {
      setSendError("Please enter a valid wallet address");
      return false;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      setSendError("Please enter a valid amount");
      return false;
    }

    let amountBigInt: bigint;
    try {
      amountBigInt = parseUnits(amount, resolvedDecimals);
    } catch {
      setSendError("Please enter a valid amount");
      return false;
    }

    if (amountBigInt > paymentBalance) {
      setSendError("Insufficient balance");
      return false;
    }

    if (!paymentTokenAddress) {
      setSendError("Payment token is not configured");
      return false;
    }

    setSendError(null);
    return true;
  };

  const handleReview = () => {
    if (!validateSend()) return;
    setIsReviewing(true);
  };

  const handleSend = async () => {
    if (!validateSend()) return;

    try {
      const calls = createTransferCalls(recipientAddress.trim(), amount);
      await execute(calls);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const formattedBalance = (balance: bigint) =>
    Number(formatUnits(balance, resolvedDecimals)).toFixed(2);

  const formattedAmount = (() => {
    try {
      return Number(formatUnits(parseUnits(amount, resolvedDecimals), resolvedDecimals)).toFixed(2);
    } catch {
      return amount;
    }
  })();

  const reviewRowClass =
    "grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-3 py-2.5 text-sm";

  return (
    <div className="space-y-6 font-display">
      <div>
        {showCexOfframp ? (
          <p className="text-sm leading-relaxed text-gray-700">
            Send {targetSymbol} to another wallet, an exchange, or another player.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-gray-700">
            Send {targetSymbol} to another wallet.
          </p>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-600">Available</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
          {balancesUnavailable ? "—" : `$${formattedBalance(paymentBalance)} ${targetSymbol}`}
        </p>
      </div>

      {isReviewing ? (
        <div>
          <p className="mb-3 text-sm font-medium text-gray-900">Review send</p>
          <dl className="divide-y divide-gray-200 border-y border-gray-200">
            <div className={reviewRowClass}>
              <dt className="font-medium text-gray-600">Amount</dt>
              <dd className="min-w-0 font-semibold tabular-nums text-gray-900">
                ${formattedAmount} {targetSymbol}
              </dd>
            </div>
            <div className={reviewRowClass}>
              <dt className="font-medium text-gray-600">Network</dt>
              <dd className="min-w-0 font-semibold text-gray-900">{networkLabel}</dd>
            </div>
            <div className={reviewRowClass}>
              <dt className="font-medium text-gray-600">To</dt>
              <dd
                className="min-w-0 break-all font-mono text-sm text-gray-900"
                title={recipientAddress.trim()}
              >
                {truncateMiddle(recipientAddress.trim())}
              </dd>
            </div>
            {gasSponsored ? (
              <div className={reviewRowClass}>
                <dt className="font-medium text-gray-600">Network fee</dt>
                <dd className="min-w-0 text-gray-900">No network fee</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Check the address and network carefully. Once sent, this transfer usually can&apos;t be
            reversed.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label htmlFor="recipient" className="mb-1.5 block text-sm font-medium text-gray-700">
              Wallet address
            </label>
            <input
              id="recipient"
              type="text"
              value={recipientAddress}
              onChange={(e) => {
                setRecipientAddress(e.target.value);
                setSendError(null);
              }}
              readOnly={lockRecipient}
              className={`${fieldClassName} font-mono`}
              placeholder={`0x… ${networkLabel} ${targetSymbol} address`}
            />
          </div>

          <div>
            <label htmlFor="send-amount" className="mb-1.5 block text-sm font-medium text-gray-700">
              Amount ({targetSymbol})
            </label>
            <div className="flex gap-2">
              <input
                id="send-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSendError(null);
                }}
                className={fieldClassName}
              />
              <button
                type="button"
                onClick={handleMaxSend}
                className="min-h-11 shrink-0 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Max
              </button>
            </div>
          </div>
        </div>
      )}

      {(sendError || transactionError) && (
        <p className="text-sm text-red-600">{sendError || String(transactionError)}</p>
      )}

      {balancesUnavailable && (
        <p className="text-sm text-amber-800">
          Could not load balance.{" "}
          <button type="button" className="underline" onClick={() => void refetchBalances()}>
            Retry
          </button>
        </p>
      )}

      {isReviewing ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!isConnected || isProcessing || balancesUnavailable}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:min-w-[10rem]"
          >
            {(isSending || isProcessing) && <LoadingSpinnerSmall />}
            {isConfirmed ? "Sent!" : isFailed ? "Failed — try again" : `Send ${targetSymbol}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsReviewing(false);
              setSendError(null);
            }}
            disabled={isProcessing}
            className="min-h-11 w-full rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto sm:min-w-[10rem]"
          >
            Back
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleReview}
          disabled={!isConnected || isProcessing || balancesUnavailable}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:min-w-[10rem]"
        >
          Review send
        </button>
      )}
    </div>
  );
};
