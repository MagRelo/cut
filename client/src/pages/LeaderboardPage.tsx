import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Candidate } from "@cut/sport-sdk";
import { useActiveEvent } from "../hooks/useActiveEvent";
import {
  candidateHasDisplayName,
  externalIdFromCandidate,
  sortCandidatesByLeaderboard,
} from "../lib/candidateSorting";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PageHeader } from "../components/common/PageHeader";
import { SportParticipantDetailModal } from "../components/platform/SportParticipantDetailModal";
import { SportParticipantRow } from "../components/platform/SportParticipantRow";

export const LeaderboardPage: React.FC = () => {
  const { eventId, status, candidates, isLoading, error } = useActiveEvent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const playerIdParam = searchParams.get("playerId");
  const pgaTourIdParam = searchParams.get("pgaTourId");

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
    if (searchParams.has("pgaTourId") || searchParams.has("playerId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("pgaTourId");
      next.delete("playerId");
      setSearchParams(next, { replace: true });
    }
  };

  const header = <PageHeader title="Leaderboard" className="px-4 pt-4" />;
  const resolvedStatus = status ?? "SCHEDULED";

  if (isLoading) {
    return (
      <div>
        {header}
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <div className="p-4">
          <ErrorMessage message={error.message} />
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div>
        {header}
        <div className="p-4 text-center">
          <p className="text-gray-600">No active event available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {header}
      {sortedCandidates.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500">
          <p>No players found.</p>
        </div>
      ) : (
        <div className="p-2 pt-0">
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
      )}

      <SportParticipantDetailModal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        candidate={selectedCandidate}
      />
    </>
  );
};
