import React, { useEffect, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest } from "../../../types/contest";
import { type ContestLobbyViewModel } from "../../../types/contestLobby";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { Modal } from "../../common/Modal";
import { ContestCard } from "../ContestCard";
import { ContestSettings } from "../ContestSettings";
import { ContestPayoutsModal } from "../ContestPayoutsModal";
import { ContestResultsPanel } from "../ContestResultsPanel";
import { ContestPrimaryTab } from "./ContestPrimaryTab";
import { ContestPredictionsPanel } from "./ContestPredictionsPanel";
import { ContestLineupModal } from "./ContestLineupModal";

export interface ContestLobbyViewProps {
  contest: Contest;
  viewModel: ContestLobbyViewModel;
  currentUserId?: string;
  isAuthenticated: boolean;
}

export const ContestLobbyView: React.FC<ContestLobbyViewProps> = ({
  contest,
  viewModel,
  currentUserId,
  isAuthenticated,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(viewModel.layout.defaultTabIndex);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);

  useEffect(() => {
    setSelectedIndex(viewModel.layout.defaultTabIndex);
  }, [viewModel.layout.layoutKey, viewModel.layout.defaultTabIndex]);
  /** Settings modal kept for later; lobby header hides the trigger for now. */
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPayoutsModalOpen, setIsPayoutsModalOpen] = useState(false);

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-sm border border-gray-200 bg-white shadow">
        <div className="px-3 py-4">
          <ContestCard
            contest={contest}
            onPotClick={
              viewModel.phase === "settled"
                ? undefined
                : () => setIsPayoutsModalOpen(true)
            }
            onSettingsClick={undefined}
          />
        </div>

        <TabGroup
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
          key={viewModel.layout.layoutKey}
        >
          <TabList className={tabListClassName("px-3")}>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Contest
            </Tab>
            {viewModel.layout.showPredictionsTab ? (
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Winner Pool
              </Tab>
            ) : null}
            {viewModel.layout.showResultsTab ? (
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Results
              </Tab>
            ) : null}
          </TabList>

          <TabPanels>
            <TabPanel className="p-4 focus:outline-none">
              <ContestPrimaryTab
                contest={contest}
                mode={viewModel.primary.mode}
                showCountdown={viewModel.primary.showCountdown}
                entryListOpensModal={viewModel.primary.entryListOpensModal}
                currentUserId={currentUserId}
                onEnterContest={() => setIsLineupModalOpen(true)}
              />
            </TabPanel>

            {viewModel.layout.showPredictionsTab ? (
              <TabPanel className="p-4 focus:outline-none">
                <ContestPredictionsPanel
                  contest={contest}
                  mode={viewModel.predictions.mode}
                  placeWagerTabLocked={viewModel.predictions.placeWagerTabLocked}
                />
              </TabPanel>
            ) : null}

            {viewModel.layout.showResultsTab ? (
              <TabPanel className="p-0 focus:outline-none">
                <ContestResultsPanel contest={contest} />
              </TabPanel>
            ) : null}
          </TabPanels>
        </TabGroup>
      </div>

      {/* Settings — wire onSettingsClick on ContestCard when re-enabled */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Settings"
        maxWidth="2xl"
        scrollable
        maxHeight="600px"
      >
        <ContestSettings contest={contest} />
      </Modal>

      {viewModel.phase !== "settled" ? (
        <ContestPayoutsModal
          isOpen={isPayoutsModalOpen}
          onClose={() => setIsPayoutsModalOpen(false)}
          contest={contest}
        />
      ) : null}

      <ContestLineupModal
        contest={contest}
        isOpen={isLineupModalOpen}
        onClose={() => setIsLineupModalOpen(false)}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};
