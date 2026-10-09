import { type ReactNode } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import type { ContestDirectoryEvent, EventContestGroup } from "../../types/contest";
import { formatTournamentDateRange } from "../../lib/contestCreation";
import { eventShellFromDirectoryEvent } from "../../lib/contestNavigation";
import { useAuth } from "../../contexts/AuthContext";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { cn } from "../../lib/tabStyles";
import { SportEventHeader } from "../platform/SportEventHeader";
import { ContestList, ContestListConnectHint } from "./ContestList";
import type { ContestListItemVariant } from "./ContestListItem";

interface GroupedContestListProps {
  groups: EventContestGroup[];
  loading: boolean;
  error: string | null;
  variant?: ContestListItemVariant;
  createContestToForEvent?: (event: ContestDirectoryEvent) => string | undefined;
  showConnectHint?: boolean;
}

function eventSublabel(event: ContestDirectoryEvent): string | null {
  if (event.startDate && event.endDate) {
    return formatTournamentDateRange(event.startDate, event.endDate);
  }
  return event.externalId;
}

function EventImageBand({ sportId, event }: { sportId: string; event: CompetitionEventShell }) {
  const plugin = useSportUIPlugin(sportId);
  const heroImage = plugin?.resolveEventHeroImage ? plugin.resolveEventHeroImage(event) : null;
  if (!heroImage) return null;

  return (
    <div
      className={cn("h-36 bg-cover bg-center sm:h-44", plugin?.eventHeroImageClassName)}
      style={{ backgroundImage: `url(${heroImage})` }}
      aria-hidden
    />
  );
}

function GroupedContestSection({
  group,
  variant = "default",
  createContestTo,
}: {
  group: EventContestGroup;
  variant?: ContestListItemVariant;
  createContestTo?: string;
}) {
  const eventShell = eventShellFromDirectoryEvent(group.event);
  const sublabel = eventSublabel(group.event);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-400/60 bg-white">
      {group.event.sportId ? (
        <>
          <EventImageBand sportId={group.event.sportId} event={eventShell} />
          <div className="border-b border-slate-200">
            <SportEventHeader
              sportId={group.event.sportId}
              event={eventShell}
              summarySurface="content"
            />
          </div>
        </>
      ) : (
        <header className="border-b border-slate-200 px-4 py-3">
          <h4 className="font-display text-2xl font-bold leading-snug tracking-tight text-gray-900 sm:text-3xl">
            {group.event.sportName} · {group.event.name}
          </h4>
          {sublabel ? (
            <p className="mt-1 font-display text-sm font-medium text-gray-900">{sublabel}</p>
          ) : null}
        </header>
      )}
      <ContestList
        contests={group.contests}
        loading={false}
        error={null}
        eventShell={eventShell}
        variant={variant}
        createContestTo={createContestTo}
      />
    </section>
  );
}

export const GroupedContestList = ({
  groups,
  loading,
  error,
  variant = "default",
  createContestToForEvent,
  showConnectHint = false,
}: GroupedContestListProps) => {
  const { user } = useAuth();
  const renderConnectHint = showConnectHint && !user && !loading && !error;

  let listContent: ReactNode;

  // Prefer existing groups over the spinner so refetches don't rip the list out.
  if (groups.length > 0) {
    listContent = (
      <div className="space-y-5">
        {groups.map((group) => (
          <GroupedContestSection
            key={group.event.id}
            group={group}
            variant={variant}
            createContestTo={createContestToForEvent?.(group.event)}
          />
        ))}
      </div>
    );
  } else if (loading) {
    listContent = <ContestList contests={[]} loading error={null} />;
  } else if (error) {
    listContent = <ContestList contests={[]} loading={false} error={error} />;
  } else {
    listContent = <ContestList contests={[]} loading={false} error={null} />;
  }

  return (
    <>
      {listContent}
      {renderConnectHint ? <ContestListConnectHint /> : null}
    </>
  );
};
