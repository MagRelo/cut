import React from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { EventLeaderboardPanel } from "../components/platform/EventLeaderboardPanel";
import { SportEventHeader } from "../components/platform/SportEventHeader";
import { ErrorMessage } from "../components/common/ErrorMessage";
import {
  getDirectoryEventById,
  parseLeaderboardNavigationState,
} from "../lib/contestNavigation";

export const LeaderboardPage: React.FC = () => {
  const { sportId, eventId } = useParams<{ sportId: string; eventId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

  const navState = parseLeaderboardNavigationState(location.state);
  const headerEvent: CompetitionEventShell | null =
    navState?.eventShell ?? (eventId ? getDirectoryEventById(queryClient, eventId) : null);

  const clearPlayerParams = () => {
    if (!searchParams.has("pgaTourId") && !searchParams.has("playerId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("pgaTourId");
    next.delete("playerId");
    setSearchParams(next, { replace: true });
  };

  if (!sportId || !eventId) {
    return (
      <div className="p-4">
        <ErrorMessage message="Sport and event are required in the URL." />
      </div>
    );
  }

  return (
    <div>
      {headerEvent ? <SportEventHeader sportId={sportId} event={headerEvent} /> : null}
      <div className="px-4 pt-2">
        <EventLeaderboardPanel
          sportId={sportId}
          eventId={eventId}
          eventMetadata={headerEvent?.metadata}
          playerIdParam={playerIdParam}
          pgaTourIdParam={pgaTourIdParam}
          onClearPlayerParams={clearPlayerParams}
        />
      </div>
    </div>
  );
};
