import React from "react";
import { GroupedContestList } from "../components/contest/GroupedContestList";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ListHeader } from "../components/common/ListHeader";
import { useContestDirectory } from "../hooks/useContestDirectory";

export const Contests: React.FC = () => {
  const { data, isLoading, error } = useContestDirectory("all");
  const errorMessage =
    error instanceof Error ? error.message : error ? "Failed to load contests" : null;
  const upcoming = data?.upcoming ?? [];
  const live = data?.live ?? [];
  const past = data?.past ?? [];
  // Only swap to the spinner on the first load — keep cards mounted while refetching.
  const showInitialLoading = isLoading && !data;
  const showUpcomingSection = upcoming.length > 0;
  const showLiveSection = live.length > 0;
  const showPastSection = past.length > 0;

  if (showInitialLoading) {
    return (
      <div className="mb-4 mt-4 min-h-[80px] text-center">
        <p className="mb-4 font-display font-semibold text-gray-400">Loading Events</p>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mb-4">
      {showUpcomingSection ? (
        <>
          <div className="mb-3">
            <ListHeader title="🚩 Upcoming Events" tone="upcoming" />
          </div>
          <GroupedContestList
            groups={upcoming}
            loading={false}
            error={errorMessage}
            variant="upcoming"
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
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-green-500"
                    aria-hidden="true"
                  />
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
};
