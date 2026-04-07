import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { formatUnits, parseUnits } from "viem";

/** Matches `useSpectatorOperations` / `createAddPredictionCalls` funding rules. */
function canCoverSecondaryPurchase(
  purchaseAmountWei: bigint,
  platformTokenBalance: bigint,
  paymentTokenBalance: bigint,
): boolean {
  if (purchaseAmountWei <= 0n) return false;
  if (platformTokenBalance >= purchaseAmountWei) return true;
  const platformShortfall = purchaseAmountWei - platformTokenBalance;
  const human = formatUnits(platformShortfall, 18);
  const paymentNeeded = parseUnits(human, 6);
  return paymentTokenBalance >= paymentNeeded;
}
import { simulateAddSecondaryPosition, type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { useAuth } from "../../contexts/AuthContext";
import { useAddPrediction } from "../../hooks/useSpectatorOperations";
import type { BatchTransactionStatusData } from "../../hooks/useBlockchainTransaction";
import apiClient from "../../utils/apiClient";
import { incrementalGlobalClaimDelta } from "../../utils/secondaryPurchasePreview";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

export interface PredictionEntryData {
  entryId: string;
  price: bigint;
  priceFormatted: string;
  balance: bigint;
  balanceFormatted: string;
  totalSupply: bigint;
  totalSupplyFormatted: string;
  /** Liquidity backing this entry's secondary side (from `secondaryLiquidityPerEntry(entryId)`). */
  entryLiquidity: bigint;
  entryLiquidityFormatted: string;
  /** Cumulative payment token deposited for this secondary position (18 decimals). */
  secondaryDepositedPerEntry: bigint;
  secondaryDepositedFormatted: string;
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
  /** Contest-wide sum of secondary liquidity (`totalSecondaryLiquidity()`) before this purchase. */
  totalSecondaryLiquidityBefore: bigint | undefined;
  /** On-chain snapshot for ContestCatalyst secondary math (undefined while loading). */
  poolSnapshot: SecondaryPoolSnapshot | undefined;
  onClose: () => void;
}

export const PredictionEntryForm: React.FC<PredictionEntryFormProps> = ({
  contest,
  entryId,
  entryData,
  totalSecondaryLiquidityBefore,
  poolSnapshot,
  onClose,
}) => {
  const location = useLocation();
  const { platformTokenBalance, paymentTokenBalance, user } = useAuth();
  const [amount, setAmount] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);

  const lineupForEntry = useMemo(
    () => contest.contestLineups?.find((l) => l.entryId === entryId) ?? null,
    [contest.contestLineups, entryId],
  );

  const selectedEntryInfo = useMemo(
    () => entryData.find((entry) => entry.entryId === entryId) ?? null,
    [entryData, entryId],
  );

  /**
   * Ownership after = (balance + buyer mint) / newSupply on this entry.
   * Incremental claim = Δ((pot × balance) / supply) for an additional purchase; at 100% pre-ownership
   * that nets exactly the purchase amount ("$10 buys $10").
   */
  const metrics = useMemo(() => {
    const empty = {
      ownershipDisplay: "—" as string,
      purchaseAmountDisplay: "—" as string,
      incrementalNetDisplay: "—" as string,
    };

    if (
      !amount ||
      Number.parseFloat(amount) <= 0 ||
      !selectedEntryInfo ||
      !poolSnapshot ||
      totalSecondaryLiquidityBefore === undefined
    ) {
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

    const balanceBefore = selectedEntryInfo.balance ?? 0n;
    const supplyBefore = selectedEntryInfo.totalSupply;

    const sim = simulateAddSecondaryPosition({
      amount: amountBigInt,
      entryShares: selectedEntryInfo.totalSupply,
      entryLiquidity: selectedEntryInfo.entryLiquidity,
      ...poolSnapshot,
    });

    const newSupply = sim.newSupply;
    const userSharesAfter = balanceBefore + sim.tokensToMint;

    const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "—");
    const fmtWei = (w: bigint) => fmt(Number(formatUnits(w, 18)));

    if (newSupply === 0n) {
      return empty;
    }

    const ownershipPercent = Number((userSharesAfter * 10000n) / newSupply) / 100;

    const incrementalWei = incrementalGlobalClaimDelta(
      totalSecondaryLiquidityBefore,
      amountBigInt,
      balanceBefore,
      supplyBefore,
      sim,
    );

    return {
      ownershipDisplay: `${fmt(ownershipPercent)}%`,
      purchaseAmountDisplay: fmtWei(amountBigInt),
      incrementalNetDisplay: incrementalWei === null ? "—" : fmtWei(incrementalWei),
    };
  }, [amount, selectedEntryInfo, poolSnapshot, totalSecondaryLiquidityBefore]);

  const metricsReady = Boolean(poolSnapshot) && totalSecondaryLiquidityBefore !== undefined;

  const ownershipDisplay = metricsReady && selectedEntryInfo ? metrics.ownershipDisplay : "—";
  const purchaseAmountDisplay =
    metricsReady && selectedEntryInfo ? metrics.purchaseAmountDisplay : "—";
  const incrementalNetDisplay =
    metricsReady && selectedEntryInfo ? metrics.incrementalNetDisplay : "—";

  const purchaseAmountWei = useMemo(() => {
    try {
      if (!amount || Number.parseFloat(amount) <= 0) return null;
      return parseUnits(amount, 18);
    } catch {
      return null;
    }
  }, [amount]);

  const canAffordPurchase = useMemo(() => {
    if (purchaseAmountWei === null) return false;
    return canCoverSecondaryPurchase(
      purchaseAmountWei,
      platformTokenBalance ?? 0n,
      paymentTokenBalance ?? 0n,
    );
  }, [purchaseAmountWei, platformTokenBalance, paymentTokenBalance]);

  useEffect(() => {
    setAmount("10");
    setError(null);
  }, [entryId, contest.id]);

  const { execute, isProcessing, createAddPredictionCalls } = useAddPrediction({
    onSuccess: async (data) => {
      const statusData = data as BatchTransactionStatusData;
      const lastReceipt = statusData.receipts[statusData.receipts.length - 1];
      if (lastReceipt?.transactionHash && entryId && contest?.id) {
        try {
          await apiClient.post(
            `/contests/${contest.id}/secondary-participants`,
            {
              entryId,
              transactionHash: lastReceipt.transactionHash,
              chainId: contest.chainId,
            },
            { requiresAuth: true },
          );
        } catch (e) {
          console.error("[PredictionEntryForm] Failed to record secondary participant:", e);
        }
      }
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

    let amountBigInt: bigint;
    try {
      amountBigInt = parseUnits(amount, 18);
    } catch {
      setError("Please enter a valid amount");
      return;
    }

    if (
      !canCoverSecondaryPurchase(
        amountBigInt,
        platformTokenBalance ?? 0n,
        paymentTokenBalance ?? 0n,
      )
    ) {
      setError("Insufficient balance for this purchase amount.");
      return;
    }

    try {
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
    <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm font-display">
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-500">User</span>
          <span className="text-gray-700 font-medium text-right truncate max-w-[58%]">
            {lineupForEntry?.user?.name || lineupForEntry?.user?.email || "—"}
          </span>
        </div>

        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-500">Lineup</span>
          <span className="text-gray-700 font-medium text-right truncate max-w-[58%]">
            {lineupForEntry?.tournamentLineup?.name || "—"}
          </span>
        </div>

        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-500">Result</span>
          <span className="text-gray-700 font-medium text-right truncate max-w-[58%]">To Win</span>
        </div>
      </div>
    </div>
  );

  const predictionPurchaseSummary = (
    <div className="space-y-2 text-sm pb-3">
      <div className="flex justify-between items-center gap-3">
        <span className="text-gray-500">Purchase amount</span>
        <span className="text-gray-700 font-medium tabular-nums">${amount}</span>
      </div>

      <div className="flex justify-between items-center gap-3">
        <span className="text-gray-500">Ownership After Purchase</span>
        <span className="text-gray-700 font-medium tabular-nums">{ownershipDisplay}</span>
      </div>

      <div className="flex justify-between items-center gap-3 ">
        <span className="text-gray-500">Purchase Leverage</span>
        <span className="font-bold tabular-nums text-emerald-600">
          ${purchaseAmountDisplay} buys ${incrementalNetDisplay}
        </span>
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
          {predictionPurchaseSummary}

          <div>
            <label
              htmlFor="position-amount-preview"
              className="block text-left text-sm font-display font-normal uppercase tracking-wide text-gray-500"
            >
              Purchase amount
            </label>
            <input
              id="position-amount-preview"
              type="text"
              inputMode="decimal"
              value={amount}
              readOnly
              tabIndex={-1}
              placeholder="Enter amount"
              className="w-full px-4 py-3 text-right text-base tabular-nums border border-gray-200 rounded-md bg-gray-50/80 text-gray-600 font-normal cursor-not-allowed"
              disabled
            />
          </div>
        </form>

        <Link
          to="/connect"
          state={{ from: location }}
          className="flex w-full justify-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded border border-blue-500 text-sm font-display font-medium transition-colors"
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {predictionDetailsCard}
      {predictionPurchaseSummary}

      <div>
        {/* <label
          htmlFor="position-amount"
          className="block text-left text-sm font-display font-normal uppercase tracking-wide text-gray-500"
        >
          Purchase amount
        </label> */}
        <input
          id="position-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter amount"
          className="w-full px-4 py-3 text-right text-base tabular-nums border border-gray-200 rounded-md text-gray-700 font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-300"
          disabled={isProcessing}
          autoFocus
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={
            secondaryActionsLocked ||
            isProcessing ||
            !amount ||
            Number.parseFloat(amount) <= 0 ||
            !canAffordPurchase
          }
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded border border-blue-500 text-sm font-display font-medium transition-colors"
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </form>
  );
};
