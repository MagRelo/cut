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
      className="block min-w-0 w-full border bg-white rounded-sm p-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-[3.75rem] flex-shrink-0 rounded-md border border-gray-300/90 bg-gradient-to-b from-white to-gray-200 p-1.5 text-center shadow-sm ring-1 ring-inset ring-white/60">
          <div className="text-base font-display font-bold leading-none tabular-nums text-gray-900">
            {contest.primaryDeposit === 0
              ? "Free"
              : contest.primaryDeposit != null
                ? `$${contest.primaryDeposit}`
                : "—"}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500">
            buy-in
          </div>
        </div>
        {/* Left Section - Contest Info */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="truncate text-base font-bold text-gray-900 font-display">
            {contest.name}
          </h3>
          {contest.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{contest.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {contest.userGroup && <span className="font-medium">• {contest.userGroup.name}</span>}
            <span>Ended: {formatDate(contest.endTime)}</span>
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
        </div>
      </div>
    </Link>
  );
};

export const UserHistoryPage: React.FC = () => {
  const { data: contests, isLoading, error } = useUserContestHistory();

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
