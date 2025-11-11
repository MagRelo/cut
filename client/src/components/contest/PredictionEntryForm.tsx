import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseUnits } from "viem";
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
  onClose: () => void;
}

export const PredictionEntryForm: React.FC<PredictionEntryFormProps> = ({
  contest,
  entryId,
  entryData,
  secondaryPrizePoolFormatted,
  secondaryTotalFundsFormatted,
  onClose,
}) => {
  const { platformTokenBalance, paymentTokenBalance, user } = usePortoAuth();
  const [amount, setAmount] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);

  const selectedEntryInfo = useMemo(
    () => entryData.find((entry) => entry.entryId === entryId) ?? null,
    [entryData, entryId]
  );

  const parsedSecondaryTotalFunds = Number.parseFloat(secondaryTotalFundsFormatted);
  const parsedSecondaryPrizePool = Number.parseFloat(secondaryPrizePoolFormatted);

  const totalPrizePool = Number.isFinite(parsedSecondaryTotalFunds)
    ? parsedSecondaryTotalFunds
    : Number.isFinite(parsedSecondaryPrizePool)
    ? parsedSecondaryPrizePool
    : entryData.reduce((sum, entry) => {
        const supply = Number.parseFloat(entry.totalSupplyFormatted ?? "0");
        return sum + (Number.isFinite(supply) ? supply : 0);
      }, 0);

  const displayPrizePool = Number.isFinite(parsedSecondaryTotalFunds)
    ? secondaryTotalFundsFormatted
    : secondaryPrizePoolFormatted;

  const metrics = useMemo(() => {
    if (!amount || Number.parseFloat(amount) <= 0 || !selectedEntryInfo) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const positionAmount = Number.parseFloat(amount);
    const feePercentage = 0.15;
    const netPosition = positionAmount * (1 - feePercentage);

    const price = Number.parseFloat(selectedEntryInfo.priceFormatted);
    const currentSupply = Number.parseFloat(selectedEntryInfo.totalSupplyFormatted);

    const newPrizePool = totalPrizePool + netPosition;

    if (currentSupply === 0 || price === 0) {
      return {
        ownershipPercent: 100,
        potentialReturn: newPrizePool,
        tokensReceived: netPosition,
      };
    }

    const tokensReceived = netPosition / price;
    const newSupply = currentSupply + tokensReceived;

    if (newSupply <= 0) {
      return { ownershipPercent: 0, potentialReturn: 0, tokensReceived: 0 };
    }

    const ownershipPercent = (tokensReceived / newSupply) * 100;
    const potentialReturn = (tokensReceived / newSupply) * newPrizePool;

    return { ownershipPercent, potentialReturn, tokensReceived };
  }, [amount, selectedEntryInfo, totalPrizePool]);

  const parsedAmount = Number.parseFloat(amount);
  const purchaseAmountDisplay =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : "0.00";
  const tokensReceivedDisplay =
    Number.isFinite(metrics.tokensReceived) && metrics.tokensReceived > 0
      ? metrics.tokensReceived >= 1
        ? metrics.tokensReceived.toFixed(2)
        : metrics.tokensReceived.toFixed(4)
      : "0";
  const ownershipPercentDisplay =
    Number.isFinite(metrics.ownershipPercent) && metrics.ownershipPercent > 0
      ? `${metrics.ownershipPercent.toFixed(2)}%`
      : "0%";
  const potentialReturnDisplay =
    Number.isFinite(metrics.potentialReturn) && metrics.potentialReturn > 0
      ? metrics.potentialReturn.toFixed(2)
      : "0.00";
  const approximateOddsRatio =
    Number.isFinite(metrics.potentialReturn) &&
    metrics.potentialReturn > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0
      ? metrics.potentialReturn / parsedAmount
      : 0;
  const approximateOddsDisplay =
    approximateOddsRatio > 0 ? Math.max(1, Math.round(approximateOddsRatio)).toString() : "0";

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
        paymentTokenBalance || 0n
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
        <div className="rounded-md border border-emerald-00 bg-emerald-50 p-4 text-sm text-emerald-700">
          {/* title */}
          <h3 className="text-lg font-semibold font-display mb-2">Winner Outcome Market</h3>

          {/* Instuctions/examples */}
          <p className="mb-2 leading-relaxed">
            <span className="font-semibold text-emerald-700">${purchaseAmountDisplay}</span> can buy{" "}
            {tokensReceivedDisplay} shares in this outcome (
            <span className="font-semibold text-emerald-700">{ownershipPercentDisplay}</span> of the
            supply).
          </p>
          <p className="mb-2 leading-relaxed">
            {" "}
            If this entry wins, you would receive{" "}
            <span className="font-semibold text-emerald-700">{ownershipPercentDisplay}</span> of the
            total prize pool (<span className="text-emerald-700">${displayPrizePool}</span>),
            currently worth{" "}
            <span className="font-semibold text-emerald-700">
              ${potentialReturnDisplay} (~{approximateOddsDisplay}x)
            </span>
          </p>
          <p>
            <Link to="/connect" className="text-emerald-700 font-semibold underline">
              Sign In
            </Link>{" "}
            to purchase shares.
          </p>
        </div>
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

      {/* details */}
      <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-md p-3 space-y-2 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Purchase Amount</span>
            <span className="font-bold text-gray-900 text-base">${amount || "0"}</span>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Pool Share Value</span>
              <span className="font-bold text-green-600 text-base">
                ~${metrics.potentialReturn > 0 ? metrics.potentialReturn.toFixed(2) : "0"}
              </span>
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-200 pt-1 mt-2">
              <p>
                <strong>Note:</strong> Final payouts are calculated based on overall participant
                activity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {amount && Number.parseFloat(amount) > 0 && (
        <div className="text-xs">
          {platformTokenBalance && parseUnits(amount, 18) > platformTokenBalance ? (
            paymentTokenBalance && parseUnits(amount, 6) <= paymentTokenBalance ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-700">
                Insufficient CUT tokens. Will automatically swap from USDC.
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700">
                Insufficient balance. Please add funds to continue.
              </div>
            )
          ) : null}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-display font-semibold transition-colors"
          disabled={isProcessing}
        >
          Cancel
        </button>
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
                parseUnits(amount, 6) > paymentTokenBalance
            )
          }
          className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-display font-semibold transition-colors"
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
