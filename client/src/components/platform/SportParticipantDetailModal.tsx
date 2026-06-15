import React, { Fragment, useRef } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import type { Candidate } from "@cut/sport-sdk";
import { useActiveEvent } from "../../hooks/useActiveEvent";
import { useRequiredSportUIPlugin } from "../../hooks/useSportUI";

export interface SportParticipantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onShare?: (candidate: Candidate) => void;
  /** Icon beside PTS in the header row: scorecard (default in lists) or share (detail modal default). */
  rowTrailing?: "scorecard" | "share";
}

export const SportParticipantDetailModal: React.FC<SportParticipantDetailModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onShare,
  rowTrailing = "share",
}) => {
  const plugin = useRequiredSportUIPlugin();
  const { status } = useActiveEvent();
  /** Keeps content visible through the leave transition when parents clear `candidate` immediately on close. */
  const candidateSnapshotRef = useRef<Candidate | null>(null);
  if (candidate) {
    candidateSnapshotRef.current = candidate;
  }
  const displayCandidate = candidate ?? candidateSnapshotRef.current;
  const resolvedStatus = status ?? "SCHEDULED";

  const sharePlayerLeaderboardLink = async (targetCandidate: Candidate) => {
    if (typeof window === "undefined") return;

    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/leaderboard";
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
                      status={resolvedStatus}
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
