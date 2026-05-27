import React, { useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress, parseUnits } from "viem";
import { Modal } from "../common/Modal";
import {
  usePlaceSideBetTicketMutation,
  useSideBetMarketQuery,
  useSideBetTicketsForLineupQuery,
} from "../../hooks/useSideBetQueries";
import type { BatchTransactionStatusData } from "../../hooks/useBlockchainTransaction";
import type { SideBetMarketSelectionDto, SideBetMarketTicketDto } from "../../types/sideBet";
import { useAuth } from "../../contexts/AuthContext";
import { useModeAwareTransfer } from "../../hooks/useTokenOperations";
import { ApiError } from "../../utils/apiError";

type SideBetRow = "2 of 4" | "3 of 4" | "4 of 4";
type SideBetCol = "Top 5" | "Top 10" | "Top 20";

const SIDE_BET_COLUMNS: SideBetCol[] = ["Top 5", "Top 10", "Top 20"];
const ROW_ORDER: SideBetRow[] = ["2 of 4", "3 of 4", "4 of 4"];
/** Minimum stake shown as dollars (matches 1:1 on-chain platform units in this app). */
const MIN_STAKE = "0.01";
/** Total return (stake × decimal odds) must stay strictly below this USD amount per ticket. */
const MAX_TICKET_PAYOUT_USD = 2000;
/** Server / market quote issues only — not used for wallet, stake, or payment-prep errors. */
const PARLAY_MARKET_UNAVAILABLE = "Parlay market is not available right now; check back soon.";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function hitsRequiredToRowLabel(h: number): string {
  if (h === 2) return "2 of 4";
  if (h === 3) return "3 of 4";
  return "4 of 4";
}

function topNToColLabel(n: number): string {
  if (n === 5) return "Top 5";
  if (n === 10) return "Top 10";
  return "Top 20";
}

function sideBetStatusBadgeClass(status: string): string {
  switch (status) {
    case "WON":
      return "bg-emerald-100 text-emerald-800";
    case "LOST":
      return "bg-red-50 text-red-800";
    case "VOID":
      return "bg-gray-100 text-gray-600";
    case "REFUND_PENDING":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-blue-50 text-blue-800";
  }
}

function selectionForCell(
  selections: SideBetMarketSelectionDto[],
  row: SideBetRow,
  col: SideBetCol,
): SideBetMarketSelectionDto | undefined {
  return selections.find((s) => s.rowLabel === row && s.colLabel === col);
}

function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function sideBetReturnDisplay(ticket: SideBetMarketTicketDto): {
  amount: string;
  amountClass: string;
} {
  const stake = ticket.stakeAmount;
  const implied = stake * ticket.decimalOddsAtPlacement;
  if (ticket.status === "LOST") {
    return { amount: "$0.00", amountClass: "text-gray-500" };
  }
  if (ticket.status === "VOID" || ticket.status === "REFUND_PENDING") {
    return { amount: "—", amountClass: "text-gray-400" };
  }
  const n = implied;
  const amount = !Number.isFinite(n) || n < 0 ? "$0.00" : n < 0.01 ? "< $0.01" : formatUsd(n);
  return { amount, amountClass: "text-emerald-700" };
}

export interface SideBetPanelProps {
  /** Left accent border (user color), same as contest entry rows. */
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
  /** Comma-separated last names, leaderboard order (matches ContestEntryList when locked). */
  playerLastNamesLine: string;
  /** Tournament lineup id for `/api/bets/side/lineup/:id/market`. */
  tournamentLineupId: string | null;
}

export const SideBetPanel: React.FC<SideBetPanelProps> = ({
  borderColor,
  userLabel,
  lineupNumberLabel,
  playerLastNamesLine,
  tournamentLineupId,
}) => {
  const [activeSelection, setActiveSelection] = useState<SideBetMarketSelectionDto | null>(null);
  const [stakeInput, setStakeInput] = useState("10");
  const [placeError, setPlaceError] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const {
    platformTokenBalance,
    paymentTokenBalance,
    platformTokenDecimals,
    paymentTokenDecimals,
    balancesUnavailable,
  } = useAuth();

  const resolvedPlatformDecimals = platformTokenDecimals ?? 18;
  const resolvedPaymentDecimals = paymentTokenDecimals ?? 6;
  const platformBalance = platformTokenBalance ?? 0n;
  const paymentBalance = paymentTokenBalance ?? 0n;
  const decimalScale = 10n ** BigInt(resolvedPlatformDecimals - resolvedPaymentDecimals);

  /** Filled immediately before `execute`; `onSuccess` reads this ref (CreateContestForm pattern). */
  const pendingSideBetRef = useRef<{
    tournamentLineupId: string;
    hitsRequired: number;
    topN: number;
    stakeAmount: number;
  } | null>(null);

  const marketQuery = useSideBetMarketQuery(tournamentLineupId);
  const ticketsQuery = useSideBetTicketsForLineupQuery(tournamentLineupId);
  const placeMutation = usePlaceSideBetTicketMutation(tournamentLineupId);

  const closeModal = () => {
    pendingSideBetRef.current = null;
    setActiveSelection(null);
    setPlaceError(null);
  };

  const {
    execute,
    isProcessing: isPayingOracle,
    error: paymentTxError,
    createModeAwareTransferCalls,
  } = useModeAwareTransfer({
    platformTokenDecimals: resolvedPlatformDecimals,
    paymentTokenDecimals: resolvedPaymentDecimals,
    onSuccess: async (statusData: BatchTransactionStatusData) => {
      const pending = pendingSideBetRef.current;
      pendingSideBetRef.current = null;
      if (!pending) return;
      const transactionHashes = statusData.receipts.map((r) => r.transactionHash);
      try {
        const result = await placeMutation.mutateAsync({
          ...pending,
          ...(transactionHashes.length > 0 ? { transactionHashes } : {}),
        });
        if (result.status === "REFUND_PENDING") {
          setPlaceError(
            "Your stake was sent on-chain, but this parlay could not be booked at current prices. A refund-pending entry was saved on your ticket list—contact support if you need a manual refund.",
          );
          return;
        }
        closeModal();
      } catch (e: unknown) {
        setPlaceError(e instanceof ApiError ? e.message : PARLAY_MARKET_UNAVAILABLE);
      }
    },
    onError: () => {
      pendingSideBetRef.current = null;
    },
  });

  const lineupParlayTickets = useMemo((): SideBetMarketTicketDto[] => {
    const raw = ticketsQuery.data?.tickets ?? [];
    return [...raw]
      .map(
        (t): SideBetMarketTicketDto => ({
          id: t.id,
          hitsRequired: t.hitsRequired,
          topN: t.topN,
          stakeAmount: t.stakeAmount,
          decimalOddsAtPlacement: t.decimalOddsAtPlacement,
          americanDisplayAtPlacement: t.americanDisplayAtPlacement,
          quoteVersionAtPlacement: t.quoteVersionAtPlacement,
          status: t.status,
          createdAt: t.createdAt,
          playerIds: t.playerIds ?? [],
          placementPlayers: t.placementPlayers ?? [],
        }),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ticketsQuery.data?.tickets]);

  const payoutPreview = useMemo(() => {
    if (!activeSelection) return null;
    const trimmed = stakeInput.trim();
    let stakeBn: bigint;
    try {
      stakeBn = parseUnits(trimmed, resolvedPlatformDecimals);
    } catch {
      return null;
    }
    const minBn = parseUnits(MIN_STAKE, resolvedPlatformDecimals);
    if (stakeBn < minBn) return null;
    const stake = parseFloat(trimmed);
    const d = activeSelection.decimalOdds;
    if (!Number.isFinite(stake) || !Number.isFinite(d) || d <= 1) return null;
    return { totalReturn: stake * d, profit: stake * (d - 1) };
  }, [activeSelection, stakeInput, resolvedPlatformDecimals]);

  const exceedsMaxTicketPayout =
    payoutPreview !== null && payoutPreview.totalReturn >= MAX_TICKET_PAYOUT_USD;

  /** Stake row in the place-ticket preview; mirrors `Your parlays` ticket formatting. */
  const modalStakeTicketLine = useMemo(() => {
    const trimmed = stakeInput.trim();
    if (!trimmed) return "—";
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n <= 0) return "—";
    const stakeDisplay = n < 0.01 ? "< 0.01" : n.toFixed(2);
    return `$${stakeDisplay}`;
  }, [stakeInput]);

  const bettable = marketQuery.data?.bettable === true;
  const sideBetMarketSelections = marketQuery.data?.selections ?? [];
  const showUnavailable =
    !tournamentLineupId ||
    marketQuery.isError ||
    (!marketQuery.isLoading && marketQuery.data && !bettable);

  const placeTicket = async () => {
    if (!activeSelection || !tournamentLineupId) return;
    if (marketQuery.data?.bettable !== true) {
      setPlaceError(PARLAY_MARKET_UNAVAILABLE);
      return;
    }
    const amountStr = stakeInput.trim();
    let stakeUnitsPlatform: bigint;
    try {
      stakeUnitsPlatform = parseUnits(amountStr, resolvedPlatformDecimals);
    } catch {
      setPlaceError("Enter a valid stake.");
      return;
    }
    if (stakeUnitsPlatform <= 0n) {
      setPlaceError("Enter a valid stake.");
      return;
    }
    const minStakeWei = parseUnits(MIN_STAKE, resolvedPlatformDecimals);
    if (stakeUnitsPlatform < minStakeWei) {
      setPlaceError("Minimum stake is $0.01 (one cent).");
      return;
    }
    const stakeAmount = Number.parseFloat(amountStr);
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
      setPlaceError("Enter a valid stake.");
      return;
    }

    const totalReturnIfWin = stakeAmount * activeSelection.decimalOdds;
    if (Number.isFinite(totalReturnIfWin) && totalReturnIfWin >= MAX_TICKET_PAYOUT_USD) {
      setPlaceError(
        `Total return must stay under ${formatUsd(MAX_TICKET_PAYOUT_USD)} for a single ticket. Lower your stake.`,
      );
      return;
    }

    const oracle = import.meta.env.VITE_ORACLE_ADDRESS?.trim() ?? "";
    if (!oracle || !isAddress(oracle)) {
      setPlaceError("Oracle payout address is not configured (VITE_ORACLE_ADDRESS).");
      return;
    }
    if (!isConnected) {
      setPlaceError("Connect your wallet to pay the stake.");
      return;
    }
    if (balancesUnavailable) {
      setPlaceError("Could not load balances. Try again from Account.");
      return;
    }

    /** Internal transfer: $ display maps 1:1 on-chain; payment balance tops up shortfall if needed. */
    const maxPayablePlatform = platformBalance + paymentBalance * decimalScale;
    if (stakeUnitsPlatform > maxPayablePlatform) {
      setPlaceError("Insufficient balance for this stake. Add funds in Account if needed.");
      return;
    }

    setPlaceError(null);
    pendingSideBetRef.current = {
      tournamentLineupId,
      hitsRequired: activeSelection.hitsRequired,
      topN: activeSelection.topN,
      stakeAmount,
    };

    let calls;
    try {
      calls = createModeAwareTransferCalls({
        mode: "internal",
        recipient: oracle,
        amount: amountStr,
        platformTokenBalance: platformBalance,
        paymentTokenBalance: paymentBalance,
      });
    } catch (e: unknown) {
      pendingSideBetRef.current = null;
      setPlaceError(e instanceof Error ? e.message : "Could not prepare payment.");
      return;
    }

    await execute(calls);
  };

  return (
    <div className="rounded-sm bg-white p-2">
      <h4 className="font-display text-base font-semibold text-gray-900">Lineup Parlays</h4>

      {!tournamentLineupId ? (
        <p className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 font-display text-sm text-amber-800">
          Save a full four-player lineup to see live parlay prices.
        </p>
      ) : null}

      {tournamentLineupId ? (
        <div className="">
          <p className="mt-1 font-display text-sm leading-relaxed text-gray-700">
            Pick how many of your 4 players you think will end up in the top 5, 10, or 20. Ties
            count too.
          </p>

          {marketQuery.isLoading ? (
            <p className="mt-3 font-display text-sm text-gray-500">Loading market…</p>
          ) : null}

          {marketQuery.isError ? (
            <p className="mt-3 rounded-sm border border-red-200 bg-red-50 p-3 font-display text-sm text-red-700">
              {PARLAY_MARKET_UNAVAILABLE}
            </p>
          ) : null}

          {showUnavailable && !marketQuery.isLoading && !marketQuery.isError ? (
            <p className="mt-3 rounded-sm border border-gray-200 bg-gray-50 p-3 font-display text-sm text-gray-800">
              {PARLAY_MARKET_UNAVAILABLE}
            </p>
          ) : null}

          {bettable ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <div className="flex w-full justify-center">
                <div className="grid w-full max-w-[28rem] grid-cols-[4rem_repeat(3,minmax(0,1fr))] gap-2">
                  <div />
                  {ROW_ORDER.map((hitsLabel) => (
                    <div
                      key={hitsLabel}
                      className="px-2 py-1 text-center font-display text-sm font-semibold text-gray-900"
                    >
                      {hitsLabel}
                    </div>
                  ))}

                  {SIDE_BET_COLUMNS.map((col) => (
                    <React.Fragment key={col}>
                      <div className="self-center pr-2 text-right font-display text-sm font-semibold text-gray-900">
                        {col}
                      </div>
                      {ROW_ORDER.map((row) => {
                        const cell = selectionForCell(sideBetMarketSelections, row, col);
                        if (!cell) return <div key={`${row}-${col}`} />;

                        return (
                          <button
                            key={`${row}-${col}`}
                            type="button"
                            onClick={() => setActiveSelection(cell)}
                            className={classNames(
                              "w-full rounded-sm border border-gray-300 bg-gray-100 py-3 font-display text-gray-900 transition-colors",
                              "hover:bg-gray-200",
                              "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                            )}
                          >
                            <span className="block w-full text-center text-sm leading-tight">
                              {cell.americanDisplay}
                            </span>
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tournamentLineupId ? (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h4 className="mb-2 font-display text-base font-semibold text-gray-900">Your parlays</h4>
          {ticketsQuery.isLoading && !ticketsQuery.data ? (
            <p className="font-display text-sm text-gray-500">Loading your parlays…</p>
          ) : null}
          {ticketsQuery.isError ? (
            <p className="mb-2 rounded-sm border border-red-200 bg-red-50 p-2 font-display text-sm text-red-700">
              Could not load your ticket list. Try again in a moment.
            </p>
          ) : null}
          {!ticketsQuery.isLoading ? (
            lineupParlayTickets.length === 0 ? (
              <div className="p-4 text-center">
                <p className="font-display text-sm text-gray-400">No parlays yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lineupParlayTickets.map((ticket) => {
                  const stake = ticket.stakeAmount;
                  const stakeDisplay =
                    !Number.isFinite(stake) || stake <= 0
                      ? "0.00"
                      : stake < 0.01
                        ? "< 0.01"
                        : stake.toFixed(2);
                  const ret = sideBetReturnDisplay(ticket);
                  const betRosterLine =
                    ticket.placementPlayers.length > 0
                      ? ticket.placementPlayers
                          .map((p) => p.lastName || p.firstName || "—")
                          .join(", ")
                      : "—";

                  return (
                    <div
                      key={ticket.id}
                      className="overflow-hidden rounded-md border border-blue-200 bg-gradient-to-tl from-blue-50 via-white to-white font-display shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-blue-200 bg-blue-50/70 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                          Parlay Ticket
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide ${sideBetStatusBadgeClass(ticket.status)}`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <div className="space-y-2 p-3 text-sm">
                        <div className="truncate text-sm font-semibold leading-tight text-gray-900">
                          {topNToColLabel(ticket.topN)} (including ties) ·{" "}
                          {hitsRequiredToRowLabel(ticket.hitsRequired)}
                        </div>
                        <div
                          className="rounded-sm border border-gray-300 bg-white/90 px-2.5 py-2 shadow-sm"
                          style={{
                            borderLeftColor: borderColor,
                            borderLeftWidth: "5px",
                            borderLeftStyle: "solid",
                          }}
                        >
                          <div className="truncate text-sm font-semibold leading-tight text-gray-900">
                            {userLabel}
                            {lineupNumberLabel ? (
                              <span className="ml-1 text-xs font-medium text-gray-500">
                                {lineupNumberLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-gray-500">
                            {betRosterLine}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div className="text-center">
                            <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
                              Stake
                            </div>
                            <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                              ${stakeDisplay}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
                              Odds
                            </div>
                            <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                              {ticket.americanDisplayAtPlacement}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
                              Return
                            </div>
                            <div
                              className={`mt-0.5 text-sm font-semibold tabular-nums ${ret.amountClass}`}
                            >
                              {ret.amount}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}
        </div>
      ) : null}

      <Modal
        isOpen={activeSelection !== null}
        onClose={() => {
          if (isPayingOracle || placeMutation.isPending) return;
          closeModal();
        }}
        title="Parlay"
        hideHeader
        maxWidth="md"
        panelClassName="bg-gray-50"
        contentClassName="p-2 font-display"
      >
        {activeSelection ? (
          <div className="space-y-3 overflow-hidden rounded-sm border border-gray-300 bg-white p-3 font-display">
            <div className="overflow-hidden rounded-md border border-blue-200 bg-gradient-to-tl from-blue-50 via-white to-white font-display shadow-md">
              <div className="space-y-3 p-3 text-sm">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold leading-tight tracking-tight text-gray-900 sm:text-xl">
                    {activeSelection.colLabel} (including ties) · {activeSelection.rowLabel}
                  </h2>
                  <p className="mt-1 text-sm leading-snug text-gray-700">
                    At least {activeSelection.hitsRequired} of the players must finish in the top{" "}
                    {activeSelection.topN} for this ticket to win.
                  </p>
                </div>

                <div
                  className="rounded-sm border border-gray-300 bg-white/90 px-2.5 py-2 shadow-sm"
                  style={{
                    borderLeftColor: borderColor,
                    borderLeftWidth: "5px",
                    borderLeftStyle: "solid",
                  }}
                >
                  <div className="truncate text-sm font-semibold leading-tight text-gray-900">
                    {userLabel}
                    {lineupNumberLabel ? (
                      <span className="ml-1 text-xs font-medium text-gray-500">
                        {lineupNumberLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {playerLastNamesLine || "No players"}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
                      Stake
                    </div>
                    <div
                      className={classNames(
                        "mt-0.5 text-sm font-semibold tabular-nums",
                        modalStakeTicketLine === "—" ? "text-gray-400" : "text-gray-900",
                      )}
                    >
                      {modalStakeTicketLine}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
                      Odds
                    </div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                      {activeSelection.americanDisplay}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
                      Return
                    </div>
                    <div
                      className={classNames(
                        "mt-0.5 text-sm font-semibold tabular-nums",
                        payoutPreview ? "text-emerald-700" : "text-gray-400",
                      )}
                    >
                      {payoutPreview ? formatUsd(payoutPreview.totalReturn) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                htmlFor="side-bet-stake"
              >
                Stake ($)
              </label>
              <input
                id="side-bet-stake"
                type="number"
                min={0.01}
                step={0.01}
                value={stakeInput}
                onChange={(ev) => setStakeInput(ev.target.value)}
                className="mt-2 w-full rounded-sm border border-gray-300 px-3 py-2 text-sm tabular-nums text-gray-900"
              />
            </div>

            {exceedsMaxTicketPayout ? (
              <p
                className="rounded-sm border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"
                role="alert"
              >
                This stake would reach or exceed the per-ticket payout cap (${MAX_TICKET_PAYOUT_USD}
                ). Lower your stake to place the bet.
              </p>
            ) : null}
            {placeError ? (
              <p className="text-sm text-red-600" role="alert">
                {placeError}
              </p>
            ) : null}
            {paymentTxError ? (
              <p className="text-sm text-red-600" role="alert">
                {paymentTxError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isPayingOracle || placeMutation.isPending}
                onClick={closeModal}
                className="rounded-sm border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !bettable || placeMutation.isPending || isPayingOracle || exceedsMaxTicketPayout
                }
                onClick={() => void placeTicket()}
                className="rounded-sm bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPayingOracle
                  ? "Confirm in wallet…"
                  : placeMutation.isPending
                    ? "Recording…"
                    : "Place Bet"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
