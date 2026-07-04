import React from "react";
import { useSideBetMarketQuery } from "../../../../hooks/useSideBetQueries";
import { PARLAY_MARKET_INSTRUCTIONS } from "../shared/sideBetConstants";
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
      {marketState.kind === "ready" ? (
        <p className="mt-1 font-display text-sm leading-relaxed text-gray-700">
          {PARLAY_MARKET_INSTRUCTIONS}
        </p>
      ) : null}
      {marketState.kind === "error" ? (
        <p
          className="mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-display text-sm leading-snug text-red-700"
          role="alert"
        >
          {marketState.message}
        </p>
      ) : null}
      {marketState.kind === "unavailable" ? (
        <p className="mt-1 font-display text-sm leading-relaxed text-gray-600">
          {marketState.message}
        </p>
      ) : null}
      {gridState ? <SideBetMarketGrid state={gridState} onSelect={onSelect} /> : null}
    </>
  );
};
