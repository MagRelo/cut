import { useEffect, useMemo, useState } from "react";
import { Tab, TabGroup, TabList } from "@headlessui/react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useModeAwareTransfer } from "../../hooks/useTokenOperations";
import { useAuth } from "../../contexts/AuthContext";

type SendMode = "internal" | "external";
const ENABLE_EXTERNAL_SEND = false;

export type SendProps = {
  /** Pre-fill recipient (e.g. admin support: target user wallet). */
  initialRecipientAddress?: string;
  /** If true, recipient field is read-only. */
  lockRecipient?: boolean;
};

export const Send = ({ initialRecipientAddress, lockRecipient = false }: SendProps) => {
  const { isConnected } = useAccount();
  const {
    platformTokenBalance,
    paymentTokenBalance,
    platformTokenAddress,
    paymentTokenAddress,
    platformTokenSymbol,
    paymentTokenSymbol,
    platformTokenDecimals,
    paymentTokenDecimals,
    balancesUnavailable,
    refetchBalances,
  } = useAuth();

  const resolvedPlatformDecimals = platformTokenDecimals ?? 18;
  const resolvedPaymentDecimals = paymentTokenDecimals ?? 6;
  const platformBalance = platformTokenBalance ?? 0n;
  const paymentBalance = paymentTokenBalance ?? 0n;
  const decimalScale = 10n ** BigInt(resolvedPlatformDecimals - resolvedPaymentDecimals);

  const [mode, setMode] = useState<SendMode>("internal");
  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress ?? "");
  const [amount, setAmount] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecipientAddress !== undefined) {
      setRecipientAddress(initialRecipientAddress);
    }
  }, [initialRecipientAddress]);

  const targetDecimals = mode === "internal" ? resolvedPlatformDecimals : resolvedPaymentDecimals;
  const targetSymbol =
    mode === "internal" ? (platformTokenSymbol ?? "CUT") : (paymentTokenSymbol ?? "USDC");

  const maxAmountInTargetUnits = useMemo(() => {
    if (mode === "internal") {
      return platformBalance + paymentBalance * decimalScale;
    }
    return paymentBalance + platformBalance / decimalScale;
  }, [mode, platformBalance, paymentBalance, decimalScale]);

  const {
    execute,
    isProcessing,
    isSending,
    isConfirmed,
    isFailed,
    error: transactionError,
    createModeAwareTransferCalls,
  } = useModeAwareTransfer({
    platformTokenAddress: platformTokenAddress as string,
    paymentTokenAddress: paymentTokenAddress as string,
    platformTokenDecimals: resolvedPlatformDecimals,
    paymentTokenDecimals: resolvedPaymentDecimals,
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
    setAmount(formatUnits(maxAmountInTargetUnits, targetDecimals));
    setSendError(null);
  };

  const handleSend = async () => {
    if (!ENABLE_EXTERNAL_SEND && mode === "external") {
      setSendError("External send is currently unavailable");
      return;
    }

    if (balancesUnavailable) {
      setSendError("Could not load your balances. Check your connection and try again.");
      return;
    }

    if (!isConnected || !recipientAddress || !amount) {
      setSendError("Please enter a valid recipient and amount");
      return;
    }

    if (!(recipientAddress.startsWith("0x") && recipientAddress.length === 42)) {
      setSendError("Recipient must be a valid wallet address");
      return;
    }

    let amountInTargetUnits: bigint;
    try {
      amountInTargetUnits = parseUnits(amount, targetDecimals);
    } catch {
      setSendError("Please enter a valid amount");
      return;
    }

    if (amountInTargetUnits <= 0n) {
      setSendError("Amount must be greater than 0");
      return;
    }

    if (amountInTargetUnits > maxAmountInTargetUnits) {
      setSendError("Insufficient combined balance");
      return;
    }

    setSendError(null);
    let calls;
    try {
      calls = createModeAwareTransferCalls({
        mode,
        recipient: recipientAddress,
        amount,
        platformTokenBalance: platformBalance,
        paymentTokenBalance: paymentBalance,
      });
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Unable to prepare transfer");
      return;
    }
    await execute(calls);
  };

  const formattedBalance = (balance: bigint, decimals: number) => {
    return Number(formatUnits(balance, decimals)).toFixed(2);
  };

  const modeTitle = mode === "internal" ? "Player-to-Player Transfer" : "Offramp to exchange";
  const modeCopy =
    mode === "internal"
      ? `You can send funds to another player at any time. Be sure to confirm the details before sending.`
      : `You can withdraw funds to your exchange account. Be sure to confirm the details before withdrawing.`;
  const selectedTabIndex = !ENABLE_EXTERNAL_SEND ? 0 : mode === "internal" ? 0 : 1;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {ENABLE_EXTERNAL_SEND ? (
            <TabGroup
              selectedIndex={selectedTabIndex}
              onChange={(index) => {
                if (!ENABLE_EXTERNAL_SEND) {
                  setMode("internal");
                } else {
                  setMode(index === 0 ? "internal" : "external");
                }
                setAmount("");
                setSendError(null);
              }}
            >
              <TabList className="flex space-x-1 border-b border-gray-200 px-4">
                <Tab
                  className={({ selected }: { selected: boolean }) =>
                    `w-full py-2 text-sm font-display leading-5 focus:outline-none ${
                      selected
                        ? "border-b-2 border-blue-600 text-blue-700"
                        : "text-gray-600 hover:text-gray-800"
                    }`
                  }
                >
                  External
                </Tab>
              </TabList>
            </TabGroup>
          ) : null}

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-800">{modeTitle}</h3>
            <p className="text-sm text-gray-600 font-display">{modeCopy}</p>
          </div>

          <div className="overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-tl from-blue-100 via-blue-50 to-white shadow-sm font-display">
            <div className="border-b border-blue-200 bg-blue-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                Total Available
              </div>
            </div>
            <div className="space-y-0.5 p-3">
              <div className="text-lg font-semibold tabular-nums text-gray-900">
                {balancesUnavailable ? (
                  <span className="text-amber-900/90">
                    —{" "}
                    <button
                      type="button"
                      onClick={() => void refetchBalances()}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Retry
                    </button>
                  </span>
                ) : (
                  formattedBalance(maxAmountInTargetUnits, targetDecimals)
                )}
              </div>
              <div className="text-xs text-blue-800/80">{targetSymbol}</div>
              <div className="text-xs text-gray-600 mt-1">
                {balancesUnavailable ? (
                  <span className="text-amber-900/90">Breakdown unavailable</span>
                ) : (
                  <>
                    {formattedBalance(platformBalance, resolvedPlatformDecimals)}{" "}
                    {platformTokenSymbol || "CUT"} +{" "}
                    {formattedBalance(paymentBalance, resolvedPaymentDecimals)}{" "}
                    {paymentTokenSymbol || "USDC"}
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account ID</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => {
                if (!lockRecipient) setRecipientAddress(e.target.value);
              }}
              readOnly={lockRecipient}
              aria-readonly={lockRecipient}
              placeholder="0x..."
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-mono text-sm ${
                lockRecipient ? "bg-gray-50 cursor-not-allowed" : ""
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ({targetSymbol})
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                step="0.01"
                max={formattedBalance(maxAmountInTargetUnits, targetDecimals)}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={handleMaxSend}
                disabled={isProcessing || balancesUnavailable}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-gray-700 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>

          {sendError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {sendError}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!recipientAddress || !amount || isProcessing || balancesUnavailable}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 px-4 rounded-lg inline-flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {isProcessing ? (
              <>
                <LoadingSpinnerSmall />
                {isSending ? "Confirming..." : "Processing..."}
              </>
            ) : (
              `Send ${targetSymbol}`
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
