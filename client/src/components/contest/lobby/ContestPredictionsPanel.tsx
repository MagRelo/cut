import React from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { SignInPrompt } from "../../user/SignInPrompt";
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
    return <SignInPrompt action="place predictions" />;
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
