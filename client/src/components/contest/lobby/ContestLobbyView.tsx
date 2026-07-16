import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest, type TimelineData } from "../../../types/contest";
import { type ContestLobbyViewModel } from "../../../types/contestLobby";
import { ErrorMessage } from "../../common/ErrorMessage";
import { useContestEvent } from "../../../hooks/useContestEvent";
import { useSportUIPlugin } from "../../../hooks/useSportUI";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { EventLineupsPanel } from "../../platform/EventLineupsPanel";
import { ContestCard } from "../ContestCard";
import { ContestPayoutsModal } from "../ContestPayoutsModal";
import { ContestResultsPanel } from "../ContestResultsPanel";
import { ContestStatusBar } from "./ContestStatusBar";
import { ContestPrimaryTab } from "./ContestPrimaryTab";
import { ContestPredictionsPanel } from "./ContestPredictionsPanel";

export interface ContestLobbyViewProps {
  contest: Contest;
  viewModel: ContestLobbyViewModel;
  currentUserId?: string;
  isAuthenticated: boolean;
  /** True while placeholder handoff data is shown and the lobby fetch is still in flight. */
  isContestDataPending?: boolean;
  timelineData?: TimelineData;
  isTimelineLoading?: boolean;
}

function tabIndexFromQuery(
  tab: string | null,
  layout: ContestLobbyViewModel["layout"],
): number | null {
  if (tab === "lineups" && layout.showLineupsTab) return layout.lineupsTabIndex;
  if (tab === "contest") return layout.contestTabIndex;
  if (tab === "results" && layout.showResultsTab) return layout.tailTabIndex;
  if (tab === "pool" && layout.showPredictionsTab) return layout.tailTabIndex;
  return null;
}

export const ContestLobbyView: React.FC<ContestLobbyViewProps> = ({
  contest,
  viewModel,
  currentUserId,
  isAuthenticated,
  isContestDataPending = false,
  timelineData,
  isTimelineLoading = false,
}) => {
  const [searchParams] = useSearchParams();
  const initialTabIndex = useMemo(() => {
    const fromQuery = tabIndexFromQuery(searchParams.get("tab"), viewModel.layout);
    return fromQuery ?? viewModel.layout.defaultTabIndex;
  }, [searchParams, viewModel.layout]);

  const [selectedIndex, setSelectedIndex] = useState(initialTabIndex);

  useEffect(() => {
    setSelectedIndex(initialTabIndex);
  }, [viewModel.layout.layoutKey, initialTabIndex]);

  const fieldSportId = contest.event?.sportId;

  const [isPayoutsModalOpen, setIsPayoutsModalOpen] = useState(false);
  const {
    eventShell,
    error: eventError,
    eventName,
    eventStartDate,
    sportId,
    currentPeriod,
    periodDisplay,
    periodStatusDisplay,
  } = useContestEvent(contest);
  const plugin = useSportUIPlugin();
  const EventSummary = plugin?.EventSummary;

  return (
    <div className="">
      {eventError ? (
        <div className="p-4">
          <ErrorMessage message={eventError.message} />
        </div>
      ) : null}
      {eventShell && EventSummary ? <EventSummary event={eventShell} /> : null}
      <div className="border-b border-gray-200">
        <div className="px-3 pb-2 pt-4">
          <ContestCard
            contest={contest}
            linkUserGroup
            showPotIcon={viewModel.phase !== "settled"}
            onPotClick={
              viewModel.phase === "settled" ? undefined : () => setIsPayoutsModalOpen(true)
            }
          />
        </div>

        <div className="mb-3">
          <ContestStatusBar
            contestStatus={contest.status}
            eventName={eventName}
            eventStartDate={eventStartDate}
            sportId={sportId}
            currentPeriod={currentPeriod}
            periodDisplay={periodDisplay}
            periodStatusDisplay={periodStatusDisplay}
          />
        </div>

        <TabGroup
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
          key={viewModel.layout.layoutKey}
        >
          <TabList className={tabListClassName("px-3")}>
            {viewModel.layout.showLineupsTab ? (
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                My Lineups
              </Tab>
            ) : null}
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
            {viewModel.layout.showLineupsTab && fieldSportId ? (
              <TabPanel className="p-4 focus:outline-none">
                <EventLineupsPanel
                  contest={contest}
                  sportId={fieldSportId}
                  eventId={contest.eventId}
                  eventMetadata={contest.event?.metadata}
                  isAuthenticated={isAuthenticated}
                />
              </TabPanel>
            ) : null}

            <TabPanel className="p-4 focus:outline-none">
              <ContestPrimaryTab
                contest={contest}
                mode={viewModel.primary.mode}
                entryListOpensModal={viewModel.primary.entryListOpensModal}
                currentUserId={currentUserId}
                isContestDataPending={isContestDataPending}
                timelineData={timelineData}
                isTimelineLoading={isTimelineLoading}
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
              <TabPanel className="p-4 focus:outline-none">
                <ContestResultsPanel contest={contest} isLoading={isContestDataPending} />
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
    </div>
  );
};
