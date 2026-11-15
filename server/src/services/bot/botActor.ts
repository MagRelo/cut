import { getAddress, isAddress, type Address, type Hex } from "viem";
import { prisma } from "../../lib/prisma.js";
import { unpackApproval } from "./approvalEnvelope.js";
import { isKernelWalletOwner } from "./kernelWallet.js";
import { readSessionKeyEnabled } from "./sessionKeyEnabled.js";

export type BotDelegateRow = {
  userId: string;
  smartWallet: string;
  delegateAddress: string;
  kind: "cut_bot" | "external";
  approval: string;
};

/**
 * Who is acting on a smart wallet for one signed request.
 * - `owner`: the ERC-8128 signer is the wallet's ECDSA owner key. It can do everything.
 * - `delegate`: the signer is an active, on-chain-enabled Kernel session key for the wallet.
 */
export type BotActor =
  | { role: "owner"; userId: string; smartWallet: Address; signer: Address }
  | {
      role: "delegate";
      userId: string;
      smartWallet: Address;
      signer: Address;
      delegate: BotDelegateRow;
      approval: string;
      permissionId: Hex;
    };

export type BotActorDeps = {
  findDelegate: (smartWallet: Address, signer: Address) => Promise<BotDelegateRow | null>;
  sessionEnabled: (smartWallet: Address, permissionId: Hex, chainId: number) => Promise<boolean>;
  findUserIdByWallet: (chainId: number, smartWallet: Address) => Promise<string | null>;
  isOwner: (chainId: number, smartWallet: Address, signer: Address) => Promise<boolean>;
};

export type ResolveActorResult =
  | { ok: true; actor: BotActor }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function resolveBotActor(
  input: { chainId: number; smartWallet: string; signer: Address },
  deps: BotActorDeps,
): Promise<ResolveActorResult> {
  if (!isAddress(input.smartWallet)) {
    return { ok: false, status: 400, error: "Invalid smart wallet" };
  }
  const smartWallet = getAddress(input.smartWallet);
  const signer = getAddress(input.signer);

  const delegate = await deps.findDelegate(smartWallet, signer);
  if (delegate) {
    let envelope: { approval: string; permissionId: Hex };
    try {
      envelope = unpackApproval(delegate.approval);
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error: error instanceof Error ? error.message : "Invalid delegate approval",
      };
    }
    const enabled = await deps.sessionEnabled(smartWallet, envelope.permissionId, input.chainId);
    if (!enabled) {
      return { ok: false, status: 403, error: "Session key is not enabled" };
    }
    return {
      ok: true,
      actor: {
        role: "delegate",
        userId: delegate.userId,
        smartWallet,
        signer,
        delegate,
        approval: envelope.approval,
        permissionId: envelope.permissionId,
      },
    };
  }

  if (await deps.isOwner(input.chainId, smartWallet, signer)) {
    const userId = await deps.findUserIdByWallet(input.chainId, smartWallet);
    if (!userId) {
      return { ok: false, status: 404, error: "Account not registered. Call register first" };
    }
    return { ok: true, actor: { role: "owner", userId, smartWallet, signer } };
  }

  return {
    ok: false,
    status: 403,
    error: "Signer is not the wallet owner or an active delegate",
  };
}

export function createBotActorDeps(): BotActorDeps {
  return {
    findDelegate: async (smartWallet, signer) => {
      const row = await prisma.botDelegate.findFirst({
        where: {
          smartWallet: smartWallet.toLowerCase(),
          delegateAddress: signer.toLowerCase(),
          status: "active",
        },
      });
      if (!row || (row.kind !== "cut_bot" && row.kind !== "external")) return null;
      return {
        userId: row.userId,
        smartWallet: row.smartWallet,
        delegateAddress: row.delegateAddress,
        kind: row.kind,
        approval: row.approval,
      };
    },
    sessionEnabled: readSessionKeyEnabled,
    findUserIdByWallet: async (chainId, smartWallet) => {
      const wallet = await prisma.userWallet.findUnique({
        where: { chainId_publicKey: { chainId, publicKey: smartWallet.toLowerCase() } },
        select: { userId: true },
      });
      return wallet?.userId ?? null;
    },
    isOwner: async (chainId, smartWallet, signer) => {
      try {
        return await isKernelWalletOwner(chainId, smartWallet, signer);
      } catch (error) {
        console.error("isKernelWalletOwner:", error);
        return false;
      }
    },
  };
}
