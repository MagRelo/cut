import React, { useEffect, useMemo, useState } from "react";
import type { Candidate } from "@cut/sport-sdk";
import { useEventFieldLeaderboard } from "../../hooks/useEventFieldLeaderboard";
import {
  candidateHasDisplayName,
  externalIdFromCandidate,
  sortCandidatesByLeaderboard,
} from "../../lib/candidateSorting";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorMessage } from "../common/ErrorMessage";
import { SportParticipantDetailModal } from "./SportParticipantDetailModal";
import { SportParticipantRow } from "./SportParticipantRow";

export interface EventLeaderboardPanelProps {
  sportId: string;
  eventId: string;
  eventMetadata?: unknown;
  playerIdParam?: string | null;
  pgaTourIdParam?: string | null;
  onClearPlayerParams?: () => void;
}

export const EventLeaderboardPanel: React.FC<EventLeaderboardPanelProps> = ({
  sportId,
  eventId,
  eventMetadata,
  playerIdParam,
  pgaTourIdParam,
  onClearPlayerParams,
}) => {
  const { status, candidates, isLoading, error } = useEventFieldLeaderboard(
    sportId,
    eventId,
    eventMetadata,
  );
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const sortedCandidates = useMemo(() => {
    const sortByNameOnly = status === "SCHEDULED";
    const withNames = candidates.filter(candidateHasDisplayName);
    return sortCandidatesByLeaderboard(withNames, { sortByNameOnly });
  }, [candidates, status]);

  useEffect(() => {
    if (isLoading || sortedCandidates.length === 0) return;

    let match: Candidate | undefined;

    if (playerIdParam?.trim()) {
      const normalizedPlayerId = playerIdParam.trim();
      match = sortedCandidates.find(
        (candidate) => String(candidate.participantId).trim() === normalizedPlayerId,
      );
    }

    if (!match && pgaTourIdParam?.trim()) {
      const normalizedExternalId = pgaTourIdParam.trim();
      match = sortedCandidates.find(
        (candidate) => externalIdFromCandidate(candidate)?.trim() === normalizedExternalId,
      );
    }

    if (match) {
      setSelectedCandidate(match);
      setIsPlayerModalOpen(true);
    }
  }, [isLoading, playerIdParam, pgaTourIdParam, sortedCandidates]);

  const openPlayerModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setSelectedCandidate(null);
    if (playerIdParam || pgaTourIdParam) {
      onClearPlayerParams?.();
    }
  };

  const resolvedStatus = status ?? "SCHEDULED";

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (sortedCandidates.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500">
        <p>No players found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="-mx-4 -mt-4">
        {sortedCandidates.map((candidate) => (
          <div key={candidate.participantId} className="border-b border-gray-200">
            <div className="p-3">
              <SportParticipantRow
                candidate={candidate}
                status={resolvedStatus}
                onClick={() => openPlayerModal(candidate)}
              />
            </div>
          </div>
        ))}
      </div>

      <SportParticipantDetailModal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        candidate={selectedCandidate}
        sportId={sportId}
      />
    </>
  );
};
