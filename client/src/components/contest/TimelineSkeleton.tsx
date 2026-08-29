import React from "react";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import {
  DEFAULT_TIMELINE_TITLE,
  TimelineChartWell,
  TimelineFrame,
  TimelineHeader,
} from "./timelineLayout";

interface TimelineSkeletonProps {
  title?: string;
  fitContainer?: boolean;
}

export const TimelineSkeleton: React.FC<TimelineSkeletonProps> = ({
  title = DEFAULT_TIMELINE_TITLE,
  fitContainer = false,
}) => {
  return (
    <TimelineFrame fitContainer={fitContainer} aria-busy="true" aria-label="Loading timeline">
      <TimelineHeader title={title} />
      <TimelineChartWell fitContainer={fitContainer}>
        <div className="flex h-full w-full items-center justify-center">
          <LoadingSpinnerSmall color="gray" />
        </div>
      </TimelineChartWell>
    </TimelineFrame>
  );
};
