import React, { useMemo } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Connect } from "../user/Connect";
import { useEffectiveWalletAddress } from "../../hooks/useEffectiveWalletAddress";
import { PredictionLineupsList } from "./PredictionLineupsList";
import { PredictionPositionsList } from "./PredictionPositionsList";
import { PredictionClaimPanel } from "./PredictionClaimPanel";
import { useContestPredictionData, ContestState } from "../../hooks/useContestPredictionData";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { type Contest, areSecondaryActionsLocked } from "../../types/contest";
import { tabButtonClassName, tabListClassName } from "../../lib/tabStyles";

interface ContestPredictionsTabProps {
  contest: Contest;
}

export const ContestPredictionsTab: React.FC<ContestPredictionsTabProps> = ({ contest }) => {
  const userAddress = useEffectiveWalletAddress();

  // Get entry IDs from contest lineups
  const entryIds = useMemo(() => {
    return (
      contest.contestLineups
        ?.filter((lineup) => lineup.entryId)
        .map((lineup) => lineup.entryId as string) || []
    );
  }, [contest.contestLineups]);

  // Fetch contest state
  const { contestState, canPredict, canClaim, isLoading } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds: entryIds.slice(0, 1), // Just need one entry to check state
    enabled: true,
    chainId: contest.chainId,
  });

  // // State labels for display
  // const getStateLabel = (state: ContestState | undefined) => {
  //   switch (state) {
  //     case ContestState.OPEN:
  //       return "Open for Predictions";
  //     case ContestState.ACTIVE:
  //       return "Active - Predictions Available";
  //     case ContestState.LOCKED:
  //       return "Locked - Predictions Closed";
  //     case ContestState.SETTLED:
  //       return "Settled - Claims Available";
  //     case ContestState.CANCELLED:
  //       return "Cancelled";
  //     case ContestState.CLOSED:
  //       return "Closed";
  //     default:
  //       return "Unknown";
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinnerSmall />
      </div>
    );
  }

  // Check if user needs to connect wallet
  if (!userAddress) {
    return (
      <div className="p-2 space-y-4">
        {/* Wallet Connection Prompt */}
        <div className="bg-white p-2 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-gray-600 text-sm font-display">
              <b>Sign In</b> to place predictions
            </p>
          </div>
          <Connect />
        </div>
      </div>
    );
  }

  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);
  const canOpenLineupModal = canPredict && !secondaryActionsLocked;

  return (
    <div className="p-2 space-y-4 mt-1">
      {/* Place Wager + Bets (tabs); when chain is not OPEN/ACTIVE, lineups list only via lobby / other entry points */}
      {canPredict && (
        <TabGroup>
          <TabList className={tabListClassName("space-x-1", "px-4")}>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                tabButtonClassName(selected, { compact: true })
              }
            >
              {!canOpenLineupModal ? <span> 🔒</span> : null} Place Wager
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                tabButtonClassName(selected, { compact: true })
              }
            >
              Bets
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="focus:outline-none">
              <PredictionLineupsList contest={contest} />
            </TabPanel>
            <TabPanel className="focus:outline-none">
              <PredictionPositionsList contest={contest} />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      )}

      {/* Locked State Message */}
      {contestState === ContestState.LOCKED && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-700 text-sm font-display">
            🔒 Predictions are locked. Waiting for contest settlement...
          </p>
        </div>
      )}

      {/* Claim Panel (SETTLED state) */}
      {canClaim && <PredictionClaimPanel contest={contest} />}

      {/* Bets list when predictions UI is the standalone view (no Place Wager tab) */}
      {!canPredict && <PredictionPositionsList contest={contest} />}

      {/* Info Panel */}
      {/* {canPredict && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 font-display">
            Prediction Market Info
          </h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Prices increase with demand (LMSR pricing)</li>
            <li>• 15% entry fee: 7.5% to prize pool, 7.5% to entry bonuses</li>
            <li>• Withdraw before settlement for 100% refund</li>
            <li>• Winner-take-all payout after settlement</li>
          </ul>
        </div>
      )} */}
    </div>
  );
};
