import React from "react";
import type { SideBetMarketSelectionDto } from "../../../../types/sideBet";
import {
  ROW_ORDER,
  SIDE_BET_CELL_MIN_H,
  SIDE_BET_COLUMNS,
  SIDE_BET_MARKET_GRID_H,
} from "../shared/sideBetConstants";
import { sideBetCellButtonClassNames } from "../shared/sideBetCellPalette";
import { classNames, selectionForCell } from "../shared/sideBetFormatters";
import type { SideBetMarketGridState } from "./resolveSideBetMarketState";

const DISABLED_CELL_CLASS =
  "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400 opacity-70";

const LOADING_CELL_CLASS =
  "animate-skeleton-pulse rounded-md border border-gray-200 shadow-sm";

export interface SideBetMarketGridProps {
  state: SideBetMarketGridState;
  onSelect?: (selection: SideBetMarketSelectionDto) => void;
}

export const SideBetMarketGrid: React.FC<SideBetMarketGridProps> = ({ state, onSelect }) => {
  const isLoading = state.kind === "loading";
  const isDisabled = state.kind === "error" || state.kind === "unavailable";
  const selections =
    state.kind === "ready" || state.kind === "error" || state.kind === "unavailable"
      ? state.selections
      : [];

  return (
    <div className="mt-3 flex w-full justify-center">
      <div
        className={classNames("w-full max-w-[28rem]", SIDE_BET_MARKET_GRID_H)}
        aria-busy={isLoading}
        aria-label={isLoading ? "Loading parlay market" : undefined}
      >
        <div className="grid w-full grid-cols-[4rem_repeat(3,minmax(0,1fr))] gap-2">
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
                const cellKey = `${row}-${col}`;

                if (isLoading) {
                  return (
                    <div
                      key={cellKey}
                      className={classNames(SIDE_BET_CELL_MIN_H, "w-full", LOADING_CELL_CLASS)}
                      aria-hidden
                    />
                  );
                }

                const cell = selectionForCell(selections, row, col);
                if (!cell && state.kind === "ready") return <div key={cellKey} />;

                const cellLabel = isDisabled ? "—" : (cell?.americanDisplay ?? "—");

                return (
                  <button
                    key={cellKey}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled && cell) onSelect?.(cell);
                    }}
                    className={classNames(
                      SIDE_BET_CELL_MIN_H,
                      "flex w-full items-center justify-center rounded-md border px-1 font-display text-sm font-semibold tabular-nums transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-offset-1",
                      isDisabled || !cell
                        ? DISABLED_CELL_CLASS
                        : sideBetCellButtonClassNames(cell.decimalOdds),
                    )}
                  >
                    <span className="text-center leading-tight">{cellLabel}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
