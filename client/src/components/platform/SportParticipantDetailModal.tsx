import React, { Fragment, useRef } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import type { Candidate, EventStatus } from "@cut/sport-sdk";
import { useOptionalEventScope } from "../../contexts/EventScopeContext";
import { useRequiredSportUIPlugin } from "../../hooks/useSportUI";

export interface SportParticipantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  sportId: string;
  status: EventStatus;
  eventMetadata?: unknown;
  onShare?: (candidate: Candidate) => void;
  rowTrailing?: "scorecard" | "share";
}

export const SportParticipantDetailModal: React.FC<SportParticipantDetailModalProps> = ({
  isOpen,
  onClose,
  candidate,
  sportId,
  status,
  eventMetadata,
  onShare,
  rowTrailing = "share",
}) => {
  const plugin = useRequiredSportUIPlugin();
  const scope = useOptionalEventScope();
  const candidateSnapshotRef = useRef<Candidate | null>(null);
  if (candidate) {
    candidateSnapshotRef.current = candidate;
  }
  const displayCandidate = candidate ?? candidateSnapshotRef.current;
  const resolvedMetadata = eventMetadata ?? scope?.metadata;

  const sharePlayerLeaderboardLink = async (targetCandidate: Candidate) => {
    if (typeof window === "undefined") return;

    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = `/sports/${sportId}/leaderboard`;
    shareUrl.searchParams.set("playerId", String(targetCandidate.participantId));
    shareUrl.searchParams.delete("pgaTourId");

    const titleName = targetCandidate.displayName?.trim() || "Player";

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: titleName ? `${titleName} - Leaderboard` : "Leaderboard",
          url: shareUrl.toString(),
        });
        return;
      }
    } catch {
      // User can cancel native share; fall through to clipboard for other cases.
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl.toString());
    }
  };

  const ParticipantDetail = plugin.ParticipantDetail;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
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
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-modal transform overflow-hidden rounded-sm bg-gray-50 text-left align-middle shadow-xl transition-[opacity,transform]">
                <div className="p-2">
                  {displayCandidate ? (
                    <ParticipantDetail
                      candidate={displayCandidate}
                      status={status}
                      eventMetadata={resolvedMetadata}
                      rowTrailing={rowTrailing}
                      onShare={
                        rowTrailing === "share"
                          ? () =>
                              onShare
                                ? onShare(displayCandidate)
                                : sharePlayerLeaderboardLink(displayCandidate)
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
