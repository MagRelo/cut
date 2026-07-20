import type { Candidate } from "@cut/sport-sdk";
import { parseGolfCandidateMetadata } from "./utils";

export type PerformanceSeason = {
  season?: string;
  stats?: { title?: string; value?: string }[];
};

export type ParticipantSeasonStats = {
  owgr: string;
  fedex: string;
  dgRank: number | undefined;
  wins: string;
  t10: string;
  t25: string;
  cutsDisplay: string;
};

function seasonStat(season: PerformanceSeason | undefined, titles: string[]): string {
  if (!season?.stats?.length) return "—";
  for (const t of titles) {
    const row = season.stats.find((x) => x.title === t);
    if (row?.value !== undefined && row.value !== "") return row.value;
  }
  return "0";
}

function dataGolfRecord(participant: Record<string, unknown>): Record<string, unknown> | undefined {
  const dataGolf = participant.dataGolf;
  if (dataGolf && typeof dataGolf === "object" && !Array.isArray(dataGolf)) {
    return dataGolf as Record<string, unknown>;
  }
  const performance = participant.performance;
  if (performance && typeof performance === "object" && !Array.isArray(performance)) {
    const legacy = (performance as Record<string, unknown>).dataGolfRanking;
    if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
      return legacy as Record<string, unknown>;
    }
  }
  return undefined;
}

function dgRankFromParticipant(participant: Record<string, unknown>): number | undefined {
  const rank = dataGolfRecord(participant)?.dg_rank;
  return typeof rank === "number" ? rank : undefined;
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

export function getParticipantSeasonStats(candidate: Candidate): ParticipantSeasonStats {
  const meta = parseGolfCandidateMetadata(candidate);
  const participant = (meta.participant ?? {}) as Record<string, unknown>;

  const year = String(new Date().getFullYear());
  const performance = performanceSeasons(participant);
  const currentSeason = performance.find((p) => p.season === year) ?? performance[0];
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

  return {
    owgr,
    fedex,
    dgRank: dgRankFromParticipant(participant),
    wins,
    t10,
    t25,
    cutsDisplay,
  };
}

export function formatOrdinalRank(value: string): string {
  const t = value.trim();
  if (t === "" || t === "—") return t;
  if (!/^\d+$/.test(t)) return value;
  const n = Number.parseInt(t, 10);
  if (n === 0) return "0";
  const j = n % 10;
  const k = n % 100;
  const suffix =
    j === 1 && k !== 11 ? "st" : j === 2 && k !== 12 ? "nd" : j === 3 && k !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}
