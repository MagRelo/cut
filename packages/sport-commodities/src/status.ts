import type { EventStatus } from "@cut/sport-sdk";
import {
  parseCommoditiesEventMetadata,
  type CommoditiesEventMetadata,
} from "./metadata.js";

export function commoditiesEventStatusFromMetadata(metadata: unknown): EventStatus {
  const commodities = parseCommoditiesEventMetadata(metadata);
  if (!commodities) {
    return "SCHEDULED";
  }
  return commoditiesEventStatus(commodities);
}

export function commoditiesEventStatus(commodities: CommoditiesEventMetadata): EventStatus {
  if (commodities.sessionComplete) {
    return "COMPLETE";
  }

  if (commodities.sessionStarted) {
    return "LIVE";
  }

  return "SCHEDULED";
}

export function commoditiesShouldActivateContest(metadata: unknown): boolean {
  return commoditiesEventStatusFromMetadata(metadata) === "LIVE";
}

export function commoditiesShouldSettleContest(metadata: unknown): boolean {
  return commoditiesEventStatusFromMetadata(metadata) === "COMPLETE";
}

export function commoditiesShouldSyncLiveScores(metadata: unknown): boolean {
  return commoditiesEventStatusFromMetadata(metadata) === "LIVE";
}
