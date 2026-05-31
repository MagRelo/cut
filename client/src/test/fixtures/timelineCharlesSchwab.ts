import type { TimelineData } from "../../types/contest";
import raw from "./timeline-cmpmotf4f000x9uap786eysdq.json";

/** Charles Schwab contest — live timeline snapshots from production DB. */
export const CHARLES_SCHWAB_CONTEST_ID = "cmpmotf4f000x9uap786eysdq";

export const charlesSchwabTimelineData = raw as TimelineData;

/** Leading team on the timeline (for highlighting the current user in Storybook). */
export const charlesSchwabTimelineLeaderUserId = charlesSchwabTimelineData.teams[0]?.userId;
