import React from "react";
import type { Candidate } from "@cut/sport-sdk";
import { getParticipantSeasonStats } from "./participantStats";

interface StatTileProps {
  label: string;
  value: string;
}

const StatTile: React.FC<StatTileProps> = ({ label, value }) => (
  <div className="px-1 py-0.5 text-center leading-snug">
    <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-600">
      {label}
    </div>
    <div className="mt-2 text-md font-bold tabular-nums leading-tight text-slate-800">{value}</div>
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
  const { wins, t10, t25, cutsDisplay } = getParticipantSeasonStats(candidate);

  const year = new Date().getFullYear();

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-wide text-slate-500">
        {year}
      </span>
      <div className="rounded-md border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-50 px-2 pb-2 pt-2.5">
        <div className="grid grid-cols-4 gap-1">
          <StatTile label="Wins" value={wins} />
          <StatTile label="T10" value={t10} />
          <StatTile label="T25" value={t25} />
          <StatTile label="Cuts" value={cutsDisplay} />
        </div>
      </div>
    </div>
  );
};
