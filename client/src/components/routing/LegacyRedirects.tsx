import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useActiveEventQuery } from "../../hooks/useSportData";
import { leaderboardPath } from "../../lib/contestNavigation";

export const SportContestRedirect: React.FC = () => {
  const { id } = useParams();
  if (!id) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={`/contest/${id}`} replace />;
};

/** Old share URLs without event id → canonical field page, or `/contests` if none. */
export const ActiveEventLeaderboardRedirect: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const location = useLocation();
  const { data, isLoading } = useActiveEventQuery(sportId ?? "");

  if (!sportId) {
    return <Navigate to="/contests" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center px-4">
        <LoadingSpinner />
      </div>
    );
  }

  const eventId = data?.event.id;
  if (!eventId) {
    return <Navigate to="/contests" replace />;
  }

  return (
    <Navigate
      to={`${leaderboardPath(sportId, eventId)}${location.search}`}
      replace
    />
  );
};

export const UserGroupToLeagueRedirect: React.FC = () => {
  const { id, code } = useParams();
  if (code) {
    return <Navigate to={`/leagues/join/${code}`} replace />;
  }
  if (id) {
    return <Navigate to={`/leagues/${id}`} replace />;
  }
  return <Navigate to="/leagues" replace />;
};
