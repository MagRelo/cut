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

type SortField = "dg" | "name" | "owgr" | "fedex";
type SortDirection = "asc" | "desc";

function sortButtonClass(sortField: SortField, field: SortField): string {
  return `rounded-md border px-3 py-1.5 text-xs font-normal font-display transition-colors ${
    sortField === field
      ? "border-blue-400/60 bg-gradient-to-b from-blue-50 to-blue-100/70 text-blue-900 shadow-sm ring-1 ring-blue-950/[0.04]"
      : "border-slate-400/35 bg-white/85 text-slate-600 hover:border-slate-400/50 hover:bg-slate-50/90"
  }`;
}

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  availablePlayers,
  selectedPlayers,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("dg");
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
        case "dg": {
          const aDg = a.pga_performance?.dataGolfRanking?.dg_rank;
          const bDg = b.pga_performance?.dataGolfRanking?.dg_rank;
          const aHas = aDg !== undefined && aDg !== null && Number.isFinite(Number(aDg));
          const bHas = bDg !== undefined && bDg !== null && Number.isFinite(Number(bDg));
          if (!aHas && !bHas) comparison = 0;
          else if (!aHas) comparison = 1;
          else if (!bHas) comparison = -1;
          else comparison = Number(aDg) - Number(bDg);
          break;
        }
        case "owgr":
          aOwgr = Number(a.pga_performance?.standings?.owgr);
          bOwgr = Number(b.pga_performance?.standings?.owgr);
          if (!aOwgr && !bOwgr) comparison = 0;
          else if (!aOwgr)
            comparison = 1; // Put missing data at bottom
          else if (!bOwgr)
            comparison = -1; // Put missing data at bottom
          else comparison = aOwgr - bOwgr;
          break;
        case "fedex":
          aFedex = Number(a.pga_performance?.standings?.rank);
          bFedex = Number(b.pga_performance?.standings?.rank);
          if (!aFedex && !bFedex) comparison = 0;
          else if (!aFedex)
            comparison = 1; // Put missing data at bottom
          else if (!bFedex)
            comparison = -1; // Put missing data at bottom
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
          <div className="flex min-h-full items-center justify-center p-5">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-modal-wide transform overflow-hidden rounded-lg bg-gradient-to-b from-slate-50 to-white text-left align-middle shadow-xl ring-1 ring-slate-900/[0.08] transition-all">
                <div className="p-4 sm:p-6">
                  <DialogTitle className="pb-2 font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900">
                    Select Player
                  </DialogTitle>

                  <div className="overflow-hidden rounded-md border border-slate-300/90 shadow-sm ring-1 ring-slate-900/[0.04]">
                    <div className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto bg-gradient-to-b from-slate-500 via-slate-700 to-slate-900 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-18px_40px_-12px_rgba(2,6,23,0.45)] md:grid-cols-2 lg:grid-cols-2">
                      {filteredPlayers.map((player) => {
                        const isAlreadySelected = selectedPlayers.includes(player.id);
                        return (
                          <PlayerSelectionButton
                            key={player.id as string}
                            player={player}
                            isSelected={isAlreadySelected}
                            onClick={() => onSelect(player.id)}
                            iconType={isAlreadySelected ? "check" : undefined}
                            disabled={isAlreadySelected}
                          />
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-500/20 bg-slate-100 p-3">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("owgr")}
                          className={sortButtonClass(sortField, "owgr")}
                        >
                          OWGR {sortField === "owgr" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSort("fedex")}
                          className={sortButtonClass(sortField, "fedex")}
                        >
                          FedEx {sortField === "fedex" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSort("dg")}
                          className={sortButtonClass(sortField, "dg")}
                        >
                          DG {sortField === "dg" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSort("name")}
                          className={sortButtonClass(sortField, "name")}
                        >
                          Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(null)}
                      className="rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs font-normal text-slate-500 font-display transition-colors hover:bg-slate-200/35 hover:text-slate-600"
                    >
                      Leave Empty
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs font-normal text-slate-500 font-display transition-colors hover:bg-slate-200/35 hover:text-slate-600"
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
