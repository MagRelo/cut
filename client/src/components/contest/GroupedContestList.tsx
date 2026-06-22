import { useMemo } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { type Contest } from "../../types/contest";
import { formatTournamentDateRange } from "../../lib/contestCreation";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { SportEventHeader } from "../platform/SportEventHeader";
import { ContestList } from "./ContestList";

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
}

function eventShellFromContest(contest: LeagueContest): CompetitionEventShell | null {
  const event = contest.event;
  if (event?.sportId) {
    return {
      id: event.id,
      sportId: event.sportId,
      externalId: event.externalId,
      isActive: event.isActive ?? true,
      metadata: event.metadata,
    };
  }

  const summary = contest.eventSummary;
  if (!summary) return null;

  return {
    id: summary.id,
    sportId: summary.sportId,
    externalId: summary.externalId,
    isActive: true,
    metadata: {
      name: summary.name,
      startDate: summary.startDate,
      endDate: summary.endDate,
    },
  };
}

function groupContests(contests: LeagueContest[]) {
  const groups = new Map<
    string,
    {
      key: string;
      sportId: string | null;
      label: string;
      sublabel: string | null;
      eventShell: CompetitionEventShell | null;
      contests: LeagueContest[];
    }
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
    const sportId = contest.event?.sportId ?? summary?.sportId ?? null;

    const existing = groups.get(key);
    if (existing) {
      existing.contests.push(contest);
    } else {
      groups.set(key, {
        key,
        sportId,
        label,
        sublabel,
        eventShell: eventShellFromContest(contest),
        contests: [contest],
      });
    }
  }

  return [...groups.values()];
}

type ContestGroup = ReturnType<typeof groupContests>[number];

function GroupedContestSection({ group }: { group: ContestGroup }) {
  const plugin = useSportUIPlugin(group.sportId ?? undefined);
  const heroImage =
    group.eventShell && plugin?.resolveEventHeroImage
      ? plugin.resolveEventHeroImage(group.eventShell)
      : null;
  const hasHeroPanel = Boolean(group.sportId && group.eventShell && heroImage);

  if (hasHeroPanel) {
    return (
      <section className="overflow-hidden rounded-md border border-slate-700 shadow-md">
        <div className="relative">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/75 to-slate-950/95"
            aria-hidden
          />
          <div className="relative z-10">
            <SportEventHeader
              sportId={group.sportId!}
              event={group.eventShell!}
              variant="standalone"
              summarySurface="content"
            />
            <div className="p-3 pt-1">
              <ContestList contests={group.contests} loading={false} error={null} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {group.sportId && group.eventShell ? (
        <SportEventHeader
          sportId={group.sportId}
          event={group.eventShell}
          variant="standalone"
        />
      ) : (
        <header className="border-b border-slate-100 px-4 py-3">
          <h4 className="font-display text-base font-semibold text-gray-900">{group.label}</h4>
          {group.sublabel ? (
            <p className="font-display text-sm text-gray-500">{group.sublabel}</p>
          ) : null}
        </header>
      )}
      <div className="border-t border-slate-800 bg-slate-900 p-3">
        <ContestList contests={group.contests} loading={false} error={null} />
      </div>
    </section>
  );
}

export const GroupedContestList = ({
  contests,
  loading,
  error,
}: GroupedContestListProps) => {
  const groups = useMemo(() => groupContests(contests), [contests]);

  if (loading) {
    return <ContestList contests={[]} loading error={null} />;
  }

  if (error) {
    return <ContestList contests={[]} loading={false} error={error} />;
  }

  if (contests.length === 0) {
    return <ContestList contests={[]} loading={false} error={null} />;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <GroupedContestSection key={group.key} group={group} />
      ))}
    </div>
  );
};
