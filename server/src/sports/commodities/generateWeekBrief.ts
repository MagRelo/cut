import { Prisma } from "@prisma/client";
import { COMMODITIES_SPORT_ID, parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { prisma } from "../../lib/prisma.js";
import { prepareEventAnnouncementEmailSafe } from "../../lib/email/prepareEventAnnouncement.js";
import { tryWithCommentaryLlmLock } from "../../lib/commentaryLlmMutex.js";
import {
  CursorCommentaryTextGenerator,
  type CommentaryTextGenerator,
} from "../../services/contest/commentaryTextGenerator.js";
import { extractJsonArray } from "../pga-golf/extractJson.js";
import { EMAIL_TZ_ET, formatEmailDateRange, parseEmailDate } from "../emailDateFormat.js";
import { formatSessionDisplayName } from "./sessionConfig.js";
import {
  assembleWeekBrief,
  buildLastWeekSection,
  parseWeekBriefSections,
  pctReturnFromScoreData,
  previousCommoditiesWeekExternalId,
  summarySectionsFromMetadata,
  validateNewsBrief,
  type WeekBriefSection,
  type WeekBriefSections,
} from "./weekBrief.js";
import { buildCommoditiesWeekBriefPrompt, type WeekBriefContext } from "./weekBriefPrompt.js";

export type GenerateCommoditiesWeekBriefOptions = {
  generator?: CommentaryTextGenerator;
  force?: boolean;
};

function metadataRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function defaultGenerator(): CommentaryTextGenerator | null {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) return null;
  return new CursorCommentaryTextGenerator({ apiKey });
}

function weekBriefContext(externalId: string, metadata: unknown): WeekBriefContext {
  const record = metadataRecord(metadata);
  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name.trim()
      : formatSessionDisplayName(externalId);
  const commodities = parseCommoditiesEventMetadata(metadata);
  const dateLine = formatEmailDateRange(
    parseEmailDate(commodities?.sessionOpen),
    parseEmailDate(commodities?.sessionClose),
    EMAIL_TZ_ET,
  );
  return { eventName: name, weekKey: externalId, dateLine };
}

async function loadLastWeekSection(currentExternalId: string): Promise<WeekBriefSection | null> {
  let previousKey: string;
  try {
    previousKey = previousCommoditiesWeekExternalId(currentExternalId);
  } catch {
    return null;
  }

  const previous = await prisma.competitionEvent.findFirst({
    where: { sportId: COMMODITIES_SPORT_ID, externalId: previousKey },
    select: { id: true },
  });
  if (!previous) return null;

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId: previous.id, total: { not: null } },
    select: {
      total: true,
      scoreData: true,
      participant: { select: { displayName: true } },
    },
  });

  return buildLastWeekSection(
    rows.flatMap((row) => {
      if (row.total == null) return [];
      return [
        {
          displayName: row.participant.displayName ?? "",
          total: row.total,
          pctReturn: pctReturnFromScoreData(row.scoreData),
        },
      ];
    }),
  );
}

async function persistWeekBrief(
  eventId: string,
  existing: Record<string, unknown>,
  sections: WeekBriefSections,
) {
  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: {
      metadata: {
        ...existing,
        summarySections: sections,
      } as Prisma.InputJsonValue,
    },
  });
  await prepareEventAnnouncementEmailSafe(eventId);
}

export async function generateCommoditiesWeekBrief(
  eventId: string,
  options: GenerateCommoditiesWeekBriefOptions = {},
): Promise<"wrote" | "skipped" | "failed"> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: COMMODITIES_SPORT_ID },
  });
  if (!event) {
    console.warn(`[commodities] Week brief skipped — no event ${eventId}`);
    return "skipped";
  }

  const existing = metadataRecord(event.metadata);
  if (!options.force && parseWeekBriefSections(summarySectionsFromMetadata(existing))) {
    console.log(`[commodities] Week brief skipped — copy already exists on ${eventId}`);
    return "skipped";
  }

  const generator = options.generator ?? defaultGenerator();
  if (!generator) {
    console.log("[commodities] Week brief skipped — CURSOR_API_KEY is not configured");
    return "skipped";
  }

  const context = weekBriefContext(event.externalId, event.metadata);

  const locked = await tryWithCommentaryLlmLock(async () => {
    const draft = await draftWeekBrief(generator, context);
    const lastWeek = await loadLastWeekSection(event.externalId);
    const assembled = assembleWeekBrief(draft, lastWeek);
    await persistWeekBrief(event.id, existing, assembled);
    return assembled;
  });

  if (locked == null) {
    console.log("[commodities] Week brief skipped — commentary LLM is busy");
    return "skipped";
  }

  console.log(
    `[commodities] Wrote summarySections (${locked.length} sections) to event ${event.id}`,
  );
  return "wrote";
}

async function draftWeekBrief(
  generator: CommentaryTextGenerator,
  context: WeekBriefContext,
): Promise<WeekBriefSections> {
  let reason: string | undefined;
  let sections: WeekBriefSections | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await generator.generate(buildCommoditiesWeekBriefPrompt(context, reason));
    let parsed: unknown;
    try {
      parsed = extractJsonArray(raw);
    } catch (error) {
      reason = error instanceof Error ? error.message : "Output was not valid JSON.";
      continue;
    }
    const validated = validateNewsBrief(parsed);
    if (validated.reason || validated.sections.length === 0) {
      reason = validated.reason ?? "Week brief validation failed";
      continue;
    }
    sections = validated.sections;
    break;
  }
  if (!sections) throw new Error(reason ?? "Week brief validation failed");
  return sections;
}

export async function generateCommoditiesWeekBriefSafe(
  eventId: string,
  options?: GenerateCommoditiesWeekBriefOptions,
): Promise<void> {
  try {
    await generateCommoditiesWeekBrief(eventId, options);
  } catch (error) {
    console.error(
      `[commodities] Week brief failed for ${eventId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
