import React, { useMemo } from "react";
import { Timeline } from "../Timeline";
import { type TimelineData } from "../../../types/contest";
import { useSportPeriodRules } from "../../../hooks/useSportPeriodRules";
import { ContestLobbyTabHero } from "./ContestLobbyTabHero";

interface ContestTimelinesSectionProps {
  timelineData: TimelineData | undefined;
  sportId?: string;
  currentUserId?: string;
}

export const ContestTimelinesSection: React.FC<ContestTimelinesSectionProps> = ({
  timelineData,
  sportId,
  currentUserId,
}) => {
  const fallbackPeriodRules = useSportPeriodRules(sportId);
  const resolvedTimelineData = useMemo(() => {
    if (!timelineData) return undefined;
    if (timelineData.periods !== undefined) return timelineData;
    return { ...timelineData, periods: fallbackPeriodRules };
  }, [fallbackPeriodRules, timelineData]);

  return (
    <ContestLobbyTabHero>
      {!resolvedTimelineData || resolvedTimelineData.teams.length === 0 ? (
        <div className="font-display text-gray-500">No timeline data available</div>
      ) : (
        <Timeline
          timelineData={resolvedTimelineData}
          currentUserId={currentUserId}
          defaultMetric="score"
          allowedMetrics={["score"]}
        />
      )}
    </ContestLobbyTabHero>
  );
};
