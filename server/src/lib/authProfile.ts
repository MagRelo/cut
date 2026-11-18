import { prisma } from "./prisma.js";
import { ensureUserReferralCode } from "./referralCode.js";

export type AuthProfileResponse = {
  id: string;
  name: string;
  userType: string;
  settings: unknown;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  createdAt: Date;
  userGroups: {
    id: string;
    userId: string;
    userGroupId: string;
    role: string;
    joinedAt: Date;
    userGroup: {
      id: string;
      name: string;
      description: string | null;
    };
  }[];
  walletAddress: string;
  chainId: number;
  referralCode: string;
  walletOwner: string | null;
  pendingOwner: string | null;
};

/** Shared GET /auth/me and POST /auth/session response body. */
export async function buildAuthProfile(userId: string, chainId: number, walletAddress: string) {
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userGroups: {
        include: {
          userGroup: true,
        },
      },
    },
  });

  if (!userData) {
    return null;
  }

  const { userGroups, ...userInfo } = userData;
  const referralCode = userInfo.referralCode ?? (await ensureUserReferralCode(userId));
  const wallet = await prisma.userWallet.findFirst({
    where: { userId, chainId, publicKey: walletAddress.toLowerCase() },
    select: { ownerAddress: true, pendingOwnerAddress: true },
  });

  return {
    id: userInfo.id,
    name: userInfo.name,
    userType: userInfo.userType,
    settings: userInfo.settings,
    phone: userInfo.phone,
    email: userInfo.email,
    isVerified: userInfo.isVerified,
    createdAt: userInfo.createdAt,
    userGroups,
    walletAddress,
    chainId,
    referralCode,
    walletOwner: wallet?.ownerAddress ?? null,
    pendingOwner: wallet?.pendingOwnerAddress ?? null,
  } satisfies AuthProfileResponse;
}
