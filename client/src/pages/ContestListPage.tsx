import React from "react";
import { GroupedContestList } from "../components/contest/GroupedContestList";
import { PageHeader } from "../components/common/PageHeader";
import { useContestDirectory } from "../hooks/useContestDirectory";

export const Contests: React.FC = () => {
  const { data, isLoading, error } = useContestDirectory("all");
  const errorMessage = error instanceof Error ? error.message : error ? "Failed to load contests" : null;
  const showPastSection = (data?.past.length ?? 0) > 0;

  return (
    <div className="mb-4 space-y-4">
      <PageHeader title="Live Events" />
      <GroupedContestList groups={data?.live ?? []} loading={isLoading} error={errorMessage} />
      {showPastSection ? (
        <>
          <hr className="border-gray-200" />
          <PageHeader title="Past Events" />
          <GroupedContestList groups={data?.past ?? []} loading={false} error={null} />
        </>
      ) : null}
    </div>
  );
};
