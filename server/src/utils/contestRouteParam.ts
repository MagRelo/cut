import { prisma } from "../lib/prisma.js";

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEthereumAddress(value: string): boolean {
  return ETH_ADDRESS_RE.test(value);
}

export function normalizeContestAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Resolves a contest lookup param to the database id.
 * Used only for `GET /api/contests/:id` when the client passes a contract address from the lobby URL.
 */
export async function resolveContestDbId(routeParam: string): Promise<string | null> {
  const trimmed = routeParam.trim();
  if (!trimmed) {
    return null;
  }

  if (isEthereumAddress(trimmed)) {
    const contest = await prisma.contest.findFirst({
      where: { address: { equals: trimmed, mode: "insensitive" } },
      select: { id: true },
    });
    return contest?.id ?? null;
  }

  const byId = await prisma.contest.findUnique({
    where: { id: trimmed },
    select: { id: true },
  });
  return byId?.id ?? null;
}
