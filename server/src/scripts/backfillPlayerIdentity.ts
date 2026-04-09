/**
 * One-off / maintenance: fill missing Player display name or headshot from PGA APIs.
 * Run: pnpm --filter server exec tsx src/scripts/backfillPlayerIdentity.ts
 */

import { prisma } from "../lib/prisma.js";
import { getPlayerProfileOverview } from "../lib/pgaPlayerProfile.js";
import { fetchPGATourPlayers } from "../lib/pgaPlayers.js";
import {
  mergeIdentityFromDirectoryPlayer,
  mergeIdentityFromProfileHeadshot,
} from "../utils/mergePlayerIdentity.js";

const bareWhere = {
  pga_pgaTourId: { not: null } as const,
  OR: [{ pga_displayName: null }, { pga_displayName: "" }, { pga_imageUrl: null }],
};

const identitySelect = {
  id: true,
  pga_pgaTourId: true,
  pga_displayName: true,
  pga_firstName: true,
  pga_lastName: true,
  pga_shortName: true,
  pga_imageUrl: true,
  pga_country: true,
  pga_countryFlag: true,
} as const;

async function main() {
  let rows = await prisma.player.findMany({
    where: bareWhere,
    select: identitySelect,
  });
  console.log(`Players missing name or image: ${rows.length}`);

  const directory = await fetchPGATourPlayers();
  const directoryById = new Map(directory.map((d) => [d.id, d]));
  let fromDirectory = 0;
  for (const row of rows) {
    const d = row.pga_pgaTourId ? directoryById.get(row.pga_pgaTourId) : undefined;
    if (!d) continue;
    const patch = mergeIdentityFromDirectoryPlayer(row, d);
    if (Object.keys(patch).length === 0) continue;
    await prisma.player.update({ where: { id: row.id }, data: patch });
    fromDirectory++;
  }
  console.log(`Updated from playerDirectory: ${fromDirectory}`);

  rows = await prisma.player.findMany({
    where: bareWhere,
    select: identitySelect,
  });
  console.log(`Still missing after directory: ${rows.length}`);

  const pauseMs = 400;
  let fromProfile = 0;
  let idx = 0;
  for (const row of rows) {
    idx++;
    const pid = row.pga_pgaTourId;
    if (!pid) continue;
    const profile = await getPlayerProfileOverview(pid);
    if (!profile) continue;
    const patch = mergeIdentityFromProfileHeadshot(row, profile);
    if (Object.keys(patch).length === 0) continue;
    await prisma.player.update({ where: { id: row.id }, data: patch });
    fromProfile++;
    if (idx % 20 === 0) await new Promise((r) => setTimeout(r, pauseMs));
  }
  console.log(`Updated from playerProfileOverview: ${fromProfile}`);

  const remaining = await prisma.player.count({ where: bareWhere });
  console.log(`Remaining with missing name or image: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
