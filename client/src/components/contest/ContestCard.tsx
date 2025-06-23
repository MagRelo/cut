import { type Contest } from "../../types.new/contest";
import { Link } from "react-router-dom";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { formatOrdinal } from "../../utils/formatting";

import { useTournament } from "../../contexts/TournamentContext";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
  const { user } = usePortoAuth();
  const { currentTournament } = useTournament();

  const userPosition = contest?.contestLineups?.find(
    (lineup) => lineup.userId === user?.id
  )?.position;

  // const renderPreTournamentCard = () => (
  //   <div className="p-4 border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
  //     <h3 className="text-lg font-extrabold leading-tight">{contest.name}</h3>

  //     <div className="grid grid-cols-[80px_80px_1fr] items-center gap-4">
  //       <div className="flex items-center gap-2">
  //         <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
  //           Entries:
  //         </span>
  //         <span className="text-base text-gray-700 font-medium leading-none">
  //           {contest?.contestLineups?.length ?? 0}/{String(contest?.settings?.maxEntry ?? 0)}
  //         </span>
  //       </div>
  //       <div className="flex items-center gap-2">
  //         <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
  //           Max:
  //         </span>
  //         <span className="text-base text-gray-700 font-medium leading-none">$40</span>
  //       </div>
  //       <div className="flex items-center gap-2">
  //         <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
  //           Entry:
  //         </span>
  //         <span className="text-base text-gray-700 font-medium leading-none">$10</span>
  //       </div>
  //     </div>
  //   </div>
  // );

  const renderPreTournamentCard = () => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg text-gray-700 font-semibold">{contest.name}</span>
          <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3>
        </div>

        <div className="text-lg text-gray-700 font-semibold text-center">
          <div className="flex items-center">
            <img src="/logo-transparent.png" alt="cut-logo" className="h-10 " />

            <div className="flex flex-col items-center">
              <div className="text-lg font-semibold leading-tight">
                {contest.settings?.fee * (contest.settings.maxEntry ?? 0)}
              </div>
              <div className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
                Max
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="text-sm uppercase text-gray-400 font-semibold tracking-wider leading-none">
          Entries:
        </div>
        <span className="text-base text-gray-700 font-medium leading-none">
          {contest.contestLineups?.length}
        </span>
      </div>
    </div>
  );

  const renderInProgressCard = () => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg text-gray-700 font-semibold">{contest.name}</span>
          <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3>
        </div>

        <div className="text-lg text-gray-700 font-semibold text-center">
          <div className="flex items-center">
            <img src="/logo-transparent.png" alt="cut-logo" className="h-10 " />

            <div className="flex flex-col items-center">
              <div className="text-lg font-semibold leading-tight">
                {contest.settings?.fee * (contest.contestLineups?.length ?? 0)}
              </div>
              <div className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
                Pot
              </div>
            </div>
          </div>
        </div>
      </div>

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
      </div>
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
