import { prisma } from "../../prisma.js";
import type { ContestListItem } from "../blocks/contestList.js";

function parsePrimaryDeposit(settings: unknown): number {
  if (typeof settings !== "object" || settings === null) return 0;
  const raw = (settings as { primaryDeposit?: unknown }).primaryDeposit;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatBuyIn(settings: unknown): string | undefined {
  const n = parsePrimaryDeposit(settings);
  if (n <= 0) return undefined;
  return `$${n} buy-in`;
}

export async function loadOpenContestsForTournament(tournamentId: string): Promise<ContestListItem[]> {
  const contests = await prisma.contest.findMany({
    where: { tournamentId, status: "OPEN" },
    select: {
      name: true,
      settings: true,
      userGroup: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return contests.map((c) => {
    const item: ContestListItem = { name: c.name };
    const buyIn = formatBuyIn(c.settings);
    if (buyIn) item.buyInLabel = buyIn;
    if (c.userGroup?.name) item.groupName = c.userGroup.name;
    return item;
  });
}
