import React from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ContestLobbyView } from "../components/contest/lobby/ContestLobbyView";
import { useContestQuery } from "../hooks/useContestQuery";
import { useContestLobbyState } from "../hooks/useContestLobbyState";
import { isApiError } from "../utils/apiError";

export const ContestLobby: React.FC = () => {
  const { address: contestAddress } = useParams<{ address: string }>();
  const { user } = useAuth();

  const { data: contest, isLoading, error: queryError } = useContestQuery(contestAddress);
  const { viewModel } = useContestLobbyState(contest);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-lg bg-white shadow">
          <div className="flex min-h-[176px] items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (queryError) {
    const message =
      isApiError(queryError) && queryError.statusCode === 404
        ? "Contest not found"
        : queryError.message;

    return (
      <div className="space-y-3 p-4">
        <div className="min-h-[176px] rounded-lg bg-white shadow">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="mb-2 text-lg font-medium text-gray-800">{message}</p>
            {message !== "Contest not found" && (
              <p className="text-sm text-gray-500">{queryError.message}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!contest || !viewModel) {
    return <div className="space-y-3 p-4 font-display">Contest not found</div>;
  }

  return (
    <ContestLobbyView
      contest={contest}
      viewModel={viewModel}
      currentUserId={user?.id}
      isAuthenticated={Boolean(user)}
    />
  );
};
