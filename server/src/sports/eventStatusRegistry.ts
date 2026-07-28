import type { EventStatus } from "@cut/sport-sdk";
import {
  commoditiesEventStatusFromMetadata,
  parseCommoditiesEventMetadata,
} from "@cut/sport-commodities";
import { f1EventStatusFromMetadata, parseF1EventMetadata } from "@cut/sport-f1";
import { golfEventStatusFromMetadata, parseGolfEventMetadata } from "@cut/sport-pga-golf";

type EventStatusAdapter = (metadata: unknown) => EventStatus;

const adapters = new Map<string, EventStatusAdapter>([
  [
    "pga-golf",
    (metadata) => golfEventStatusFromMetadata(metadata),
  ],
  [
    "f1",
    (metadata) => f1EventStatusFromMetadata(metadata),
  ],
  [
    "commodities",
    (metadata) => commoditiesEventStatusFromMetadata(metadata),
  ],
]);

export function eventStatusFromMetadataForSport(
  sportId: string,
  metadata: unknown,
): EventStatus {
  const adapter = adapters.get(sportId);
  if (!adapter) {
    throw new Error(`No event status adapter for sportId: ${sportId}`);
  }
  return adapter(metadata);
}

/**
 * Best-effort status when sportId is unknown: try parsers in registration order.
 * Prefer `eventStatusFromMetadataForSport(sportId, metadata)` at call sites.
 */
export function eventStatusFromMetadataGuess(metadata: unknown): EventStatus {
  if (parseCommoditiesEventMetadata(metadata)) {
    return commoditiesEventStatusFromMetadata(metadata);
  }
  if (parseF1EventMetadata(metadata)) {
    return f1EventStatusFromMetadata(metadata);
  }
  if (parseGolfEventMetadata(metadata)) {
    return golfEventStatusFromMetadata(metadata);
  }
  return "SCHEDULED";
}
