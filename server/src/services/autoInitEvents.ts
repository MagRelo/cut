import { getISODay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  commoditiesEventStatusFromMetadata,
  COMMODITIES_SPORT_ID,
} from "@cut/sport-commodities";
import { golfEventStatusFromMetadata, PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";
import { getUpcomingCommoditiesWeekExternalId } from "../sports/commodities/externalId.js";
import { initCommoditiesEvent } from "../sports/commodities/initEvent.js";
import { generateGolfEventSummarySafe } from "../sports/pga-golf/generateEventSummary.js";
import { initGolfEvent } from "../sports/pga-golf/initEvent.js";
import { resolveNextGolfEvent } from "../sports/pga-golf/resolveNextGolfEvent.js";

const SESSION_TZ = "America/New_York";

export type AutoInitSport = "pga-golf" | "commodities";

export type AutoInitOptions = {
  now?: Date;
  sports?: AutoInitSport | "all";
  dryRun?: boolean;
  skipSummary?: boolean;
  /** When true (cron), only run sports scheduled for this weekday in ET. */
  respectWeekday?: boolean;
};

export type AutoInitResult = {
  sportId: AutoInitSport;
  action: "inited" | "prepared" | "skipped" | "failed";
  reason?: string | undefined;
  externalId?: string | undefined;
  eventId?: string | undefined;
  fieldSize?: number | undefined;
  activate?: boolean | undefined;
};

export function isAutoInitEventsEnabled(): boolean {
  return process.env.AUTO_INIT_EVENTS?.trim().toLowerCase() !== "false";
}

export function sportsForEventInitTick(
  now: Date = new Date(),
  tz: string = SESSION_TZ,
): AutoInitSport[] {
  const zonedDate = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const isoDay = getISODay(new Date(`${zonedDate}T12:00:00Z`));
  if (isoDay === 6) return ["commodities"];
  if (isoDay === 1) return ["pga-golf"];
  return [];
}

function resolveSports(options: AutoInitOptions): AutoInitSport[] {
  const now = options.now ?? new Date();
  if (options.respectWeekday) {
    return sportsForEventInitTick(now);
  }
  if (!options.sports || options.sports === "all") {
    return ["commodities", "pga-golf"];
  }
  return [options.sports];
}

async function autoInitCommodities(options: AutoInitOptions): Promise<AutoInitResult> {
  const now = options.now ?? new Date();
  const weekKey = getUpcomingCommoditiesWeekExternalId(now);
  const existing = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId: weekKey },
  });
  if (existing) {
    return {
      sportId: "commodities",
      action: "skipped",
      reason: "event already exists",
      externalId: weekKey,
      eventId: existing.id,
    };
  }

  const active = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
  });
  if (active && commoditiesEventStatusFromMetadata(active.metadata) === "LIVE") {
    return {
      sportId: "commodities",
      action: "skipped",
      reason: "active commodities event is LIVE",
      externalId: weekKey,
    };
  }

  if (options.dryRun) {
    return {
      sportId: "commodities",
      action: "inited",
      reason: "dry-run",
      externalId: weekKey,
      activate: true,
    };
  }

  await initCommoditiesEvent(weekKey);
  const created = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId: weekKey },
  });
  return {
    sportId: "commodities",
    action: "inited",
    externalId: weekKey,
    eventId: created?.id,
    activate: true,
  };
}

async function autoInitGolf(options: AutoInitOptions): Promise<AutoInitResult> {
  const active = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
  });
  const activeStatus = active ? golfEventStatusFromMetadata(active.metadata) : null;
  const next = await resolveNextGolfEvent({
    now: options.now,
    currentExternalId: active?.externalId ?? null,
  });

  if (!next) {
    return {
      sportId: "pga-golf",
      action: "skipped",
      reason: "no upcoming PGA event with a published field",
    };
  }

  if (active?.externalId === next.id) {
    return {
      sportId: "pga-golf",
      action: "skipped",
      reason: "already the active golf event",
      externalId: next.id,
      eventId: active.id,
      fieldSize: next.fieldSize,
    };
  }

  const existing = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, externalId: next.id },
  });
  if (existing?.isActive) {
    return {
      sportId: "pga-golf",
      action: "skipped",
      reason: "already the active golf event",
      externalId: next.id,
      eventId: existing.id,
      fieldSize: next.fieldSize,
    };
  }

  const activate = !active || activeStatus === "COMPLETE";
  if (options.dryRun) {
    return {
      sportId: "pga-golf",
      action: activate ? "inited" : "prepared",
      reason: "dry-run",
      externalId: next.id,
      fieldSize: next.fieldSize,
      activate,
    };
  }

  const inited = await initGolfEvent(next.id, { activate });
  if (!options.skipSummary) {
    await generateGolfEventSummarySafe(inited.id);
  }

  return {
    sportId: "pga-golf",
    action: activate ? "inited" : "prepared",
    externalId: next.id,
    eventId: inited.id,
    fieldSize: next.fieldSize,
    activate,
  };
}

export async function runAutoInitEvents(options: AutoInitOptions = {}): Promise<AutoInitResult[]> {
  const sports = resolveSports(options);
  const results: AutoInitResult[] = [];
  for (const sport of sports) {
    try {
      const result =
        sport === "commodities" ? await autoInitCommodities(options) : await autoInitGolf(options);
      results.push(result);
      console.log(`[auto-init] ${sport} ${result.action}${result.externalId ? ` ${result.externalId}` : ""}${result.reason ? ` (${result.reason})` : ""}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[auto-init] ${sport} failed:`, error);
      results.push({ sportId: sport, action: "failed", reason: message });
    }
  }
  return results;
}
