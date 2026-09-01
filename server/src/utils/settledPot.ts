import { formatUnits } from "viem";

const SETTLED_POT_STATUSES = new Set(["SETTLED", "CLOSED"]);

function parseWei(value: unknown): bigint | null {
  if (value == null) return null;
  try {
    return BigInt(String(value));
  } catch {
    return null;
  }
}

function sumPaymentAmountWeis(
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

/** Rounded payment-token units. After settle the pot is what left the contract. */
export function settledPotFromPayments(
  amountWeis: readonly string[] | undefined,
  decimals = 6,
): number | null {
  const wei = sumPaymentAmountWeis(amountWeis);
  if (wei == null || wei <= 0n) return null;
  try {
    return Math.round(Number(formatUnits(wei, decimals)));
  } catch {
    return null;
  }
}

export function settledPotForContestRow(
  row: {
    status: string;
    onchainPayments?: { amountWei: string }[];
  },
  decimals = 6,
): number | null {
  if (!SETTLED_POT_STATUSES.has(row.status)) return null;
  return settledPotFromPayments(
    row.onchainPayments?.map((payment) => payment.amountWei),
    decimals,
  );
}
