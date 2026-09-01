import { formatUnits } from "viem";
import type { OnchainPaymentView } from "../../types/contest";

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
