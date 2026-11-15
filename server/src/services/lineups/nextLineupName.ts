import { prisma } from "../../lib/prisma.js";

const numberedName = /^Lineup #(\d+)$/;

/** Next `Lineup #N` for this user and event. Counts every lineup, and skips past an existing number. */
export async function nextLineupName(userId: string, eventId: string): Promise<string> {
  const rows = await prisma.lineup.findMany({
    where: { userId, eventId },
    select: { name: true },
  });
  let highest = 0;
  for (const row of rows) {
    const match = numberedName.exec(row.name.trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Lineup #${Math.max(highest, rows.length) + 1}`;
}
