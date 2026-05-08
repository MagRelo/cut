import React, { useMemo, useState } from "react";
import { Modal } from "../common/Modal";

type SideBetRow = "2 of 4" | "3 of 4" | "4 of 4";
type SideBetCol = "Top 5" | "Top 10" | "Top 20";

interface SideBetOdds {
  english: string;
  decimal: string;
  american: string;
}

interface SideBetCell {
  row: SideBetRow;
  col: SideBetCol;
  odds: SideBetOdds;
}

const SIDE_BET_COLUMNS: SideBetCol[] = ["Top 5", "Top 10", "Top 20"];

const SIDE_BET_CELLS: SideBetCell[] = [
  { row: "2 of 4", col: "Top 5", odds: { english: "6/1", decimal: "6.97", american: "+597" } },
  { row: "2 of 4", col: "Top 10", odds: { english: "11/3", decimal: "4.67", american: "+367" } },
  { row: "2 of 4", col: "Top 20", odds: { english: "11/10", decimal: "2.12", american: "+112" } },
  { row: "3 of 4", col: "Top 5", odds: { english: "17/1", decimal: "18.22", american: "+1722" } },
  { row: "3 of 4", col: "Top 10", odds: { english: "9/1", decimal: "10.03", american: "+903" } },
  { row: "3 of 4", col: "Top 20", odds: { english: "2/1", decimal: "3.08", american: "+208" } },
  { row: "4 of 4", col: "Top 5", odds: { english: "46/1", decimal: "47.31", american: "+4631" } },
  { row: "4 of 4", col: "Top 10", odds: { english: "20/1", decimal: "21.48", american: "+2048" } },
  { row: "4 of 4", col: "Top 20", odds: { english: "7/2", decimal: "4.48", american: "+348" } },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export interface SideBetPanelProps {
  /** Left accent border (user color), same as contest entry rows. */
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
  /** Comma-separated last names, leaderboard order (matches ContestEntryList when locked). */
  playerLastNamesLine: string;
}

export const SideBetPanel: React.FC<SideBetPanelProps> = ({
  borderColor,
  userLabel,
  lineupNumberLabel,
  playerLastNamesLine,
}) => {
  const [activeCell, setActiveCell] = useState<SideBetCell | null>(null);

  const oddsByRow = useMemo(() => {
    const byRow = new Map<SideBetRow, SideBetCell[]>();
    SIDE_BET_CELLS.forEach((cell) => {
      const current = byRow.get(cell.row) ?? [];
      current.push(cell);
      byRow.set(cell.row, current);
    });
    return byRow;
  }, []);

  const closeModal = () => setActiveCell(null);

  return (
    <div className="rounded-sm bg-white p-4 pt-0">
      <h4 className="font-display text-base font-semibold text-gray-900">Lineup Parlays</h4>
      <p className="mt-1 font-display text-sm leading-relaxed text-gray-700">
        Pick how many of your 4 players you think will end up in the top 5, 10, or 20. Ties count
        too.
      </p>

      <div className="mt-2 flex justify-center">
        <div className="grid w-full max-w-[28rem] grid-cols-[3rem_repeat(3,minmax(0,1fr))] gap-2">
          <div />
          {SIDE_BET_COLUMNS.map((column) => (
            <div
              key={column}
              className="px-2 py-1 text-center font-display text-sm font-semibold text-gray-900"
            >
              {column}
            </div>
          ))}

          {(["4 of 4", "3 of 4", "2 of 4"] as SideBetRow[]).map((row) => {
            const rowCells = oddsByRow.get(row) ?? [];

            return (
              <React.Fragment key={row}>
                <div className="self-center pr-2 text-right font-display text-sm font-semibold text-gray-900">
                  {row}
                </div>
                {SIDE_BET_COLUMNS.map((col) => {
                  const cell = rowCells.find((entry) => entry.col === col);
                  if (!cell) return null;

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => setActiveCell(cell)}
                      className={classNames(
                        "w-full rounded-sm border border-gray-300 bg-gray-100 py-3 font-display text-gray-900 transition-colors",
                        "hover:bg-gray-200",
                        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                      )}
                    >
                      <span className="block w-full text-center text-sm leading-tight">
                        {cell.odds.american}
                      </span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={activeCell !== null}
        onClose={closeModal}
        title="Parlay"
        maxWidth="md"
        headerClassName="font-display"
        contentClassName="p-4 font-display"
      >
        {activeCell ? (
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lineup</h5>

            <div>
              <div
                className="rounded-sm border-0 border-l border-t border-r border-b border-gray-200 p-3 font-display shadow-sm"
                style={{
                  borderLeftColor: borderColor,
                  borderLeftWidth: "5px",
                  borderLeftStyle: "solid",
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg">
                    {userLabel}
                    {lineupNumberLabel ? (
                      <span className="ml-1 text-xs font-medium text-gray-500 sm:text-sm">
                        {lineupNumberLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {playerLastNamesLine || "No players"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bet</h5>
              <p className="mt-2 text-base font-semibold text-gray-900">
                {activeCell.col} (including ties) · {activeCell.row} players
              </p>
              <p className="text-sm text-gray-700">
                All four of your players must finish {activeCell.col} to win.
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    American
                  </dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{activeCell.odds.american}</dd>
                </div>
                <div className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Decimal
                  </dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{activeCell.odds.decimal}</dd>
                </div>
                <div className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Fractional
                  </dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{activeCell.odds.english}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
