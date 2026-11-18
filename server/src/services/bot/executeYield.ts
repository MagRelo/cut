import { getAddress, type Address, type Hex } from "viem";
import { prisma } from "../../lib/prisma.js";
import { classifySigner } from "./accountKey.js";
import { packApproval } from "./approvalEnvelope.js";
import { prepareOwnerUserOp, submitOwnerUserOp } from "./ownerUserOp.js";
import type { SerializedUserOp } from "./submitSessionKeyUserOp.js";
import { buildYieldCalls } from "./yieldCalls.js";

export type YieldResult =
  | { ok: true; yielded: true }
  | { ok: true; preparedUserOp: true; userOpHash: Hex; userOp: SerializedUserOp }
  | { ok: false; status: number; error: string };

export async function executeYield(input: {
  chainId: number;
  smartWallet: string;
  signer: Address;
  userOpSignature?: Hex;
  userOp?: SerializedUserOp;
}): Promise<YieldResult> {
  const smartWallet = getAddress(input.smartWallet);
  const signer = getAddress(input.signer);
  const row = await prisma.userWallet.findUnique({
    where: { chainId_publicKey: { chainId: input.chainId, publicKey: smartWallet.toLowerCase() } },
    select: { userId: true, ownerAddress: true, pendingOwnerAddress: true },
  });
  if (!row) return { ok: false, status: 403, error: "No account for this wallet" };

  const role = classifySigner(signer, smartWallet, input.chainId, row.ownerAddress);
  const pending = row.pendingOwnerAddress;
  if (!pending) {
    const delegate = await prisma.botDelegate.findFirst({
      where: {
        smartWallet: smartWallet.toLowerCase(),
        delegateAddress: signer.toLowerCase(),
        status: "active",
      },
      select: { id: true },
    });
    if (delegate) return { ok: true, yielded: true };
    return { ok: false, status: 403, error: "No takeover is waiting" };
  }
  if (role !== "owner") {
    return { ok: false, status: 403, error: "On-chain actions from this wallet are signed by its owner key" };
  }
  if (row.ownerAddress && getAddress(row.ownerAddress) === getAddress(pending)) {
    return { ok: true, yielded: true };
  }

  let built: Awaited<ReturnType<typeof buildYieldCalls>>;
  try {
    built = await buildYieldCalls({
      chainId: input.chainId,
      owner: signer,
      smartWallet,
      embedded: getAddress(pending),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the yield";
    return { ok: false, status: 502, error: message };
  }

  const op = {
    chainId: input.chainId,
    owner: signer,
    smartWallet,
    calls: built.calls,
    pendingOwner: getAddress(pending),
    ...(input.userOpSignature ? { userOpSignature: input.userOpSignature } : {}),
    ...(input.userOp ? { userOp: input.userOp } : {}),
  };
  if (!input.userOp || !input.userOpSignature) {
    const prepared = await prepareOwnerUserOp(op);
    if (!prepared.ok) return { ok: false, status: 502, error: prepared.error };
    return { ok: true, preparedUserOp: true, userOpHash: prepared.userOpHash, userOp: prepared.userOp };
  }
  const submitted = await submitOwnerUserOp(op);
  if (!submitted.ok) return { ok: false, status: 502, error: submitted.error };
  await recordYield({
    userId: row.userId,
    smartWallet,
    signer,
    embedded: getAddress(pending),
    chainId: input.chainId,
    approval: built.approval,
    permissionId: built.permissionId,
  });
  return { ok: true, yielded: true };
}

async function recordYield(input: {
  userId: string;
  smartWallet: Address;
  signer: Address;
  embedded: Address;
  chainId: number;
  approval: string;
  permissionId: Hex;
}): Promise<void> {
  const approval = packApproval({ approval: input.approval, permissionId: input.permissionId });
  const delegateAddress = input.signer.toLowerCase();
  await prisma.$transaction([
    prisma.userWallet.update({
      where: {
        chainId_publicKey: {
          chainId: input.chainId,
          publicKey: input.smartWallet.toLowerCase(),
        },
      },
      data: {
        ownerAddress: input.embedded.toLowerCase(),
        pendingOwnerAddress: null,
      },
    }),
    prisma.botDelegate.upsert({
      where: { userId_delegateAddress: { userId: input.userId, delegateAddress } },
      create: {
        userId: input.userId,
        smartWallet: input.smartWallet.toLowerCase(),
        delegateAddress,
        kind: "external",
        status: "active",
        approval,
      },
      update: {
        smartWallet: input.smartWallet.toLowerCase(),
        kind: "external",
        status: "active",
        approval,
        revokedAt: null,
      },
    }),
    prisma.botActionLog.create({
      data: { userId: input.userId, action: "yield" },
    }),
  ]);
}
