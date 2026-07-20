import React from "react";
import { GroupedContestList } from "../components/contest/GroupedContestList";
import { PageHeader } from "../components/common/PageHeader";
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
  const showUpcomingSection = showInitialLoading || upcoming.length > 0;
  const showLiveSection = live.length > 0;
  const showPastSection = past.length > 0;

  return (
    <div className="mb-4">
      {showUpcomingSection ? (
        <>
          <div className="mb-2">
            <PageHeader title="Upcoming Events" />
          </div>
          <GroupedContestList
            groups={upcoming}
            loading={showInitialLoading}
            error={errorMessage}
            variant="upcoming"
          />
        </>
      ) : null}
      {showLiveSection ? (
        <>
          {showUpcomingSection ? <hr className="my-5 border-gray-200" /> : null}

          <div className="mb-2">
            <PageHeader title="In Progress" />
          </div>
          <GroupedContestList groups={live} loading={false} error={null} />
        </>
      ) : null}
      {showPastSection ? (
        <>
          {showUpcomingSection || showLiveSection ? (
            <hr className="mb-5 mt-4 border-gray-200" />
          ) : null}
          <div className="mb-2">
            <PageHeader title="Past Events" />
          </div>
          <GroupedContestList groups={past} loading={false} error={null} variant="past" />
        </>
      ) : null}
    </div>
  );
};
