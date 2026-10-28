import type { EventStatus } from "../types/event";
import { readPeriodDisplay, readPeriodStatusDisplay } from "@cut/sport-sdk";

type EventMetadataShape = {
  name?: string;
};

export function isEventEditableStatus(status: EventStatus): boolean {
  return status !== "LIVE" && status !== "COMPLETE";
}

export function eventDisplayNameFromMetadata(metadata: unknown, fallback = "this event"): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallback;
  }
  const meta = metadata as EventMetadataShape;
  return meta.name?.trim() || fallback;
}

export function periodDisplayFromMetadata(metadata: unknown): string | null {
  return readPeriodDisplay(metadata);
}

export function periodStatusDisplayFromMetadata(metadata: unknown): string | null {
  return readPeriodStatusDisplay(metadata);
}
