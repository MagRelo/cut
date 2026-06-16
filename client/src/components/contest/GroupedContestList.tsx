import { useMemo } from "react";
import { type Contest } from "../../types/contest";
import { formatTournamentDateRange } from "../../lib/contestCreation";
import { ContestList, PrivateLeagueNotice } from "./ContestList";

export interface ContestEventSummary {
  id: string;
  sportId: string;
  sportName: string;
  externalId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export type LeagueContest = Contest & {
  eventSummary?: ContestEventSummary;
};

interface GroupedContestListProps {
  contests: LeagueContest[];
  loading: boolean;
  error: string | null;
  showPrivateLeagueNotice?: boolean;
}

function groupContests(contests: LeagueContest[]) {
  const groups = new Map<
    string,
    { key: string; label: string; sublabel: string | null; contests: LeagueContest[] }
  >();

  for (const contest of contests) {
    const summary = contest.eventSummary;
    const key = summary?.id ?? contest.eventId;
    const label = summary
      ? `${summary.sportName} · ${summary.name}`
      : "Other events";
    const sublabel =
      summary?.startDate && summary?.endDate
        ? formatTournamentDateRange(summary.startDate, summary.endDate)
        : summary?.externalId ?? null;

    const existing = groups.get(key);
    if (existing) {
      existing.contests.push(contest);
    } else {
      groups.set(key, { key, label, sublabel, contests: [contest] });
    }
  }

  return [...groups.values()];
}

export const GroupedContestList = ({
  contests,
  loading,
  error,
  showPrivateLeagueNotice = false,
}: GroupedContestListProps) => {
  const groups = useMemo(() => groupContests(contests), [contests]);

  if (loading) {
    return <ContestList contests={[]} loading error={null} showPrivateLeagueNotice={showPrivateLeagueNotice} />;
  }

  if (error) {
    return <ContestList contests={[]} loading={false} error={error} showPrivateLeagueNotice={showPrivateLeagueNotice} />;
  }

  if (contests.length === 0) {
    return <ContestList contests={[]} loading={false} error={null} showPrivateLeagueNotice={showPrivateLeagueNotice} />;
  }

  if (groups.length === 1) {
    return (
      <ContestList
        contests={contests}
        loading={false}
        error={null}
        showPrivateLeagueNotice={showPrivateLeagueNotice}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key}>
            <header className="mb-3">
              <h4 className="font-display text-base font-semibold text-gray-900">{group.label}</h4>
              {group.sublabel ? (
                <p className="font-display text-sm text-gray-500">{group.sublabel}</p>
              ) : null}
            </header>
            <ContestList contests={group.contests} loading={false} error={null} />
          </section>
        ))}
      </div>
      {showPrivateLeagueNotice ? <PrivateLeagueNotice /> : null}
    </>
  );
};
