import type { CompetitionEventShell } from "@cut/sport-sdk";
import { type Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ContestListItem, type ContestListItemVariant } from "./ContestListItem";

interface ContestListProps {
  contests: Contest[];
  loading: boolean;
  error: string | null;
  eventName?: string | null;
  eventStartDate?: string | null;
  eventShell?: CompetitionEventShell;
  variant?: ContestListItemVariant;
}

export function ContestListConnectHint({
  message = "to see private contests",
  className = "mt-6 text-center",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <p className={`font-display text-sm text-gray-600 ${className}`}>
      <Link to="/connect" className="font-semibold text-blue-600 hover:text-blue-700">
        Sign in
      </Link>{" "}
      {message}
    </p>
  );
}

export const ContestList = ({
  contests,
  loading,
  error,
  eventName,
  eventStartDate,
  eventShell,
  variant = "default",
}: ContestListProps) => {
  if (loading) {
    return (
      <div className="mt-4 min-h-[80px] text-center">
        <p className="mb-4 font-display font-semibold text-gray-400">Searching for contests...</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center font-display text-sm text-red-500">{error}</div>;
  }

  const listContent =
    contests.length === 0 ? (
      <div>
        <p className="mb-1 font-display text-base font-semibold text-gray-900">No contests yet</p>
        <p className="font-display text-sm leading-relaxed text-gray-600">
          New contests will show up here when they open. Check back soon.
        </p>
      </div>
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {contests.map((contest) => (
          <ContestListItem
            key={contest.id}
            contest={contest}
            to={contestLobbyPath(contest.address)}
            eventName={eventName}
            eventStartDate={eventStartDate}
            eventShell={eventShell}
            variant={variant}
          />
        ))}
      </div>
    );

  return listContent;
};
