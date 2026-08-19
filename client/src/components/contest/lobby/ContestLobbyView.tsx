import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { type Contest, type TimelineData } from "../../../types/contest";
import { type ContestLobbyViewModel } from "../../../types/contestLobby";
import { ErrorMessage } from "../../common/ErrorMessage";
import { ContestEventScopeProvider } from "../../../contexts/EventScopeContext";
import { useContestEvent } from "../../../hooks/useContestEvent";
import { useContestMentionBadge } from "../../../hooks/useContestMentionBadge";
import { useStreamFeedsSession } from "../../../hooks/useStreamFeedsSession";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
import { EventLineupsPanel } from "../../platform/EventLineupsPanel";
import { SportEventHeader } from "../../platform/SportEventHeader";
import { ContestCard } from "../ContestCard";
import { ContestPayoutsModal } from "../ContestPayoutsModal";
import { ContestResultsPanel } from "../ContestResultsPanel";
import { ContestFeedPanel } from "./ContestFeedPanel";
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
  if (tab === "feed" && layout.showFeedTab) return layout.feedTabIndex;
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

  const { client: streamClient } = useStreamFeedsSession();
  const { unreadCount, markContestMentionsRead } = useContestMentionBadge(streamClient, contest.id);

  const handleTabChange = (index: number) => {
    setSelectedIndex(index);
  };

  // Mark contest mentions read whenever the Feed tab is showing (including
  // landing on it / staying on it when new unread arrives). Tab onChange alone
  // misses re-clicks and default selection.
  useEffect(() => {
    if (!viewModel.layout.showFeedTab || selectedIndex !== viewModel.layout.feedTabIndex) {
      return;
    }
    void markContestMentionsRead();
  }, [
    selectedIndex,
    viewModel.layout.showFeedTab,
    viewModel.layout.feedTabIndex,
    markContestMentionsRead,
  ]);

  const hasUnreadMentions = unreadCount > 0;

  const fieldSportId = contest.event?.sportId;

  const [isPayoutsModalOpen, setIsPayoutsModalOpen] = useState(false);
  const { eventShell, error: eventError } = useContestEvent(contest);

  return (
    <ContestEventScopeProvider contest={contest}>
      <div className="">
        {eventError ? (
          <div className="p-4">
            <ErrorMessage message={eventError.message} />
          </div>
        ) : null}
        {fieldSportId && eventShell ? (
          <SportEventHeader sportId={fieldSportId} event={eventShell} variant="context" />
        ) : null}
        <div>
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

          <TabGroup
            selectedIndex={selectedIndex}
            onChange={handleTabChange}
            key={viewModel.layout.layoutKey}
          >
            <div className="px-3">
              <TabList className={tabListClassName()}>
                {viewModel.layout.showLineupsTab ? (
                  <Tab
                    className={({ selected }: { selected: boolean }) =>
                      tabButtonClassName(selected)
                    }
                  >
                    Lineups
                  </Tab>
                ) : null}
                <Tab
                  className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
                >
                  Contest
                </Tab>
                {viewModel.layout.showPredictionsTab ? (
                  <Tab
                    className={({ selected }: { selected: boolean }) =>
                      tabButtonClassName(selected)
                    }
                  >
                    Pool
                  </Tab>
                ) : null}
                {viewModel.layout.showResultsTab ? (
                  <Tab
                    className={({ selected }: { selected: boolean }) =>
                      tabButtonClassName(selected)
                    }
                  >
                    Results
                  </Tab>
                ) : null}
                {viewModel.layout.showFeedTab ? (
                  <Tab
                    className={({ selected }: { selected: boolean }) =>
                      tabButtonClassName(selected)
                    }
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      {hasUnreadMentions ? (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                        />
                      ) : null}
                      Cutbot
                      {hasUnreadMentions ? (
                        <span className="sr-only">, unread mentions</span>
                      ) : null}
                    </span>
                  </Tab>
                ) : null}
              </TabList>
            </div>

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

              {viewModel.layout.showFeedTab ? (
                <TabPanel className="p-4 focus:outline-none">
                  <ContestFeedPanel
                    contest={contest}
                    streamClient={streamClient}
                    currentUserId={currentUserId}
                  />
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
    </ContestEventScopeProvider>
  );
};
