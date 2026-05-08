import React, { useMemo, useState } from "react";

type SideBetRow = "2 of 4" | "3 of 4" | "4 of 4";
type SideBetCol = "Top 5" | "Top 10" | "Top 20";

interface SideBetCell {
  row: SideBetRow;
  col: SideBetCol;
  odds: string;
}

const SIDE_BET_COLUMNS: SideBetCol[] = ["Top 5", "Top 10", "Top 20"];

const SIDE_BET_CELLS: SideBetCell[] = [
  { row: "2 of 4", col: "Top 5", odds: "+500" },
  { row: "2 of 4", col: "Top 10", odds: "+300" },
  { row: "2 of 4", col: "Top 20", odds: "+150" },
  { row: "3 of 4", col: "Top 5", odds: "+800" },
  { row: "3 of 4", col: "Top 10", odds: "+400" },
  { row: "3 of 4", col: "Top 20", odds: "+200" },
  { row: "4 of 4", col: "Top 5", odds: "+1500" },
  { row: "4 of 4", col: "Top 10", odds: "+800" },
  { row: "4 of 4", col: "Top 20", odds: "+400" },
];

const makeKey = (row: SideBetRow, col: SideBetCol) => `${row}-${col}`;

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const SideBetPanel: React.FC = () => {
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(new Set());

  const oddsByRow = useMemo(() => {
    const byRow = new Map<SideBetRow, SideBetCell[]>();
    SIDE_BET_CELLS.forEach((cell) => {
      const current = byRow.get(cell.row) ?? [];
      current.push(cell);
      byRow.set(cell.row, current);
    });
    return byRow;
  }, []);

  const toggleCell = (row: SideBetRow, col: SideBetCol) => {
    const key = makeKey(row, col);
    setSelectedCellKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="rounded-sm bg-white p-4 pt-0">
      <h4 className="font-display text-base font-semibold text-gray-900">Lineup Parlays</h4>
      <p className="mt-1 font-display text-sm leading-relaxed text-gray-700">
        Pick how many of your 4 players you think will end up in the top 5, 10, or 20. Ties count
        too.
      </p>

      <div className="mt-4 flex justify-center">
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

                  const isSelected = selectedCellKeys.has(makeKey(row, col));

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => toggleCell(row, col)}
                      className={classNames(
                        "w-full rounded-sm border px-4 py-3 text-center font-display transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                        isSelected
                          ? "border-green-500 bg-green-100 text-green-900"
                          : "border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200",
                      )}
                      aria-pressed={isSelected}
                    >
                      <span className="block text-base font-medium leading-tight">{cell.odds}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {}}
        className="mt-5 w-full rounded border border-blue-500 bg-blue-500 px-3 py-2 text-center font-display text-base font-semibold text-white transition-colors hover:bg-blue-600"
      >
        {`Place ${selectedCellKeys.size} Bet${selectedCellKeys.size === 1 ? "" : "s"}`}
      </button>
    </div>
  );
};
