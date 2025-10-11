import { type Contest } from "../../types/contest";
import { Link } from "react-router-dom";
import { CutAmountDisplay } from "../common/CutAmountDisplay";

import { useTournament } from "../../contexts/TournamentContext";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
  const { isTournamentEditable, currentTournament } = useTournament();

  const renderPreTournamentCard = () => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-lg text-gray-700 font-semibold font-display">{contest.name}</span>
          <div>
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm w-14">
              ${contest.settings?.fee}
            </span>
            <span className="text-sm text-gray-500 ml-4">
              Entries: {contest.contestLineups?.length}
            </span>
          </div>
        </div>
        <CutAmountDisplay
          amount={contest.settings?.fee * (contest.contestLineups?.length ?? 0)}
          label="Pot"
          logoPosition="right"
        />
      </div>
    </div>
  );

  const renderInProgressCard = () => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg text-gray-700 font-semibold font-display">{contest.name}</span>
          <h3 className="text-sm font-sans text-gray-500 mt-1">
            {currentTournament?.roundDisplay} - {currentTournament?.roundStatusDisplay}
          </h3>
        </div>

        <CutAmountDisplay
          amount={contest.settings?.fee * (contest.contestLineups?.length ?? 0)}
          label="Pot"
          logoPosition="right"
        />
      </div>
    </div>
  );

  return (
    <Link to={`/contest/${contest.id}`}>
      {isTournamentEditable ? renderPreTournamentCard() : renderInProgressCard()}
    </Link>
  );
};
