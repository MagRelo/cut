import {
  buildMockPredictionEntryData,
  MOCK_SECONDARY_TOTAL_FUNDS,
  MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
} from "../../src/test/fixtures/contestPredictionMock";
import { ContestState } from "../../src/chain/contestState";

interface StorybookContest {
  address?: string | null;
}

const noopRefetch = async () => undefined;

const DEFAULT_ENTRY_IDS = ["1", "2", "3", "4"];

export function useContestEntries(
  _contest?: StorybookContest | null,
  entryIds: string[] = [],
  _options?: { enabled?: boolean },
) {
  const ids = entryIds.length > 0 ? entryIds : DEFAULT_ENTRY_IDS;
  const entryData = buildMockPredictionEntryData(ids);

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
    paymentDecimals: 18,
    isLoading: false,
    contestChainReadsUnavailable: false,
    refetchContestChainReads: noopRefetch,
  };
}
