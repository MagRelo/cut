import { actionSchema } from "@playthecut/agent/contract";
import { Hono } from "hono";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";
import { getCutBotAddress, isCutBotAddress } from "../lib/cutBotKey.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePrivySession } from "../middleware/auth.js";
import { packApproval } from "../services/bot/approvalEnvelope.js";
import { executeYield } from "../services/bot/executeYield.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";
import { verifyBotRequest } from "../services/bot/verifyBotRequest.js";

const botRouter = new Hono();

const enableSchema = z.object({
  kind: z.enum(["cut_bot", "external"]),
  delegateAddress: z.string().refine((value) => isAddress(value), "Invalid delegate address"),
  smartWallet: z.string().refine((value) => isAddress(value), "Invalid smart wallet"),
  approval: z.string().min(1),
  permissionId: z.string().regex(/^0x[0-9a-fA-F]{8}$/, "Invalid permission id"),
});

const revokeSchema = z.object({
  delegateAddress: z.string().refine((value) => isAddress(value), "Invalid delegate address"),
});

botRouter.get("/delegate-address", (c) => {
  return c.json({ address: getCutBotAddress() });
});

botRouter.get("/delegates", requireAuth, async (c) => {
  const user = c.get("user");
  const rows = await prisma.botDelegate.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      delegateAddress: true,
      smartWallet: true,
      kind: true,
      status: true,
      createdAt: true,
      revokedAt: true,
    },
  });
  return c.json({ delegates: rows, cutBotAddress: getCutBotAddress() });
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
  if (body.kind === "cut_bot" && !isCutBotAddress(delegateAddress)) {
    return c.json({ error: "That address is not Cut Bot" }, 400);
  }
  if (body.kind === "external" && isCutBotAddress(delegateAddress)) {
    return c.json({ error: "Use Allow Cut Bot for the Cut Bot address" }, 400);
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
      kind: body.kind,
      status: "active",
      approval,
    },
    update: {
      smartWallet,
      kind: body.kind,
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

botRouter.post("/actions", async (c) => {
  const verified = await verifyBotRequest(c.req.raw.clone());
  if (!verified.ok) return c.json({ error: verified.error }, verified.status);
  const parsed = actionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
  }
  const body = parsed.data;
  if (body.chainId !== verified.chainId) {
    return c.json({ error: "Signature chain does not match the request" }, 400);
  }
  if (body.action === "yield") {
    const result = await executeYield({
      chainId: body.chainId,
      smartWallet: body.smartWallet,
      signer: verified.signer,
      ...(body.userOpSignature ? { userOpSignature: body.userOpSignature as Hex } : {}),
      ...(body.userOp ? { userOp: body.userOp as SerializedUserOp } : {}),
    });
    if (!result.ok) {
      const status = result.status as 400 | 401 | 403 | 404 | 409 | 502 | 503;
      return c.json({ error: result.error }, status);
    }
    if ("preparedUserOp" in result) {
      return c.json({
        preparedUserOp: true,
        userOpHash: result.userOpHash,
        userOp: result.userOp,
      });
    }
    return c.json({ ok: true, yielded: true });
  }
  return c.json({ error: "Use the contest and lineup routes" }, 400);
});

export default botRouter;
