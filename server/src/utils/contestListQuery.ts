import { getMemberUserGroupIds } from "./userGroup.js";

export const CONTEST_LIST_CHAIN_IDS = [8453, 84532] as const;

export const contestListSelect = {
  id: true,
  name: true,
  description: true,
  eventId: true,
  userGroupId: true,
  endTime: true,
  address: true,
  chainId: true,
  status: true,
  settings: true,
  results: true,
  pickPopularity: true,
  pickPopularityLockedAt: true,
  createdAt: true,
  updatedAt: true,
  userGroup: {
    select: {
      id: true,
      name: true,
    },
  },
  contestLineups: {
    select: {
      id: true,
      contestId: true,
      userId: true,
      lineupId: true,
      position: true,
      score: true,
      baseScore: true,
      popularityBonus: true,
      status: true,
      entryId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          settings: true,
        },
      },
      lineup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

export async function contestVisibilityWhere(
  userId: string | null,
  options: { chainId?: number | undefined; userGroupId?: string | undefined } = {},
) {
  const chainId = options.chainId ?? { in: [...CONTEST_LIST_CHAIN_IDS] };

  if (options.userGroupId) {
    return {
      chainId,
      userGroupId: options.userGroupId,
    };
  }

  const memberGroupIds = userId ? await getMemberUserGroupIds(userId) : [];

  return {
    chainId,
    OR: [
      { userGroupId: null },
      ...(memberGroupIds.length > 0 ? [{ userGroupId: { in: memberGroupIds } }] : []),
    ],
  };
}

export function sortContestsByEntryFee<
  T extends { settings?: { primaryDeposit?: number } | null | undefined },
>(contests: T[]): T[] {
  return [...contests].sort((a, b) => {
    const feeA = a.settings?.primaryDeposit ?? 0;
    const feeB = b.settings?.primaryDeposit ?? 0;
    return feeB - feeA;
  });
}
