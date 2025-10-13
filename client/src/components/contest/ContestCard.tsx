import { type Contest } from "../../types/contest";
import { Link } from "react-router-dom";
import { useTournament } from "../../contexts/TournamentContext";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
  const { isTournamentEditable, tournamentStatusDisplay } = useTournament();
  const potAmount = contest.settings?.fee * (contest.contestLineups?.length ?? 0);
  const entryCount = contest.contestLineups?.length ?? 0;

  return (
    <Link to={`/contest/${contest.id}`}>
      <div className="bg-white rounded-lg p-3 hover:shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left Section - Entry Fee Badge */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md bg-gradient-to-br from-green-50 to-emerald-50 border border-green-500">
              <span className="text-base font-bold text-green-700">${contest.settings?.fee}</span>
            </div>
          </div>

          {/* Middle Section - Contest Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 font-display truncate leading-tight">
              {contest.name}
            </h3>
            <p className="text-xs text-gray-500 font-medium leading-tight mt-0.5">
              {isTournamentEditable ? (
                <>
                  {entryCount} {entryCount === 1 ? "Entry" : "Entries"}
                </>
              ) : (
                <>{tournamentStatusDisplay}</>
              )}
            </p>
          </div>

          {/* Right Section - Prize Pool */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 leading-none">${potAmount}</div>
              <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                POT
              </div>
            </div>
            <img src="/logo-transparent.png" alt="cut-logo" className="h-8 w-8 object-contain" />
          </div>
        </div>
      </div>
    </Link>
  );
};
