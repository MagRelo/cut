import {
  clampPublishedDecimal,
  decimalToAmerican,
  decimalToEnglishFractional,
} from "./decimalAmerican.js";
import { sideBetPricingMargin } from "../sideBets/sideBetPricingConfig.js";

export type SideBetRowLabel = "2 of 4" | "3 of 4" | "4 of 4";
export type SideBetColLabel = "Top 5" | "Top 10" | "Top 20";

export interface PlayerFinishDecimals {
  /** Bovada decimal for top-5 market (must be > 1). */
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

export interface CalculateRoundRobinOddsOptions {
  /** Overrides SIDE_BET_PRICING_MARGIN env when set. */
  margin?: number;
}

const ROWS: SideBetRowLabel[] = ["4 of 4", "3 of 4", "2 of 4"];
const COLS: { label: SideBetColLabel; key: keyof PlayerFinishDecimals }[] = [
  { label: "Top 5", key: "top5" },
  { label: "Top 10", key: "top10" },
  { label: "Top 20", key: "top20" },
];

function assertProbs(probs: number[]): void {
  if (probs.length < 1) {
    throw new Error("probAtLeastK requires at least one probability");
  }
  for (const p of probs) {
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("each probability must be in (0, 1)");
    }
  }
}

function assertK(k: number, n: number): void {
  if (!Number.isInteger(k) || k < 1 || k > n) {
    throw new Error(`k must be an integer from 1 to ${n}`);
  }
}

function assertMargin(margin: number): void {
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error("margin must be a non-negative finite number");
  }
}

/** P(at least k successes) for independent Bernoulli legs. */
export function probAtLeastK(probs: number[], k: number): number {
  assertProbs(probs);
  const n = probs.length;
  assertK(k, n);
  let pWin = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let hits = 0;
    let pr = 1;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) {
        hits++;
        pr *= probs[i]!;
      } else {
        pr *= 1 - probs[i]!;
      }
    }
    if (hits >= k) pWin += pr;
  }
  return pWin;
}

/** House-shortened decimal: 1 / (P(win) * (1 + margin)), cap P at 0.9999. */
export function publishDecimal(probs: number[], k: number, margin: number): number {
  assertMargin(margin);
  const p = probAtLeastK(probs, k);
  const pAdj = Math.min(p * (1 + margin), 0.9999);
  return 1 / pAdj;
}

function rowToK(row: SideBetRowLabel): number {
  if (row === "2 of 4") return 2;
  if (row === "3 of 4") return 3;
  return 4;
}

function resolveMargin(options?: CalculateRoundRobinOddsOptions): number {
  if (options?.margin !== undefined) return options.margin;
  return sideBetPricingMargin();
}

/**
 * Four players × top5/10/20 Bovada decimals → 3×3 grid via P(at least k) under independence.
 */
export function calculateRoundRobinOdds(
  players: [
    PlayerFinishDecimals,
    PlayerFinishDecimals,
    PlayerFinishDecimals,
    PlayerFinishDecimals,
  ],
  options?: CalculateRoundRobinOddsOptions,
): SideBetCellQuote[] {
  if (players.length !== 4) {
    throw new Error("calculateRoundRobinOdds requires exactly 4 players");
  }

  const margin = resolveMargin(options);
  assertMargin(margin);

  const cells: SideBetCellQuote[] = [];

  for (const row of ROWS) {
    const k = rowToK(row);

    for (const { label: col, key } of COLS) {
      const probs = players.map((p) => 1 / p[key]);
      const rawDecimal = publishDecimal(probs, k, margin);
      const rounded = Math.round(rawDecimal * 10000) / 10000;
      const decimal = clampPublishedDecimal(rounded);

      cells.push({
        row,
        col,
        decimal,
        american: decimalToAmerican(decimal),
        english: decimalToEnglishFractional(decimal),
      });
    }
  }

  return cells;
}
