import React from "react";
import { Timeline } from "../Timeline";
import { type TimelineData } from "../../../types/contest";
import { ContestLobbyTabHero } from "./ContestLobbyTabHero";

interface ContestTimelinesSectionProps {
  timelineData: TimelineData | undefined;
  currentUserId?: string;
}

export const ContestTimelinesSection: React.FC<ContestTimelinesSectionProps> = ({
  timelineData,
  currentUserId,
}) => {
  return (
    <ContestLobbyTabHero>
      {!timelineData || timelineData.teams.length === 0 ? (
        <div className="font-display text-gray-500">No timeline data available</div>
      ) : (
        <Timeline
          timelineData={timelineData}
          currentUserId={currentUserId}
          defaultMetric="score"
          allowedMetrics={["score"]}
          fitContainer
          className="h-full w-full"
        />
      )}
    </ContestLobbyTabHero>
  );
};
