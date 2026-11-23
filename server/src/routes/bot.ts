import { Hono } from "hono";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePrivySession } from "../middleware/auth.js";
import { packApproval } from "../services/bot/approvalEnvelope.js";

const botRouter = new Hono();

const enableSchema = z.object({
  delegateAddress: z.string().refine((value) => isAddress(value), "Invalid delegate address"),
  smartWallet: z.string().refine((value) => isAddress(value), "Invalid smart wallet"),
  approval: z.string().min(1),
  permissionId: z.string().regex(/^0x[0-9a-fA-F]{8}$/, "Invalid permission id"),
});

const revokeSchema = z.object({
  delegateAddress: z.string().refine((value) => isAddress(value), "Invalid delegate address"),
});

botRouter.get("/delegates", requireAuth, async (c) => {
  const user = c.get("user");
  const rows = await prisma.botDelegate.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      delegateAddress: true,
      smartWallet: true,
      status: true,
      createdAt: true,
      revokedAt: true,
    },
  });
  return c.json({ delegates: rows });
});

botRouter.post("/delegates", requireAuth, requirePrivySession, async (c) => {
  const user = c.get("user");
  const parsed = enableSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
  }
  const body = parsed.data;
  const smartWallet = getAddress(body.smartWallet).toLowerCase();
  const delegateAddress = getAddress(body.delegateAddress).toLowerCase();
  if (smartWallet !== user.address.toLowerCase()) {
    return c.json({ error: "Smart wallet does not match the signed-in account" }, 403);
  }

  const approval = packApproval({
    approval: body.approval,
    permissionId: body.permissionId as Hex,
  });
  await prisma.botDelegate.upsert({
    where: { userId_delegateAddress: { userId: user.userId, delegateAddress } },
    create: {
      userId: user.userId,
      smartWallet,
      delegateAddress,
      status: "active",
      approval,
    },
    update: {
      smartWallet,
      status: "active",
      approval,
      revokedAt: null,
    },
  });
  await prisma.botActionLog.create({
    data: { userId: user.userId, action: "delegate" },
  });
  return c.json({ status: "active", delegateAddress });
});

botRouter.post("/delegates/revoke", requireAuth, requirePrivySession, async (c) => {
  const user = c.get("user");
  const parsed = revokeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
  }
  const delegateAddress = getAddress(parsed.data.delegateAddress).toLowerCase();
  const existing = await prisma.botDelegate.findUnique({
    where: { userId_delegateAddress: { userId: user.userId, delegateAddress } },
  });
  if (!existing) {
    return c.json({ error: "Delegate not found" }, 404);
  }
  await prisma.botDelegate.update({
    where: { id: existing.id },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await prisma.botActionLog.create({
    data: { userId: user.userId, action: "revoke" },
  });
  return c.json({ status: "revoked", delegateAddress });
});

export default botRouter;
