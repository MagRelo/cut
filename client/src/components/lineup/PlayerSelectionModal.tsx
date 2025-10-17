import React, { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import type { PlayerWithTournamentData } from "../../types/player";
import { PlayerSelectionCard } from "./PlayerSelectionCard";

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
  const [sortField, setSortField] = useState<SortField>("fedex");
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
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-4xl w-full bg-white rounded-md shadow-lg">
          <div className="p-4 sm:p-6">
            <DialogTitle className="text-2xl font-semibold text-gray-900 mb-2">
              Select a Golfer
            </DialogTitle>

            {/* Player Grid and Controls */}
            <div className="border border-gray-300 rounded-sm overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto bg-gray-200 p-2 shadow-[inset_0_2px_5px_0_rgba(0,0,0,0.09)]">
                {filteredPlayers.map((player) => (
                  <PlayerSelectionCard
                    key={player.id}
                    player={player}
                    isSelected={selectedPlayers.includes(player.id)}
                    onClick={() => onSelect(player.id)}
                    iconType={selectedPlayers.includes(player.id) ? "check" : undefined}
                  />
                ))}
              </div>

              {/* Search and Sort Controls */}
              <div className="p-3 bg-white border-t border-gray-400">
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => toggleSort("fedex")}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      sortField === "fedex"
                        ? "bg-emerald-100 text-emerald-600 border-emerald-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } rounded-md border`}
                  >
                    FedEx {sortField === "fedex" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                  <button
                    onClick={() => toggleSort("owgr")}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      sortField === "owgr"
                        ? "bg-emerald-100 text-emerald-600 border-emerald-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } rounded-md border`}
                  >
                    OWGR {sortField === "owgr" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                  <button
                    onClick={() => toggleSort("name")}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      sortField === "name"
                        ? "bg-emerald-100 text-emerald-600 border-emerald-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } rounded-md border`}
                  >
                    Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input */}
            {/* <div className='mt-4'>
              <div className='relative'>
                <input
                  type='text'
                  placeholder='Search players...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                />
              </div>
            </div> */}

            {/* Close Button */}
            <div className="mt-4 sm:mt-6 flex justify-end space-x-4">
              <button
                onClick={() => onSelect(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 border border-gray-300"
              >
                Leave Empty
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 border border-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
