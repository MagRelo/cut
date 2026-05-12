import { combinationsOfIndices } from "./combinations.js";
import { decimalToAmerican, decimalToEnglishFractional } from "./decimalAmerican.js";

export type SideBetRowLabel = "2 of 4" | "3 of 4" | "4 of 4";
export type SideBetColLabel = "Top 5" | "Top 10" | "Top 20";

export interface PlayerFinishDecimals {
  /** DataGolf / model decimal for top-5 market (must be > 1). */
  top5: number;
  top10: number;
  top20: number;
}

export interface SideBetCellQuote {
  row: SideBetRowLabel;
  col: SideBetColLabel;
  decimal: number;
  american: string;
  english: string;
}

const ROWS: SideBetRowLabel[] = ["4 of 4", "3 of 4", "2 of 4"];
const COLS: { label: SideBetColLabel; key: keyof PlayerFinishDecimals }[] = [
  { label: "Top 5", key: "top5" },
  { label: "Top 10", key: "top10" },
  { label: "Top 20", key: "top20" },
];

/**
 * Four players × top5/10/20 decimals → 3×3 grid (mean of combo products per plan).
 */
export function calculateRoundRobinOdds(players: [
  PlayerFinishDecimals,
  PlayerFinishDecimals,
  PlayerFinishDecimals,
  PlayerFinishDecimals,
]): SideBetCellQuote[] {
  if (players.length !== 4) {
    throw new Error("calculateRoundRobinOdds requires exactly 4 players");
  }

  const cells: SideBetCellQuote[] = [];

  for (const row of ROWS) {
    const k = row === "2 of 4" ? 2 : row === "3 of 4" ? 3 : 4;
    const combos = combinationsOfIndices(4, k);

    for (const { label: col, key } of COLS) {
      const comboDecimals = combos.map((idxs) =>
        idxs.reduce((acc, pi) => acc * players[pi]![key], 1),
      );
      const meanDecimal =
        comboDecimals.reduce((a, b) => a + b, 0) / comboDecimals.length;

      cells.push({
        row,
        col,
        decimal: meanDecimal,
        american: decimalToAmerican(meanDecimal),
        english: decimalToEnglishFractional(meanDecimal),
      });
    }
  }

  return cells;
}
