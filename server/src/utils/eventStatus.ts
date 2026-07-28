import type { EventStatus } from "@cut/sport-sdk";
import {
  eventStatusFromMetadataForSport,
  eventStatusFromMetadataGuess,
} from "../sports/eventStatusRegistry.js";

/**
 * Derive EventStatus from CompetitionEvent.metadata.
 * Pass sportId whenever available — guessing from metadata shape is a fallback only.
 */
export function eventStatusFromMetadata(metadata: unknown, sportId?: string): EventStatus {
  if (sportId) {
    return eventStatusFromMetadataForSport(sportId, metadata);
  }
  return eventStatusFromMetadataGuess(metadata);
}
