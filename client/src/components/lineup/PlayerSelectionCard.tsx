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
    className={`rounded-sm border px-1.5 py-1 text-center leading-snug ${
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
      className={`mt-0.5 text-[13px] font-bold tabular-nums leading-tight ${
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
}

const RankPill: React.FC<RankPillProps> = ({ label, value, muted }) => (
  <div
    className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-xs ${
      muted
        ? "bg-slate-100 text-slate-400"
        : "bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/80"
    }`}
  >
    <span className={`font-medium ${muted ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
    <span className={`font-bold tabular-nums ${muted ? "text-slate-400" : "text-slate-900"}`}>
      {value}
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
    "rounded-md border border-slate-900/20 bg-gradient-to-br from-white via-white to-slate-50/90 shadow-sm overflow-hidden";

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
            <div className="mt-2 flex flex-wrap gap-2">
              <RankPill label="DG" value="—" muted />
              <RankPill label="OWGR" value="—" muted />
              <RankPill label="FedEx" value="—" muted />
            </div>
          </div>
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
  const tourPos = player.tournamentData?.leaderboardPosition?.trim();
  const tourTotal = player.tournamentData?.leaderboardTotal?.trim();
  const tourScore =
    player.tournamentData?.total !== undefined && player.tournamentData.total !== null
      ? String(player.tournamentData.total)
      : null;
  const showThisEvent = Boolean(tourPos || tourTotal || tourScore);

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
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-left text-xl font-semibold leading-tight text-slate-900">
            {player.pga_displayName || "Unknown"}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {dgRank !== undefined ? (
              <RankPill label="DG" value={String(dgRank)} />
            ) : (
              <RankPill label="DG" value="—" muted />
            )}
            <RankPill label="OWGR" value={owgr} />
            <RankPill label="FedEx" value={fedex} />
          </div>
        </div>
      </div>

      {showThisEvent && (
        <div className="mt-3 rounded-md border border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">
            This tournament
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm text-emerald-950">
            {tourPos ? (
              <span>
                <span className="font-medium text-emerald-800/85">Pos.</span>{" "}
                <span className="font-bold tabular-nums">{tourPos}</span>
              </span>
            ) : null}
            {tourTotal ? (
              <span>
                <span className="font-medium text-emerald-800/85">Score</span>{" "}
                <span className="font-bold tabular-nums">{tourTotal}</span>
              </span>
            ) : null}
            {!tourTotal && tourScore ? (
              <span>
                <span className="font-medium text-emerald-800/85">Pts</span>{" "}
                <span className="font-bold tabular-nums">{tourScore}</span>
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-2.5 border-t border-slate-100 pt-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide leading-tight text-slate-500">
          Season form
          {currentSeason?.displaySeason ? (
            <span className="font-normal text-slate-500"> · {currentSeason.displaySeason}</span>
          ) : null}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          <StatTile label="Wins" value={wins} />
          <StatTile label="T10" value={t10} />
          <StatTile label="T25" value={t25} />
          <StatTile label="Cuts" value={cutsDisplay} />
        </div>
      </div>
    </div>
  );
};
