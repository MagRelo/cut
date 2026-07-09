import React, { useMemo } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { useSportActiveEvent } from "../hooks/useSportActiveEvent";
import { EventLeaderboardPanel } from "../components/platform/EventLeaderboardPanel";
import { SportEventHeader } from "../components/platform/SportEventHeader";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import {
  getDirectoryEventById,
  parseLeaderboardNavigationState,
} from "../lib/contestNavigation";

export const LeaderboardPage: React.FC = () => {
  const { sportId, eventId: routeEventId } = useParams<{ sportId: string; eventId?: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const activeEvent = useSportActiveEvent(sportId ?? "");
  const [searchParams, setSearchParams] = useSearchParams();

  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

  const navState = parseLeaderboardNavigationState(location.state);

  const resolvedEvent = useMemo((): {
    eventId: string | undefined;
    eventShell: CompetitionEventShell | null;
    metadata: unknown;
    isResolving: boolean;
  } => {
    if (!sportId) {
      return { eventId: undefined, eventShell: null, metadata: null, isResolving: false };
    }

    if (routeEventId) {
      const shell =
        navState?.eventShell ??
        getDirectoryEventById(queryClient, routeEventId) ??
        (activeEvent.eventId === routeEventId && activeEvent.event
          ? {
              id: activeEvent.event.id,
              sportId: activeEvent.event.sportId,
              externalId: activeEvent.event.externalId,
              isActive: activeEvent.event.isActive,
              metadata: activeEvent.event.metadata,
            }
          : null);

      return {
        eventId: routeEventId,
        eventShell: shell,
        metadata: shell?.metadata ?? null,
        isResolving: !shell && activeEvent.isLoading,
      };
    }

    return {
      eventId: activeEvent.eventId,
      eventShell: activeEvent.event
        ? {
            id: activeEvent.event.id,
            sportId: activeEvent.event.sportId,
            externalId: activeEvent.event.externalId,
            isActive: activeEvent.event.isActive,
            metadata: activeEvent.event.metadata,
          }
        : navState?.eventShell ?? null,
      metadata: activeEvent.metadata ?? navState?.eventShell.metadata ?? null,
      isResolving: activeEvent.isLoading,
    };
  }, [
    sportId,
    routeEventId,
    navState,
    queryClient,
    activeEvent.eventId,
    activeEvent.event,
    activeEvent.metadata,
    activeEvent.isLoading,
  ]);

  const clearPlayerParams = () => {
    if (!searchParams.has("pgaTourId") && !searchParams.has("playerId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("pgaTourId");
    next.delete("playerId");
    setSearchParams(next, { replace: true });
  };

  if (!sportId) {
    return (
      <div className="p-4">
        <ErrorMessage message="Sport is required in the URL." />
      </div>
    );
  }

  const headerEvent = resolvedEvent.eventShell ?? undefined;

  if (resolvedEvent.isResolving) {
    return (
      <div>
        <SportEventHeader sportId={sportId} event={headerEvent} variant="context" />
        <div className="flex min-h-[200px] items-center justify-center px-4 pt-2">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!resolvedEvent.eventId) {
    return (
      <div>
        <SportEventHeader sportId={sportId} variant="context" />
        <div className="p-4 text-center">
          <p className="text-gray-600">No active event available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SportEventHeader sportId={sportId} event={headerEvent} variant="context" />
      <div className="px-4 pt-2">
        <EventLeaderboardPanel
          sportId={sportId}
          eventId={resolvedEvent.eventId}
          eventMetadata={resolvedEvent.metadata}
          playerIdParam={playerIdParam}
          pgaTourIdParam={pgaTourIdParam}
          onClearPlayerParams={clearPlayerParams}
        />
      </div>
    </div>
  );
};
