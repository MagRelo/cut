import { formatUnits, parseUnits } from "viem";
import { getContractAddress } from "../utils/blockchainUtils";

export const PAYMENT_TOKEN_DECIMALS = 6;

export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export function isAppPaymentToken(
  chainId: number,
  tokenAddress: string | null | undefined,
): boolean {
  if (!tokenAddress) return false;
  const configured = getContractAddress(chainId, "paymentTokenAddress");
  return !!configured && configured.toLowerCase() === tokenAddress.toLowerCase();
}

/** Decimals for a contest's on-chain payment token (xUSDC = 6; legacy CUT contests = 18). */
export function contestPaymentDecimals(chainId: number, contestPaymentToken: string): number {
  return isAppPaymentToken(chainId, contestPaymentToken) ? PAYMENT_TOKEN_DECIMALS : 18;
}

export function primaryDepositWeiFromHuman(humanAmount: number): bigint {
  return BigInt(Math.floor(humanAmount * 10 ** PAYMENT_TOKEN_DECIMALS));
}

export function parseContestAmountFromHuman(
  humanAmount: string,
  chainId: number,
  contestPaymentToken: string,
): bigint {
  return parseUnits(humanAmount, contestPaymentDecimals(chainId, contestPaymentToken));
}

export function hasEnoughTokenBalance(spendableBalance: bigint, amountWei: bigint): boolean {
  if (amountWei === 0n) return true;
  return spendableBalance >= amountWei;
}

/** @deprecated Legacy contests only — human-readable conversion for 18-dec CUT display. */
export function formatContestAmount(amountWei: bigint, chainId: number, contestPaymentToken: string): string {
  return formatUnits(amountWei, contestPaymentDecimals(chainId, contestPaymentToken));
}
