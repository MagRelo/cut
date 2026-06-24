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

export interface SideBetMarketGridProps {
  state: SideBetMarketGridState;
  onSelect?: (selection: SideBetMarketSelectionDto) => void;
}

export const SideBetMarketGrid: React.FC<SideBetMarketGridProps> = ({ state, onSelect }) => {
  const isMessage = state.kind === "error" || state.kind === "unavailable";
  const selections = state.kind === "ready" ? state.selections : [];

  return (
    <div className="mt-3 flex w-full justify-center">
      <div
        className={classNames(
          "w-full max-w-[28rem]",
          SIDE_BET_MARKET_GRID_H,
          ...(isMessage ? ["flex items-center justify-center"] : []),
        )}
        aria-busy={state.kind === "loading"}
        aria-label={state.kind === "loading" ? "Loading parlay market" : undefined}
      >
        {isMessage ? (
          <p
            className={classNames(
              "max-w-[18rem] rounded-sm border px-6 py-5 text-center font-display text-sm leading-snug",
              state.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-800",
            )}
            role="status"
          >
            {state.message}
          </p>
        ) : (
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

                  if (state.kind === "loading") {
                    return (
                      <div
                        key={cellKey}
                        className={classNames(
                          SIDE_BET_CELL_MIN_H,
                          "w-full animate-pulse rounded-sm bg-gray-200",
                        )}
                        aria-hidden
                      />
                    );
                  }

                  const cell = selectionForCell(selections, row, col);
                  if (!cell) return <div key={cellKey} />;

                  return (
                    <button
                      key={cellKey}
                      type="button"
                      onClick={() => onSelect?.(cell)}
                      className={classNames(
                        SIDE_BET_CELL_MIN_H,
                        "flex w-full items-center justify-center rounded-sm border px-1 font-display font-medium tabular-nums transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-offset-1",
                        sideBetCellButtonClassNames(cell.decimalOdds),
                      )}
                    >
                      <span className="text-center text-sm leading-tight">
                        {cell.americanDisplay}
                      </span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
