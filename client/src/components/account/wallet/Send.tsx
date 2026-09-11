import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { formatUnits, isAddress, parseUnits } from "viem";
import { LoadingSpinnerSmall } from "../../common/LoadingSpinnerSmall";
import { useTransferTokens } from "../../../hooks/useTokenOperations";
import { useAuth } from "../../../contexts/AuthContext";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../../config/targetChain";
import { PAYMENT_TOKEN_DECIMALS } from "../../../lib/paymentTokenSpend";
import { BLOCKCHAIN_NETWORK } from "../../../lib/legalPlaceholders";
import { getSmartWalletsPaymasterConfig } from "../../../lib/privySmartWalletPaymaster";
import {
  AssetChips,
  walletSpecCtaClassName,
  walletSpecLabelClassName,
  walletSpecSecondaryClassName,
} from "./AssetChips";
import { formatAddressForDisplay, walletAddressWellClassName } from "./WalletAddressCopy";

export type SendProps = {
  /** Pre-fill recipient (e.g. admin support: target user wallet). */
  initialRecipientAddress?: string;
  /** If true, recipient field is read-only. */
  lockRecipient?: boolean;
};

const fieldClassName =
  "min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100";

function SendSpec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className={walletSpecLabelClassName}>{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

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

  const trimmedRecipient = recipientAddress.trim();

  return (
    <div className="space-y-4 font-display">
      <p className="text-sm leading-relaxed text-gray-700">
        Send {targetSymbol} to another player, wallet or exchange.
      </p>

      {isReviewing ? (
        <div className="flex flex-col gap-4">
          <AssetChips tokenSymbol={targetSymbol} networkLabel={networkLabel} flush />
          <SendSpec label="Amount">
            <p className="font-display text-sm font-medium tabular-nums leading-none text-gray-900">
              ${formattedAmount} {targetSymbol}
            </p>
          </SendSpec>
          <SendSpec label="To">
            <p className={walletAddressWellClassName} aria-label={trimmedRecipient}>
              {formatAddressForDisplay(trimmedRecipient)}
            </p>
          </SendSpec>
          {gasSponsored ? (
            <SendSpec label="Network fee">
              <p className="font-display text-sm font-medium leading-none text-gray-900">
                No network fee
              </p>
            </SendSpec>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AssetChips tokenSymbol={targetSymbol} networkLabel={networkLabel} flush />

          <SendSpec label="Available">
            <p className="font-display text-sm font-medium tabular-nums leading-none text-gray-900">
              {balancesUnavailable ? "—" : `$${formattedBalance(paymentBalance)} ${targetSymbol}`}
            </p>
          </SendSpec>

          <div>
            <label htmlFor="recipient" className={`${walletSpecLabelClassName} block`}>
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
              className={`${fieldClassName} mt-1.5 font-mono ${lockRecipient ? "bg-gray-50" : ""}`}
              placeholder={`0x… ${networkLabel} ${targetSymbol} address`}
            />
          </div>

          <div>
            <label htmlFor="send-amount" className={`${walletSpecLabelClassName} block`}>
              Amount ({targetSymbol})
            </label>
            <div className="mt-1.5 flex gap-2">
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

      <div className="flex flex-col gap-2">
        {isReviewing ? (
          <>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!isConnected || isProcessing || balancesUnavailable}
              className={walletSpecCtaClassName}
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
              className={walletSpecSecondaryClassName}
            >
              Back
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleReview}
            disabled={!isConnected || isProcessing || balancesUnavailable}
            className={walletSpecCtaClassName}
          >
            Review send
          </button>
        )}
      </div>
    </div>
  );
};
