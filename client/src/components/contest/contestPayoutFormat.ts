import { defaultPayoutVector } from "@cut/sport-sdk";
import { formatUnits } from "viem";
import type { Contest, OnchainPaymentView } from "../../types/contest";

export function formatTokenAmount(valueWei: bigint, decimals: number, fractionDigits = 2) {
  const valueStr = formatUnits(valueWei, decimals);
  const [whole, fraction = ""] = valueStr.split(".");
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionDigits <= 0) return wholeWithCommas;
  const fixedFraction = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `${wholeWithCommas}.${fixedFraction}`;
}

export function formatDollarFromWei(valueWei: bigint, decimals: number, fractionDigits = 2) {
  return `$${formatTokenAmount(valueWei, decimals, fractionDigits)}`;
}

export function parseAmountWei(row: OnchainPaymentView): bigint | null {
  try {
    return BigInt(row.amountWei);
  } catch {
    return null;
  }
}

/** Winner-take-all (< 10 entries) vs 70/20/10. Prefer settled payoutBps when present. */
export function contestWinnerPayoutBlurb(
  contest: Pick<Contest, "results" | "_count" | "contestLineups">,
): string {
  const settledPaidPlaces = contest.results?.payoutBps?.filter((bps) => bps > 0).length ?? 0;
  const paidPlaces =
    settledPaidPlaces > 0
      ? settledPaidPlaces
      : defaultPayoutVector(
          contest._count?.contestLineups ?? contest.contestLineups?.length ?? 0,
        ).length;

  return paidPlaces <= 1 ? "Winner takes all." : "Top three lineups split the pot.";
}
