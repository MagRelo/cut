import React from "react";
import { classNames } from "./sideBetFormatters";

export interface SideBetStatsRowProps {
  stake: string;
  odds: string;
  returnAmount: string;
  stakeClassName?: string;
  returnClassName?: string;
}

export const SideBetStatsRow: React.FC<SideBetStatsRowProps> = ({
  stake,
  odds,
  returnAmount,
  stakeClassName = "text-gray-900",
  returnClassName = "text-gray-900",
}) => (
  <div className="grid grid-cols-3 gap-2 sm:gap-4">
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
        Stake
      </div>
      <div className={classNames("mt-0.5 text-sm font-semibold tabular-nums", stakeClassName)}>
        {stake}
      </div>
    </div>
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
        Odds
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{odds}</div>
    </div>
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-500">
        Return
      </div>
      <div className={classNames("mt-0.5 text-sm font-semibold tabular-nums", returnClassName)}>
        {returnAmount}
      </div>
    </div>
  </div>
);
