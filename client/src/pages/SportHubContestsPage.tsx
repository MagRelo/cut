import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ContestList, ContestListConnectHint } from "../components/contest/ContestList";
import { PageHeader } from "../components/common/PageHeader";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import { useSportActiveEvent } from "../hooks/useSportActiveEvent";
import { useContestsQuery } from "../hooks/useContestQuery";

/** Contests for the active event of the sport in the URL (`/sports/:sportId`). */
export const SportHubContests: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const { user } = useAuth();
  const { eventId, isLoading: isEventLoading, error: fetchError } = useSportActiveEvent(
    sportId ?? "",
  );

  const {
    data: contestsWithLineupsData,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useContestsQuery(eventId, undefined);
  const eventError = fetchError instanceof Error ? fetchError.message : null;
  const contestsErrorMessage = contestsError instanceof Error ? contestsError.message : null;
  const error = eventError ?? contestsErrorMessage;

  const contests = useMemo(() => {
    const list = contestsWithLineupsData ?? [];
    return [...list].sort((a, b) => {
      const feeA = a.settings?.primaryDeposit ?? 0;
      const feeB = b.settings?.primaryDeposit ?? 0;
      return feeB - feeA;
    });
  }, [contestsWithLineupsData]);

  const showLoading =
    isEventLoading || (isContestsLoading && contestsWithLineupsData === undefined);

  if (!sportId) {
    return (
      <div className="p-4">
        <ErrorMessage message="Sport is required in the URL." />
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-4">
      <PageHeader title="Live Contests" />
      <ContestList contests={contests} loading={showLoading} error={error} />
      {!user && !showLoading && !error ? <ContestListConnectHint /> : null}
    </div>
  );
};
