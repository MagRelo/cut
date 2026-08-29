import React, { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/tabStyles";

/** Chart plot height when the timeline is not stretching to a parent. */
export const TIMELINE_CHART_HEIGHT_PX = 220;

export const DEFAULT_TIMELINE_TITLE = "Event Timeline";

const timelineFrameClassName =
  "flex w-full flex-col overflow-hidden rounded-sm border border-gray-300 bg-white font-display";

interface TimelineFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  fitContainer?: boolean;
}

export const TimelineFrame: React.FC<TimelineFrameProps> = ({
  children,
  className,
  fitContainer = false,
  ...rest
}) => {
  return (
    <div
      className={cn(timelineFrameClassName, fitContainer && "h-full min-h-0", className)}
      {...rest}
    >
      {children}
    </div>
  );
};

export const TimelineHeader: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="shrink-0 px-3 pb-2 pt-2.5">
      <h3 className="text-sm font-semibold leading-tight text-gray-900">{title}</h3>
      <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
        Each line tracks a lineup&apos;s total points.
      </p>
    </div>
  );
};

export const TimelineChartWell: React.FC<{
  children: ReactNode;
  fitContainer?: boolean;
}> = ({ children, fitContainer = false }) => {
  return (
    <div
      className={cn("timeline-chart min-h-0 px-2 pb-3 pt-1", fitContainer ? "flex-1" : "")}
      style={fitContainer ? undefined : { height: TIMELINE_CHART_HEIGHT_PX }}
    >
      {children}
    </div>
  );
};
