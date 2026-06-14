import type { PayoutVector } from "./types.js";

/** Platform default: 100% to 1st if fewer than 10 entries, else 70/20/10 for top 3. */
export function defaultPayoutVector(entryCount: number): PayoutVector {
  if (entryCount < 10) {
    return [10_000];
  }
  return [7_000, 2_000, 1_000];
}
