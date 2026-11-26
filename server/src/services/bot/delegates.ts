import { getAddress, isAddress } from "viem";
import { prisma } from "../../lib/prisma.js";
import { walletsFromPrivyUser } from "../auth/registerAgent.js";
import { readQuorumId, writeQuorumApproval } from "./quorumApproval.js";

type LinkedAccount = {
  type: string;
  address?: string;
  id?: string | null;
  chain_type?: string;
  connector_type?: string;
};

export class DelegateRouteError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 503;

  constructor(status: 400 | 403 | 404 | 409 | 503, message: string) {
    super(message);
    this.name = "DelegateRouteError";
    this.status = status;
  }
}

const REMOVAL_UNFINISHED = "Removal from the wallet has not finished";

function labelWrite(label: string | null | undefined): { label: string | null } | Record<string, never> {
  if (label === undefined) return {};
  return { label };
}

export async function prepareDelegateQuorum(input: {
  userId: string;
  smartWallet: string;
  publicKey: string;
  label?: string | null;
  createQuorum: (publicKey: string) => Promise<{ id: string }>;
}): Promise<{ quorumId: string }> {
  const existing = await prisma.botDelegate.findUnique({
    where: { userId_delegateAddress: { userId: input.userId, delegateAddress: input.publicKey } },
  });
  if (existing?.status === "revoking") {
    throw new DelegateRouteError(409, REMOVAL_UNFINISHED);
  }
  if (existing?.status === "active" || existing?.status === "pending") {
    const quorumId = readQuorumId(existing.approval);
    if (!quorumId) throw new DelegateRouteError(400, "Start again. The key was not ready to add.");
    if (input.label !== undefined) {
      await prisma.botDelegate.update({
        where: { userId_delegateAddress: { userId: input.userId, delegateAddress: input.publicKey } },
        data: { label: input.label },
      });
    }
    return { quorumId };
  }
  const quorum = await input.createQuorum(input.publicKey);
  const approval = JSON.stringify({ quorumId: quorum.id, publicKey: input.publicKey });
  await prisma.botDelegate.upsert({
    where: { userId_delegateAddress: { userId: input.userId, delegateAddress: input.publicKey } },
    create: {
      userId: input.userId,
      smartWallet: input.smartWallet.toLowerCase(),
      delegateAddress: input.publicKey,
      kind: "grant",
      label: input.label ?? null,
      status: "pending",
      approval,
    },
    update: {
      smartWallet: input.smartWallet.toLowerCase(),
      status: "pending",
      approval,
      revokedAt: null,
      ...labelWrite(input.label),
    },
  });
  return { quorumId: quorum.id };
}

export async function enableDelegate(input: {
  userId: string;
  accountAddress: string;
  publicKey: string;
  quorumId: string;
  label?: string | null;
  linkedAccounts: LinkedAccount[];
  signerInstalled: boolean;
}): Promise<{ status: "active"; delegateAddress: string }> {
  const existing = await prisma.botDelegate.findUnique({
    where: { userId_delegateAddress: { userId: input.userId, delegateAddress: input.publicKey } },
  });
  if (!existing || readQuorumId(existing.approval) !== input.quorumId) {
    throw new DelegateRouteError(400, "Start again. The key was not ready to add.");
  }
  if (existing.status === "revoking") {
    throw new DelegateRouteError(409, REMOVAL_UNFINISHED);
  }
  if (existing.status !== "pending" && existing.status !== "active") {
    throw new DelegateRouteError(400, "Start again. The key was not ready to add.");
  }
  let wallets: ReturnType<typeof walletsFromPrivyUser>;
  try {
    wallets = walletsFromPrivyUser(input.linkedAccounts);
  } catch {
    throw new DelegateRouteError(503, "Your wallet is not ready. Try again.");
  }
  if (isAddress(input.accountAddress)) {
    if (getAddress(wallets.kernel) !== getAddress(input.accountAddress)) {
      throw new DelegateRouteError(403, "Smart wallet does not match the signed-in account");
    }
  } else {
    const wallet = await prisma.userWallet.findFirst({
      where: { userId: input.userId, isPrimary: true, publicKey: wallets.kernel.toLowerCase() },
      select: { id: true },
    });
    if (!wallet) throw new DelegateRouteError(503, "Your wallet is not ready. Try again.");
  }
  if (!input.signerInstalled) {
    throw new DelegateRouteError(400, "The key was not added to your wallet. Try again.");
  }
  const approval = writeQuorumApproval({
    quorumId: input.quorumId,
    publicKey: input.publicKey,
    embeddedWalletId: wallets.embeddedWalletId,
    embeddedAddress: wallets.embeddedAddress,
  });
  await prisma.botDelegate.update({
    where: { id: existing.id },
    data: {
      smartWallet: wallets.kernel.toLowerCase(),
      status: "active",
      approval,
      revokedAt: null,
      ...labelWrite(input.label),
    },
  });
  await prisma.botActionLog.create({
    data: { userId: input.userId, action: "delegate" },
  });
  return { status: "active", delegateAddress: input.publicKey };
}

export async function revokeDelegates(userId: string): Promise<{ status: "revoking"; revoked: number }> {
  const rows = await prisma.botDelegate.findMany({
    where: { userId, status: { in: ["active", "pending", "revoking"] } },
    select: { status: true },
  });
  if (rows.length === 0) throw new DelegateRouteError(404, "No agent has access.");
  const toFlip = rows.filter((row) => row.status !== "revoking");
  if (toFlip.length > 0) {
    await prisma.botDelegate.updateMany({
      where: { userId, status: { in: ["active", "pending"] } },
      data: { status: "revoking", revokedAt: new Date() },
    });
    await prisma.botActionLog.create({
      data: { userId, action: "revoke" },
    });
  }
  return { status: "revoking", revoked: rows.length };
}

export async function confirmRevoke(input: {
  userId: string;
  signerListed: (quorumId: string) => Promise<boolean | "unavailable">;
}): Promise<{ status: "revoked" | "revoking"; revoked?: number }> {
  const rows = await prisma.botDelegate.findMany({
    where: { userId: input.userId, status: "revoking" },
    select: { approval: true },
  });
  if (rows.length === 0) return { status: "revoked", revoked: 0 };
  const quorumIds: string[] = [];
  for (const row of rows) {
    const quorumId = readQuorumId(row.approval);
    if (!quorumId) throw new DelegateRouteError(400, "Start again. The key was not ready to add.");
    quorumIds.push(quorumId);
  }
  for (const quorumId of quorumIds) {
    const listed = await input.signerListed(quorumId);
    if (listed === "unavailable") {
      throw new DelegateRouteError(503, "Could not confirm the key was added to your wallet.");
    }
    if (listed) return { status: "revoking" };
  }
  await prisma.botDelegate.updateMany({
    where: { userId: input.userId, status: "revoking" },
    data: { status: "revoked", revokedAt: new Date() },
  });
  return { status: "revoked", revoked: rows.length };
}

export async function walletListsSigner(walletId: string, quorumId: string): Promise<boolean | "unavailable"> {
  const appId = process.env.PRIVY_APP_ID?.trim();
  const secret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !secret) return "unavailable";
  const response = await fetch(`https://api.privy.io/v1/wallets/${encodeURIComponent(walletId)}`, {
    headers: {
      "privy-app-id": appId,
      authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString("base64")}`,
    },
  });
  if (!response.ok) return "unavailable";
  const body = (await response.json()) as { additional_signers?: { signer_id?: string }[] };
  return body.additional_signers?.some((signer) => signer.signer_id === quorumId) ?? false;
}
