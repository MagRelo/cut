import type { CompetitionEventShell } from "@cut/sport-sdk";
import {
  EventCardImage,
  eventCardBodyClassName,
  eventCardSoloClassName,
  useEventCardHeroImage,
} from "../../platform/EventCardFrame";
import { SportEventHeader } from "../../platform/SportEventHeader";
import { ContestEntryListSkeleton } from "../ContestEntryList";
import { TimelineSkeleton } from "../TimelineSkeleton";
import { tabListClassName } from "../../../lib/tabStyles";

function ContestCardSkeleton() {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2.5" aria-hidden>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="h-6 w-48 max-w-[70%] animate-skeleton-pulse rounded" />
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <div className="h-6 w-12 animate-skeleton-pulse rounded" />
        <div className="mt-1 h-2 w-6 animate-skeleton-pulse rounded" />
      </div>
    </div>
  );
}

function ContestTabListSkeleton() {
  return (
    <div className={tabListClassName()} aria-hidden>
      <div className="flex-1 rounded-sm bg-white py-1.5 shadow-sm">
        <div className="mx-auto h-3.5 w-14 animate-skeleton-pulse rounded" />
      </div>
      <div className="flex-1 rounded-sm py-1.5">
        <div className="mx-auto h-3.5 w-10 animate-skeleton-pulse rounded" />
      </div>
      <div className="flex-1 rounded-sm py-1.5">
        <div className="mx-auto h-3.5 w-12 animate-skeleton-pulse rounded" />
      </div>
    </div>
  );
}

export function ContestLobbyLoadingShell({
  eventShell,
}: {
  eventShell?: CompetitionEventShell | null;
}) {
  const heroImage = useEventCardHeroImage(eventShell?.sportId, eventShell);

  return (
    <section className="shadow-sm" aria-busy="true" aria-label="Loading contest">
      {eventShell && heroImage ? (
        <EventCardImage sportId={eventShell.sportId} event={eventShell} />
      ) : null}
      <div className={heroImage ? eventCardBodyClassName : eventCardSoloClassName}>
        {eventShell ? (
          <div className="border-b border-slate-200">
            <SportEventHeader
              sportId={eventShell.sportId}
              event={eventShell}
              summarySurface="content"
            />
          </div>
        ) : null}
        <div className="border-b border-slate-200 px-4 py-3">
          <ContestCardSkeleton />
        </div>
        <ContestTabListSkeleton />
        <div className="space-y-4 p-4">
          <TimelineSkeleton />
          <ContestEntryListSkeleton />
        </div>
      </div>
    </section>
  );
}
