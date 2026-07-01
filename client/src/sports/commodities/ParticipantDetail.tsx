import React from "react";
import type { ParticipantDetailProps } from "@cut/sport-sdk/ui";
import { COMMODITIES_PERIOD_RULES } from "@cut/sport-commodities";
import type { CommodityRoundScoreData } from "@cut/sport-commodities";
import { CommodityParticipantRow } from "./ParticipantRow";
import {
  formatDailyPctReturn,
  formatPctReturn,
  formatPrice,
  formatRoundPoints,
  parseCommodityCandidateMetadata,
} from "./commodityUtils";

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center px-1 py-3 text-center">
      <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
        {label}
      </span>
      <span className="mt-2 text-lg font-bold tabular-nums leading-none text-gray-900">
        {value}
      </span>
    </div>
  );
}

function PeriodCell({
  label,
  round,
  periodNumber,
  currentPeriod,
}: {
  label: string;
  round?: CommodityRoundScoreData | null;
  periodNumber: number;
  currentPeriod?: number | null;
}) {
  const unplayed = currentPeriod != null && periodNumber > currentPeriod;
  const total = typeof round?.total === "number" ? round.total : null;
  const pctReturn =
    typeof round?.pctReturn === "number" && Number.isFinite(round.pctReturn)
      ? round.pctReturn
      : null;
  const pctTone =
    pctReturn == null ? "text-gray-400" : pctReturn >= 0 ? "text-emerald-700" : "text-red-600";

  return (
    <div className="flex min-w-0 flex-col items-center px-1 py-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      {unplayed ? (
        <div className="text-sm font-bold leading-none text-gray-400">—</div>
      ) : (
        <div className="mt-1 flex flex-col items-center gap-0.5 leading-none">
          <span className="text-md font-bold text-gray-900">
            {total == null ? "—" : formatRoundPoints(total)}
          </span>
          {pctReturn != null ? (
            <span className={`text-xs font-semibold ${pctTone}`}>
              {formatDailyPctReturn(pctReturn)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const CommodityParticipantDetail: React.FC<ParticipantDetailProps> = ({
  candidate,
  status,
}) => {
  const meta = parseCommodityCandidateMetadata(candidate);
  const scoreData = meta.scoreData ?? {};
  const hasRoundScores = Boolean(scoreData.r1 || scoreData.r2 || scoreData.r3);

  return (
    <div className="overflow-hidden rounded-sm border border-gray-300 bg-white">
      <div className="p-3 py-4">
        <CommodityParticipantRow candidate={candidate} status={status} />
      </div>

      <div
        className="grid w-full grid-cols-3 divide-x divide-gray-200 border-t border-gray-200 bg-white"
        role="presentation"
      >
        <StatCell label="Open" value={formatPrice(scoreData.openPrice)} />
        <StatCell
          label="Last"
          value={formatPrice(scoreData.currentPrice ?? scoreData.closePrice)}
        />
        <StatCell label="Move" value={formatPctReturn(scoreData.pctReturn)} />
      </div>

      {hasRoundScores ? (
        <div
          className="grid grid-cols-5 divide-x divide-gray-200 border-t border-gray-200 bg-slate-50"
          role="presentation"
        >
          {Array.from({ length: COMMODITIES_PERIOD_RULES.count }, (_, index) => {
            const periodNumber = index + 1;
            const roundKey = `r${periodNumber}` as keyof typeof scoreData;
            const label = COMMODITIES_PERIOD_RULES.labels?.[index] ?? `D${periodNumber}`;
            return (
              <PeriodCell
                key={periodNumber}
                label={label}
                round={scoreData[roundKey] as CommodityRoundScoreData | null | undefined}
                periodNumber={periodNumber}
                currentPeriod={scoreData.currentPeriod}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
