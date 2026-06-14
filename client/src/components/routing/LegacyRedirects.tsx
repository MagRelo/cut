import React from "react";
import { Navigate, useParams } from "react-router-dom";

export const SportContestRedirect: React.FC = () => {
  const { id } = useParams();
  if (!id) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={`/contest/${id}`} replace />;
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
