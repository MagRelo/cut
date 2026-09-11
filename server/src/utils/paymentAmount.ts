import { formatUnits } from "viem";
import { getPaymentTokenAddress } from "../lib/contractAddresses.js";

export const PAYMENT_TOKEN_DECIMALS = 6;
export const LEGACY_TOKEN_DECIMALS = 18;

export function paymentDecimals(
  chainId: number,
  tokenAddress: string | null | undefined,
): number {
  if (!tokenAddress) return PAYMENT_TOKEN_DECIMALS;
  const configured = getPaymentTokenAddress(chainId);
  if (configured && configured.toLowerCase() === tokenAddress.toLowerCase()) {
    return PAYMENT_TOKEN_DECIMALS;
  }
  return LEGACY_TOKEN_DECIMALS;
}

export function humanFromWei(
  amountWei: string | null | undefined,
  chainId: number,
  tokenAddress?: string | null,
): number | null {
  if (amountWei == null || amountWei === "") return null;
  try {
    const decimals = paymentDecimals(chainId, tokenAddress);
    return Number(formatUnits(BigInt(amountWei), decimals));
  } catch {
    return null;
  }
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumHumanPayments(
  payments: Array<{
    amountWei: string;
    chainId: number;
    tokenAddress?: string | null;
  }>,
): number {
  let total = 0;
  for (const payment of payments) {
    const human = humanFromWei(payment.amountWei, payment.chainId, payment.tokenAddress);
    if (human != null) total += human;
  }
  return roundMoney(total);
}
