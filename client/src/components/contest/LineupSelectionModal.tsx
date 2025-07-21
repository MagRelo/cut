import React from "react";
import { Dialog } from "@headlessui/react";
import { TournamentLineup } from "../../types.new/player";

interface LineupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineups: TournamentLineup[];
  selectedLineupId: string | null;
  onSelectLineup: (lineupId: string) => void;
  onCreateNew: () => void;
}

export const LineupSelectionModal: React.FC<LineupSelectionModalProps> = ({
  isOpen,
  onClose,
  lineups,
  selectedLineupId,
  onSelectLineup,
  onCreateNew,
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
                lineups.map((lineup) => (
                  <button
                    key={lineup.id}
                    onClick={() => onSelectLineup(lineup.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLineupId === lineup.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {lineup.players?.length || 0} players selected
                    </div>
                  </button>
                ))
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
