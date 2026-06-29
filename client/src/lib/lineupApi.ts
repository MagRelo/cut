import apiClient from "../utils/apiClient";
import type { PlatformLineup } from "../types/event";
import { toLineupPredictionValue } from "./sportPrediction";

export async function createLineupForEvent(params: {
  eventId: string;
  contestId?: string;
  picks: string[];
  name?: string;
  predictionValue?: number;
}): Promise<PlatformLineup> {
  const response = await apiClient.post<{ lineup: PlatformLineup }>(
    `/lineups/${params.eventId}`,
    {
      picks: params.picks,
      name: params.name,
      contestId: params.contestId,
      prediction: toLineupPredictionValue(params.predictionValue),
    },
  );

  return response.lineup;
}

export async function updateLineupById(params: {
  lineupId: string;
  eventId: string;
  picks: string[];
  name?: string;
  predictionValue?: number;
}): Promise<PlatformLineup> {
  const response = await apiClient.put<{ lineup: PlatformLineup }>(
    `/lineups/${params.lineupId}`,
    {
      picks: params.picks,
      name: params.name,
      prediction: toLineupPredictionValue(params.predictionValue),
    },
  );

  return response.lineup;
}

export async function cloneLineupById(params: {
  lineupId: string;
  contestId: string;
  name?: string;
}): Promise<PlatformLineup> {
  const response = await apiClient.post<{ lineup: PlatformLineup }>(
    `/lineups/clone/${params.lineupId}`,
    {
      contestId: params.contestId,
      name: params.name,
    },
  );

  return response.lineup;
}

export type LineupApiParams = {
  eventId: string;
  contestId?: string;
  picks: string[];
  name?: string;
  predictionValue?: number;
};
