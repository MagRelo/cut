/**
 * Pre-settlement guard: winner must be on ReferralGraph (Option B — no oracle fallback).
 */

import { getAddress, type Hex } from "viem";
import { getReferralGraphAddress } from "../../lib/referralConfig.js";
import { referralGraphIsRegistered } from "./referralGraph.js";

export async function assertWinnerRegisteredOnReferralGraph(params: {
  chainId: number;
  winnerWallet: string;
  referralGroupId: Hex;
  referralNetworkBps: bigint;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { chainId, winnerWallet, referralGroupId, referralNetworkBps } = params;

  if (referralNetworkBps === 0n) {
    return { ok: true };
  }

  const graphAddress = getReferralGraphAddress(chainId);
  if (!graphAddress) {
    return { ok: true };
  }

  const winner = getAddress(winnerWallet).toLowerCase() as `0x${string}`;
  const registered = await referralGraphIsRegistered(
    chainId,
    graphAddress,
    winner,
    referralGroupId,
  );

  if (!registered) {
    return {
      ok: false,
      error: `Winner ${winner} is not registered on ReferralGraph for group ${referralGroupId}. Run oracle-root bootstrap and user registration before settlement.`,
    };
  }

  return { ok: true };
}
