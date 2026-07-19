import React, { useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import type { SideBetMarketSelectionDto } from "../../../types/sideBet";
import { useSideBetMarketQuery } from "../../../hooks/useSideBetQueries";
import { tabButtonClassName, tabListClassName } from "../../../lib/tabStyles";
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
  lineupId: string | null;
}

export const SideBetPanel: React.FC<SideBetPanelProps> = ({
  borderColor,
  userLabel,
  lineupNumberLabel,
  playerLastNamesLine,
  lineupId,
}) => {
  const [activeSelection, setActiveSelection] = useState<SideBetMarketSelectionDto | null>(null);
  const [stakeInput, setStakeInput] = useState("10");

  const marketQuery = useSideBetMarketQuery(lineupId);
  const bettable = marketQuery.data?.bettable === true;

  const placeFlow = useSideBetPlaceFlow({
    lineupId,
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
      {!lineupId ? <SideBetNoLineupPrompt /> : null}

      {lineupId ? (
        <TabGroup>
          <TabList className={tabListClassName("mt-2 space-x-1")}>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Place
            </Tab>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Your parlays
            </Tab>
          </TabList>
          <TabPanels className="pt-3">
            <TabPanel className="focus:outline-none">
              <SideBetMarketSection lineupId={lineupId} onSelect={setActiveSelection} />
            </TabPanel>
            <TabPanel className="focus:outline-none">
              <SideBetTicketsSection
                lineupId={lineupId}
                borderColor={borderColor}
                userLabel={userLabel}
                lineupNumberLabel={lineupNumberLabel}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
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
