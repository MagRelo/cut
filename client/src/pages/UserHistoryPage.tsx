import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { useUserContestHistory, type UserContestHistoryItem } from "../hooks/useUserContestHistory";

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface ContestHistoryItemProps {
  contest: UserContestHistoryItem;
}

const ContestHistoryItem: React.FC<ContestHistoryItemProps> = ({ contest }) => {
  return (
    <Link
      to={`/contest/${contest.id}`}
      className="block border bg-white rounded-sm p-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Section - Contest Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 font-display truncate">
            {contest.name}
          </h3>
          {contest.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{contest.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {contest.tournament && (
              <span className="font-medium">{contest.tournament.name}</span>
            )}
            {contest.userGroup && (
              <span className="font-medium">• {contest.userGroup.name}</span>
            )}
            <span className="font-medium">
              • {contest.lineupCount} {contest.lineupCount === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>

        {/* Right Section - Status & Date */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
              contest.status === "SETTLED"
                ? "bg-green-100 text-green-800"
                : contest.status === "ACTIVE" || contest.status === "LOCKED"
                ? "bg-blue-100 text-blue-800"
                : contest.status === "OPEN"
                ? "bg-gray-100 text-gray-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {formatStatus(contest.status)}
          </span>
          <div className="text-xs text-gray-500 text-right">
            <div>Ended: {formatDate(contest.endTime)}</div>
            <div className="text-gray-400">Joined: {formatDate(contest.firstParticipatedAt)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const UserHistoryPage: React.FC = () => {
  const {
    data: contests,
    isLoading,
    error,
  } = useUserContestHistory();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="Contest History" className="" />
        <div className="bg-white rounded-sm shadow p-4">
          <div className="text-center min-h-[200px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="Contest History" className="" />
        <div className="bg-white rounded-sm shadow p-4">
          <div className="text-center text-red-500 font-display">
            {error instanceof Error ? error.message : "Failed to load contest history"}
          </div>
        </div>
      </div>
    );
  }

  if (!contests || contests.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="Contest History" className="" />
        <div className="bg-white rounded-sm shadow p-4">
          <div className="text-center my-8">
            <p className="text-gray-400 font-semibold font-display mb-2">
              No contest history found
            </p>
            <p className="text-sm text-gray-500">
              You haven't participated in any contests yet.{" "}
              <Link to="/contests" className="text-blue-600 hover:text-blue-800 underline">
                Browse contests
              </Link>{" "}
              to get started!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Contest History" className="" />
      <div className="bg-white rounded-sm shadow p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600 font-display">
            You've participated in <span className="font-semibold">{contests.length}</span>{" "}
            {contests.length === 1 ? "contest" : "contests"}
          </p>
        </div>
        <div className="grid gap-3">
          {contests.map((contest) => (
            <ContestHistoryItem key={contest.id} contest={contest} />
          ))}
        </div>
      </div>
    </div>
  );
};

