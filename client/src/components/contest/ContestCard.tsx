import { type Contest } from "../../types.new/contest";
import { Link } from "react-router-dom";
// import { usePortoAuth } from "../../contexts/PortoAuthContext";
// import { formatOrdinal } from "../../utils/formatting";
import { CutAmountDisplay } from "../common/CutAmountDisplay";

import { useTournament } from "../../contexts/TournamentContext";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
  // const { user } = usePortoAuth();
  const { currentTournament } = useTournament();

  // const userPosition = contest?.contestLineups?.find(
  //   (lineup) => lineup.userId === user?.id
  // )?.position;

  const renderPreTournamentCard = () => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg text-gray-700 font-semibold">{contest.name}</span>
          <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3>
        </div>

        <CutAmountDisplay
          amount={contest.settings?.fee * (contest.contestLineups?.length ?? 0)}
          label="Pot"
          logoPosition="right"
        />
      </div>

      {/* <div className="flex items-center gap-2 mt-2">
        <div className="text-sm uppercase text-gray-400 font-semibold tracking-wider leading-none">
          Entries:
        </div>
        <span className="text-base text-gray-700 font-medium leading-none">
          {contest.contestLineups?.length}
        </span>
      </div> */}
    </div>
  );

  const renderInProgressCard = () => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg text-gray-700 font-semibold">{contest.name}</span>
          <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3>
        </div>

        <CutAmountDisplay
          amount={contest.settings?.fee * (contest.contestLineups?.length ?? 0)}
          label="Pot"
          logoPosition="right"
        />
      </div>
      {/* 
      <div className="flex items-center gap-2 mt-2">
        <div className="text-sm uppercase text-gray-400 font-semibold tracking-wider leading-none">
          Position:
        </div>
        <span className="text-base text-gray-700 font-medium leading-none">
          {formatOrdinal(userPosition)}
        </span>
        <div className="text-sm uppercase text-gray-400 font-semibold tracking-wider leading-none">
          Entries:
        </div>
        <span className="text-base text-gray-700 font-medium leading-none">
          {contest.contestLineups?.length}
        </span>
      </div> */}
    </div>
  );

  return (
    <Link to={`/contest/${contest.id}`}>
      {currentTournament?.status === "IN_PROGRESS"
        ? renderInProgressCard()
        : renderPreTournamentCard()}
    </Link>
  );
};
