import React from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { Connect } from "../../user/Connect";
import { ContestSharesPieChart } from "../ContestSharesPieChart";
import { PredictionLineupsList } from "../PredictionLineupsList";
import { PredictionPositionsList } from "../PredictionPositionsList";
import { PredictionClaimPanel } from "../PredictionClaimPanel";
import { ContestLobbyTabHero } from "./ContestLobbyTabHero";

export interface ContestPredictionsPanelProps {
  contest: Contest;
  mode: PredictionsPanelMode;
  placeWagerTabLocked: boolean;
}

function PredictionsHeroContent({
  contest,
  mode,
}: {
  contest: Contest;
  mode: PredictionsPanelMode;
}) {
  if (mode === "connectWallet") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center justify-center gap-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="font-display text-sm text-gray-600">
            <b>Sign In</b> to place predictions
          </p>
        </div>
        <Connect />
      </div>
    );
  }

  if (mode === "locked") {
    return (
      <div className="max-w-md rounded-lg border border-gray-200 bg-gray-50 px-6 py-5 text-center">
        <p className="font-display text-sm text-gray-700">
          🔒 Predictions are locked. Waiting for contest settlement...
        </p>
      </div>
    );
  }

  return <ContestSharesPieChart contest={contest} />;
}

export const ContestPredictionsPanel: React.FC<ContestPredictionsPanelProps> = ({
  contest,
  mode,
  placeWagerTabLocked,
}) => {
  return (
    <div className="space-y-4">
      <ContestLobbyTabHero>
        <PredictionsHeroContent contest={contest} mode={mode} />
      </ContestLobbyTabHero>

      {mode === "wager" ? (
        <TabGroup>
          <TabList className={tabListClassName("px-3")}>
            <Tab
              className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
            >
              {placeWagerTabLocked ? <span> 🔒</span> : null} Place Wager
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
            >
              Bets
            </Tab>
          </TabList>
          <TabPanels className="pt-4">
            <TabPanel className="focus:outline-none">
              <PredictionLineupsList contest={contest} />
            </TabPanel>
            <TabPanel className="focus:outline-none">
              <PredictionPositionsList contest={contest} />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      ) : null}

      {mode === "claim" ? <PredictionClaimPanel contest={contest} /> : null}

      {mode === "positions" ? <PredictionPositionsList contest={contest} /> : null}
    </div>
  );
};
