/**
 * Register a new organic user under the oracle root on ReferralGraph (Option B signup).
 */

import { parseReferralGroupIdFromEnv } from "../../lib/referralConfig.js";
import { prisma } from "../../lib/prisma.js";
import {
  bootstrapReferralOracleRoot,
  isOracleRootRegistered,
  registerWalletOnReferralGraph,
  resolveReferralGraphSetup,
} from "./referralGraphSetup.js";

const ALREADY_ON_CHAIN = "already_registered";

export async function registerOrganicUserOnReferralGraph(
  userId: string,
  walletAddress: string,
  chainId: number,
): Promise<void> {
  const groupId = parseReferralGroupIdFromEnv();
  if (!groupId) {
    console.warn(
      `[registerOrganicUserOnReferralGraph] REFERRAL_GROUP_ID unset; skip on-chain register for user ${userId}`,
    );
    return;
  }

  let setup: ReturnType<typeof resolveReferralGraphSetup>;
  try {
    setup = resolveReferralGraphSetup(chainId);
  } catch (e) {
    console.warn(
      `[registerOrganicUserOnReferralGraph] setup failed for user ${userId}:`,
      e instanceof Error ? e.message : e,
    );
    return;
  }

  if (walletAddress.toLowerCase() === setup.oracleRoot) {
    return;
  }

  if (!(await isOracleRootRegistered(setup))) {
    await bootstrapReferralOracleRoot(setup);
  }

  const { txHash, skipped } = await registerWalletOnReferralGraph(
    setup,
    walletAddress,
    setup.oracleRoot,
  );

  if (skipped && !txHash) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        referralOnchainTxHash: ALREADY_ON_CHAIN,
        referralGroupId: groupId,
        referralChainId: chainId,
      },
    });
    return;
  }

  if (txHash) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        referralOnchainTxHash: txHash,
        referralGroupId: groupId,
        referralChainId: chainId,
      },
    });
  }
}
