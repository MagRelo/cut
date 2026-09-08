import React from "react";
import { ContestDirectorySections } from "../components/contest/ContestDirectorySections";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { useContestDirectory } from "../hooks/useContestDirectory";

export const Contests: React.FC = () => {
  const { data, isLoading, error } = useContestDirectory("all");
  const errorMessage =
    error instanceof Error ? error.message : error ? "Failed to load contests" : null;
  // Only swap to the spinner on the first load — keep cards mounted while refetching.
  const showInitialLoading = isLoading && !data;

  if (showInitialLoading) {
    return (
      <div className="mb-4 mt-4 min-h-[80px] text-center">
        <p className="mb-4 font-display font-semibold text-gray-400">Loading Events</p>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ContestDirectorySections
      upcoming={data?.upcoming ?? []}
      live={data?.live ?? []}
      past={data?.past ?? []}
      error={errorMessage}
    />
  );
};
