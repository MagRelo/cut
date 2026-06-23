import type { EventStatus } from "@cut/sport-sdk";
import { parseGolfEventMetadata, type GolfEventMetadata } from "./metadata.js";

export function golfEventStatusFromMetadata(metadata: unknown): EventStatus {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return "SCHEDULED";
  }
  return golfEventStatus(golf);
}

export function golfEventStatus(golf: GolfEventMetadata): EventStatus {
  const status = golf.status.toUpperCase();
  if (status === "COMPLETE" || status === "OFFICIAL") {
    return "COMPLETE";
  }
  if (status === "IN_PROGRESS") {
    return "LIVE";
  }
  return "SCHEDULED";
}

export function golfShouldActivateContest(metadata: unknown): boolean {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return false;
  }
  return golf.status === "IN_PROGRESS";
}

export function golfShouldSettleContest(metadata: unknown): boolean {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return false;
  }
  return golf.status === "COMPLETE" || golf.status === "OFFICIAL";
}

export function golfShouldSyncLiveScores(metadata: unknown): boolean {
  const golf = parseGolfEventMetadata(metadata);
  if (!golf) {
    return false;
  }

  const isPlayoffRound =
    golf.roundDisplay === "Playoff" || (golf.currentRound ?? 0) >= 401;

  return (
    golf.status === "IN_PROGRESS" &&
    (golf.roundStatusDisplay === "In Progress" ||
      golf.roundStatusDisplay === "Complete" ||
      isPlayoffRound)
  );
}
