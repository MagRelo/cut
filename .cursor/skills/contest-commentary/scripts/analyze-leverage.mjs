#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error(
    "Usage: node .cursor/skills/contest-commentary/scripts/analyze-leverage.mjs <report.json>",
  );
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), inputPath);
let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
} catch (error) {
  console.error(`Unable to read report JSON: ${error.message}`);
  process.exit(1);
}

const wrapper = Array.isArray(parsed) ? parsed[0] : parsed;
const report = wrapper?.report ?? wrapper;
if (!report?.lineupOutlooks || !report?.contention?.entryIds) {
  console.error("Expected realistic contest outlook JSON with report.lineupOutlooks.");
  process.exit(1);
}

const contentionIds = new Set(report.contention.entryIds);
const contentionLineups = report.lineupOutlooks
  .filter((lineup) => contentionIds.has(lineup.entryId))
  .sort((a, b) => a.positionNow - b.positionNow);
const cohortSize = contentionLineups.length;
const lineupById = new Map(
  report.lineupOutlooks.map((lineup) => [lineup.entryId, lineup]),
);

const playerRows = (report.decisive ?? [])
  .filter((player) => player.holesLeft > 0)
  .map((player) => {
    const ownerIds = player.affectedEntryIds.filter((entryId) =>
      contentionIds.has(entryId),
    );
    const ownershipShare = cohortSize > 0 ? ownerIds.length / cohortSize : 0;
    return {
      displayName: player.displayName,
      ownersCount: ownerIds.length,
      cohortSize,
      ownership: `${ownerIds.length}/${cohortSize}`,
      ownershipShare: rounded(ownershipShare),
      leverage: rounded(1 - ownershipShare),
      payoutSwing: player.payoutSwing,
      holesLeft: player.holesLeft,
      ownerEntryIds: ownerIds,
      ownerNames: ownerIds.map(
        (entryId) => lineupById.get(entryId)?.displayName ?? entryId,
      ),
    };
  })
  .filter((player) => player.ownersCount > 0)
  .sort(
    (a, b) =>
      a.ownersCount - b.ownersCount ||
      b.payoutSwing - a.payoutSwing ||
      a.displayName.localeCompare(b.displayName),
  );

const highLeveragePlayers = playerRows.filter(
  (player) => player.ownershipShare <= 1 / 3,
);

const volatileLineups = contentionLineups
  .map((lineup) => {
    const ownedPlayers = playerRows.filter((player) =>
      player.ownerEntryIds.includes(lineup.entryId),
    );
    const highLeverage = ownedPlayers.filter(
      (player) => player.ownershipShare <= 1 / 3,
    );
    return {
      entryId: lineup.entryId,
      displayName: lineup.displayName,
      positionNow: lineup.positionNow,
      scoreNow: lineup.scoreNow,
      tier: lineup.tier,
      payoutProbability: lineup.payoutProbability,
      volatilityScore: rounded(
        (ownedPlayers.reduce((sum, player) => sum + player.leverage, 0) / 4) *
          100,
        1,
      ),
      highLeveragePlayers: highLeverage.map(
        (player) => `${player.displayName} (${player.ownership})`,
      ),
      activeDifferentiators: ownedPlayers.map(
        (player) => `${player.displayName} (${player.ownership})`,
      ),
    };
  })
  .sort(
    (a, b) =>
      b.volatilityScore - a.volatilityScore ||
      a.positionNow - b.positionNow,
  );

const consensusByName = new Map();
for (const player of playerRows.filter(
  (candidate) => candidate.ownershipShare >= 0.5,
)) {
  consensusByName.set(player.displayName, {
    displayName: player.displayName,
    ownership: player.ownership,
    ownershipShare: player.ownershipShare,
    payoutSwing: player.payoutSwing,
  });
}
for (const player of report.consensus ?? []) {
  const candidate = playerRows.find(
    (row) => row.displayName === player.displayName,
  );
  consensusByName.set(player.displayName, {
    displayName: player.displayName,
    ownership: candidate?.ownership ?? player.ownership,
    ownershipShare:
      candidate?.ownershipShare ??
      (player.cohortSize ? rounded(player.ownersCount / player.cohortSize) : null),
    payoutSwing: candidate?.payoutSwing ?? player.payoutSwing ?? 0,
  });
}
const consensusPlayers = [...consensusByName.values()].sort(
  (a, b) =>
    (b.ownershipShare ?? 0) - (a.ownershipShare ?? 0) ||
    a.payoutSwing - b.payoutSwing,
);

console.log(
  JSON.stringify(
    {
      source: absolutePath,
      cohortDefinition: "plausible contention lineups from report.contention",
      cohortSize,
      paidCount: report.paidCount,
      leaderScore: report.contention.leaderScore,
      cutScore: report.contention.cutScore,
      contentionLineups: contentionLineups.map((lineup) => ({
        entryId: lineup.entryId,
        displayName: lineup.displayName,
        positionNow: lineup.positionNow,
        scoreNow: lineup.scoreNow,
        tier: lineup.tier,
      })),
      highLeveragePlayers,
      volatileLineups,
      consensusPlayers,
      interpretation:
        "Leverage and volatility measure differentiation, not lineup quality or win probability.",
    },
    null,
    2,
  ),
);

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
