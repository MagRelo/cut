import type { ContestDirectoryEvent, EventContestGroup } from "../../types/contest";
import { ListHeader } from "../common/ListHeader";
import { GroupedContestList } from "./GroupedContestList";

interface ContestDirectorySectionsProps {
  upcoming: EventContestGroup[];
  live: EventContestGroup[];
  past: EventContestGroup[];
  error?: string | null;
  createContestToForEvent?: (event: ContestDirectoryEvent) => string | undefined;
}

export function ContestDirectorySections({
  upcoming,
  live,
  past,
  error = null,
  createContestToForEvent,
}: ContestDirectorySectionsProps) {
  const showUpcomingSection = upcoming.length > 0;
  const showLiveSection = live.length > 0;
  const showPastSection = past.length > 0;

  return (
    <div className="mb-4">
      {showUpcomingSection ? (
        <>
          <div className="mb-3">
            <ListHeader title={" 🚩\u00A0 Upcoming Events"} tone="upcoming" />
          </div>
          <GroupedContestList
            groups={upcoming}
            loading={false}
            error={error}
            variant="upcoming"
            createContestToForEvent={createContestToForEvent}
          />
        </>
      ) : null}
      {showLiveSection ? (
        <>
          <div className={showUpcomingSection ? "mb-3 mt-8" : "mb-3"}>
            <ListHeader
              tone="live"
              title={
                <>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
                  In Progress
                </>
              }
            />
          </div>
          <GroupedContestList groups={live} loading={false} error={null} />
        </>
      ) : null}
      {showPastSection ? (
        <>
          <div className={showUpcomingSection || showLiveSection ? "mb-3 mt-8" : "mb-3"}>
            <ListHeader title="Past Events" tone="past" />
          </div>
          <GroupedContestList groups={past} loading={false} error={null} variant="past" />
        </>
      ) : null}
    </div>
  );
}
