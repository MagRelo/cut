import React from "react";
import { GroupedContestList } from "../components/contest/GroupedContestList";
import { PageHeader } from "../components/common/PageHeader";
import { useLiveContestsAcrossSports } from "../hooks/useLiveContestsAcrossSports";

export const Contests: React.FC = () => {
  const { contests, isLoading, error } = useLiveContestsAcrossSports();

  return (
    <div className="mb-4 space-y-4">
      <PageHeader title="Live Contests" />
      <GroupedContestList contests={contests} loading={isLoading} error={error} />
    </div>
  );
};
