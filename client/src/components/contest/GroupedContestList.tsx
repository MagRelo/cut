import { useMemo, type ReactNode } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { DEFAULT_EVENT_HERO_OVERLAY_CLASSNAME } from "@cut/sport-sdk/ui";
import { type Contest } from "../../types/contest";
import { formatTournamentDateRange } from "../../lib/contestCreation";
import { useAuth } from "../../contexts/AuthContext";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { SportEventHeader } from "../platform/SportEventHeader";
import { ContestList, ContestListConnectHint } from "./ContestList";

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
    const heroImageClassName = plugin?.eventHeroImageClassName;
    const heroOverlayClassName =
      plugin?.eventHeroOverlayClassName ?? DEFAULT_EVENT_HERO_OVERLAY_CLASSNAME;
    return (
      <section className="overflow-hidden rounded-md border border-slate-700 shadow-md">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div
              className={[
                "absolute inset-0 bg-cover bg-center",
                heroImageClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          </div>
          <div className={["absolute inset-0", heroOverlayClassName].join(" ")} aria-hidden />
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
  const { user } = useAuth();
  const groups = useMemo(() => groupContests(contests), [contests]);
  const showConnectHint = !user && !loading && !error;

  let listContent: ReactNode;

  if (loading) {
    listContent = <ContestList contests={[]} loading error={null} />;
  } else if (error) {
    listContent = <ContestList contests={[]} loading={false} error={error} />;
  } else if (contests.length === 0) {
    listContent = <ContestList contests={[]} loading={false} error={null} />;
  } else {
    listContent = (
      <div className="space-y-8">
        {groups.map((group) => (
          <GroupedContestSection key={group.key} group={group} />
        ))}
      </div>
    );
  }

  return (
    <>
      {listContent}
      {showConnectHint ? <ContestListConnectHint /> : null}
    </>
  );
};
