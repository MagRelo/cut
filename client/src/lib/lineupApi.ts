import apiClient from "../utils/apiClient";
import type { PlatformLineup } from "../types/event";
import { toGolfPrediction } from "./golfPrediction";

export async function createLineupForEvent(params: {
  eventId: string;
  sportId?: string;
  picks: string[];
  name?: string;
  winningScorePrediction?: number;
}): Promise<PlatformLineup> {
  const response = await apiClient.post<{ lineup: PlatformLineup }>(
    `/lineups/${params.eventId}`,
    {
      picks: params.picks,
      name: params.name,
      prediction: toGolfPrediction(params.winningScorePrediction),
    },
  );

  return response.lineup;
}

export async function updateLineupById(params: {
  lineupId: string;
  eventId: string;
  sportId?: string;
  picks: string[];
  name?: string;
  winningScorePrediction?: number;
}): Promise<PlatformLineup> {
  const response = await apiClient.put<{ lineup: PlatformLineup }>(
    `/lineups/${params.lineupId}`,
    {
      picks: params.picks,
      name: params.name,
      prediction: toGolfPrediction(params.winningScorePrediction),
    },
  );

  return response.lineup;
}

/** @deprecated Use createLineupForEvent or updateLineupById */
export async function saveLineupForEvent(params: {
  eventId: string;
  sportId?: string;
  picks: string[];
  name?: string;
  winningScorePrediction?: number;
}): Promise<PlatformLineup> {
  return createLineupForEvent(params);
}
