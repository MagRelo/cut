import { type Contest } from "../../types.new/contest";
import { Link } from "react-router-dom";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { formatOrdinal } from "../../utils/formatting";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest, preTournament = false }: ContestCardProps) => {
  const { user } = usePortoAuth();

  const userPosition = contest?.contestLineups?.find(
    (lineup) => lineup.userId === user?.id
  )?.position;

  const renderPreTournamentCard = () => (
    <div className="p-4 border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <h3 className="text-lg font-extrabold leading-tight">{contest.name}</h3>

      <div className="grid grid-cols-[80px_80px_1fr] items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
            Entries:
          </span>
          <span className="text-base text-gray-700 font-medium leading-none">
            {contest?.contestLineups?.length ?? 0}/{String(contest?.settings?.maxEntry ?? 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
            Max:
          </span>
          <span className="text-base text-gray-700 font-medium leading-none">$40</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
            Entry:
          </span>
          <span className="text-base text-gray-700 font-medium leading-none">$10</span>
        </div>
      </div>
    </div>
  );

  const renderInProgressCard = () => (
    <div className="p-4 border bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-gray-500">{contest.tournament?.name}</h3>
        <span className="text-sm text-gray-700 font-semibold">
          {contest.settings?.fee} {contest.settings?.paymentTokenSymbol}
        </span>
      </div>

      <div className="grid grid-cols-[66px_66px_1fr] items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
            POS
          </span>
          <span className="text-base text-gray-700 font-medium leading-none">
            {formatOrdinal(userPosition)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
            POT
          </span>
          <span className="text-base text-gray-700 font-medium leading-none">
            {contest.settings?.fee * (contest.contestLineups?.length ?? 0)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
            REM
          </span>
          <span className="text-base text-gray-700 font-medium leading-none">
            {contest.tournament?.roundDisplay || "-"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Link to={`/contest/${contest.id}`}>
      {preTournament ? renderPreTournamentCard() : renderInProgressCard()}
    </Link>
  );
};
