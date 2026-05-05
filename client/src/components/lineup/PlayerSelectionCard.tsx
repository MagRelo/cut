import React from "react";
import type { Player, PlayerWithTournamentData } from "../../types/player";

type PerformanceSeason = NonNullable<NonNullable<Player["pga_performance"]>["performance"]>[number];

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

/** Adds 1st / 2nd / 3rd-style suffix when value is a plain integer string; otherwise returns as-is. */
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

export const PlayerSelectionCard: React.FC<{
  player?: PlayerWithTournamentData;
  showImage?: boolean;
  className?: string;
}> = ({ player, showImage = true, className = "" }) => {
  const shell =
    "overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm";

  if (!player) {
    return (
      <div className={`${shell} p-3 ${className}`}>
        <div className="flex items-start gap-3">
          {showImage && (
            <div className="shrink-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-8 w-8 text-slate-300"
                  fill="none"
                  viewBox="0 0 23 23"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-left text-base font-semibold text-slate-400">No golfer selected</p>
            <p className="mt-1 text-left text-sm text-slate-400">—</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 justify-evenly">
          <RankPill label="DG" value="—" muted />
          <RankPill label="OWGR" value="—" muted />
          <RankPill label="FedEx" value="—" muted />
        </div>
        <div className="mt-2.5 border-t border-slate-100 pt-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide leading-tight text-slate-400">
            Season form
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            <StatTile label="Wins" value="—" muted />
            <StatTile label="T10" value="—" muted />
            <StatTile label="T25" value="—" muted />
            <StatTile label="Cuts" value="—" muted />
          </div>
        </div>
      </div>
    );
  }

  const year = String(new Date().getFullYear());
  const currentSeason =
    player.pga_performance?.performance?.find((p) => p.season === year) ??
    player.pga_performance?.performance?.[0];

  const standings = player.pga_performance?.standings;
  const fedex = standings?.rank?.trim() ? standings.rank : "—";
  const owgr = standings?.owgr?.trim() ? standings.owgr : "—";

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

  const dgRank = player.pga_performance?.dataGolfRanking?.dg_rank;

  return (
    <div className={`${shell} p-3 ${className}`}>
      <div className="flex items-start gap-3">
        {showImage && player.pga_imageUrl && (
          <div className="shrink-0">
            <img
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white"
              src={player.pga_imageUrl}
              alt={player.pga_displayName || ""}
            />
          </div>
        )}
        <div className="min-w-0 flex-1 mt-1">
          <h3 className="truncate text-left text-xl font-semibold leading-tight text-slate-900">
            {player.pga_displayName || "Unknown"}
          </h3>
          <p className="truncate text-left text-sm text-slate-600">
            {player.pga_country?.trim() || "—"}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-3 gap-1.5">
          {dgRank !== undefined ? (
            <RankPill label="DG" value={String(dgRank)} className="w-full justify-center" />
          ) : (
            <RankPill label="DG" value="—" muted className="w-full justify-center" />
          )}
          <RankPill label="OWGR" value={owgr} className="w-full justify-center" />
          <RankPill label="FedEx" value={fedex} className="w-full justify-center" />
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
