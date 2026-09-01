import { formatUnits } from "viem";

export type SettledPotSnapshot = {
  grossTvlWei?: unknown;
  primarySideBalance?: unknown;
  secondarySideBalance?: unknown;
};

function parseWei(value: unknown): bigint | null {
  if (value == null) return null;
  try {
    return BigInt(String(value));
  } catch {
    return null;
  }
}

export function sumPaymentAmountWeis(
  amountWeis: readonly string[] | undefined,
): bigint | null {
  if (!amountWeis?.length) return null;
  let total = 0n;
  for (const wei of amountWeis) {
    const parsed = parseWei(wei);
    if (parsed == null) return null;
    total += parsed;
  }
  return total;
}

export function settledPotWei(input: {
  snapshot?: SettledPotSnapshot | null;
  paymentAmountWeis?: readonly string[];
}): bigint | null {
  const gross = parseWei(input.snapshot?.grossTvlWei);
  if (gross != null) return gross;

  const payments = sumPaymentAmountWeis(input.paymentAmountWeis);
  if (payments != null) return payments;

  if (!input.snapshot) return null;

  const primary = parseWei(input.snapshot.primarySideBalance ?? "0") ?? 0n;
  const secondary = parseWei(input.snapshot.secondarySideBalance ?? "0") ?? 0n;
  return primary + secondary;
}

/** Rounded human-token units for directory/lobby pot display (USDC = 6 decimals). */
export function settledPotFromSettlement(
  input: {
    snapshot?: SettledPotSnapshot | null;
    paymentAmountWeis?: readonly string[];
  },
  decimals = 6,
): number | null {
  const wei = settledPotWei(input);
  if (wei == null) return null;
  try {
    return Math.round(Number(formatUnits(wei, decimals)));
  } catch {
    return null;
  }
}
