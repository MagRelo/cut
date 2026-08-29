import type { CompetitionEventShell } from "@cut/sport-sdk";
import { SportEventHeader } from "../../platform/SportEventHeader";
import { ContestEntryListSkeleton } from "../ContestEntryList";
import { TimelineSkeleton } from "../TimelineSkeleton";
import { tabListClassName } from "../../../lib/tabStyles";

function ContestCardSkeleton() {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2.5" aria-hidden>
      <div className="min-w-0 flex-1 overflow-hidden pl-2">
        <div className="h-6 w-48 max-w-[70%] animate-skeleton-pulse rounded" />
        <div className="mt-1.5 h-4 w-28 max-w-[45%] animate-skeleton-pulse rounded" />
      </div>
      <div className="ml-2 mr-2 flex shrink-0 flex-col items-end">
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
  return (
    <div aria-busy="true" aria-label="Loading contest">
      {eventShell ? (
        <SportEventHeader sportId={eventShell.sportId} event={eventShell} variant="context" />
      ) : null}
      <div>
        <div className="px-3 pb-2 pt-4">
          <ContestCardSkeleton />
        </div>
        <div className="px-3">
          <ContestTabListSkeleton />
        </div>
        <div className="space-y-4 p-4">
          <TimelineSkeleton />
          <ContestEntryListSkeleton />
        </div>
      </div>
    </div>
  );
}
