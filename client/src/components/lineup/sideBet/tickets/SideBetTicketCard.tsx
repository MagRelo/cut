import React from "react";
import type { SideBetMarketTicketDto } from "../../../../types/sideBet";
import { SideBetLineupSummary } from "../shared/SideBetLineupSummary";
import { SideBetStatsRow } from "../shared/SideBetStatsRow";
import { useOddsFormat } from "../../../../hooks/useOddsFormat";
import {
  formatPlayerRosterLine,
  formatStakeDisplay,
  hitsRequiredToRowLabel,
  sideBetReturnDisplay,
  sideBetStatusBadgeClass,
  topNToColLabel,
} from "../shared/sideBetFormatters";

export interface SideBetTicketCardProps {
  ticket: SideBetMarketTicketDto;
  borderColor: string;
  userLabel: string;
  lineupNumberLabel: string | null;
}

export const SideBetTicketCard: React.FC<SideBetTicketCardProps> = ({
  ticket,
  borderColor,
  userLabel,
  lineupNumberLabel,
}) => {
  const { formatOdds } = useOddsFormat();
  const ret = sideBetReturnDisplay(ticket);
  const stakeDisplay = formatStakeDisplay(ticket.stakeAmount);

  return (
    <div className="overflow-hidden rounded-md border border-blue-200 bg-gradient-to-tl from-blue-50 via-white to-white font-display shadow-md">
      <div className="flex items-center justify-between gap-2 border-b border-blue-200 bg-blue-50/70 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          Parlay Ticket
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide ${sideBetStatusBadgeClass(ticket.status)}`}
        >
          {ticket.status}
        </span>
      </div>
      <div className="space-y-2 p-3 text-sm">
        <div className="truncate text-sm font-semibold leading-tight text-gray-900">
          {topNToColLabel(ticket.topN)} (including ties) ·{" "}
          {hitsRequiredToRowLabel(ticket.hitsRequired)}
        </div>
        <SideBetLineupSummary
          borderColor={borderColor}
          userLabel={userLabel}
          lineupNumberLabel={lineupNumberLabel}
          playerLine={formatPlayerRosterLine(ticket.placementPlayers)}
        />
        <SideBetStatsRow
          stake={`$${stakeDisplay}`}
          odds={formatOdds(ticket.decimalOddsAtPlacement)}
          returnAmount={ret.amount}
          returnClassName={ret.amountClass}
        />
      </div>
    </div>
  );
};
