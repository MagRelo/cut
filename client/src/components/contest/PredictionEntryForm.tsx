import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";
import { simulateAddSecondaryPosition, type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { useAddPrediction } from "../../hooks/useSpectatorOperations";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

export interface PredictionEntryData {
  entryId: string;
  price: bigint;
  priceFormatted: string;
  balance: bigint;
  balanceFormatted: string;
  totalSupply: bigint;
  totalSupplyFormatted: string;
  positionSubsidy: bigint;
  positionSubsidyFormatted: string;
  impliedWinnings: bigint;
  impliedWinningsFormatted: string;
  hasPosition: boolean;
}

interface PredictionEntryFormProps {
  contest: Contest;
  entryId: string | null;
  entryData: PredictionEntryData[];
  secondaryPrizePoolFormatted: string;
  secondaryTotalFundsFormatted: string;
  /** On-chain snapshot for ContestCatalyst secondary math (undefined while loading). */
  poolSnapshot: SecondaryPoolSnapshot | undefined;
  onClose: () => void;
}

export const PredictionEntryForm: React.FC<PredictionEntryFormProps> = ({
  contest,
  entryId,
  entryData,
  poolSnapshot,
  onClose,
}) => {
  const { platformTokenBalance, paymentTokenBalance, user } = usePortoAuth();
  const [amount, setAmount] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);

  const selectedEntryInfo = useMemo(
    () => entryData.find((entry) => entry.entryId === entryId) ?? null,
    [entryData, entryId],
  );

  const metrics = useMemo(() => {
    if (!amount || Number.parseFloat(amount) <= 0 || !selectedEntryInfo || !poolSnapshot) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const positionAmount = Number.parseFloat(amount);
    if (!Number.isFinite(positionAmount) || positionAmount <= 0) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    let amountBigInt: bigint;
    try {
      amountBigInt = parseUnits(amount, 18);
    } catch {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const sim = simulateAddSecondaryPosition({
      amount: amountBigInt,
      entryShares: selectedEntryInfo.totalSupply,
      ...poolSnapshot,
    });

    if (sim.tokensToMint === 0n) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const newTotal = sim.newSecondaryTotalFunds;
    const newSupply = selectedEntryInfo.totalSupply + sim.tokensToMint;
    if (newSupply === 0n) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const potentialReturnWei = (sim.tokensToMint * newTotal) / newSupply;
    const potentialReturn = Number(formatUnits(potentialReturnWei, 18));
    const tokensReceived = Number(formatUnits(sim.tokensToMint, 18));
    const ownershipPercent =
      newSupply > 0n ? (Number(sim.tokensToMint) / Number(newSupply)) * 100 : 0;

    return { ownershipPercent, potentialReturn, tokensReceived };
  }, [amount, selectedEntryInfo, poolSnapshot]);

  const parsedAmount = Number.parseFloat(amount);
  const purchaseAmountDisplay =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : "0.00";

  // Concept: each share is worth $1 winnings if the entry wins.
  // Therefore, share "price" here is the cost per $1 of winnings:
  //   sharePrice = $paid / $winnings
  const sharesToPurchase = metrics.potentialReturn > 0 ? metrics.potentialReturn : 0;
  const sharePrice =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && metrics.potentialReturn > 0
      ? parsedAmount / metrics.potentialReturn
      : 0;

  const metricsReady = Boolean(poolSnapshot);

  useEffect(() => {
    setAmount("10");
    setError(null);
  }, [entryId, contest.id]);

  const { execute, isProcessing, createAddPredictionCalls } = useAddPrediction({
    onSuccess: async () => {
      setAmount("10");
      setError(null);
      onClose();
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!entryId) {
      setError("No entry selected");
      return;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      const amountBigInt = parseUnits(amount, 18);
      const calls = createAddPredictionCalls(
        contest.address,
        Number.parseInt(entryId, 10),
        amountBigInt,
        platformTokenBalance || 0n,
        paymentTokenBalance || 0n,
      );

      await execute(calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    }
  };

  if (!user) {
    return (
      <div className="space-y-2 h-[269px]">
        <form
          className="space-y-2 pointer-events-none opacity-55"
          aria-disabled="true"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-md p-3 space-y-2 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Share Price</span>
                <span className="font-bold text-gray-900 text-base">
                  {metricsReady ? `$${sharePrice.toFixed(2)}` : "—"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-700">Purchase Amount</span>
                <span className="font-bold text-gray-900 text-base">${purchaseAmountDisplay}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-700">Winnings if Entry Wins</span>
                <span className="font-bold text-green-600 text-base">
                  ${sharesToPurchase.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="position-amount-preview"
              className="block text-left text-sm font-medium text-gray-500 mb-2"
            >
              Purchase Amount
            </label>
            <input
              id="position-amount-preview"
              type="text"
              inputMode="decimal"
              value={amount}
              readOnly
              tabIndex={-1}
              placeholder="Enter amount"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              disabled
            />
          </div>
        </form>

        <Link
          to="/connect"
          className="flex w-full justify-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-display font-semibold transition-colors"
        >
          Connect
        </Link>
      </div>
    );
  }

  if (!selectedEntryInfo) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        Prediction data is unavailable for this entry.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 h-[269px]">
      {/* details */}
      <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-md p-3 space-y-2 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Share Price</span>
            <span className="font-bold text-gray-900 text-base">
              {metricsReady ? `$${sharePrice.toFixed(2)}` : "—"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700">Purchase Amount</span>
            <span className="font-bold text-gray-900 text-base">${purchaseAmountDisplay}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700">Winnings if Entry Wins</span>
            <span className="font-bold text-green-600 text-base">
              ${sharesToPurchase.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="position-amount"
          className="block text-left text-sm font-medium text-gray-500 mb-2"
        >
          Purchase Amount
        </label>
        <input
          id="position-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter amount"
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={isProcessing}
          autoFocus
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={
            secondaryActionsLocked ||
            isProcessing ||
            !amount ||
            Number.parseFloat(amount) <= 0 ||
            Boolean(
              platformTokenBalance &&
              paymentTokenBalance &&
              parseUnits(amount, 18) > platformTokenBalance &&
              parseUnits(amount, 6) > paymentTokenBalance,
            )
          }
          className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-display font-semibold transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinnerSmall />
              Placing...
            </span>
          ) : (
            "Buy Shares"
          )}
        </button>
      </div>

      {/* <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
        <p>
          <strong>Note:</strong> Payouts are calculated using live LMSR pricing. Actual payout
          depends on contest settlement.
        </p>
      </div> */}
    </form>
  );
};
