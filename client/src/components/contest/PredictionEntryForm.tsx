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
  /** Cumulative payment token deposited for this secondary position (18 decimals). */
  secondaryDepositedPerEntry: bigint;
  secondaryDepositedFormatted: string;
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
    const empty = {
      ownershipPercent: 0,
      tokensReceived: 0,
      impliedValueAfterPurchaseDisplay: "—" as string,
    };

    if (!amount || Number.parseFloat(amount) <= 0 || !selectedEntryInfo || !poolSnapshot) {
      return empty;
    }

    const positionAmount = Number.parseFloat(amount);
    if (!Number.isFinite(positionAmount) || positionAmount <= 0) {
      return empty;
    }

    let amountBigInt: bigint;
    try {
      amountBigInt = parseUnits(amount, 18);
    } catch {
      return empty;
    }

    const sim = simulateAddSecondaryPosition({
      amount: amountBigInt,
      entryShares: selectedEntryInfo.totalSupply,
      ...poolSnapshot,
    });

    if (sim.tokensToMint === 0n) {
      return { ...empty, impliedValueAfterPurchaseDisplay: "0.00" };
    }

    const newSupply = selectedEntryInfo.totalSupply + sim.tokensToMint;
    if (newSupply === 0n) {
      return empty;
    }

    const tokensReceived = Number(formatUnits(sim.tokensToMint, 18));
    const ownershipPercent =
      newSupply > 0n ? Number((sim.tokensToMint * 10000n) / newSupply) / 100 : 0;

    // Buy-only implied value: value only the newly minted shares from this purchase.
    const impliedAfter = (sim.tokensToMint * sim.newSecondaryTotalFunds) / newSupply;
    const impliedRaw = Number(formatUnits(impliedAfter, 18));
    const impliedValueAfterPurchaseDisplay = Number.isFinite(impliedRaw)
      ? impliedRaw.toFixed(2)
      : "—";

    return { ownershipPercent, tokensReceived, impliedValueAfterPurchaseDisplay };
  }, [amount, selectedEntryInfo, poolSnapshot]);

  const metricsReady = Boolean(poolSnapshot);

  const ownPercentAfterDisplay =
    metricsReady && selectedEntryInfo ? `${metrics.ownershipPercent.toFixed(2)}%` : "—";

  const impliedValueDisplay =
    metricsReady && selectedEntryInfo ? metrics.impliedValueAfterPurchaseDisplay : "—";

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

  const predictionDetailsCard = (
    <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm">
      <div className="space-y-2">
        {/* purchase amount  */}

        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-500">Purchase amount</span>
          <span className="text-gray-700 font-medium tabular-nums">${amount}</span>
        </div>

        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-500">% of Pool</span>
          <span className="text-gray-700 font-medium tabular-nums">{ownPercentAfterDisplay}</span>
        </div>

        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-500">Current Value</span>
          <span className="font-bold tabular-nums text-emerald-600">${impliedValueDisplay}</span>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="space-y-2">
        <form
          className="space-y-2 pointer-events-none opacity-55"
          aria-disabled="true"
          onSubmit={(event) => event.preventDefault()}
        >
          {predictionDetailsCard}

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
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-md bg-gray-50/80 text-gray-600 font-normal cursor-not-allowed"
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {predictionDetailsCard}

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
          className="w-full px-4 py-3 text-base border border-gray-200 rounded-md text-gray-700 font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-300"
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
