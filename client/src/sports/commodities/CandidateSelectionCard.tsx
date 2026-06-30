import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { CommodityAvatar } from "./CommodityAvatar";
import { formatPctReturn, formatPrice, parseCommodityCandidateMetadata } from "./commodityUtils";
import { PriceSparkline } from "./PriceSparkline";
import { sectorLabel } from "./utils";

export const CommodityCandidateSelectionCard: React.FC<{ candidate: Candidate }> = ({
  candidate,
}) => {
  const meta = parseCommodityCandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const quote = participant.quote;
  const changeClass =
    quote?.changePercent != null && quote.changePercent < 0 ? "text-red-600" : "text-emerald-600";

  return (
    <div className="flex min-h-[5.5rem] flex-col justify-between rounded-sm border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex w-14 shrink-0 flex-col items-center gap-1">
          <CommodityAvatar
            displayName={candidate.displayName}
            iconKey={participant.iconKey}
            sector={participant.sector}
            size="lg"
          />
          <div className="text-center text-[10px] leading-tight text-gray-600">
            {sectorLabel(participant.sector)}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold text-gray-900">
                {candidate.displayName}
              </div>
              {participant.symbol ? (
                <div className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  {participant.symbol}
                </div>
              ) : null}
            </div>
            {quote?.lastPrice != null ? (
              <div className="shrink-0 text-right leading-tight">
                <div className="text-sm font-semibold tabular-nums text-gray-900">
                  {formatPrice(quote.lastPrice)}
                </div>
                {quote.changePercent != null ? (
                  <div className={`text-xs font-medium tabular-nums ${changeClass}`}>
                    {formatPctReturn(quote.changePercent)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <PriceSparkline
            values={participant.priceHistory ?? []}
            changePercent={quote?.changePercent}
          />
          {quote ? (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] tabular-nums text-gray-500">
              {quote.lastPrice != null ? <span>Mark {formatPrice(quote.lastPrice)}</span> : null}
              {quote.previousClose != null ? (
                <span>24h {formatPrice(quote.previousClose)}</span>
              ) : null}
              {quote.bid != null && quote.ask != null ? (
                <span>
                  Bid/Ask {formatPrice(quote.bid)}–{formatPrice(quote.ask)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
