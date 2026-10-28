import type { EventStatus, PeriodRules } from "@cut/sport-sdk";
import { getSportUIPlugin } from "./registry";

function pluginFor(sportId: string | undefined) {
  if (!sportId) return undefined;
  return getSportUIPlugin(sportId);
}

/** Platform status for a known sport. Missing plugin or sport id is `SCHEDULED`. */
export function eventStatusForSport(sportId: string | undefined, metadata: unknown): EventStatus {
  return pluginFor(sportId)?.eventStatus(metadata) ?? "SCHEDULED";
}

export function eventStatusLabelForSport(sportId: string | undefined, metadata: unknown): string {
  const plugin = pluginFor(sportId);
  if (!plugin) return "Scheduled";
  return plugin.formatEventStatus(plugin.eventStatus(metadata), metadata);
}

export function eventStartForSport(sportId: string | undefined, metadata: unknown): string | null {
  return pluginFor(sportId)?.eventStart(metadata) ?? null;
}

export function eventEndForSport(sportId: string | undefined, metadata: unknown): string | null {
  return pluginFor(sportId)?.eventEnd(metadata) ?? null;
}

/** Build-time period rules. `GET /sports` wins when that field is present. */
export function periodRulesForSport(sportId: string | undefined): PeriodRules | null {
  return pluginFor(sportId)?.periodRules ?? null;
}
