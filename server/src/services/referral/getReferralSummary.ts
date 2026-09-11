import { prisma } from "../../lib/prisma.js";
import { sumHumanPayments } from "../../utils/paymentAmount.js";

export const MAX_REFERRAL_SUMMARY_DEPTH = 10;

export type ReferralSummaryLevel = {
  depth: number;
  count: number;
};

export type ReferralSummaryNode = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  /** User accent color from settings; gray fallback when missing/invalid. */
  color: string;
};

export type ReferralSummary = {
  chainId: number | null;
  groupId: string | null;
  maxDepth: number;
  levels: ReferralSummaryLevel[];
  tree: ReferralSummaryNode[];
  grandTotal: number;
  /** Settled referral-network payouts credited to this user (USD, 2 decimals). */
  totalEarned: number;
};

type ReferralTreeRow = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  settings: unknown;
};

const DEFAULT_USER_COLOR = "#9CA3AF";

export function publicReferralName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("@")) return "Player";
  return trimmed;
}

function referralNodeColor(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return DEFAULT_USER_COLOR;
  const maybeColor = (settings as { color?: unknown }).color;
  if (typeof maybeColor !== "string") return DEFAULT_USER_COLOR;
  const color = maybeColor.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : DEFAULT_USER_COLOR;
}

function emptySummary(totalEarned: number): ReferralSummary {
  return {
    chainId: null,
    groupId: null,
    maxDepth: MAX_REFERRAL_SUMMARY_DEPTH,
    levels: [],
    tree: [],
    grandTotal: 0,
    totalEarned,
  };
}

function levelsFromTree(tree: ReferralSummaryNode[]): ReferralSummaryLevel[] {
  const counts = new Map<number, number>();
  for (const node of tree) {
    counts.set(node.depth, (counts.get(node.depth) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([depth, count]) => ({ depth, count }));
}

export async function getReferralSummary(userId: string): Promise<ReferralSummary> {
  const [user, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralChainId: true,
        referralGroupId: true,
      },
    }),
    prisma.onchainPayment.findMany({
      where: { userId, kind: "REFERRAL" },
      select: {
        amountWei: true,
        chainId: true,
        tokenAddress: true,
      },
    }),
  ]);

  const totalEarned = sumHumanPayments(payments);

  let chainId = user?.referralChainId ?? null;
  let groupId = user?.referralGroupId ?? null;

  // Users who signed up without a referral never got chain/group on their row, but
  // direct referrals store the same chain + group. Infer from any direct invitee
  // so the invite network panel counts correctly for "root" referrers.
  if (chainId == null || !groupId) {
    const fromInvitee = await prisma.user.findFirst({
      where: {
        referredByUserId: userId,
        referralChainId: { not: null },
        referralGroupId: { not: null },
      },
      select: { referralChainId: true, referralGroupId: true },
    });
    if (fromInvitee?.referralChainId != null && fromInvitee.referralGroupId) {
      chainId = fromInvitee.referralChainId;
      groupId = fromInvitee.referralGroupId;
    }
  }

  if (chainId == null || !groupId) {
    return emptySummary(totalEarned);
  }

  const rows = await prisma.$queryRaw<ReferralTreeRow[]>`
    WITH RECURSIVE referral_tree AS (
      SELECT
        u.id,
        u.name,
        u.settings,
        NULL::text AS "parentId",
        1::int AS depth,
        ARRAY[u.id]::text[] AS path
      FROM "User" u
      WHERE
        u."referredByUserId" = ${userId}
        AND u."referralChainId" = ${chainId}
        AND u."referralGroupId" = ${groupId}

      UNION ALL

      SELECT
        child.id,
        child.name,
        child.settings,
        rt.id AS "parentId",
        rt.depth + 1,
        rt.path || child.id
      FROM "User" child
      JOIN referral_tree rt ON child."referredByUserId" = rt.id
      WHERE
        child."referralChainId" = ${chainId}
        AND child."referralGroupId" = ${groupId}
        AND rt.depth < ${MAX_REFERRAL_SUMMARY_DEPTH}
        AND NOT child.id = ANY(rt.path)
    )
    SELECT
      id,
      name,
      settings,
      "parentId",
      depth::int AS depth
    FROM referral_tree
    ORDER BY depth ASC, name ASC
  `;

  const tree: ReferralSummaryNode[] = rows.map((row) => ({
    id: row.id,
    name: publicReferralName(row.name),
    parentId: row.parentId ?? null,
    depth: Number(row.depth),
    color: referralNodeColor(row.settings),
  }));
  const levels = levelsFromTree(tree);

  return {
    chainId,
    groupId,
    maxDepth: MAX_REFERRAL_SUMMARY_DEPTH,
    levels,
    tree,
    grandTotal: tree.length,
    totalEarned,
  };
}
