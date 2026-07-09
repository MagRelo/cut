import React from "react";
import type { SideBetMarketSelectionDto } from "../../../../types/sideBet";
import { SideBetLineupSummary } from "../shared/SideBetLineupSummary";
import { SideBetStatsRow } from "../shared/SideBetStatsRow";
import { useOddsFormat } from "../../../../hooks/useOddsFormat";
import { MAX_TICKET_PAYOUT_USD } from "../shared/sideBetConstants";
import { formatUsd } from "../shared/sideBetFormatters";

export interface SideBetPlaceFormProps {
  activeSelection: SideBetMarketSelectionDto;
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
  playerLastNamesLine: string;
  stakeInput: string;
  onStakeInputChange: (value: string) => void;
  bettable: boolean;
  modalStakeTicketLine: string;
  payoutPreview: { totalReturn: number; profit: number } | null;
  exceedsMaxTicketPayout: boolean;
  placeError: string | null;
  paymentTxError: string | null;
  isPayingOracle: boolean;
  isRecording: boolean;
  onCancel: () => void;
  onPlaceTicket: () => void;
}

export const SideBetPlaceForm: React.FC<SideBetPlaceFormProps> = ({
  activeSelection,
  borderColor,
  userLabel,
  lineupNumberLabel,
  playerLastNamesLine,
  stakeInput,
  onStakeInputChange,
  bettable,
  modalStakeTicketLine,
  payoutPreview,
  exceedsMaxTicketPayout,
  placeError,
  paymentTxError,
  isPayingOracle,
  isRecording,
  onCancel,
  onPlaceTicket,
}) => {
  const { formatOdds } = useOddsFormat();

  return (
    <div className="max-w-md space-y-3 overflow-hidden rounded-sm border border-gray-300 bg-white p-3 font-display">
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

        <SideBetLineupSummary
          borderColor={borderColor}
          userLabel={userLabel}
          lineupNumberLabel={lineupNumberLabel}
          playerLine={playerLastNamesLine || "No players"}
        />

        <SideBetStatsRow
          stake={modalStakeTicketLine}
          odds={formatOdds(activeSelection.decimalOdds)}
          returnAmount={payoutPreview ? formatUsd(payoutPreview.totalReturn) : "—"}
          stakeClassName={modalStakeTicketLine === "—" ? "text-gray-400" : "text-gray-900"}
          returnClassName={payoutPreview ? "text-emerald-700" : "text-gray-400"}
        />
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
        onChange={(ev) => onStakeInputChange(ev.target.value)}
        className="mt-2 w-full rounded-sm border border-gray-300 px-3 py-2 text-sm tabular-nums text-gray-900"
      />
    </div>

    {exceedsMaxTicketPayout ? (
      <p
        className="rounded-sm border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"
        role="alert"
      >
        This stake would reach or exceed the per-ticket payout cap (${MAX_TICKET_PAYOUT_USD}). Lower
        your stake to place the bet.
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
        disabled={isPayingOracle || isRecording}
        onClick={onCancel}
        className="rounded-sm border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={!bettable || isRecording || isPayingOracle || exceedsMaxTicketPayout}
        onClick={() => void onPlaceTicket()}
        className="rounded-sm bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPayingOracle ? "Confirm in wallet…" : isRecording ? "Recording…" : "Place Bet"}
      </button>
    </div>
    </div>
  );
};
