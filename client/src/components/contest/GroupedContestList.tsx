import { type ReactNode } from "react";
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
}

function eventSublabel(event: ContestDirectoryEvent): string | null {
  if (event.startDate && event.endDate) {
    return formatTournamentDateRange(event.startDate, event.endDate);
  }
  return event.externalId;
}

function directoryHeroOverlayClass(variant: ContestListItemVariant): string {
  if (variant === "past") {
    return "bg-gradient-to-b from-black/40 via-black/15 to-black/5";
  }
  return "bg-gradient-to-b from-black/35 via-black/10 to-transparent";
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
  const plugin = useSportUIPlugin(group.event.sportId);
  const eventShell = eventShellFromDirectoryEvent(group.event);
  const heroImage = plugin?.resolveEventHeroImage ? plugin.resolveEventHeroImage(eventShell) : null;
  const hasHeroPanel = Boolean(group.event.sportId && heroImage);

  if (hasHeroPanel) {
    const heroImageClassName = plugin?.eventHeroImageClassName;
    return (
      <section className="overflow-hidden rounded-2xl shadow-xl shadow-slate-900/25">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div
              className={cn("absolute inset-0 bg-cover bg-center", heroImageClassName)}
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          </div>
          <div className={cn("absolute inset-0", directoryHeroOverlayClass(variant))} aria-hidden />
          <div className="relative z-10">
            <SportEventHeader
              sportId={group.event.sportId}
              event={eventShell}
              summarySurface="content"
            />
            <div className="px-3 pb-3.5 pt-1">
              <div
                className={cn(
                  "rounded-lg p-2.5",
                  group.contests.length > 0 &&
                    "bg-black/40 ring-1 ring-white/15 backdrop-blur-[2px]",
                )}
              >
                <ContestList
                  contests={group.contests}
                  loading={false}
                  error={null}
                  eventShell={eventShell}
                  variant={variant}
                  nest="hero"
                  createContestTo={createContestTo}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
      {group.event.sportId ? (
        <SportEventHeader sportId={group.event.sportId} event={eventShell} />
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
          eventShell={eventShell}
          variant={variant}
          createContestTo={createContestTo}
        />
      </div>
    </section>
  );
}

export const GroupedContestList = ({
  groups,
  loading,
  error,
  variant = "default",
  createContestToForEvent,
}: GroupedContestListProps) => {
  const { user } = useAuth();
  const showConnectHint = !user && !loading && !error;

  let listContent: ReactNode;

  // Prefer existing groups over the spinner so refetches don't rip hero images out.
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
      {showConnectHint ? <ContestListConnectHint /> : null}
    </>
  );
};
