import type { EventStatus } from "@cut/sport-sdk";
import {
  commoditiesEventStatusFromMetadata,
  parseCommoditiesEventMetadata,
} from "@cut/sport-commodities";
import { f1EventStatusFromMetadata, parseF1EventMetadata } from "@cut/sport-f1";
import { golfEventStatusFromMetadata } from "@cut/sport-pga-golf";

export function eventStatusFromMetadata(metadata: unknown): EventStatus {
  if (parseCommoditiesEventMetadata(metadata)) {
    return commoditiesEventStatusFromMetadata(metadata);
  }
  if (parseF1EventMetadata(metadata)) {
    return f1EventStatusFromMetadata(metadata);
  }
  return golfEventStatusFromMetadata(metadata);
}
