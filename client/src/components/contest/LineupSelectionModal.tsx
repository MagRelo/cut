import React from "react";
import { Dialog } from "@headlessui/react";
import { TournamentLineup } from "../../types/player";

interface LineupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineups: TournamentLineup[];
  selectedLineupId: string | null;
  onSelectLineup: (lineupId: string) => void;
  onCreateNew: () => void;
  enteredLineupIds?: string[]; // IDs of lineups already entered in this contest
}

export const LineupSelectionModal: React.FC<LineupSelectionModalProps> = ({
  isOpen,
  onClose,
  lineups,
  selectedLineupId,
  onSelectLineup,
  onCreateNew,
  enteredLineupIds = [],
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-lg">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              Select a Lineup
            </Dialog.Title>

            <div className="space-y-3">
              {lineups.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No lineups found. Create your first lineup to join this contest.
                </div>
              ) : (
                lineups.map((lineup) => {
                  const isAlreadyEntered = enteredLineupIds.includes(lineup.id);
                  return (
                    <button
                      key={lineup.id}
                      onClick={() => !isAlreadyEntered && onSelectLineup(lineup.id)}
                      disabled={isAlreadyEntered}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isAlreadyEntered
                          ? "border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                          : selectedLineupId === lineup.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-gray-900">
                          {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
                        </div>
                        {isAlreadyEntered && (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            Already Entered
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lineup.players && lineup.players.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            <ul className="list-disc list-inside space-y-0.5">
                              {lineup.players.map((player, index) => (
                                <li key={index}>
                                  {player.pga_displayName ||
                                    `${player.pga_firstName} ${player.pga_lastName}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}

              <button
                onClick={onCreateNew}
                className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Create New Lineup
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
