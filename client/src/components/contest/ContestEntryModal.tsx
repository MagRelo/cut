import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import type { Candidate } from "@cut/sport-sdk";
import { useEventScope } from "../../contexts/EventScopeContext";
import {
  candidatesByEventParticipantIdMap,
  candidatesForLineupPicks,
  contestLineupDisplayName,
  lineupPicksFromContestLineup,
} from "../../lib/candidateUtils";
import { useCandidateSort } from "../../hooks/useCandidateSort";
import { lineupDisplayScore } from "../../lib/lineupScore";
import { golfPredictionValue } from "../../lib/golfPrediction";
import { SportParticipantDetailModal } from "../platform/SportParticipantDetailModal";
import { SportParticipantRow } from "../platform/SportParticipantRow";
import { EntryHeader } from "./EntryHeader";
import { type ContestLineup } from "../../types/lineup";

interface ContestEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineup: ContestLineup | null;
  userName?: string;
}

export const ContestEntryModal: React.FC<ContestEntryModalProps> = ({
  isOpen,
  onClose,
  lineup,
  userName,
}) => {
  const { candidates, status, sportId, metadata } = useEventScope();
  const { sort } = useCandidateSort(sportId);
  const candidatesByEventParticipantId = useMemo(
    () => candidatesByEventParticipantIdMap(candidates),
    [candidates],
  );

  const lineupCandidates = useMemo(() => {
    if (!lineup) return [];
    const picks = lineupPicksFromContestLineup(lineup);
    return sort(
      candidatesForLineupPicks(picks, candidatesByEventParticipantId),
      "lineupPicks",
      status,
    );
  }, [lineup, candidatesByEventParticipantId, sort, status]);

  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    if (!isOpen) setDetailCandidate(null);
  }, [isOpen]);

  if (!lineup) return null;

  const totalPoints = lineupDisplayScore(lineup);

  const userSettings = lineup.user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const userColorHex = typeof maybeUserColor === "string" ? maybeUserColor : undefined;

  const winningScorePrediction =
    lineup.lineup && "prediction" in lineup.lineup
      ? golfPredictionValue(lineup.lineup.prediction)
      : null;

  const openDetailModal = (candidate: Candidate) => {
    setDetailCandidate(candidate);
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-5 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="max-w-modal w-full transform overflow-hidden rounded-sm bg-gray-100 p-2 shadow-xl transition-all">
                  <div className="max-h-[70vh] overflow-y-auto rounded-sm border border-gray-300 bg-white">
                    <div>
                      <EntryHeader
                        userColorHex={userColorHex}
                        userName={userName}
                        lineupName={contestLineupDisplayName(lineup)}
                        winningScorePrediction={winningScorePrediction}
                        totalPoints={totalPoints}
                      />
                    </div>

                    <div className="space-y-1">
                      <hr className="my-0 border-0 border-t border-gray-200" />
                      <div className="space-y-1 px-2 pb-2 pt-0 sm:px-6">
                        {lineupCandidates.length === 0 ? (
                          <p className="py-4 text-center text-sm text-gray-500">No players</p>
                        ) : (
                          lineupCandidates.map((candidate, index) => (
                            <Fragment key={candidate.participantId}>
                              <div className="p-3">
                                <SportParticipantRow
                                  candidate={candidate}
                                  status={status}
                                  eventMetadata={metadata}
                                  onClick={() => openDetailModal(candidate)}
                                />
                              </div>
                              {index < lineupCandidates.length - 1 ? (
                                <hr className="my-0 border-0 border-t border-gray-200" />
                              ) : null}
                            </Fragment>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
      <SportParticipantDetailModal
        isOpen={detailCandidate != null}
        onClose={() => setDetailCandidate(null)}
        candidate={detailCandidate}
        sportId={sportId}
        status={status}
        eventMetadata={metadata}
      />
    </>
  );
};
