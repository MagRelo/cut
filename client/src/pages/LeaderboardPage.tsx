import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSportActiveEvent } from "../hooks/useSportActiveEvent";
import { PageHeader } from "../components/common/PageHeader";
import { EventLeaderboardPanel } from "../components/platform/EventLeaderboardPanel";
import { SportEventHeader } from "../components/platform/SportEventHeader";
import { ErrorMessage } from "../components/common/ErrorMessage";

export const LeaderboardPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const { eventId, metadata } = useSportActiveEvent(sportId ?? "");
  const [searchParams, setSearchParams] = useSearchParams();

  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

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

  if (!eventId) {
    return (
      <div>
        <SportEventHeader sportId={sportId} variant="context" />
        <PageHeader title="Leaderboard" className="px-8 pt-4" />
        <div className="p-4 text-center">
          <p className="text-gray-600">No active event available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SportEventHeader sportId={sportId} variant="context" />
      <PageHeader title="Leaderboard" className="px-8 pt-2" />
      <div className="px-4">
        <EventLeaderboardPanel
          sportId={sportId}
          eventId={eventId}
          eventMetadata={metadata}
          playerIdParam={playerIdParam}
          pgaTourIdParam={pgaTourIdParam}
          onClearPlayerParams={clearPlayerParams}
        />
      </div>
    </div>
  );
};
