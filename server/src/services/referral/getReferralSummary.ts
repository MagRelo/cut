import { prisma } from "../../lib/prisma.js";
import { sumHumanPayments } from "../../utils/paymentAmount.js";

export const MAX_REFERRAL_SUMMARY_DEPTH = 10;

export type ReferralSummaryLevel = {
  depth: number;
  count: number;
};

export type ReferralSummary = {
  chainId: number | null;
  groupId: string | null;
  maxDepth: number;
  levels: ReferralSummaryLevel[];
  grandTotal: number;
  /** Settled referral-network payouts credited to this user (USD, 2 decimals). */
  totalEarned: number;
};

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
    return {
      chainId: null,
      groupId: null,
      maxDepth: MAX_REFERRAL_SUMMARY_DEPTH,
      levels: [],
      grandTotal: 0,
      totalEarned,
    };
  }

  const levels = await prisma.$queryRaw<ReferralSummaryLevel[]>`
    WITH RECURSIVE referral_tree AS (
      SELECT
        u.id,
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
      depth::int AS depth,
      COUNT(*)::int AS count
    FROM referral_tree
    GROUP BY depth
    ORDER BY depth ASC
  `;

  const grandTotal = levels.reduce((sum, level) => sum + level.count, 0);

  return {
    chainId,
    groupId,
    maxDepth: MAX_REFERRAL_SUMMARY_DEPTH,
    levels,
    grandTotal,
    totalEarned,
  };
}
