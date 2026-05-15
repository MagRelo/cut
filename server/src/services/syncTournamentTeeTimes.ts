import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { eventsAlign } from "./sideBets/eventAlignment.js";
import {
  buildPgaTourIdToTeeTimesMap,
  buildStoredTeeTimes,
  dataGolfTourFromEnv,
  fetchDataGolfFieldUpdates,
  type DataGolfFieldUpdatesPayload,
} from "./odds/dataGolfFieldUpdates.js";

export interface SyncTournamentTeeTimesOptions {
  /** Reuse a field-updates payload (e.g. from initTournament) to avoid an extra HTTP call. */
  fieldPayload?: DataGolfFieldUpdatesPayload | null;
}

export async function syncTournamentTeeTimes(
  tournamentId: string,
  options?: SyncTournamentTeeTimesOptions,
): Promise<{ updated: number; skipped: boolean; reason?: string }> {
  if (!process.env.DATAGOLF_API_KEY?.trim()) {
    return { updated: 0, skipped: true, reason: "DATAGOLF_API_KEY not set" };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, timezone: true },
  });
  if (!tournament) {
    return { updated: 0, skipped: true, reason: "tournament not found" };
  }
  if (!tournament.timezone?.trim()) {
    return { updated: 0, skipped: true, reason: "tournament timezone missing" };
  }

  let fieldPayload = options?.fieldPayload ?? null;
  if (!fieldPayload) {
    try {
      fieldPayload = await fetchDataGolfFieldUpdates(dataGolfTourFromEnv());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[syncTournamentTeeTimes] field-updates failed: ${msg}`);
      return { updated: 0, skipped: true, reason: msg };
    }
  }

  if (!fieldPayload?.field?.length) {
    return { updated: 0, skipped: true, reason: "empty field" };
  }

  if (!eventsAlign(tournament.name, fieldPayload.event_name)) {
    console.warn(
      `[syncTournamentTeeTimes] event mismatch: tournament="${tournament.name}" datagolf="${fieldPayload.event_name}"`,
    );
    return { updated: 0, skipped: true, reason: "event mismatch" };
  }

  const teeTimesByPgaId = buildPgaTourIdToTeeTimesMap(fieldPayload.field);

  const tournamentPlayers = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    select: {
      id: true,
      player: { select: { pga_pgaTourId: true } },
    },
  });

  const inFieldPgaIds = new Set(teeTimesByPgaId.keys());
  let updated = 0;

  await Promise.all(
    tournamentPlayers.map(async (tp) => {
      const pgaId = tp.player.pga_pgaTourId;
      const clearTeeTimes = {
        teeTimes: Prisma.JsonNull as unknown as Prisma.InputJsonValue,
      };

      if (!pgaId) {
        await prisma.tournamentPlayer.update({
          where: { id: tp.id },
          data: clearTeeTimes,
        });
        return;
      }

      if (!inFieldPgaIds.has(pgaId)) {
        await prisma.tournamentPlayer.update({
          where: { id: tp.id },
          data: clearTeeTimes,
        });
        updated++;
        return;
      }

      const raw = teeTimesByPgaId.get(pgaId)!;
      const stored = buildStoredTeeTimes(raw, tournament.timezone);
      await prisma.tournamentPlayer.update({
        where: { id: tp.id },
        data: {
          teeTimes:
            stored.length > 0
              ? (stored as unknown as Prisma.InputJsonValue)
              : (Prisma.JsonNull as unknown as Prisma.InputJsonValue),
        },
      });
      updated++;
    }),
  );

  return { updated, skipped: false };
}

/**
 * Sync tee times for the current manualActive tournament (cron via updateTournament).
 */
export async function syncActiveTournamentTeeTimes(): Promise<void> {
  const tournament = await prisma.tournament.findFirst({
    where: { manualActive: true },
    select: { id: true },
  });
  if (!tournament) return;
  const result = await syncTournamentTeeTimes(tournament.id);
  if (!result.skipped && result.updated > 0) {
    console.log(`[syncTournamentTeeTimes] updated ${result.updated} players`);
  }
}
