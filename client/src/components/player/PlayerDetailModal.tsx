import React, { Fragment, useEffect, useState } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayCard } from "./PlayerDisplayCard";
import { PlayerScorecard } from "./PlayerScorecard";
import { getDefaultScorecardRound } from "./playerRoundUtils";
import type { PlayerWithTournamentData } from "../../types/player";

export interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerWithTournamentData | null;
  /** Page context (e.g. contest round); modal opens on latest round with data regardless. */
  roundDisplay: string;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  isOpen,
  onClose,
  player,
}) => {
  const [scorecardRound, setScorecardRound] = useState(1);

  useEffect(() => {
    if (!isOpen || !player) return;
    setScorecardRound(getDefaultScorecardRound(player.tournamentData));
  }, [isOpen, player]);

  return (
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-white text-left align-middle shadow-xl transition-all">
                <div className="p-2">
                  {player ? (
                    <div className="overflow-hidden border border-gray-300 rounded-sm bg-white">
                      <PlayerDisplayCard
                        player={player}
                        selectedScorecardRound={scorecardRound}
                        onScorecardRoundChange={setScorecardRound}
                      />
                      <div className="max-h-[min(50vh,22rem)] overflow-y-auto border-t border-slate-200 bg-white">
                        <PlayerScorecard player={player} selectedRound={scorecardRound} />
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
