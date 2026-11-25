import { Hono } from "hono";
import { z } from "zod";
import { isDelegatePublicKey } from "@playthecut/agent";
import { prisma } from "../lib/prisma.js";
import { getPrivyClient } from "../lib/privyClient.js";
import { requireAuth, requirePrivySession } from "../middleware/auth.js";
import {
  confirmRevoke,
  DelegateRouteError,
  enableDelegate,
  prepareDelegateQuorum,
  revokeDelegates,
  walletListsSigner,
} from "../services/bot/delegates.js";
import { readQuorumId } from "../services/bot/quorumApproval.js";

const botRouter = new Hono();

const quorumSchema = z.object({
  publicKey: z.string().refine((value) => isDelegatePublicKey(value), "Invalid public key"),
});

const enableSchema = z.object({
  publicKey: z.string().refine((value) => isDelegatePublicKey(value), "Invalid public key"),
  quorumId: z.string().min(1),
});

function embeddedWalletId(accounts: readonly object[]): string | null {
  for (const account of accounts) {
    if (!("type" in account) || account.type !== "wallet") continue;
    if (!("chain_type" in account) || account.chain_type !== "ethereum") continue;
    if (!("connector_type" in account) || account.connector_type !== "embedded") continue;
    if (!("id" in account) || typeof account.id !== "string" || account.id.length === 0) continue;
    return account.id;
  }
  return null;
}

function delegateError(
  error: unknown,
): { status: 400 | 403 | 404 | 409 | 503; body: { error: string } } | null {
  if (error instanceof DelegateRouteError) {
    return { status: error.status, body: { error: error.message } };
  }
  return null;
}

botRouter.get("/delegates", requireAuth, async (c) => {
  const user = c.get("user");
  const rows = await prisma.botDelegate.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      delegateAddress: true,
      smartWallet: true,
      status: true,
      approval: true,
      createdAt: true,
      revokedAt: true,
    },
  });
  return c.json({
    delegates: rows.map((row) => ({
      delegateAddress: row.delegateAddress,
      smartWallet: row.smartWallet,
      status: row.status,
      quorumId: readQuorumId(row.approval),
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    })),
  });
});

botRouter.post("/delegates/quorum", requireAuth, requirePrivySession, async (c) => {
  try {
    const user = c.get("user");
    const parsed = quorumSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }
    const prepared = await prepareDelegateQuorum({
      userId: user.userId,
      smartWallet: user.address,
      publicKey: parsed.data.publicKey,
      createQuorum: async (publicKey) => {
        const quorum = await getPrivyClient().keyQuorums().create({
          public_keys: [publicKey],
          authorization_threshold: 1,
          display_name: "Play The Cut agent",
        });
        return { id: quorum.id };
      },
    });
    return c.json(prepared);
  } catch (error) {
    const routed = delegateError(error);
    if (routed) return c.json(routed.body, routed.status);
    throw error;
  }
});

botRouter.post("/delegates", requireAuth, requirePrivySession, async (c) => {
  try {
    const user = c.get("user");
    const parsed = enableSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }
    const privyUserId = c.get("privyUserId");
    if (!privyUserId) return c.json({ error: "No token provided" }, 401);
    const privyUser = await getPrivyClient().users()._get(privyUserId);
    const pending = await prisma.botDelegate.findUnique({
      where: {
        userId_delegateAddress: { userId: user.userId, delegateAddress: parsed.data.publicKey },
      },
      select: { approval: true },
    });
    const quorumId = pending ? readQuorumId(pending.approval) : null;
    if (!quorumId || quorumId !== parsed.data.quorumId) {
      return c.json({ error: "Start again. The key was not ready to add." }, 400);
    }
    const embeddedId = embeddedWalletId(privyUser.linked_accounts);
    if (!embeddedId) return c.json({ error: "Your wallet is not ready. Try again." }, 503);
    const installed = await walletListsSigner(embeddedId, quorumId);
    if (installed === "unavailable") {
      return c.json({ error: "Could not confirm the key was added to your wallet." }, 503);
    }
    const enabled = await enableDelegate({
      userId: user.userId,
      accountAddress: user.address,
      publicKey: parsed.data.publicKey,
      quorumId,
      linkedAccounts: privyUser.linked_accounts,
      signerInstalled: installed,
    });
    return c.json(enabled);
  } catch (error) {
    const routed = delegateError(error);
    if (routed) return c.json(routed.body, routed.status);
    throw error;
  }
});

botRouter.post("/delegates/revoke", requireAuth, requirePrivySession, async (c) => {
  try {
    const user = c.get("user");
    return c.json(await revokeDelegates(user.userId));
  } catch (error) {
    const routed = delegateError(error);
    if (routed) return c.json(routed.body, routed.status);
    throw error;
  }
});

botRouter.post("/delegates/revoke/confirm", requireAuth, requirePrivySession, async (c) => {
  try {
    const user = c.get("user");
    let embeddedId: string | null | undefined;
    const confirmed = await confirmRevoke({
      userId: user.userId,
      signerListed: async (quorumId) => {
        if (embeddedId === undefined) {
          const privyUserId = c.get("privyUserId");
          if (!privyUserId) {
            embeddedId = null;
          } else {
            const privyUser = await getPrivyClient().users()._get(privyUserId);
            embeddedId = embeddedWalletId(privyUser.linked_accounts);
          }
        }
        if (!embeddedId) return "unavailable";
        return walletListsSigner(embeddedId, quorumId);
      },
    });
    return c.json(confirmed);
  } catch (error) {
    const routed = delegateError(error);
    if (routed) return c.json(routed.body, routed.status);
    throw error;
  }
});

export default botRouter;
