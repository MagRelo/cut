import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { formatOrdinalRank, getParticipantSeasonStats } from "./participantStats";

interface StatTileProps {
  label: string;
  value: string;
  muted?: boolean;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, muted }) => (
  <div
    className={`rounded-sm border px-1.5 py-1.5 text-center leading-snug ${
      muted
        ? "border-slate-100 bg-slate-50/80"
        : "border-blue-100 bg-gradient-to-b from-blue-50/95 to-blue-50/45"
    }`}
  >
    <div
      className={`text-[10px] font-semibold uppercase tracking-wide leading-tight ${
        muted ? "text-slate-400" : "text-blue-800"
      }`}
    >
      {label}
    </div>
    <div
      className={`mt-1 text-[13px] font-bold tabular-nums leading-tight ${
        muted ? "text-slate-400" : "text-slate-800"
      }`}
    >
      {value}
    </div>
  </div>
);

interface RankPillProps {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}

const RankPill: React.FC<RankPillProps> = ({ label, value, muted, className = "" }) => (
  <div
    className={`inline-flex items-baseline gap-1.5 rounded-sm border p-2 leading-snug ${className} ${
      muted
        ? "border-slate-100 bg-slate-50/80"
        : "border-blue-100 bg-gradient-to-b from-blue-50/95 to-blue-50/45"
    }`}
  >
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide leading-tight ${
        muted ? "text-slate-400" : "text-blue-800"
      }`}
    >
      {label}
    </span>
    <span
      className={`text-[13px] font-bold tabular-nums leading-tight ${muted ? "text-slate-400" : "text-slate-800"}`}
    >
      {formatOrdinalRank(value)}
    </span>
  </div>
);

interface ParticipantStatsPanelProps {
  candidate: Candidate;
  className?: string;
}

export const ParticipantStatsPanel: React.FC<ParticipantStatsPanelProps> = ({
  candidate,
  className = "",
}) => {
  const { owgr, fedex, dgRank, wins, t10, t25, cutsDisplay } =
    getParticipantSeasonStats(candidate);

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-1.5">
        <RankPill label="OWGR" value={owgr} className="w-full justify-center" />
        <RankPill label="FedEx" value={fedex} className="w-full justify-center" />
        {dgRank !== undefined ? (
          <RankPill label="DG" value={String(dgRank)} className="w-full justify-center" />
        ) : (
          <RankPill label="DG" value="—" muted className="w-full justify-center" />
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        <StatTile label="Wins" value={wins} />
        <StatTile label="T10" value={t10} />
        <StatTile label="T25" value={t25} />
        <StatTile label="Cuts" value={cutsDisplay} />
      </div>
    </div>
  );
};
