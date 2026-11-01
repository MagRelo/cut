import React from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import {
  EventCardImage,
  eventCardBodyClassName,
  eventCardSoloClassName,
  useEventCardHeroImage,
} from "../components/platform/EventCardFrame";
import { EventLeaderboardPanel } from "../components/platform/EventLeaderboardPanel";
import { SportEventHeader } from "../components/platform/SportEventHeader";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { useEventQuery } from "../hooks/useSportData";
import { parseLeaderboardNavigationState } from "../lib/contestNavigation";

export const LeaderboardPage: React.FC = () => {
  const { sportId, eventId } = useParams<{ sportId: string; eventId: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventQuery = useEventQuery(sportId, eventId);

  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

  const navState = parseLeaderboardNavigationState(location.state);
  const headerEvent = eventQuery.data ?? navState?.eventShell ?? null;
  const heroImage = useEventCardHeroImage(sportId, headerEvent);

  const clearPlayerParams = () => {
    if (!searchParams.has("pgaTourId") && !searchParams.has("playerId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("pgaTourId");
    next.delete("playerId");
    setSearchParams(next, { replace: true });
  };

  if (!sportId || !eventId) {
    return <ErrorMessage message="Sport and event are required in the URL." />;
  }

  return (
    <section className="shadow-sm">
      {headerEvent && heroImage ? (
        <EventCardImage sportId={sportId} event={headerEvent} />
      ) : null}
      <div className={heroImage ? eventCardBodyClassName : eventCardSoloClassName}>
        {headerEvent ? (
          <div className="border-b border-slate-200">
            <SportEventHeader sportId={sportId} event={headerEvent} summarySurface="content" />
          </div>
        ) : null}
        {headerEvent ? (
          <EventLeaderboardPanel
            sportId={sportId}
            eventId={eventId}
            eventMetadata={headerEvent.metadata}
            playerIdParam={playerIdParam}
            pgaTourIdParam={pgaTourIdParam}
            onClearPlayerParams={clearPlayerParams}
          />
        ) : eventQuery.isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <ErrorMessage
            message={
              eventQuery.error instanceof Error ? eventQuery.error.message : "Event not found."
            }
          />
        )}
      </div>
    </section>
  );
};
