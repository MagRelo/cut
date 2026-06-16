import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest } from "../../../types/contest";
import { type ContestLobbyViewModel } from "../../../types/contestLobby";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { EventLeaderboardPanel } from "../../platform/EventLeaderboardPanel";
import { ContestCard } from "../ContestCard";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabIndex = useMemo(() => {
    const tab = searchParams.get("tab");
    if (tab === "field") return viewModel.layout.fieldTabIndex;
    return viewModel.layout.defaultTabIndex;
  }, [searchParams, viewModel.layout.defaultTabIndex, viewModel.layout.fieldTabIndex]);

  const [selectedIndex, setSelectedIndex] = useState(initialTabIndex);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);

  useEffect(() => {
    setSelectedIndex(initialTabIndex);
  }, [viewModel.layout.layoutKey, initialTabIndex]);

  const fieldSportId = contest.event?.sportId;
  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

  const clearPlayerParams = () => {
    if (!searchParams.has("pgaTourId") && !searchParams.has("playerId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("pgaTourId");
    next.delete("playerId");
    setSearchParams(next, { replace: true });
  };

  const [isPayoutsModalOpen, setIsPayoutsModalOpen] = useState(false);

  return (
    <div className="">
      <div className="border-b border-gray-200">
        <div className="px-3 py-4">
          <ContestCard
            contest={contest}
            linkUserGroup
            onPotClick={
              viewModel.phase === "settled" ? undefined : () => setIsPayoutsModalOpen(true)
            }
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
            {viewModel.layout.showFieldTab ? (
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Field
              </Tab>
            ) : null}
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
                eventName={viewModel.primary.eventName}
                eventStartDate={viewModel.primary.eventStartDate}
                currentUserId={currentUserId}
                onEnterContest={() => setIsLineupModalOpen(true)}
              />
            </TabPanel>

            {viewModel.layout.showFieldTab && fieldSportId ? (
              <TabPanel className="p-4 focus:outline-none">
                <EventLeaderboardPanel
                  sportId={fieldSportId}
                  eventId={contest.eventId}
                  eventMetadata={contest.event?.metadata}
                  playerIdParam={playerIdParam}
                  pgaTourIdParam={pgaTourIdParam}
                  onClearPlayerParams={clearPlayerParams}
                />
              </TabPanel>
            ) : null}

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
