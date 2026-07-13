import React from "react";
import { type Contest, type TimelineData } from "../../../types/contest";
import { type PrimaryTabMode } from "../../../types/contestLobby";
import { ContestEntryList } from "../ContestEntryList";
import { ContestTimelinesSection } from "./ContestTimelinesSection";

export interface ContestPrimaryTabProps {
  contest: Contest;
  mode: PrimaryTabMode;
  entryListOpensModal: boolean;
  currentUserId?: string;
  isContestDataPending?: boolean;
  timelineData?: TimelineData;
  isTimelineLoading?: boolean;
}

export const ContestPrimaryTab: React.FC<ContestPrimaryTabProps> = ({
  contest,
  mode,
  entryListOpensModal,
  currentUserId,
  isContestDataPending = false,
  timelineData,
  isTimelineLoading = false,
}) => {
  return (
    <div className="space-y-4">
      {mode === "liveTimeline" ? (
        <ContestTimelinesSection
          timelineData={timelineData}
          sportId={contest.event?.sportId}
          currentUserId={currentUserId}
          isLoading={isTimelineLoading || (isContestDataPending && !timelineData)}
        />
      ) : null}

      <ContestEntryList
        contestLineups={contest.contestLineups}
        contestStatus={contest.status}
        entryListOpensModal={entryListOpensModal}
      />
    </div>
  );
};
