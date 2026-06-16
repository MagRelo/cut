import React from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveEvent } from "../hooks/useActiveEvent";
import { PageHeader } from "../components/common/PageHeader";
import { EventLeaderboardPanel } from "../components/platform/EventLeaderboardPanel";
import { useSportContext } from "../contexts/SportContext";

export const LeaderboardPage: React.FC = () => {
  const { sportId } = useSportContext();
  const { eventId, activeEvent } = useActiveEvent();
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

  if (!eventId) {
    return (
      <div>
        <PageHeader title="Leaderboard" className="px-4 pt-4" />
        <div className="p-4 text-center">
          <p className="text-gray-600">No active event available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Leaderboard" className="px-4 pt-4" />
      <EventLeaderboardPanel
        sportId={sportId}
        eventId={eventId}
        eventMetadata={activeEvent?.event.metadata}
        playerIdParam={playerIdParam}
        pgaTourIdParam={pgaTourIdParam}
        onClearPlayerParams={clearPlayerParams}
      />
    </div>
  );
};
