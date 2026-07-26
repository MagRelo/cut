import { prisma } from "../../lib/prisma.js";
import { requireStreamFeedsClient } from "./streamFeedsClient.js";

export async function resolveMentionedUserIds(params: {
  contestId: string;
  entryIds: readonly string[] | undefined;
}): Promise<string[]> {
  const entryIds = [...new Set((params.entryIds ?? []).filter(Boolean))];
  if (entryIds.length === 0) return [];

  const rows = await prisma.contestLineup.findMany({
    where: {
      contestId: params.contestId,
      entryId: { in: entryIds },
    },
    select: { userId: true },
  });

  return [...new Set(rows.map((row) => row.userId).filter(Boolean))];
}

export async function upsertStreamUsers(
  users: ReadonlyArray<{ id: string; name?: string }>,
): Promise<void> {
  if (users.length === 0) return;
  const client = requireStreamFeedsClient();
  await client.upsertUsers(
    users.map((user) => {
      if (user.name) return { id: user.id, name: user.name };
      return { id: user.id };
    }),
  );
}

export async function loadUserDisplayNames(
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });

  return new Map(rows.map((row) => [row.id, row.name]));
}
