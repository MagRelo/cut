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

export async function loadOpenContestsForEvent(eventId: string): Promise<ContestListItem[]> {
  const contests = await prisma.contest.findMany({
    where: { eventId, status: "OPEN" },
    select: {
      name: true,
      settings: true,
      userGroup: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return contests.map((contest) => {
    const item: ContestListItem = { name: contest.name };
    const buyIn = formatBuyIn(contest.settings);
    if (buyIn) item.buyInLabel = buyIn;
    if (contest.userGroup?.name) item.groupName = contest.userGroup.name;
    return item;
  });
}

/** @deprecated Use loadOpenContestsForEvent */
export async function loadOpenContestsForTournament(eventId: string): Promise<ContestListItem[]> {
  return loadOpenContestsForEvent(eventId);
}
