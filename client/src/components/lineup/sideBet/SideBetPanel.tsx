import React, { useState } from "react";
import type { SideBetMarketSelectionDto } from "../../../types/sideBet";
import { useSideBetMarketQuery } from "../../../hooks/useSideBetQueries";
import { SideBetMarketSection } from "./market/SideBetMarketSection";
import { SideBetNoLineupPrompt } from "./SideBetNoLineupPrompt";
import { SideBetPlaceModal } from "./place/SideBetPlaceModal";
import { useSideBetPlaceFlow } from "./place/useSideBetPlaceFlow";
import { SideBetTicketsSection } from "./tickets/SideBetTicketsSection";

export interface SideBetPanelProps {
  /** Left accent border (user color), same as contest entry rows. */
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
  /** Comma-separated last names, leaderboard order (matches ContestEntryList when locked). */
  playerLastNamesLine: string;
  /** Tournament lineup id for `/api/bets/side/lineup/:id/market`. */
  tournamentLineupId: string | null;
}

export const SideBetPanel: React.FC<SideBetPanelProps> = ({
  borderColor,
  userLabel,
  lineupNumberLabel,
  playerLastNamesLine,
  tournamentLineupId,
}) => {
  const [activeSelection, setActiveSelection] = useState<SideBetMarketSelectionDto | null>(null);
  const [stakeInput, setStakeInput] = useState("10");

  const marketQuery = useSideBetMarketQuery(tournamentLineupId);
  const bettable = marketQuery.data?.bettable === true;

  const placeFlow = useSideBetPlaceFlow({
    tournamentLineupId,
    activeSelection,
    stakeInput,
    bettable,
    onSuccess: () => setActiveSelection(null),
  });

  const closeModal = () => {
    setActiveSelection(null);
    placeFlow.clearPlaceError();
  };

  return (
    <div className="rounded-sm bg-white p-2">
      <h4 className="font-display text-base font-semibold text-gray-900">Lineup Parlays</h4>

      {!tournamentLineupId ? <SideBetNoLineupPrompt /> : null}

      {tournamentLineupId ? (
        <SideBetMarketSection
          tournamentLineupId={tournamentLineupId}
          onSelect={setActiveSelection}
        />
      ) : null}

      {tournamentLineupId ? (
        <SideBetTicketsSection
          tournamentLineupId={tournamentLineupId}
          borderColor={borderColor}
          userLabel={userLabel}
          lineupNumberLabel={lineupNumberLabel}
        />
      ) : null}

      <SideBetPlaceModal
        isOpen={activeSelection !== null}
        activeSelection={activeSelection}
        borderColor={borderColor}
        userLabel={userLabel}
        lineupNumberLabel={lineupNumberLabel}
        playerLastNamesLine={playerLastNamesLine}
        stakeInput={stakeInput}
        onStakeInputChange={setStakeInput}
        bettable={bettable}
        modalStakeTicketLine={placeFlow.modalStakeTicketLine}
        payoutPreview={placeFlow.payoutPreview}
        exceedsMaxTicketPayout={placeFlow.exceedsMaxTicketPayout}
        placeError={placeFlow.placeError}
        paymentTxError={placeFlow.paymentTxError}
        isPayingOracle={placeFlow.isPayingOracle}
        isRecording={placeFlow.isRecording}
        onClose={closeModal}
        onPlaceTicket={placeFlow.placeTicket}
      />
    </div>
  );
};
