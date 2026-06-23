import type { EventStatus } from "../types/event";
import { golfEventStatusFromMetadata } from "@cut/sport-pga-golf";
import { formatGolfEventStatus } from "../sports/pga-golf/utils";

type EventMetadataShape = {
  name?: string;
  status?: string;
  startDate?: string;
  roundDisplay?: string | null;
  roundStatusDisplay?: string | null;
};

export function eventStatusFromMetadata(metadata: unknown): EventStatus {
  return golfEventStatusFromMetadata(metadata);
}

export function isEventEditableFromMetadata(metadata: unknown): boolean {
  const status = eventStatusFromMetadata(metadata);
  return status !== "LIVE" && status !== "COMPLETE";
}

export function eventDisplayNameFromMetadata(metadata: unknown, fallback = "this event"): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallback;
  }
  const meta = metadata as EventMetadataShape;
  return meta.name?.trim() || fallback;
}

export function eventStatusDisplayFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "Scheduled";
  }
  return formatGolfEventStatus((metadata as EventMetadataShape).status);
}

export function eventStartDateFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const startDate = (metadata as EventMetadataShape).startDate?.trim();
  return startDate || null;
}

export function roundDisplayFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const roundDisplay = (metadata as EventMetadataShape).roundDisplay;
  return typeof roundDisplay === "string" && roundDisplay.trim() ? roundDisplay.trim() : null;
}

export function roundStatusDisplayFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const roundStatusDisplay = (metadata as EventMetadataShape).roundStatusDisplay;
  return typeof roundStatusDisplay === "string" && roundStatusDisplay.trim()
    ? roundStatusDisplay.trim()
    : null;
}

export function isEventEditableFromActiveStatus(
  platformStatus: EventStatus,
  metadata: unknown,
): boolean {
  if (platformStatus === "LIVE" || platformStatus === "COMPLETE") {
    return false;
  }
  return isEventEditableFromMetadata(metadata);
}
