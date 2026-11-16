import { Hono } from "hono";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";
import { getCutBotAddress, isCutBotAddress } from "../lib/cutBotKey.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePrivySession } from "../middleware/auth.js";
import { packApproval } from "../services/bot/approvalEnvelope.js";
import { botContestListDeps, listSignedBotContests } from "../services/bot/listBotContests.js";
import { executeBotAction } from "../services/bot/executeBotAction.js";
import { createContestActionDeps, executeCreateContest } from "../services/bot/executeCreateContest.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";
import { verifyBotRequest } from "../services/bot/verifyBotRequest.js";
import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "../schemas/limits.js";
import { contestSettingsSchema } from "../schemas/contest.js";

const botRouter = new Hono();
const deps = createBotActionDeps();
const createDeps = createContestActionDeps();

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

const uintSchema = z.string().regex(/^\d+$/);

const userOpSchema = z.object({
  sender: z.string().refine((value) => isAddress(value), "Invalid user operation sender"),
  nonce: uintSchema,
  callData: hexSchema,
  callGasLimit: uintSchema,
  verificationGasLimit: uintSchema,
  preVerificationGas: uintSchema,
  maxFeePerGas: uintSchema,
  maxPriorityFeePerGas: uintSchema,
  paymaster: z.string().optional(),
  paymasterData: hexSchema.optional(),
  paymasterVerificationGasLimit: uintSchema.optional(),
  paymasterPostOpGasLimit: uintSchema.optional(),
  factory: z.string().optional(),
  factoryData: hexSchema.optional(),
});

const playActionSchema = z.object({
  chainId: z.number().int(),
  action: z.enum(["lineupUpsert", "join", "leave"]),
  smartWallet: z.string(),
  contestId: z.string().min(1),
  lineupId: z.string().default(""),
  candidates: z.array(z.string().min(1)).optional(),
  prediction: z.unknown().optional(),
  userOpSignature: hexSchema.optional(),
  userOp: userOpSchema.optional(),
});

const createContestActionSchema = z
  .object({
    chainId: z.number().int(),
    action: z.literal("createContest"),
    smartWallet: z.string(),
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    eventId: z.string().cuid(),
    userGroupId: z.string().cuid().optional(),
    endDate: z.union([z.string().datetime(), z.number()]),
    settings: contestSettingsSchema,
    notifyLeagueMembers: z.boolean().optional(),
    userOpSignature: hexSchema.optional(),
    userOp: userOpSchema.optional(),
  });

const actionSchema = z.discriminatedUnion("action", [playActionSchema, createContestActionSchema]);

function selectedCandidates(body: { candidates?: string[] | undefined }): string[] {
  return body.candidates ?? [];
}

botRouter.get("/delegate-address", (c) => {
  return c.json({ address: getCutBotAddress() });
});

const listDeps = botContestListDeps();

botRouter.get("/contests", async (c) => {
  const chainId = Number(c.req.query("chainId"));
  const smartWallet = c.req.query("smartWallet") ?? "";
  const eventId = c.req.query("eventId")?.trim();
  if (chainId !== 8453 && chainId !== 84532) {
    return c.json({ error: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)" }, 400);
  }
  const verified = await verifyBotRequest(c.req.raw.clone());
  if (!verified.ok) return c.json({ error: verified.error }, verified.status);
  if (verified.chainId !== chainId) {
    return c.json({ error: "Signature chain does not match the request" }, 400);
  }
  const result = await listSignedBotContests(
    {
      chainId,
      smartWallet,
      signer: verified.signer,
      ...(eventId ? { eventId } : {}),
    },
    listDeps,
  );
  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json({ contests: result.contests });
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

botRouter.post("/delegates/revoke", requireAuth, requirePrivySession, async (c) => {
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
  const verified = await verifyBotRequest(c.req.raw.clone());
  if (!verified.ok) return c.json({ error: verified.error }, verified.status);
  const parsed = actionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.errors }, 400);
  }
  const body = parsed.data;
  if (body.chainId !== verified.chainId) {
    return c.json({ error: "Signature chain does not match the request" }, 400);
  }
  if (body.action === "createContest") {
    const result = await executeCreateContest(
      {
        chainId: body.chainId,
        smartWallet: body.smartWallet,
        signer: verified.signer,
        name: body.name,
        ...(body.description !== undefined ? { description: body.description } : {}),
        eventId: body.eventId,
        ...(body.userGroupId ? { userGroupId: body.userGroupId } : {}),
        endTime: new Date(body.endDate),
        settings: (body.settings ?? {}) as Record<string, unknown>,
        ...(body.notifyLeagueMembers !== undefined
          ? { notifyLeagueMembers: body.notifyLeagueMembers }
          : {}),
        ...(body.userOpSignature ? { userOpSignature: body.userOpSignature as Hex } : {}),
        ...(body.userOp ? { userOp: body.userOp as SerializedUserOp } : {}),
      },
      createDeps,
    );
    if (!result.ok) {
      const status = result.status as 400 | 401 | 403 | 404 | 409 | 502 | 503;
      return c.json({ error: result.error }, status);
    }
    if (result.preparedUserOp) {
      return c.json({
        preparedUserOp: true,
        userOpHash: result.userOpHash,
        userOp: result.userOp,
      });
    }
    return c.json({ ok: true, contestId: result.contestId, address: result.address });
  }
  const candidates = selectedCandidates(body);
  const result = await executeBotAction(
    {
      chainId: body.chainId,
      action: body.action,
      smartWallet: body.smartWallet,
      contestId: body.contestId,
      lineupId: body.lineupId,
      picks: candidates,
      ...(body.prediction !== undefined ? { prediction: body.prediction } : {}),
      signer: verified.signer,
      ...(body.userOpSignature ? { userOpSignature: body.userOpSignature as Hex } : {}),
      ...(body.userOp ? { userOp: body.userOp as SerializedUserOp } : {}),
    },
    deps,
  );
  if (!result.ok) {
    const status = result.status as 400 | 401 | 403 | 404 | 409 | 502 | 503;
    return c.json({ error: result.error }, status);
  }
  if (result.preparedUserOp) {
    return c.json({
      preparedUserOp: true,
      lineupId: result.lineupId,
      userOpHash: result.userOpHash,
      userOp: result.userOp,
    });
  }
  return c.json({ ok: true, lineupId: result.lineupId });
});

export default botRouter;
