import { isDelegatePublicKey } from "@playthecut/agent";
import { getAddress, isAddress } from "viem";
import { prisma } from "../../lib/prisma.js";
import type { CutAuthUser } from "../../lib/privyUserProvisioning.js";

export async function resolveSignedAccount(input: {
  signer: string;
  chainId: number;
  smartWallet?: string | null | undefined;
}): Promise<
  { ok: true; user: CutAuthUser } | { ok: false; status: 400 | 403; error: string }
> {
  if (!isDelegatePublicKey(input.signer)) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }
  const named = input.smartWallet?.trim() ?? "";
  if (!named || !isAddress(named)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }
  const wallet = getAddress(named);
  const delegate = await prisma.botDelegate.findFirst({
    where: {
      smartWallet: wallet.toLowerCase(),
      delegateAddress: input.signer,
      status: "active",
    },
    select: { smartWallet: true, user: { select: { id: true, userType: true } } },
  });
  if (!delegate) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }
  return {
    ok: true,
    user: {
      userId: delegate.user.id,
      address: getAddress(delegate.smartWallet),
      chainId: input.chainId,
      userType: delegate.user.userType,
    },
  };
}
