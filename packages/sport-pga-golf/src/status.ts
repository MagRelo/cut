import type { EventStatus } from "@cut/sport-sdk";
import { parseGolfEventMetadata, type GolfEventMetadata } from "./metadata.js";

export function isGolfEventCompleteRaw(status: string): boolean {
  const s = status.toUpperCase();
  return s === "COMPLETED" || s === "COMPLETE" || s === "OFFICIAL";
}

export function isGolfEventLiveRaw(status: string): boolean {
  return status.toUpperCase() === "IN_PROGRESS";
}

export function golfEventStatusFromMetadata(metadata: unknown): EventStatus {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return "SCHEDULED";
  }
  return golfEventStatus(golf);
}

export function golfEventStatus(golf: GolfEventMetadata): EventStatus {
  if (isGolfEventCompleteRaw(golf.status)) {
    return "COMPLETE";
  }
  if (isGolfEventLiveRaw(golf.status)) {
    return "LIVE";
  }
  return "SCHEDULED";
}

export function golfShouldActivateContest(metadata: unknown): boolean {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return false;
  }
  return isGolfEventLiveRaw(golf.status);
}

export function golfShouldSettleContest(metadata: unknown): boolean {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return false;
  }
  return isGolfEventCompleteRaw(golf.status);
}

export function golfShouldSyncLiveScores(metadata: unknown): boolean {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return false;
  }

  const isPlayoffRound =
    golf.periodDisplay === "Playoff" || (golf.currentPeriod ?? 0) >= 401;

  return (
    isGolfEventLiveRaw(golf.status) &&
    (golf.periodStatusDisplay === "In Progress" ||
      golf.periodStatusDisplay === "Complete" ||
      isPlayoffRound)
  );
}
