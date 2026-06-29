import type { EventStatus } from "@cut/sport-sdk";
import {
  parseCommoditiesEventMetadata,
  type CommoditiesEventMetadata,
} from "./metadata.js";

export function commoditiesEventStatusFromMetadata(
  metadata: unknown,
  now: Date = new Date(),
): EventStatus {
  const commodities = parseCommoditiesEventMetadata(metadata);
  if (!commodities) {
    return "SCHEDULED";
  }
  return commoditiesEventStatus(commodities, now);
}

export function commoditiesEventStatus(
  commodities: CommoditiesEventMetadata,
  now: Date = new Date(),
): EventStatus {
  if (commodities.sessionComplete) {
    return "COMPLETE";
  }

  const sessionClose = new Date(commodities.sessionClose);
  if (!Number.isNaN(sessionClose.getTime()) && now >= sessionClose) {
    return "COMPLETE";
  }

  const sessionOpen = new Date(commodities.sessionOpen);
  if (!Number.isNaN(sessionOpen.getTime()) && now >= sessionOpen) {
    return "LIVE";
  }

  return "SCHEDULED";
}

export function commoditiesShouldActivateContest(
  metadata: unknown,
  now: Date = new Date(),
): boolean {
  return commoditiesEventStatusFromMetadata(metadata, now) === "LIVE";
}

export function commoditiesShouldSettleContest(
  metadata: unknown,
  now: Date = new Date(),
): boolean {
  return commoditiesEventStatusFromMetadata(metadata, now) === "COMPLETE";
}

export function commoditiesShouldSyncLiveScores(
  metadata: unknown,
  now: Date = new Date(),
): boolean {
  const status = commoditiesEventStatusFromMetadata(metadata, now);
  return status === "LIVE" || status === "COMPLETE";
}
