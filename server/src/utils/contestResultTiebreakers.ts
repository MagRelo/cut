import { parseLineupPrediction } from "@cut/sport-sdk";
import { requireSportModule } from "../sports/registry.js";
import type { DetailedResult } from "../services/shared/types.js";

export type TiebreakFields = {
  prediction: number | null;
  predictionDistance: number | null;
};

function settlementEntryId(lineup: { id: string; entryId?: string | null }): string {
  return lineup.entryId ?? lineup.id;
}

export function tiebreakFieldsFromRankedRow(
  predictionDistance: number,
  predictionRaw: unknown,
): TiebreakFields {
  return {
    prediction: parseLineupPrediction(predictionRaw),
    predictionDistance: Number.isFinite(predictionDistance) ? predictionDistance : null,
  };
}

type LineupForTiebreak = {
  id: string;
  entryId?: string | null;
  score: number | null;
  createdAt: Date;
  lineup: { prediction: unknown };
};

function detailedResultsNeedTiebreakers(rows: DetailedResult[]): boolean {
  return rows.some((row) => row.prediction === undefined && row.predictionDistance === undefined);
}

/** Fill prediction / predictionDistance on stored settlement JSON for older contests. */
export function enrichDetailedResultsTiebreakers(
  detailedResults: DetailedResult[] | undefined,
  lineups: LineupForTiebreak[],
  sportId: string,
): DetailedResult[] | undefined {
  if (!detailedResults?.length || !detailedResultsNeedTiebreakers(detailedResults)) {
    return detailedResults;
  }

  const sportModule = requireSportModule(sportId);
  const ranked = sportModule.rankEntries(
    lineups.map((lineup) => ({
      entryId: settlementEntryId(lineup),
      score: lineup.score,
      prediction: lineup.lineup.prediction,
      createdAt: lineup.createdAt,
    })),
  );
  const byEntryId = new Map(ranked.map((row) => [row.entryId, row]));
  const predictionByEntryId = new Map(
    lineups.map((lineup) => [settlementEntryId(lineup), lineup.lineup.prediction]),
  );

  return detailedResults.map((row) => {
    if (row.prediction !== undefined || row.predictionDistance !== undefined) {
      return row;
    }
    const rankedRow = byEntryId.get(row.entryId);
    if (!rankedRow) return row;
    return {
      ...row,
      ...tiebreakFieldsFromRankedRow(rankedRow.predictionDistance, predictionByEntryId.get(row.entryId)),
    };
  });
}
