import React, { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "./PlayerDisplayCard";
import { PlayerScorecard } from "./PlayerScorecard";
import { getDefaultScorecardRound } from "./playerRoundUtils";
import type { PlayerWithTournamentData } from "../../types/player";

export interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerWithTournamentData | null;
  onShare?: (player: PlayerWithTournamentData) => void;
  /** Icon beside PTS in the header row: scorecard (default in lists) or share (detail modal default). */
  playerRowTrailing?: "scorecard" | "share";
  /** Page context (e.g. contest round); modal opens on latest round with data regardless. */
  roundDisplay: string;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  isOpen,
  onClose,
  player,
  onShare,
  playerRowTrailing = "share",
}) => {
  const [scorecardRound, setScorecardRound] = useState(1);
  /** Keeps card content visible through the leave transition when parents clear `player` immediately on close. */
  const playerSnapshotRef = useRef<PlayerWithTournamentData | null>(null);
  if (player) {
    playerSnapshotRef.current = player;
  }
  const displayPlayer = player ?? playerSnapshotRef.current;

  useEffect(() => {
    if (!isOpen || !player) return;
    setScorecardRound(getDefaultScorecardRound(player.tournamentData));
  }, [isOpen, player]);

  const sharePlayerLeaderboardLink = async (targetPlayer: PlayerWithTournamentData) => {
    if (typeof window === "undefined") return;

    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/leaderboard";
    shareUrl.searchParams.set("playerId", String(targetPlayer.id));
    shareUrl.searchParams.delete("pgaTourId");

    const titleName =
      targetPlayer.pga_displayName ||
      [targetPlayer.pga_firstName, targetPlayer.pga_lastName].filter(Boolean).join(" ");

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
                  {displayPlayer ? (
                    <div className="overflow-hidden border border-gray-300 rounded-sm bg-white">
                      <PlayerDisplayCard
                        player={displayPlayer}
                        selectedScorecardRound={scorecardRound}
                        onScorecardRoundChange={setScorecardRound}
                        playerRowTrailing={playerRowTrailing}
                        onPlayerShare={
                          playerRowTrailing === "share"
                            ? () =>
                                onShare
                                  ? onShare(displayPlayer)
                                  : sharePlayerLeaderboardLink(displayPlayer)
                            : undefined
                        }
                      />
                      <div className="max-h-[min(50vh,22rem)] overflow-y-auto bg-white">
                        <PlayerScorecard player={displayPlayer} selectedRound={scorecardRound} />
                      </div>
                    </div>
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
