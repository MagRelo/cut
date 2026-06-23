import React from "react";
import { useSideBetMarketQuery } from "../../../../hooks/useSideBetQueries";
import { SideBetMarketGrid } from "./SideBetMarketGrid";
import { resolveSideBetMarketState, toMarketGridState } from "./resolveSideBetMarketState";
import type { SideBetMarketSelectionDto } from "../../../../types/sideBet";

export interface SideBetMarketSectionProps {
  lineupId: string | null;
  onSelect: (selection: SideBetMarketSelectionDto) => void;
}

export const SideBetMarketSection: React.FC<SideBetMarketSectionProps> = ({
  lineupId,
  onSelect,
}) => {
  const marketQuery = useSideBetMarketQuery(lineupId);
  const marketState = resolveSideBetMarketState(lineupId, marketQuery);
  const gridState = toMarketGridState(marketState);

  if (!lineupId) return null;

  return (
    <>
      <p className="mt-1 font-display text-sm leading-relaxed text-gray-700">
        Pick how many of your 4 players you think will end up in the top 5, 10, or 20. Ties count
        too.
      </p>
      {gridState ? <SideBetMarketGrid state={gridState} onSelect={onSelect} /> : null}
    </>
  );
};
