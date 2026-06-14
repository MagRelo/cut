import { prisma } from "../../lib/prisma.js";

export async function getActiveEvents() {
  return prisma.competitionEvent.findMany({
    where: { isActive: true },
    include: { sport: true },
    orderBy: { createdAt: "asc" },
  });
}
