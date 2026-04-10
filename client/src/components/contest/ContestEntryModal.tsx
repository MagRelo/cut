import React, { Fragment, useEffect, useState } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { PlayerDetailModal } from "../player/PlayerDetailModal";
import { type PlayerWithTournamentData } from "../../types/player";
import { EntryHeader } from "./EntryHeader";
import { type ContestLineup } from "../../types/lineup";

interface ContestEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineup: ContestLineup | null;
  roundDisplay: string;
  userName?: string;
}

export const ContestEntryModal: React.FC<ContestEntryModalProps> = ({
  isOpen,
  onClose,
  lineup,
  roundDisplay,
  userName,
}) => {
  // NOTE: Do not early-return before hooks.
  const lineupPlayers = lineup?.tournamentLineup?.players ?? [];

  // Calculate total points for the lineup
  const totalPoints = lineupPlayers.reduce((sum, player) => {
    return sum + (player.tournamentData?.total || 0);
  }, 0);

  const sortedPlayers = [...lineupPlayers].sort((a, b) => {
    const aTotal = a.tournamentData?.total || 0;
    const bTotal = b.tournamentData?.total || 0;
    return bTotal - aTotal;
  });

  const [detailPlayer, setDetailPlayer] = useState<PlayerWithTournamentData | null>(null);

  useEffect(() => {
    if (!isOpen) setDetailPlayer(null);
  }, [isOpen]);

  if (!lineup) return null;

  const userSettings = lineup.user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const userColorHex = typeof maybeUserColor === "string" ? maybeUserColor : undefined;

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
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-gray-100 shadow-xl transition-all p-2">
                  {/* Content Section */}
                  <div className="px-2 sm:px-6 py-2 max-h-[70vh] overflow-y-auto bg-white rounded-sm border border-gray-300">
                    {/* Header */}
                    <div className="mb-2 border-b border-slate-300 pb-2">
                      <EntryHeader
                        userColorHex={userColorHex}
                        userName={userName}
                        lineupName={lineup.tournamentLineup?.name}
                        totalPoints={totalPoints || 0}
                      />
                    </div>

                    <div>
                      {sortedPlayers.length === 0 ? (
                        <p className="text-sm text-gray-500 px-2 py-4 text-center">No players</p>
                      ) : (
                        sortedPlayers.map((player, index) => {
                          return (
                            <Fragment key={player.id}>
                              <button
                                type="button"
                                className="block w-full text-left text-inherit cursor-pointer hover:opacity-90 border-0 bg-transparent p-0"
                                onClick={() => setDetailPlayer(player)}
                              >
                                <PlayerDisplayRow
                                  player={player}
                                  roundDisplay={roundDisplay}
                                  showArrow={false}
                                />
                              </button>
                              {index < sortedPlayers.length - 1 && (
                                <hr className="my-0 border-0 border-t border-gray-200" />
                              )}
                            </Fragment>
                          );
                        })
                      )}
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
      <PlayerDetailModal
        isOpen={detailPlayer != null}
        onClose={() => setDetailPlayer(null)}
        player={detailPlayer}
        roundDisplay={roundDisplay}
      />
    </>
  );
};
