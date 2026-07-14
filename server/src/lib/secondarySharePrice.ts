/**
 * Matches client secondary "BUY" price: cost per $1 of potential winnings from a fixed $10 deposit
 * (see PredictionLineupsList / PredictionEntryForm + @cut/secondary-pricing).
 */

import { type Abi, createPublicClient, formatUnits, http, parseUnits } from "viem";
import {
  sharesForSecondaryPricing,
  simulateAddSecondaryPosition,
  type SecondaryPoolSnapshot,
} from "@cut/secondary-pricing";
import ContestController from "../contracts/ContestController.json" with { type: "json" };
import { getChainConfig } from "./chainConfig.js";

const abi = ContestController.abi as Abi;

export async function fetchSecondaryPoolSnapshot(
  _contestAddress: `0x${string}`,
  _chainId: number,
): Promise<SecondaryPoolSnapshot> {
  /** `addSecondaryPosition` does not read extra immutables for curve sizing; snapshot is empty. */
  return {};
}

export async function fetchPaymentTokenDecimals(
  contestAddress: `0x${string}`,
  chainId: number,
): Promise<number> {
  const { chain, rpcUrl } = getChainConfig(chainId);
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  try {
    const decimals = (await client.readContract({
      address: contestAddress,
      abi,
      functionName: "paymentTokenDecimals",
    })) as number;
    return Number(decimals);
  } catch {
    return 18;
  }
}

export async function fetchNetPosition(
  contestAddress: `0x${string}`,
  chainId: number,
  entryIdStr: string,
): Promise<bigint> {
  const { chain, rpcUrl } = getChainConfig(chainId);
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  const entryId = BigInt(entryIdStr);
  return client.readContract({
    address: contestAddress,
    abi,
    functionName: "netPosition",
    args: [entryId],
  }) as Promise<bigint>;
}

export async function fetchSecondaryLiquidityPerEntry(
  contestAddress: `0x${string}`,
  chainId: number,
  entryIdStr: string,
): Promise<bigint> {
  const { chain, rpcUrl } = getChainConfig(chainId);
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  const entryId = BigInt(entryIdStr);
  return client.readContract({
    address: contestAddress,
    abi,
    functionName: "secondaryLiquidityPerEntry",
    args: [entryId],
  }) as Promise<bigint>;
}

/**
 * @returns USD cost per $1 of winnings for a marginal $10 buy, or null if undefined / no tokens minted
 */
export function computeSharePriceUsdFromSnapshot(
  pool: SecondaryPoolSnapshot,
  netPositionRaw: bigint,
  entryLiquidityWei: bigint,
  paymentDecimals = 18,
): number | null {
  const tenDollarPosition = parseUnits("10", paymentDecimals);
  const entryShares = sharesForSecondaryPricing(netPositionRaw);
  const sim = simulateAddSecondaryPosition({
    amount: tenDollarPosition,
    entryShares,
    entryLiquidity: entryLiquidityWei,
    paymentDecimals,
    ...pool,
  });
  if (sim.tokensToMint === 0n) {
    return null;
  }
  const newSupply = entryShares + sim.tokensToMint;
  if (newSupply === 0n) {
    return null;
  }
  const payoutWei = (sim.tokensToMint * sim.newSecondaryTotalFunds) / newSupply;
  const potentialWinnings = Number(formatUnits(payoutWei, paymentDecimals));
  if (!Number.isFinite(potentialWinnings) || potentialWinnings <= 0) {
    return null;
  }
  return 10 / potentialWinnings;
}
