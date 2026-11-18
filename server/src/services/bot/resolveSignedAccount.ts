import { getAddress, isAddress, type Address } from "viem";
import { prisma } from "../../lib/prisma.js";
import type { CutAuthUser } from "../../lib/privyUserProvisioning.js";
import { signerControlsWallet } from "./accountKey.js";

export async function resolveSignedAccount(input: {
  signer: Address;
  chainId: number;
  smartWallet?: string | null | undefined;
}): Promise<
  { ok: true; user: CutAuthUser } | { ok: false; status: 400 | 403; error: string }
> {
  const signer = getAddress(input.signer);
  const named = input.smartWallet?.trim() ?? "";
  if (named && !isAddress(named)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }
  const wallet = named ? getAddress(named) : signer;

  if (signerControlsWallet(signer, wallet, input.chainId)) {
    const row = await prisma.userWallet.findUnique({
      where: { chainId_publicKey: { chainId: input.chainId, publicKey: wallet.toLowerCase() } },
      select: { publicKey: true, user: { select: { id: true, userType: true } } },
    });
    if (!row) {
      return { ok: false, status: 403, error: "No account for this wallet" };
    }
    return {
      ok: true,
      user: {
        userId: row.user.id,
        address: row.publicKey,
        chainId: input.chainId,
        userType: row.user.userType,
      },
    };
  }

  const delegate = await prisma.botDelegate.findFirst({
    where: {
      smartWallet: wallet.toLowerCase(),
      delegateAddress: signer.toLowerCase(),
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
      address: delegate.smartWallet,
      chainId: input.chainId,
      userType: delegate.user.userType,
    },
  };
}
