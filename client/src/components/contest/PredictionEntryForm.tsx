import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePostHog } from "posthog-js/react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import {
  contestPaymentDecimals,
  hasEnoughTokenBalance,
  parseContestAmountFromHuman,
} from "../../lib/paymentTokenSpend";
import ContestContract from "../../utils/contracts/ContestController.json";
import { simulateAddSecondaryPosition, type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { useAuth } from "../../contexts/AuthContext";
import { useAddPrediction } from "../../hooks/useSpectatorOperations";
import type { BatchTransactionStatusData } from "../../hooks/useBlockchainTransaction";
import apiClient from "../../utils/apiClient";
import { incrementalGlobalClaimDelta, toEnglishOdds } from "../../utils/secondaryPurchasePreview";
import { captureWinnerPoolPositionRecorded } from "../../lib/analytics/posthog";
import { contestLineupDisplayName } from "../../lib/candidateUtils";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

const DEFAULT_USER_COLOR = "#9CA3AF";
const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

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
  const posthog = usePostHog();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const balanceAddress = smartWalletClient?.account?.address ?? address;
  const { paymentTokenBalance, user, balancesUnavailable, refetchBalances } = useAuth();
  const [amount, setAmount] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);

  const { data: contestPaymentTokenOnChain } = useReadContract({
    address: contest.address as `0x${string}` | undefined,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    query: { enabled: !!contest.address },
  });

  const contestPaymentToken =
    (typeof contestPaymentTokenOnChain === "string"
      ? contestPaymentTokenOnChain
      : contest.settings?.paymentTokenAddress) ?? "";

  const contestAmountDecimals = contestPaymentDecimals(contest.chainId, contestPaymentToken);

  const { data: contestTokenBalanceData } = useBalance({
    address: balanceAddress,
    token: contestPaymentToken as `0x${string}`,
    query: {
      enabled: !!balanceAddress && !!contestPaymentToken && !!user,
    },
  });

  const spendableForContest =
    contestTokenBalanceData?.value ?? paymentTokenBalance ?? 0n;

  const lineupForEntry = useMemo(
    () => contest.contestLineups?.find((l) => l.entryId === entryId) ?? null,
    [contest.contestLineups, entryId],
  );

  const selectedEntryInfo = useMemo(
    () => entryData.find((entry) => entry.entryId === entryId) ?? null,
    [entryData, entryId],
  );
  const resolvedLeftBorderColor = useMemo(() => {
    const userSettings = lineupForEntry?.user?.settings;
    const maybeColor =
      typeof userSettings === "object" && userSettings !== null
        ? (userSettings as { color?: unknown }).color
        : undefined;
    return isValidHexColor(maybeColor) ? maybeColor : DEFAULT_USER_COLOR;
  }, [lineupForEntry]);

  /**
   * Ownership after = (balance + buyer mint) / newSupply on this entry.
   * Incremental claim = Δ((pot × balance) / supply) for an additional purchase; at 100% pre-ownership
   * that nets exactly the purchase amount ("$10 returns $10").
   */
  const metrics = useMemo(() => {
    const empty = {
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
      amountBigInt = parseContestAmountFromHuman(amount, contest.chainId, contestPaymentToken);
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

    const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "—");
    const fmtWei = (w: bigint) => fmt(Number(formatUnits(w, contestAmountDecimals)));

    if (newSupply === 0n) {
      return empty;
    }

    const incrementalWei = incrementalGlobalClaimDelta(
      totalSecondaryLiquidityBefore,
      amountBigInt,
      balanceBefore,
      supplyBefore,
      sim,
    );

    return {
      purchaseAmountDisplay: fmtWei(amountBigInt),
      incrementalNetDisplay: incrementalWei === null ? "—" : fmtWei(incrementalWei),
    };
  }, [amount, selectedEntryInfo, poolSnapshot, totalSecondaryLiquidityBefore]);

  const metricsReady = Boolean(poolSnapshot) && totalSecondaryLiquidityBefore !== undefined;

  const purchaseAmountDisplay =
    metricsReady && selectedEntryInfo ? metrics.purchaseAmountDisplay : "—";
  const incrementalNetDisplay =
    metricsReady && selectedEntryInfo ? metrics.incrementalNetDisplay : "—";
  const projectedEnglishOdds = useMemo(() => {
    const stake = Number.parseFloat(purchaseAmountDisplay);
    const projectedReturn = Number.parseFloat(incrementalNetDisplay);
    if (!Number.isFinite(stake) || !Number.isFinite(projectedReturn)) return "—";
    return toEnglishOdds(stake, projectedReturn);
  }, [purchaseAmountDisplay, incrementalNetDisplay]);

  const projectedPayoutDisplay = useMemo(() => {
    const payout = Number.parseFloat(incrementalNetDisplay);
    if (!Number.isFinite(payout)) return "—";
    if (payout > 0 && payout < 0.01) return "< 0.01";
    return payout.toFixed(2);
  }, [incrementalNetDisplay]);

  const purchaseAmountWei = useMemo(() => {
    try {
      if (!amount || Number.parseFloat(amount) <= 0) return null;
      return parseContestAmountFromHuman(amount, contest.chainId, contestPaymentToken);
    } catch {
      return null;
    }
  }, [amount, contest.chainId, contestPaymentToken]);

  const canAffordPurchase = useMemo(() => {
    if (balancesUnavailable) return false;
    if (purchaseAmountWei === null) return false;
    return hasEnoughTokenBalance(spendableForContest, purchaseAmountWei);
  }, [balancesUnavailable, purchaseAmountWei, spendableForContest]);

  useEffect(() => {
    setAmount("10");
    setError(null);
  }, [entryId, contest.id]);

  const { execute, isProcessing, createAddPredictionCalls } = useAddPrediction({
    onSuccess: async (data) => {
      const statusData = data as BatchTransactionStatusData;
      const lastReceipt = statusData.receipts[statusData.receipts.length - 1];
      if (user?.id && entryId && contest?.id) {
        captureWinnerPoolPositionRecorded(posthog, {
          user_id: user.id,
          contest_id: contest.id,
          entry_id: entryId,
          chain_id: contest.chainId,
          amount_wei: purchaseAmountWei !== null ? purchaseAmountWei.toString() : undefined,
        });
      }
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

    if (balancesUnavailable) {
      setError("Could not load your balance. Check your connection and tap Retry below.");
      return;
    }

    let amountBigInt: bigint;
    try {
      amountBigInt = parseContestAmountFromHuman(amount, contest.chainId, contestPaymentToken);
    } catch {
      setError("Please enter a valid amount");
      return;
    }

    if (!hasEnoughTokenBalance(spendableForContest, amountBigInt)) {
      setError("Insufficient balance for this purchase amount.");
      return;
    }

    try {
      const calls = createAddPredictionCalls(
        contest.address,
        Number.parseInt(entryId, 10),
        amountBigInt,
        contestPaymentToken,
      );

      await execute(calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    }
  };

  const predictionDetailsCard = (
    <div className="overflow-hidden rounded-md border border-blue-200 bg-gradient-to-tl from-blue-50 via-white to-white font-display shadow-md">
      <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50/70 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          Winner Pool Ticket
        </div>
        <div className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-blue-700">
          To Win
        </div>
      </div>

      <div className="space-y-2 p-3 text-sm">
        <div
          className="rounded-sm border border-gray-300 bg-white/90 px-2.5 py-2 shadow-sm"
          style={{
            borderLeftColor: resolvedLeftBorderColor,
            borderLeftWidth: "5px",
            borderLeftStyle: "solid",
          }}
        >
          <div className="truncate text-sm font-semibold leading-tight text-gray-900">
            {lineupForEntry?.user?.name || lineupForEntry?.user?.email || "—"}
          </div>
          <div className="mt-0.5 truncate text-xs text-gray-500">
            {lineupForEntry ? contestLineupDisplayName(lineupForEntry) : "—"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
            Ticket Amount
          </div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">${amount}</div>
        </div>
      </div>
    </div>
  );

  const currentOddsQuoteCard = (
    <div className="px-1 pt-4 font-display">
      <div className="flex items-start justify-between gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums leading-none text-gray-800">
            {projectedEnglishOdds}
          </div>
          <div className="mt-1 text-[10px] uppercase leading-tight tracking-wide text-gray-500">
            Estimated Odds
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold tabular-nums leading-none text-emerald-700">
            {projectedPayoutDisplay === "—" ? "—" : `$${projectedPayoutDisplay}`}
          </div>
          <div className="mt-1 text-[10px] uppercase leading-tight tracking-wide text-gray-500">
            Estimated Payout
          </div>
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[11px] leading-snug text-gray-600">
          <span className="font-semibold text-gray-900">Note:</span> Winner Pool quotes update as
          entries and pool size change. Your final odds and payout are calculated from the closing
          pool at lock.{" "}
          <Link
            to="/faq#winner-pool"
            className="font-medium text-gray-700 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            Learn more...
          </Link>
        </p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="space-y-2">
        <form
          className="pointer-events-none space-y-2 opacity-55"
          aria-disabled="true"
          onSubmit={(event) => event.preventDefault()}
        >
          {predictionDetailsCard}
          {currentOddsQuoteCard}

          <div>
            <label
              htmlFor="position-amount-preview"
              className="block text-left font-display text-sm font-normal uppercase tracking-wide text-gray-500"
            >
              Ticket amount
            </label>
            <input
              id="position-amount-preview"
              type="text"
              inputMode="decimal"
              value={amount}
              readOnly
              tabIndex={-1}
              placeholder="Enter amount"
              className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-right text-base font-normal tabular-nums text-gray-600 shadow-inner"
              disabled
            />
          </div>
        </form>

        <Link
          to="/connect"
          state={{ from: location }}
          className="flex w-full justify-center rounded border border-blue-500 bg-blue-500 px-4 py-2 font-display text-sm font-medium text-white transition-colors hover:bg-blue-600"
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
      {balancesUnavailable && (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Couldn&apos;t load your wallet balance (network or RPC).{" "}
          <button
            type="button"
            onClick={() => void refetchBalances()}
            className="font-medium text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      {predictionDetailsCard}
      {currentOddsQuoteCard}

      <div>
        {/* <label
          htmlFor="position-amount"
          className="block text-left text-sm font-display font-normal uppercase tracking-wide text-gray-500"
        >
          Ticket amount
        </label> */}
        <input
          id="position-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter amount"
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-right text-base font-normal tabular-nums text-gray-900 shadow-inner transition-[box-shadow,border-color] placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none"
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
            balancesUnavailable ||
            !amount ||
            Number.parseFloat(amount) <= 0 ||
            !canAffordPurchase
          }
          className="w-full rounded border border-blue-500 bg-blue-500 px-4 py-2 font-display text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinnerSmall />
              Placing...
            </span>
          ) : (
            "Place Wager"
          )}
        </button>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </form>
  );
};
