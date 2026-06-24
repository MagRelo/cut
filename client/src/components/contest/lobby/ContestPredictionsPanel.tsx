import React from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest } from "../../../types/contest";
import { type PredictionsPanelMode } from "../../../types/contestLobby";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { SignInPrompt } from "../../user/SignInPrompt";
import { PredictionLineupsList } from "../PredictionLineupsList";
import { PredictionPositionsList } from "../PredictionPositionsList";
import { PredictionClaimPanel } from "../PredictionClaimPanel";
import { WinnerPoolOverview } from "./WinnerPoolOverview";

export interface ContestPredictionsPanelProps {
  contest: Contest;
  mode: PredictionsPanelMode;
  placeWagerTabLocked: boolean;
}

export const ContestPredictionsPanel: React.FC<ContestPredictionsPanelProps> = ({
  contest,
  mode,
  placeWagerTabLocked,
}) => {
  return (
    <div className="space-y-4">
      <WinnerPoolOverview contest={contest} mode={mode} placeWagerTabLocked={placeWagerTabLocked} />

      {mode === "connectWallet" ? (
        <SignInPrompt action="use the Winner Pool" className="py-6" />
      ) : null}

      {mode === "wager" ? (
        <TabGroup>
          <TabList className={tabListClassName("px-3")}>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              {placeWagerTabLocked ? <span> 🔒</span> : null} Bet To Win
            </Tab>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Open Bets
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
