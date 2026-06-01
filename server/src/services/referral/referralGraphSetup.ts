/**
 * Option B graph setup: oracle under REFERRAL_ROOT; organic users under oracle.
 */

import { getAddress, type Hex } from "viem";
import {
  getReferralGraphAddress,
  getReferralOracleRootAddress,
  REFERRAL_ROOT,
  requireReferralGroupId,
} from "../../lib/referralConfig.js";
import {
  referralGraphBatchRegister,
  referralGraphIsRegistered,
  referralGraphRegister,
} from "./referralGraph.js";

export type ReferralGraphSetup = {
  chainId: number;
  graphAddress: `0x${string}`;
  groupId: Hex;
  oracleRoot: `0x${string}`;
};

export function resolveReferralGraphSetup(chainId: number): ReferralGraphSetup {
  const graphAddress = getReferralGraphAddress(chainId);
  if (!graphAddress) {
    throw new Error(`No referralGraphAddress configured for chain ${chainId}`);
  }
  return {
    chainId,
    graphAddress,
    groupId: requireReferralGroupId(),
    oracleRoot: getReferralOracleRootAddress(chainId),
  };
}

export async function isOracleRootRegistered(setup: ReferralGraphSetup): Promise<boolean> {
  return referralGraphIsRegistered(
    setup.chainId,
    setup.graphAddress,
    setup.oracleRoot,
    setup.groupId,
  );
}

/** Register contest oracle wallet under REFERRAL_ROOT (idempotent). */
export async function bootstrapReferralOracleRoot(
  setup: ReferralGraphSetup,
  options?: { dryRun?: boolean },
): Promise<{ registered: boolean; txHash: Hex | null }> {
  const dryRun = options?.dryRun ?? false;
  if (await isOracleRootRegistered(setup)) {
    return { registered: false, txHash: null };
  }
  if (dryRun) {
    return { registered: true, txHash: null };
  }
  const txHash = await referralGraphRegister(
    setup.chainId,
    setup.graphAddress,
    setup.oracleRoot,
    REFERRAL_ROOT,
    setup.groupId,
  );
  return { registered: true, txHash };
}

export async function isWalletRegisteredOnGraph(
  setup: ReferralGraphSetup,
  wallet: string,
): Promise<boolean> {
  const addr = getAddress(wallet).toLowerCase() as `0x${string}`;
  return referralGraphIsRegistered(setup.chainId, setup.graphAddress, addr, setup.groupId);
}

/** Register one user wallet with a referrer (oracle or inviter). */
export async function registerWalletOnReferralGraph(
  setup: ReferralGraphSetup,
  userWallet: string,
  referrerWallet: string,
  options?: { dryRun?: boolean },
): Promise<{ txHash: Hex | null; skipped: boolean }> {
  const user = getAddress(userWallet).toLowerCase() as `0x${string}`;
  const referrer = getAddress(referrerWallet).toLowerCase() as `0x${string}`;

  if (user === referrer) {
    throw new Error("Cannot register wallet as its own referrer");
  }

  if (await isWalletRegisteredOnGraph(setup, user)) {
    return { txHash: null, skipped: true };
  }

  if (options?.dryRun) {
    return { txHash: null, skipped: false };
  }

  const txHash = await referralGraphRegister(
    setup.chainId,
    setup.graphAddress,
    user,
    referrer,
    setup.groupId,
  );
  return { txHash, skipped: false };
}

export async function registerWalletsBatchOnReferralGraph(
  setup: ReferralGraphSetup,
  userWallets: string[],
  referrerWallet: string,
): Promise<Hex> {
  const referrer = getAddress(referrerWallet).toLowerCase() as `0x${string}`;
  const users = userWallets.map((w) => getAddress(w).toLowerCase() as `0x${string}`);
  return referralGraphBatchRegister(
    setup.chainId,
    setup.graphAddress,
    users,
    referrer,
    setup.groupId,
  );
}
