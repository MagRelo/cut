/**
 * Sync PGA field withdrawals for the active pre-tournament week.
 * Updates inField, removes withdrawn players from lineups, and emails affected users.
 */

import { getActivePlayers } from "../lib/pgaField.js";
import { EmailKind } from "../lib/email/types.js";
import { renderPlayerWithdrawalEmail } from "../lib/email/emails/playerWithdrawal.js";
import { sendIfNotLogged } from "../lib/email/sendLog.js";
import { isEmailConfigured } from "../lib/email/transport.js";
import { fetchPGATourPlayers } from "../lib/pgaPlayers.js";
import { prisma } from "../lib/prisma.js";
import { markSideBetMarketStaleAfterRosterChange } from "./sideBets/markSideBetMarketStaleAfterRosterChange.js";
import {
  type BatchOperationResult,
  type OperationResult,
} from "./shared/types.js";

function emptyBatchResult(): BatchOperationResult {
  return { total: 0, succeeded: 0, failed: 0, results: [] };
}

function playerDisplayName(player: {
  pga_displayName: string | null;
  pga_firstName: string | null;
  pga_lastName: string | null;
}): string {
  const fromParts = `${player.pga_firstName ?? ""} ${player.pga_lastName ?? ""}`.trim();
  return player.pga_displayName?.trim() || fromParts || "A player";
}

async function ensurePlayersExistForField(fieldPgaIds: string[]): Promise<void> {
  const existingPlayers = await prisma.player.findMany({
    where: { pga_pgaTourId: { in: fieldPgaIds } },
    select: { pga_pgaTourId: true },
  });
  const existingSet = new Set(
    existingPlayers
      .map((p) => p.pga_pgaTourId)
      .filter((id): id is string => id !== null),
  );
  const missingPgaIds = fieldPgaIds.filter((id) => !existingSet.has(id));
  if (missingPgaIds.length === 0) return;

  const pgaPlayers = await fetchPGATourPlayers();
  const playerInfoById = new Map(pgaPlayers.map((p) => [p.id, p]));

  for (const pgaTourId of missingPgaIds) {
    const info = playerInfoById.get(pgaTourId);
    if (info) {
      await prisma.player.create({
        data: {
          pga_pgaTourId: info.id,
          pga_displayName: info.displayName,
          pga_imageUrl: info.headshot,
          isActive: info.isActive,
          pga_firstName: info.firstName,
          pga_lastName: info.lastName,
          pga_shortName: info.shortName,
          pga_country: info.country,
          pga_countryFlag: info.countryFlag,
          pga_age: info.playerBio?.age ?? null,
          inField: true,
        },
      });
    } else {
      await prisma.player.create({
        data: {
          pga_pgaTourId: pgaTourId,
          inField: true,
        },
      });
    }
  }
}

export async function syncTournamentFieldWithdrawals(): Promise<BatchOperationResult> {
  const tournament = await prisma.tournament.findFirst({
    where: { manualActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, pgaTourId: true, status: true },
  });

  if (!tournament) {
    console.log("[syncTournamentFieldWithdrawals] Skipped: No active tournament");
    return emptyBatchResult();
  }

  if (tournament.status === "IN_PROGRESS" || tournament.status === "COMPLETED") {
    console.log(
      `[syncTournamentFieldWithdrawals] Skipped: Tournament status is ${tournament.status}`,
    );
    return emptyBatchResult();
  }

  if (!tournament.pgaTourId) {
    console.log("[syncTournamentFieldWithdrawals] Skipped: Tournament has no pgaTourId");
    return emptyBatchResult();
  }

  const fieldData = await getActivePlayers(tournament.pgaTourId);
  const fieldPgaIds = fieldData.players.map((p) => p.id);
  const fieldPgaIdSet = new Set(fieldPgaIds);

  const currentlyInField = await prisma.player.findMany({
    where: { inField: true, pga_pgaTourId: { not: null } },
    select: { pga_pgaTourId: true },
  });

  const withdrawnPgaIds = currentlyInField
    .map((p) => p.pga_pgaTourId)
    .filter((id): id is string => id !== null && !fieldPgaIdSet.has(id));

  await ensurePlayersExistForField(fieldPgaIds);

  await prisma.player.updateMany({
    where: { pga_pgaTourId: { in: fieldPgaIds } },
    data: { inField: true },
  });
  await prisma.player.updateMany({
    where: { pga_pgaTourId: { notIn: fieldPgaIds } },
    data: { inField: false },
  });

  const playersInField = await prisma.player.findMany({
    where: { inField: true },
    select: { id: true },
  });
  await prisma.tournamentPlayer.createMany({
    data: playersInField.map((player) => ({
      tournamentId: tournament.id,
      playerId: player.id,
    })),
    skipDuplicates: true,
  });

  if (withdrawnPgaIds.length === 0) {
    console.log("[syncTournamentFieldWithdrawals] No withdrawals detected");
    return emptyBatchResult();
  }

  console.log(
    `[syncTournamentFieldWithdrawals] Detected ${withdrawnPgaIds.length} withdrawn player(s)`,
  );

  const withdrawnPlayers = await prisma.player.findMany({
    where: { pga_pgaTourId: { in: withdrawnPgaIds } },
    select: {
      id: true,
      pga_displayName: true,
      pga_firstName: true,
      pga_lastName: true,
    },
  });
  const withdrawnPlayerIds = withdrawnPlayers.map((p) => p.id);

  const affectedLineupPlayers = await prisma.tournamentLineupPlayer.findMany({
    where: {
      tournamentPlayer: {
        tournamentId: tournament.id,
        playerId: { in: withdrawnPlayerIds },
      },
    },
    include: {
      tournamentLineup: {
        select: {
          id: true,
          name: true,
          user: { select: { id: true, email: true } },
        },
      },
      tournamentPlayer: {
        include: { player: true },
      },
    },
  });

  if (affectedLineupPlayers.length === 0) {
    console.log("[syncTournamentFieldWithdrawals] No lineups affected");
    return emptyBatchResult();
  }

  await prisma.tournamentLineupPlayer.deleteMany({
    where: { id: { in: affectedLineupPlayers.map((row) => row.id) } },
  });

  const uniqueLineupIds = [...new Set(affectedLineupPlayers.map((row) => row.tournamentLineupId))];
  for (const lineupId of uniqueLineupIds) {
    await markSideBetMarketStaleAfterRosterChange(lineupId);
  }

  type EmailGroup = {
    userId: string;
    email: string | null;
    playerId: string;
    playerName: string;
    lineupNames: string[];
  };

  const emailGroups = new Map<string, EmailGroup>();
  for (const row of affectedLineupPlayers) {
    const player = row.tournamentPlayer.player;
    const user = row.tournamentLineup.user;
    const key = `${user.id}:${player.id}`;

    if (!emailGroups.has(key)) {
      emailGroups.set(key, {
        userId: user.id,
        email: user.email,
        playerId: player.id,
        playerName: playerDisplayName(player),
        lineupNames: [],
      });
    }

    const group = emailGroups.get(key)!;
    if (!group.lineupNames.includes(row.tournamentLineup.name)) {
      group.lineupNames.push(row.tournamentLineup.name);
    }
  }

  const results: OperationResult[] = [];
  const emailConfigured = isEmailConfigured();
  if (!emailConfigured) {
    console.warn("[syncTournamentFieldWithdrawals] MailerSend not configured, skipping emails");
  }

  for (const group of emailGroups.values()) {
    const resultId = `${group.userId}:${group.playerId}`;

    if (!group.email) {
      console.warn(
        `[syncTournamentFieldWithdrawals] Skipping email for user ${group.userId}: no email`,
      );
      results.push({ success: true, contestId: resultId });
      continue;
    }

    if (!emailConfigured) {
      results.push({ success: true, contestId: resultId });
      continue;
    }

    const { subject, html } = renderPlayerWithdrawalEmail({
      tournamentName: tournament.name,
      playerName: group.playerName,
      lineupNames: group.lineupNames,
    });

    try {
      const sendResult = await sendIfNotLogged({
        kind: EmailKind.PLAYER_WITHDRAWAL,
        dedupe: {
          tournamentId: tournament.id,
          userId: group.userId,
          playerId: group.playerId,
        },
        to: group.email,
        subject,
        html,
      });

      results.push({
        success: sendResult.status === "sent" || sendResult.status === "skipped",
        contestId: resultId,
        ...(sendResult.status === "skipped" ? { error: "already_sent" } : {}),
      });
    } catch (error) {
      results.push({
        success: false,
        contestId: resultId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `[syncTournamentFieldWithdrawals] Removed players from ${uniqueLineupIds.length} lineup(s); emails ${succeeded}/${results.length} succeeded`,
  );

  return {
    total: results.length,
    succeeded,
    failed,
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncTournamentFieldWithdrawals()
    .then((result) => {
      console.log("Sync field withdrawals completed:", result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Sync field withdrawals failed:", error);
      process.exit(1);
    });
}
