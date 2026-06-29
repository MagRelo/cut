import type { EventStatus } from "@cut/sport-sdk";
import { parseF1EventMetadata, type F1EventMetadata } from "./metadata.js";

export function f1EventStatusFromMetadata(
  metadata: unknown,
  now: Date = new Date(),
): EventStatus {
  const f1 = parseF1EventMetadata(metadata);
  if (!f1) {
    return "SCHEDULED";
  }
  return f1EventStatus(f1, now);
}

export function f1EventStatus(f1: F1EventMetadata, now: Date = new Date()): EventStatus {
  if (f1.classificationComplete) {
    return "COMPLETE";
  }

  const raceStart = new Date(f1.raceStart);
  if (!Number.isNaN(raceStart.getTime()) && now >= raceStart) {
    return "LIVE";
  }

  return "SCHEDULED";
}

export function f1ShouldActivateContest(metadata: unknown, now: Date = new Date()): boolean {
  return f1EventStatusFromMetadata(metadata, now) === "LIVE";
}

export function f1ShouldSettleContest(metadata: unknown, now: Date = new Date()): boolean {
  return f1EventStatusFromMetadata(metadata, now) === "COMPLETE";
}

export function f1ShouldSyncLiveScores(metadata: unknown, now: Date = new Date()): boolean {
  const status = f1EventStatusFromMetadata(metadata, now);
  return status === "LIVE" || status === "COMPLETE";
}
