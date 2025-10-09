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
        <div>
          <span className="text-lg text-gray-700 font-semibold">{contest.name}</span>
          <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3>
        </div>
        <CutAmountDisplay
          amount={contest.settings?.fee * (contest._count?.contestLineups ?? 0)}
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
          <span className="text-2xl text-gray-700 font-semibold">{contest.name}</span>
          {/* <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3> */}
          <h3 className="text-medium text-gray-500 mt-1">
            {currentTournament?.roundDisplay} - {currentTournament?.roundStatusDisplay}
          </h3>
        </div>

        <CutAmountDisplay
          amount={contest.settings?.fee * (contest._count?.contestLineups ?? 0)}
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
