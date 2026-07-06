import { type ReactNode } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { DEFAULT_EVENT_HERO_OVERLAY_CLASSNAME } from "@cut/sport-sdk/ui";
import type { ContestDirectoryEvent, EventContestGroup } from "../../types/contest";
import { formatTournamentDateRange } from "../../lib/contestCreation";
import { useAuth } from "../../contexts/AuthContext";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { SportEventHeader } from "../platform/SportEventHeader";
import { ContestList, ContestListConnectHint } from "./ContestList";

interface GroupedContestListProps {
  groups: EventContestGroup[];
  loading: boolean;
  error: string | null;
}

function eventShellFromDirectoryEvent(event: ContestDirectoryEvent): CompetitionEventShell {
  return {
    id: event.id,
    sportId: event.sportId,
    externalId: event.externalId,
    isActive: event.isActive,
    metadata: event.metadata ?? {
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
    },
  };
}

function eventSublabel(event: ContestDirectoryEvent): string | null {
  if (event.startDate && event.endDate) {
    return formatTournamentDateRange(event.startDate, event.endDate);
  }
  return event.externalId;
}

function GroupedContestSection({ group }: { group: EventContestGroup }) {
  const plugin = useSportUIPlugin(group.event.sportId);
  const eventShell = eventShellFromDirectoryEvent(group.event);
  const heroImage =
    plugin?.resolveEventHeroImage ? plugin.resolveEventHeroImage(eventShell) : null;
  const hasHeroPanel = Boolean(group.event.sportId && heroImage);

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
              sportId={group.event.sportId}
              event={eventShell}
              variant="standalone"
              summarySurface="content"
            />
            <div className="p-3 pt-1">
              <ContestList
                contests={group.contests}
                loading={false}
                error={null}
                eventName={group.event.name}
                eventStartDate={group.event.startDate}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {group.event.sportId ? (
        <SportEventHeader
          sportId={group.event.sportId}
          event={eventShell}
          variant="standalone"
        />
      ) : (
        <header className="border-b border-slate-100 px-4 py-3">
          <h4 className="font-display text-base font-semibold text-gray-900">
            {group.event.sportName} · {group.event.name}
          </h4>
          {eventSublabel(group.event) ? (
            <p className="font-display text-sm text-gray-500">{eventSublabel(group.event)}</p>
          ) : null}
        </header>
      )}
      <div className="border-t border-slate-800 bg-slate-900 p-3">
        <ContestList
          contests={group.contests}
          loading={false}
          error={null}
          eventName={group.event.name}
          eventStartDate={group.event.startDate}
        />
      </div>
    </section>
  );
}

export const GroupedContestList = ({ groups, loading, error }: GroupedContestListProps) => {
  const { user } = useAuth();
  const showConnectHint = !user && !loading && !error;

  let listContent: ReactNode;

  if (loading) {
    listContent = <ContestList contests={[]} loading error={null} />;
  } else if (error) {
    listContent = <ContestList contests={[]} loading={false} error={error} />;
  } else if (groups.length === 0) {
    listContent = <ContestList contests={[]} loading={false} error={null} />;
  } else {
    listContent = (
      <div className="space-y-8">
        {groups.map((group) => (
          <GroupedContestSection key={group.event.id} group={group} />
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
