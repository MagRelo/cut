import type { EventStatus } from "../types/event";
import { formatGolfEventStatus } from "../sports/pga-golf/utils";

type EventMetadataShape = {
  name?: string;
  status?: string;
  startDate?: string;
};

export function eventStatusFromMetadata(metadata: unknown): EventStatus {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "SCHEDULED";
  }
  const status = (metadata as EventMetadataShape).status?.toUpperCase();
  if (status === "IN_PROGRESS") return "LIVE";
  if (status === "COMPLETE" || status === "OFFICIAL") return "COMPLETE";
  return "SCHEDULED";
}

export function isEventEditableFromMetadata(metadata: unknown): boolean {
  const status = eventStatusFromMetadata(metadata);
  if (status === "LIVE" || status === "COMPLETE") return false;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return true;
  }
  const metaStatus = (metadata as EventMetadataShape).status?.toUpperCase();
  if (metaStatus === "IN_PROGRESS" || metaStatus === "COMPLETE" || metaStatus === "OFFICIAL") {
    return false;
  }
  return true;
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
