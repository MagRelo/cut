import {
  buildMockPredictionEntryData,
  MOCK_SECONDARY_TOTAL_FUNDS,
  MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
} from "../../src/test/fixtures/contestPredictionMock";

export enum ContestState {
  OPEN = 0,
  ACTIVE = 1,
  LOCKED = 2,
  SETTLED = 3,
  CANCELLED = 4,
  CLOSED = 5,
}

interface StorybookPredictionOptions {
  contestAddress?: string;
  entryIds?: string[];
  enabled?: boolean;
  chainId?: number;
}

const noopRefetch = async () => undefined;

const DEFAULT_ENTRY_IDS = ["1", "2", "3", "4"];

export function useContestPredictionData(options: StorybookPredictionOptions = {}) {
  const entryIds =
    options.entryIds && options.entryIds.length > 0 ? options.entryIds : DEFAULT_ENTRY_IDS;

  const entryData = buildMockPredictionEntryData(entryIds);

  return {
    contestState: ContestState.ACTIVE,
    canPredict: true,
    canWithdraw: true,
    canClaim: false,
    entryData,
    secondaryPrizePool: MOCK_SECONDARY_TOTAL_FUNDS,
    secondaryPrizePoolFormatted: MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
    secondaryPrizePoolSubsidy: 0n,
    secondaryPrizePoolSubsidyFormatted: "0",
    secondaryTotalFunds: MOCK_SECONDARY_TOTAL_FUNDS,
    secondaryTotalFundsFormatted: MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
    poolSnapshot: {},
    isLoading: false,
    contestChainReadsUnavailable: false,
    refetchContestChainReads: noopRefetch,
  };
}
