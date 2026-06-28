import { prisma } from "../../lib/prisma.js";
import { F1_SPORT_ID } from "@cut/sport-f1";
import {
  driverExternalId,
  fetchChampionshipDrivers,
  fetchDrivers,
  fetchStartingGrid,
} from "./openf1Client.js";
import { requireF1Metadata } from "./metadataMerge.js";

export async function syncF1ParticipantField(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: F1_SPORT_ID },
  });

  if (!event) {
    throw new Error(`F1 event not found: ${eventId}`);
  }

  const f1Meta = requireF1Metadata(event.metadata);
  const sessionKey = f1Meta.sessionKey;

  const [drivers, startingGrid, championshipDrivers] = await Promise.all([
    fetchDrivers(sessionKey),
    fetchStartingGrid(sessionKey),
    fetchChampionshipDrivers(sessionKey),
  ]);

  const gridByDriver = new Map(startingGrid.map((row) => [row.driver_number, row.position]));
  const championshipByDriver = new Map(
    championshipDrivers.map((row) => [row.driver_number, row.position_current ?? null]),
  );
  const fieldDriverNumbers = new Set(drivers.map((driver) => driver.driver_number));

  for (const driver of drivers) {
    const externalId = driverExternalId(driver.driver_number);
    const participantMetadata = {
      driverNumber: driver.driver_number,
      teamName: driver.team_name,
      teamColour: driver.team_colour,
      headshotUrl: driver.headshot_url ?? null,
      countryCode: driver.country_code ?? null,
      gridPosition: gridByDriver.get(driver.driver_number) ?? null,
      championshipPosition: championshipByDriver.get(driver.driver_number) ?? null,
      inField: true,
    };

    const participant = await prisma.participant.upsert({
      where: {
        sportId_externalId: {
          sportId: F1_SPORT_ID,
          externalId,
        },
      },
      create: {
        sportId: F1_SPORT_ID,
        externalId,
        displayName: driver.full_name,
        metadata: participantMetadata,
      },
      update: {
        displayName: driver.full_name,
        metadata: participantMetadata,
      },
    });

    await prisma.eventParticipant.upsert({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: participant.id,
        },
      },
      create: {
        eventId: event.id,
        participantId: participant.id,
        scoreData: {},
        total: 0,
      },
      update: {},
    });
  }

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  for (const row of eventParticipants) {
    const driverNumber = Number.parseInt(row.participant.externalId ?? "", 10);
    if (!Number.isFinite(driverNumber) || !fieldDriverNumbers.has(driverNumber)) {
      await prisma.participant.update({
        where: { id: row.participantId },
        data: {
          metadata: {
            ...(typeof row.participant.metadata === "object" && row.participant.metadata
              ? row.participant.metadata
              : {}),
            inField: false,
          },
        },
      });
    }
  }

  console.log(`[f1] Synced field for ${eventId}: ${drivers.length} drivers`);
}
