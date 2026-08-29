import React, { useMemo } from "react";
import { Timeline } from "../Timeline";
import { TimelineSkeleton } from "../TimelineSkeleton";
import { type TimelineData } from "../../../types/contest";
import { useSportPeriodRules } from "../../../hooks/useSportPeriodRules";
import { ContestLobbyTabHero } from "./ContestLobbyTabHero";
import {
  DEFAULT_TIMELINE_TITLE,
  TimelineChartWell,
  TimelineFrame,
  TimelineHeader,
} from "../timelineLayout";

interface ContestTimelinesSectionProps {
  timelineData: TimelineData | undefined;
  sportId?: string;
  currentUserId?: string;
  isLoading?: boolean;
}

export const ContestTimelinesSection: React.FC<ContestTimelinesSectionProps> = ({
  timelineData,
  sportId,
  currentUserId,
  isLoading = false,
}) => {
  const fallbackPeriodRules = useSportPeriodRules(sportId);
  const resolvedTimelineData = useMemo(() => {
    if (!timelineData) return undefined;
    if (timelineData.periods !== undefined) return timelineData;
    return { ...timelineData, periods: fallbackPeriodRules };
  }, [fallbackPeriodRules, timelineData]);

  const timelineTitle =
    resolvedTimelineData?.periods?.timelineTitle ??
    fallbackPeriodRules?.timelineTitle ??
    DEFAULT_TIMELINE_TITLE;

  return (
    <ContestLobbyTabHero>
      {isLoading ? (
        <TimelineSkeleton title={timelineTitle} />
      ) : !resolvedTimelineData || resolvedTimelineData.teams.length === 0 ? (
        <TimelineFrame>
          <TimelineHeader title={timelineTitle} />
          <TimelineChartWell>
            <div className="flex h-full items-center justify-center font-display text-sm text-gray-500">
              No timeline data available
            </div>
          </TimelineChartWell>
        </TimelineFrame>
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
