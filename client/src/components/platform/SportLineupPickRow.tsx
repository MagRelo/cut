import React, { useMemo } from "react";
import type { LineupPickShell } from "@cut/sport-sdk/ui";
import type { PlayerWithTournamentData } from "../../types/player";
import { useActiveTournament } from "../../hooks/useTournamentData";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";

interface SportLineupPickRowProps {
  player: PlayerWithTournamentData;
  slotIndex: number;
  roundDisplay: string;
  onClick?: () => void;
}

export const SportLineupPickRow: React.FC<SportLineupPickRowProps> = ({
  player,
  slotIndex,
  roundDisplay,
  onClick,
}) => {
  const plugin = useSportUIPlugin();
  const { eventId, sportId } = useActiveTournament();
  const { data: candidates = [] } = useEventCandidatesQuery(sportId, eventId);
  const PickDetail = plugin?.PickDetail;

  const pick = useMemo((): LineupPickShell | null => {
    const candidate = candidates.find((entry) => entry.participantId === player.id);
    if (!candidate) return null;
    return {
      id: `${slotIndex}-${candidate.eventParticipantId}`,
      eventParticipantId: candidate.eventParticipantId,
      slotIndex,
      metadata: candidate.metadata,
    };
  }, [candidates, player.id, slotIndex]);

  if (!PickDetail || !pick) {
    return (
      <PlayerDisplayRow
        player={player}
        roundDisplay={roundDisplay}
        preRoundLayout
        onClick={onClick}
      />
    );
  }

  return <PickDetail pick={pick} />;
};
