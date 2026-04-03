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

const TEN_DOLLAR_POSITION = parseUnits("10", 18);

const abi = ContestController.abi as Abi;

export async function fetchSecondaryPoolSnapshot(
  contestAddress: `0x${string}`,
  chainId: number,
): Promise<SecondaryPoolSnapshot> {
  const { chain, rpcUrl } = getChainConfig(chainId);
  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  const primaryEntryInvestmentShareBps = (await client.readContract({
    address: contestAddress,
    abi,
    functionName: "primaryEntryInvestmentShareBps",
  })) as bigint;

  return { primaryEntryInvestmentShareBps };
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
): number | null {
  const entryShares = sharesForSecondaryPricing(netPositionRaw);
  const sim = simulateAddSecondaryPosition({
    amount: TEN_DOLLAR_POSITION,
    entryShares,
    entryLiquidity: entryLiquidityWei,
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
  const potentialWinnings = Number(formatUnits(payoutWei, 18));
  if (!Number.isFinite(potentialWinnings) || potentialWinnings <= 0) {
    return null;
  }
  return 10 / potentialWinnings;
}
