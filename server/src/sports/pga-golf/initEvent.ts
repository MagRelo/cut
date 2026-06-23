import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../lib/prisma.js";
import { getTournament } from "../../lib/pgaTournament.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { syncGolfEventMetadata } from "./syncMetadata.js";
import { syncGolfParticipantField } from "./syncField.js";

async function loadSummarySections(pgaTourId: string): Promise<unknown | undefined> {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  const summaryFilePath = path.join(
    thisDir,
    "..",
    "..",
    "tournamentSummaries",
    `${pgaTourId}.json`,
  );

  try {
    const raw = await readFile(summaryFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function initGolfEvent(externalId: string) {
  const pgaTourId = externalId.trim();
  if (!pgaTourId) {
    throw new Error("externalId (PGA tournament id) is required");
  }

  const tournamentData = await getTournament(pgaTourId);
  const summarySections = await loadSummarySections(pgaTourId);

  let event = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, externalId: pgaTourId },
  });

  if (!event) {
    event = await prisma.competitionEvent.create({
      data: {
        sportId: PGA_GOLF_SPORT_ID,
        externalId: pgaTourId,
        isActive: false,
        metadata: {
          name: tournamentData.tournamentName,
          pgaTourId,
          status: tournamentData.tournamentStatus ?? "UPCOMING",
          ...(summarySections ? { summarySections } : {}),
        },
      },
    });
  } else if (summarySections) {
    await prisma.competitionEvent.update({
      where: { id: event.id },
      data: {
        metadata: {
          ...(typeof event.metadata === "object" && event.metadata ? event.metadata : {}),
          summarySections,
        },
      },
    });
  }

  await syncGolfEventMetadata(event.id, { seedBeautyImage: true });
  await syncGolfParticipantField(event.id);

  await prisma.competitionEvent.updateMany({
    where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
    data: { isActive: false },
  });

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: { isActive: true },
  });

  console.log(`[pga-golf] Initialized event ${event.id} (${pgaTourId})`);
}
