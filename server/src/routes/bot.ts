import { Hono } from "hono";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";
import { getCutBotAddress, isCutBotAddress } from "../lib/cutBotKey.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { packApproval } from "../services/bot/approvalEnvelope.js";
import { getEventCandidates } from "../services/events/getEventCandidates.js";
import { PREPARE_CALLS_HASH, executeBotAction } from "../services/bot/executeBotAction.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";

const botRouter = new Hono();
const deps = createBotActionDeps();

const hexSchema = z.string().regex(/^0x[0-9a-fA-F]*$/);

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

const actionSchema = z.object({
  chainId: z.number().int(),
  action: z.enum(["join", "leave", "update"]),
  smartWallet: z.string(),
  contestId: z.string().min(1),
  lineupId: z.string().default(""),
  candidates: z.array(z.string().min(1)).optional(),
  picks: z.array(z.string().min(1)).optional(),
  callsHash: hexSchema.default(PREPARE_CALLS_HASH),
  prediction: z.unknown().optional(),
  deadline: z.string().regex(/^\d+$/),
  signature: hexSchema,
  userOpSignature: hexSchema.optional(),
});

function selectedCandidates(body: {
  candidates?: string[] | undefined;
  picks?: string[] | undefined;
}): string[] | { error: string } {
  if (body.candidates && body.picks) {
    const same =
      body.candidates.length === body.picks.length &&
      body.candidates.every((id, index) => id === body.picks?.[index]);
    if (!same) return { error: "candidates and picks do not match" };
  }
  return body.candidates ?? body.picks ?? [];
}

botRouter.get("/delegate-address", (c) => {
  return c.json({ address: getCutBotAddress() });
});

botRouter.get("/contests/:contestId/candidates", async (c) => {
  const contest = await prisma.contest.findUnique({
    where: { id: c.req.param("contestId") },
    select: { id: true, eventId: true, event: { select: { sportId: true } } },
  });
  if (!contest) return c.json({ error: "Contest not found" }, 404);

  const candidates = await getEventCandidates(contest.event.sportId, contest.eventId);
  if (candidates === null) return c.json({ error: "Event not found" }, 404);

  return c.json({
    contestId: contest.id,
    eventId: contest.eventId,
    candidates,
  });
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

botRouter.post("/delegates", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = enableSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.errors }, 400);
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

botRouter.post("/delegates/revoke", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = revokeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.errors }, 400);
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
  const parsed = actionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.errors }, 400);
  }
  const body = parsed.data;
  const candidates = selectedCandidates(body);
  if (!Array.isArray(candidates)) {
    return c.json({ error: candidates.error }, 400);
  }
  const result = await executeBotAction(
    {
      chainId: body.chainId,
      action: body.action,
      smartWallet: body.smartWallet,
      contestId: body.contestId,
      lineupId: body.lineupId,
      picks: candidates,
      callsHash: body.callsHash as Hex,
      ...(body.prediction !== undefined ? { prediction: body.prediction } : {}),
      deadline: BigInt(body.deadline),
      signature: body.signature as Hex,
      ...(body.userOpSignature ? { userOpSignature: body.userOpSignature as Hex } : {}),
      nowSeconds: Math.floor(Date.now() / 1000),
    },
    deps,
  );
  if (!result.ok) {
    const status = result.status as 400 | 401 | 403 | 404 | 409 | 502 | 503;
    return c.json({ error: result.error }, status);
  }
  if (result.prepared) {
    return c.json({
      prepared: true,
      lineupId: result.lineupId,
      callsHash: result.callsHash,
      calls: result.calls.map((call) => ({
        to: call.to,
        data: call.data,
        value: call.value.toString(),
      })),
    });
  }
  return c.json({ ok: true, lineupId: result.lineupId });
});

export default botRouter;
