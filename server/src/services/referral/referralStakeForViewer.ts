import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/** Matches on-chain `getPayoutChain` / `GET /auth/referrals/summary` max depth. */
export const MAX_REFERRAL_STAKE_DEPTH = 10;

type ReferralStakeRow = {
  leaf_id: string;
  depth: number | bigint;
};

function uniqueContestantIds(viewerUserId: string, contestantUserIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of contestantUserIds) {
    if (!id || id === viewerUserId || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function referralScopeFromViewer(viewer: {
  referralChainId: number | null;
  referralGroupId: string | null;
  referredUsers: Array<{ referralChainId: number | null; referralGroupId: string | null }>;
}): { chainId: number; groupId: string } | null {
  if (viewer.referredUsers.length === 0) return null;

  let chainId = viewer.referralChainId;
  let groupId = viewer.referralGroupId;
  if (chainId == null || !groupId) {
    const fromInvitee = viewer.referredUsers[0];
    chainId = fromInvitee?.referralChainId ?? chainId;
    groupId = fromInvitee?.referralGroupId ?? groupId;
  }
  if (chainId == null || !groupId) return null;
  return { chainId, groupId };
}

/**
 * Depths at which contest entry owners sit in the viewer's invite tree (1 = direct invitee).
 * Bounded by unique contestants × 10 hops — does not load the full downline.
 */
export async function referralStakeForViewer(
  viewerUserId: string,
  contestantUserIds: readonly string[],
): Promise<Map<string, number>> {
  const contestantIds = uniqueContestantIds(viewerUserId, contestantUserIds);
  if (contestantIds.length === 0) return new Map();

  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: {
      referralChainId: true,
      referralGroupId: true,
      referredUsers: {
        take: 1,
        select: { referralChainId: true, referralGroupId: true },
      },
    },
  });
  if (!viewer) return new Map();

  const scope = referralScopeFromViewer(viewer);
  if (!scope) return new Map();

  return queryReferralStakeDepths(viewerUserId, contestantIds, scope.chainId, scope.groupId);
}

/** Same as `referralStakeForViewer` when the lobby only has a Privy id. */
export async function referralStakeForViewerByPrivyId(
  privyUserId: string,
  contestantUserIds: readonly string[],
): Promise<Map<string, number>> {
  const viewer = await prisma.user.findUnique({
    where: { privyUserId },
    select: {
      id: true,
      referralChainId: true,
      referralGroupId: true,
      referredUsers: {
        take: 1,
        select: { referralChainId: true, referralGroupId: true },
      },
    },
  });
  if (!viewer) return new Map();

  const contestantIds = uniqueContestantIds(viewer.id, contestantUserIds);
  if (contestantIds.length === 0) return new Map();

  const scope = referralScopeFromViewer(viewer);
  if (!scope) return new Map();

  return queryReferralStakeDepths(viewer.id, contestantIds, scope.chainId, scope.groupId);
}

async function queryReferralStakeDepths(
  viewerUserId: string,
  contestantIds: string[],
  chainId: number,
  groupId: string,
): Promise<Map<string, number>> {
  const idList = Prisma.join(contestantIds.map((id) => Prisma.sql`${id}`));

  const rows = await prisma.$queryRaw<ReferralStakeRow[]>`
    WITH RECURSIVE climb AS (
      SELECT
        u.id AS leaf_id,
        u.id AS current_id,
        u."referredByUserId" AS parent_id,
        0::int AS depth,
        ARRAY[u.id]::text[] AS path
      FROM "User" u
      WHERE
        u.id IN (${idList})
        AND u."referralChainId" = ${chainId}
        AND u."referralGroupId" = ${groupId}

      UNION ALL

      SELECT
        c.leaf_id,
        p.id,
        p."referredByUserId",
        c.depth + 1,
        c.path || p.id
      FROM climb c
      JOIN "User" p ON p.id = c.parent_id
      WHERE
        c.depth < ${MAX_REFERRAL_STAKE_DEPTH}
        AND c.parent_id IS NOT NULL
        AND NOT p.id = ANY(c.path)
        AND (
          p.id = ${viewerUserId}
          OR (
            p."referralChainId" = ${chainId}
            AND p."referralGroupId" = ${groupId}
          )
        )
    )
    SELECT leaf_id, depth
    FROM climb
    WHERE current_id = ${viewerUserId}
      AND depth BETWEEN 1 AND ${MAX_REFERRAL_STAKE_DEPTH}
  `;

  const depths = new Map<string, number>();
  for (const row of rows ?? []) {
    const depth = Number(row.depth);
    if (!Number.isInteger(depth) || depth < 1 || depth > MAX_REFERRAL_STAKE_DEPTH) continue;
    depths.set(row.leaf_id, depth);
  }
  return depths;
}

/** Contest invite-network fee in bps; 0 means no referral payout at settle. */
export function contestReferralNetworkBps(settings: unknown): number {
  if (typeof settings !== "object" || settings === null) return 0;
  const record = settings as { referralNetworkBps?: unknown; oracleFeeBps?: unknown };
  const raw =
    typeof record.referralNetworkBps === "number"
      ? record.referralNetworkBps
      : typeof record.oracleFeeBps === "number"
        ? record.oracleFeeBps
        : 0;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

export function attachReferralStakes<T extends { userId: string }>(
  lineups: T[],
  depths: Map<string, number>,
): Array<T & { referralStake?: { depth: number } }> {
  if (depths.size === 0) return lineups;
  return lineups.map((entry) => {
    const depth = depths.get(entry.userId);
    if (depth == null) return entry;
    return { ...entry, referralStake: { depth } };
  });
}
