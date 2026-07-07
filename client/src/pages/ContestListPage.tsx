import React from "react";
import { GroupedContestList } from "../components/contest/GroupedContestList";
import { PageHeader } from "../components/common/PageHeader";
import { useContestDirectory } from "../hooks/useContestDirectory";

export const Contests: React.FC = () => {
  const { data, isLoading, error } = useContestDirectory("all");
  const errorMessage = error instanceof Error ? error.message : error ? "Failed to load contests" : null;
  const upcoming = data?.upcoming ?? [];
  const live = data?.live ?? [];
  const past = data?.past ?? [];
  const showLiveSection = live.length > 0;
  const showPastSection = past.length > 0;

  return (
    <div className="mb-4 space-y-4">
      <PageHeader title="Upcoming Events" />
      <GroupedContestList groups={upcoming} loading={isLoading} error={errorMessage} />
      {showLiveSection ? (
        <>
          <hr className="border-gray-200" />
          <PageHeader title="Live Events" />
          <GroupedContestList groups={live} loading={false} error={null} />
        </>
      ) : null}
      {showPastSection ? (
        <>
          <hr className="border-gray-200" />
          <PageHeader title="Past Events" />
          <GroupedContestList groups={past} loading={false} error={null} />
        </>
      ) : null}
    </div>
  );
};
