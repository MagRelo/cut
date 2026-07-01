import React from "react";
import { type Contest } from "../../../types/contest";
import { type PrimaryTabMode } from "../../../types/contestLobby";
import { ContestEntryList } from "../ContestEntryList";
import { ContestTimelinesSection } from "./ContestTimelinesSection";

export interface ContestPrimaryTabProps {
  contest: Contest;
  mode: PrimaryTabMode;
  entryListOpensModal: boolean;
  currentUserId?: string;
}

export const ContestPrimaryTab: React.FC<ContestPrimaryTabProps> = ({
  contest,
  mode,
  entryListOpensModal,
  currentUserId,
}) => {
  return (
    <div className="space-y-4">
      {mode === "liveTimeline" ? (
        <ContestTimelinesSection
          timelineData={contest.timeline}
          sportId={contest.event?.sportId}
          currentUserId={currentUserId}
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
