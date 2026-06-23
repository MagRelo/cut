import React from "react";
import { UserIcon } from "@heroicons/react/24/outline";
import type { Candidate } from "@cut/sport-sdk";
import { parseGolfCandidateMetadata } from "./utils";

type PerformanceSeason = {
  season?: string;
  stats?: { title?: string; value?: string }[];
};

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

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

function formatOrdinalRank(value: string): string {
  const t = value.trim();
  if (t === "" || t === "—") return t;
  if (!/^\d+$/.test(t)) return value;
  const n = Number.parseInt(t, 10);
  if (n === 0) return "0";
  return `${n}${ordinalSuffix(n)}`;
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

function seasonStat(season: PerformanceSeason | undefined, titles: string[]): string {
  if (!season?.stats?.length) return "—";
  for (const t of titles) {
    const row = season.stats.find((x) => x.title === t);
    if (row?.value !== undefined && row.value !== "") return row.value;
  }
  return "0";
}

function dgRankFromParticipant(participant: Record<string, unknown>): number | undefined {
  const dataGolf = participant.dataGolf;
  if (dataGolf && typeof dataGolf === "object" && !Array.isArray(dataGolf)) {
    const rank = (dataGolf as Record<string, unknown>).dg_rank;
    if (typeof rank === "number") return rank;
  }
  const performance = participant.performance;
  if (performance && typeof performance === "object" && !Array.isArray(performance)) {
    const legacy = (performance as Record<string, unknown>).dataGolfRanking;
    if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
      const rank = (legacy as Record<string, unknown>).dg_rank;
      if (typeof rank === "number") return rank;
    }
  }
  return undefined;
}

function performanceSeasons(participant: Record<string, unknown>): PerformanceSeason[] {
  const performance = participant.performance;
  if (Array.isArray(performance)) {
    return performance as PerformanceSeason[];
  }
  if (performance && typeof performance === "object") {
    const nested = (performance as Record<string, unknown>).performance;
    if (Array.isArray(nested)) {
      return nested as PerformanceSeason[];
    }
  }
  return [];
}

function standingsFromParticipant(
  participant: Record<string, unknown>,
): { rank?: string; owgr?: string } | undefined {
  if (participant.standings && typeof participant.standings === "object") {
    return participant.standings as { rank?: string; owgr?: string };
  }
  const performance = participant.performance;
  if (performance && typeof performance === "object" && !Array.isArray(performance)) {
    const nested = (performance as Record<string, unknown>).standings;
    if (nested && typeof nested === "object") {
      return nested as { rank?: string; owgr?: string };
    }
  }
  return undefined;
}

interface CandidateSelectionCardProps {
  candidate: Candidate;
  className?: string;
}

export const CandidateSelectionCard: React.FC<CandidateSelectionCardProps> = ({
  candidate,
  className = "",
}) => {
  const meta = parseGolfCandidateMetadata(candidate);
  const participant = (meta.participant ?? {}) as Record<string, unknown>;
  const shell =
    "overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm";

  const year = String(new Date().getFullYear());
  const performance = performanceSeasons(participant);
  const currentSeason =
    performance.find((p) => p.season === year) ?? performance[0];

  const standings = standingsFromParticipant(participant);

  const fedex =
    standings?.rank?.trim() ||
    (typeof participant.fedex === "string" ? participant.fedex.trim() : "") ||
    "—";
  const owgr =
    standings?.owgr?.trim() ||
    (typeof participant.owgr === "string" ? participant.owgr.trim() : "") ||
    "—";

  const wins = seasonStat(currentSeason, ["Wins"]);
  const t10 = seasonStat(currentSeason, ["Top 10"]);
  const t25 = seasonStat(currentSeason, ["Top 25"]);
  const cutsMade = seasonStat(currentSeason, ["Cuts Made"]);
  const events = seasonStat(currentSeason, ["Events"]);
  const cutsDisplay =
    cutsMade !== "—" && events !== "—"
      ? `${cutsMade}/${events}`
      : cutsMade !== "—"
        ? cutsMade
        : "—";

  const dgRank = dgRankFromParticipant(participant);
  const imageUrl = typeof participant.imageUrl === "string" ? participant.imageUrl : null;
  const country = typeof participant.country === "string" ? participant.country : "—";

  return (
    <div className={`${shell} p-3 ${className}`}>
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <div className="shrink-0">
            <img
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white"
              src={imageUrl}
              alt={candidate.displayName}
            />
          </div>
        ) : (
          <div className="shrink-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <UserIcon className="h-8 w-8 text-slate-300" aria-hidden="true" />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1 mt-1">
          <h3 className="truncate text-left text-xl font-semibold leading-tight text-slate-900">
            {candidate.displayName || "Unknown"}
          </h3>
          <p className="truncate text-left text-sm text-slate-600">{country}</p>
        </div>
      </div>

      <div className="mt-3">
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
    </div>
  );
};
