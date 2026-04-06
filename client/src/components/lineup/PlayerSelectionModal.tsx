import React, { Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import type { PlayerWithTournamentData } from "../../types/player";
import { PlayerSelectionButton } from "./PlayerSelectionButton";

interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playerId: string | null) => void;
  availablePlayers: PlayerWithTournamentData[];
  selectedPlayers: string[];
}

type SortField = "name" | "owgr" | "fedex";
type SortDirection = "asc" | "desc";

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  availablePlayers,
  selectedPlayers,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("owgr");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const filteredPlayers = availablePlayers
    .filter((player) => {
      const fullName = `${player.pga_firstName || ""} ${player.pga_lastName || ""}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;
      let aOwgr: number, bOwgr: number, aFedex: number, bFedex: number;

      switch (sortField) {
        case "name":
          comparison = (a.pga_lastName || "").localeCompare(b.pga_lastName || "");
          break;
        case "owgr":
          aOwgr = Number(a.pga_performance?.standings?.owgr);
          bOwgr = Number(b.pga_performance?.standings?.owgr);
          if (!aOwgr && !bOwgr) comparison = 0;
          else if (!aOwgr) comparison = 1; // Put missing data at bottom
          else if (!bOwgr) comparison = -1; // Put missing data at bottom
          else comparison = aOwgr - bOwgr;
          break;
        case "fedex":
          aFedex = Number(a.pga_performance?.standings?.rank);
          bFedex = Number(b.pga_performance?.standings?.rank);
          if (!aFedex && !bFedex) comparison = 0;
          else if (!aFedex) comparison = 1; // Put missing data at bottom
          else if (!bFedex) comparison = -1; // Put missing data at bottom
          else comparison = aFedex - bFedex;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
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
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-4xl transform rounded-md bg-white text-left align-middle shadow-xl transition-all">
                <div className="p-4 sm:p-6">
                  <DialogTitle className="text-2xl font-semibold text-gray-900 mb-2">
                    Select a Golfer
                  </DialogTitle>

                  <div className="border border-gray-300 rounded-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto bg-gray-200 p-2 shadow-[inset_0_2px_5px_0_rgba(0,0,0,0.09)]">
                      {filteredPlayers.map((player) => {
                        const isAlreadySelected = selectedPlayers.includes(player.id);
                        return (
                          <PlayerSelectionButton
                            key={player.id}
                            player={player}
                            isSelected={isAlreadySelected}
                            onClick={() => onSelect(player.id)}
                            iconType={isAlreadySelected ? "check" : undefined}
                            disabled={isAlreadySelected}
                          />
                        );
                      })}
                    </div>

                    <div className="p-3 bg-gray-100 border-t border-gray-300">
                      <div className="flex justify-center items-center gap-4">
                        <button
                          type="button"
                          onClick={() => toggleSort("fedex")}
                          className={`px-3 py-1.5 text-xs font-medium font-display ${
                            sortField === "fedex"
                              ? "bg-blue-50 text-blue-600 border-blue-300"
                              : "bg-white text-gray-500 hover:bg-gray-50 border-gray-300"
                          } rounded-md border transition-colors`}
                        >
                          FedEx {sortField === "fedex" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSort("owgr")}
                          className={`px-3 py-1.5 text-xs font-medium font-display ${
                            sortField === "owgr"
                              ? "bg-blue-50 text-blue-600 border-blue-300"
                              : "bg-white text-gray-500 hover:bg-gray-50 border-gray-300"
                          } rounded-md border transition-colors`}
                        >
                          OWGR {sortField === "owgr" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSort("name")}
                          className={`px-3 py-1.5 text-xs font-medium font-display ${
                            sortField === "name"
                              ? "bg-blue-50 text-blue-600 border-blue-300"
                              : "bg-white text-gray-500 hover:bg-gray-50 border-gray-300"
                          } rounded-md border transition-colors`}
                        >
                          Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => onSelect(null)}
                      className="px-3 py-1.5 text-xs font-display text-gray-600 bg-gray-50 rounded-md hover:bg-gray-200 border border-gray-300 transition-colors"
                    >
                      Leave Empty
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-3 py-1.5 text-xs font-display text-gray-600 bg-gray-50 rounded-md hover:bg-gray-200 border border-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
