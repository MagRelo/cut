import type { Prisma } from "@prisma/client";
import { erc20Abi, formatUnits, getAddress, type Address, type Hex } from "viem";
import { isCutBotAddress } from "../../lib/cutBotKey.js";
import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { prisma } from "../../lib/prisma.js";
import { mergeUserSettings, type UpdateUserSettingsBody } from "../../schemas/user.js";
import { getPublicClient } from "../shared/contractClient.js";
import { packApproval } from "./approvalEnvelope.js";
import type { BotActor } from "./botActor.js";
import { createApprovalCheckDeps } from "./delegatePolicyRuntime.js";
import { validateDelegateApproval, type ApprovalCheckDeps } from "./delegatePolicy.js";

type Fail = { ok: false; status: 400 | 403 | 404 | 502 | 503; error: string };

// ---------------------------------------------------------------------------
// userSettingsUpsert
// ---------------------------------------------------------------------------

export type UserSettingsDeps = {
  loadUser: (userId: string) => Promise<{ name: string; settings: unknown } | null>;
  saveUser: (
    userId: string,
    data: { name: string; settings: Record<string, unknown> },
  ) => Promise<void>;
};

/** Owner or delegate. Merges like `PUT /api/auth/settings`; repeating it is a no-op. */
export async function upsertUserSettings(
  actor: BotActor,
  patch: { name?: string | undefined; settings?: UpdateUserSettingsBody | undefined },
  deps: UserSettingsDeps,
): Promise<{ ok: true; name: string; settings: Record<string, unknown> } | Fail> {
  const user = await deps.loadUser(actor.userId);
  if (!user) return { ok: false, status: 404, error: "User not found" };
  const name = patch.name ?? user.name;
  const settings = mergeUserSettings(user.settings, patch.settings ?? {});
  await deps.saveUser(actor.userId, { name, settings });
  return { ok: true, name, settings };
}

export function createUserSettingsDeps(): UserSettingsDeps {
  return {
    loadUser: (userId) =>
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, settings: true } }),
    saveUser: async (userId, data) => {
      await prisma.user.update({
        where: { id: userId },
        data: { name: data.name, settings: data.settings as Prisma.InputJsonValue },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// delegateAdd / delegateRevoke (owner only)
// ---------------------------------------------------------------------------

export type DelegateDeps = {
  upsertDelegate: (input: {
    userId: string;
    smartWallet: string;
    delegateAddress: string;
    kind: "cut_bot" | "external";
    approval: string;
  }) => Promise<void>;
  revokeDelegate: (userId: string, delegateAddress: string) => Promise<boolean>;
  isCutBot: (address: string) => boolean;
  approvals: ApprovalCheckDeps;
};

export async function addDelegate(
  actor: BotActor,
  input: {
    chainId: number;
    kind: "cut_bot" | "external";
    delegateAddress: string;
    approval: string;
    permissionId: Hex;
  },
  deps: DelegateDeps,
): Promise<{ ok: true; status: "active"; delegateAddress: string; policyAddress: string } | Fail> {
  if (actor.role !== "owner") {
    return { ok: false, status: 403, error: "Only the wallet owner can add a delegate" };
  }
  const delegateAddress = getAddress(input.delegateAddress).toLowerCase();
  if (delegateAddress === actor.signer.toLowerCase()) {
    return { ok: false, status: 400, error: "The owner key cannot be its own delegate" };
  }
  if (input.kind === "cut_bot" && !deps.isCutBot(delegateAddress)) {
    return { ok: false, status: 400, error: "That address is not Cut Bot" };
  }
  if (input.kind === "external" && deps.isCutBot(delegateAddress)) {
    return { ok: false, status: 400, error: "Use kind cut_bot for the Cut Bot address" };
  }
  const checked = await validateDelegateApproval(
    {
      chainId: input.chainId,
      smartWallet: actor.smartWallet,
      delegateAddress: getAddress(delegateAddress),
      approval: input.approval,
      permissionId: input.permissionId,
    },
    deps.approvals,
  );
  if (!checked.ok) return { ok: false, status: checked.status ?? 400, error: checked.error };
  let approval: string;
  try {
    approval = packApproval({ approval: input.approval, permissionId: input.permissionId });
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Invalid approval",
    };
  }
  await deps.upsertDelegate({
    userId: actor.userId,
    smartWallet: actor.smartWallet.toLowerCase(),
    delegateAddress,
    kind: input.kind,
    approval,
  });
  return { ok: true, status: "active", delegateAddress, policyAddress: checked.policyAddress };
}

export async function revokeDelegate(
  actor: BotActor,
  input: { delegateAddress: string },
  deps: DelegateDeps,
): Promise<{ ok: true; status: "revoked"; delegateAddress: string } | Fail> {
  const delegateAddress = getAddress(input.delegateAddress).toLowerCase();
  // The owner can revoke any delegate; a delegate can only revoke itself.
  if (actor.role !== "owner" && actor.signer.toLowerCase() !== delegateAddress) {
    return { ok: false, status: 403, error: "Only the wallet owner can revoke another delegate" };
  }
  const revoked = await deps.revokeDelegate(actor.userId, delegateAddress);
  if (!revoked) return { ok: false, status: 404, error: "Delegate not found" };
  return { ok: true, status: "revoked", delegateAddress };
}

export function createDelegateDeps(): DelegateDeps {
  return {
    upsertDelegate: async ({ userId, smartWallet, delegateAddress, kind, approval }) => {
      await prisma.botDelegate.upsert({
        where: { userId_delegateAddress: { userId, delegateAddress } },
        create: { userId, smartWallet, delegateAddress, kind, status: "active", approval },
        update: { smartWallet, kind, status: "active", approval, revokedAt: null },
      });
    },
    revokeDelegate: async (userId, delegateAddress) => {
      const updated = await prisma.botDelegate.updateMany({
        where: { userId, delegateAddress },
        data: { status: "revoked", revokedAt: new Date() },
      });
      return updated.count > 0;
    },
    isCutBot: isCutBotAddress,
    approvals: createApprovalCheckDeps(),
  };
}

// ---------------------------------------------------------------------------
// balance (signed read, no nonce)
// ---------------------------------------------------------------------------

export type BotBalance = {
  chainId: number;
  smartWallet: Address;
  deployed: boolean;
  paymentToken: {
    address: Address;
    symbol: string;
    decimals: number;
    /** Raw token units as a decimal string. */
    balance: string;
    /** `balance` scaled by `decimals`, as the app shows it. */
    formatted: string;
  };
};

export type BalanceDeps = {
  paymentToken: (chainId: number) => Address | null;
  readToken: (
    chainId: number,
    token: Address,
    owner: Address,
  ) => Promise<{ balance: bigint; decimals: number; symbol: string }>;
  isDeployed: (chainId: number, smartWallet: Address) => Promise<boolean>;
};

/**
 * The app's wallet balance is the contest payment token (USDC on Base, xUSDC on Base
 * Sepolia) held by the smart wallet. See `WalletBalancePanel.tsx`.
 */
export async function readBotBalance(
  actor: BotActor,
  chainId: number,
  deps: BalanceDeps,
): Promise<{ ok: true; balance: BotBalance } | Fail> {
  const token = deps.paymentToken(chainId);
  if (!token)
    return { ok: false, status: 503, error: "Payment token is not configured for this chain" };
  try {
    const [read, deployed] = await Promise.all([
      deps.readToken(chainId, token, actor.smartWallet),
      deps.isDeployed(chainId, actor.smartWallet),
    ]);
    return {
      ok: true,
      balance: {
        chainId,
        smartWallet: actor.smartWallet,
        deployed,
        paymentToken: {
          address: token,
          symbol: read.symbol,
          decimals: read.decimals,
          balance: read.balance.toString(),
          formatted: formatUnits(read.balance, read.decimals),
        },
      },
    };
  } catch (error) {
    console.error("bot balance read:", error);
    return { ok: false, status: 502, error: "Could not read the wallet balance" };
  }
}

export function createBalanceDeps(): BalanceDeps {
  return {
    paymentToken: getPaymentTokenAddress,
    readToken: async (chainId, token, owner) => {
      const client = getPublicClient(chainId);
      const [balance, decimals, symbol] = await Promise.all([
        client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
        }),
        client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
        client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
      ]);
      return { balance, decimals, symbol };
    },
    isDeployed: async (chainId, smartWallet) => {
      const code = await getPublicClient(chainId).getCode({ address: smartWallet });
      return Boolean(code && code !== "0x");
    },
  };
}
