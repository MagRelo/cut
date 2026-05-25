import { formatUnits } from "viem";

/** Share weights for pie chart slices (18 decimals). */
const MOCK_SUPPLY_WEIGHTS = [
  45n * 10n ** 18n,
  30n * 10n ** 18n,
  15n * 10n ** 18n,
  10n * 10n ** 18n,
] as const;

export type MockPredictionEntryRow = {
  entryId: string;
  price: bigint;
  priceFormatted: string;
  balance: bigint;
  balanceFormatted: string;
  totalSupply: bigint;
  totalSupplyFormatted: string;
  entryLiquidity: bigint;
  entryLiquidityFormatted: string;
  secondaryDepositedPerEntry: bigint;
  secondaryDepositedFormatted: string;
  impliedWinnings: bigint;
  impliedWinningsFormatted: string;
  hasPosition: boolean;
  isLoadingPrice: boolean;
  isLoadingBalance: boolean;
  isLoadingSupply: boolean;
  isLoadingLiquidity: boolean;
};

export function buildMockPredictionEntryData(entryIds: string[]): MockPredictionEntryRow[] {
  return entryIds.map((entryId, index) => {
    const totalSupply = MOCK_SUPPLY_WEIGHTS[index % MOCK_SUPPLY_WEIGHTS.length];
    const price = BigInt(120_000 + index * 35_000);
    const balance = index === 0 ? 8n * 10n ** 18n : index === 1 ? 3n * 10n ** 18n : 0n;
    const entryLiquidity = 18n * 10n ** 18n;

    return {
      entryId,
      price,
      priceFormatted: (Number(price) / 1e6).toFixed(2),
      balance,
      balanceFormatted: balance > 0n ? formatUnits(balance, 18) : "0",
      totalSupply,
      totalSupplyFormatted: formatUnits(totalSupply, 18),
      entryLiquidity,
      entryLiquidityFormatted: formatUnits(entryLiquidity, 18),
      secondaryDepositedPerEntry: 2n * 10n ** 18n,
      secondaryDepositedFormatted: "2",
      impliedWinnings: 42n * 10n ** 18n,
      impliedWinningsFormatted: "42",
      hasPosition: balance > 0n,
      isLoadingPrice: false,
      isLoadingBalance: false,
      isLoadingSupply: false,
      isLoadingLiquidity: false,
    };
  });
}

export const MOCK_SECONDARY_TOTAL_FUNDS = 250n * 10n ** 18n;
export const MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED = "250";
