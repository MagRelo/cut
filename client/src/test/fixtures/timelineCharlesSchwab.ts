import type { TimelineData, TimelineDataPoint } from "../../types/contest";
import { PGA_GOLF_PERIOD_RULES } from "@cut/sport-pga-golf";
import raw from "./timeline-cmpmotf4f000x9uap786eysdq.json";

/** Charles Schwab contest — live timeline snapshots from production DB. */
export const CHARLES_SCHWAB_CONTEST_ID = "cmpmotf4f000x9uap786eysdq";

type LegacyTimelinePoint = TimelineDataPoint & { roundNumber?: number };

function normalizeTimelineData(data: TimelineData): TimelineData {
  return {
    ...data,
    teams: data.teams.map((team) => ({
      ...team,
      dataPoints: team.dataPoints.map((point) => {
        const legacy = point as LegacyTimelinePoint;
        const periodNumber = legacy.periodNumber ?? legacy.roundNumber;
        return periodNumber == null ? point : { ...point, periodNumber };
      }),
    })),
  };
}

export const charlesSchwabTimelineData: TimelineData = normalizeTimelineData({
  ...(raw as TimelineData),
  periods: (raw as TimelineData).periods ?? PGA_GOLF_PERIOD_RULES,
});

/** Leading team on the timeline (for highlighting the current user in Storybook). */
export const charlesSchwabTimelineLeaderUserId = charlesSchwabTimelineData.teams[0]?.userId;
