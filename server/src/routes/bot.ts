import { Hono } from "hono";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { z } from "zod";
import { getCutBotAddress, isCutBotAddress } from "../lib/cutBotKey.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { packApproval } from "../services/bot/approvalEnvelope.js";
import { botContestListDeps, listSignedBotContests } from "../services/bot/listBotContests.js";
import { executeBotAction, type Erc8128Auth } from "../services/bot/executeBotAction.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";
import {
  verifyErc8128Request,
  ERC8128_SPEC_VERSION,
  type Erc8128VerifyResult,
} from "../services/bot/erc8128.js";

/**
 * Verify ERC-8128 signature from HTTP headers.
 * Returns the verified result or null if headers are not present.
 *
 * ERC-8128 spec version: draft-2026-01-16
 * @see https://erc8128.slice.so/
 */
async function verifyErc8128Headers(
  req: {
    header: (name: string) => string | undefined;
    method: string;
    url: string;
  },
  body?: string,
  nowSeconds?: number,
): Promise<Erc8128VerifyResult | null> {
  const signatureInput = req.header("signature-input");
  const signature = req.header("signature");

  if (!signatureInput || !signature) {
    return null; // No ERC-8128 headers, use legacy format
  }

  const url = new URL(req.url);
  const contentDigest = req.header("content-digest");

  return verifyErc8128Request({
    method: req.method,
    authority: url.host,
    path: url.pathname,
    query: url.search || undefined,
    contentDigest,
    signatureInput,
    signature,
    body: body ? new TextEncoder().encode(body) : undefined,
    nowSeconds: nowSeconds ?? Math.floor(Date.now() / 1000),
  });
}

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

const actionSchema = z.object({
  chainId: z.number().int(),
  action: z.enum(["lineupUpsert", "join", "leave"]),
  smartWallet: z.string(),
  contestId: z.string().min(1),
  lineupId: z.string().default(""),
  candidates: z.array(z.string().min(1)).optional(),
  picks: z.array(z.string().min(1)).optional(),
  prediction: z.unknown().optional(),
  deadline: z.string().regex(/^\d+$/),
  signature: hexSchema,
  userOpSignature: hexSchema.optional(),
  userOp: userOpSchema.optional(),
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

const listDeps = botContestListDeps();

/**
 * GET /api/bot/contests - List contests accessible to a delegate.
 *
 * Supports two authentication methods:
 * 1. ERC-8128 HTTP Message Signatures (preferred) - signature in headers, no nonce required for reads
 * 2. Legacy EIP-712 query params - signature, deadline, smartWallet, chainId in query string
 *
 * ERC-8128 reads are replayable (no nonce requirement) since they don't modify state.
 */
botRouter.get("/contests", async (c) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const eventId = c.req.query("eventId")?.trim();

  // Check for ERC-8128 headers first
  const erc8128Result = await verifyErc8128Headers(c.req, undefined, nowSeconds);

  if (erc8128Result) {
    // ERC-8128 headers present
    if (!erc8128Result.ok) {
      return c.json({ error: erc8128Result.error }, 401);
    }

    // Reads don't require nonce (replayable is OK)
    const chainId = erc8128Result.chainId;
    const smartWallet = c.req.query("smartWallet") ?? "";

    if (!isAddress(smartWallet)) {
      return c.json({ error: "smartWallet query parameter required for ERC-8128 signed reads" }, 400);
    }

    if (chainId !== 8453 && chainId !== 84532) {
      return c.json({ error: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)" }, 400);
    }

    const result = await listSignedBotContests(
      {
        chainId,
        smartWallet,
        deadline: BigInt(erc8128Result.expires),
        signature: "0x" as Hex, // Placeholder, signature already verified via headers
        ...(eventId ? { eventId } : {}),
        nowSeconds,
        // Pass pre-verified signer for ERC-8128
        erc8128Signer: erc8128Result.address,
      },
      listDeps,
    );

    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ contests: result.contests });
  }

  // Legacy EIP-712 query param format
  const chainId = Number(c.req.query("chainId"));
  const smartWallet = c.req.query("smartWallet") ?? "";
  const deadline = c.req.query("deadline") ?? "";
  const signature = c.req.query("signature") ?? "";

  if (chainId !== 8453 && chainId !== 84532) {
    return c.json({ error: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)" }, 400);
  }
  if (!/^0x[0-9a-fA-F]+$/.test(signature) || !/^\d+$/.test(deadline)) {
    return c.json({ error: "Invalid request" }, 400);
  }

  const result = await listSignedBotContests(
    {
      chainId,
      smartWallet,
      deadline: BigInt(deadline),
      signature: signature as Hex,
      ...(eventId ? { eventId } : {}),
      nowSeconds,
    },
    listDeps,
  );

  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }
  // Add deprecation warning header for legacy format
  c.header("X-Deprecation-Warning", "EIP-712 query signatures are deprecated. Migrate to ERC-8128 HTTP Message Signatures.");
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

/**
 * ERC-8128 action body schema - only contains the action data, no signature.
 * Signature is in HTTP headers per RFC 9421.
 */
const erc8128ActionSchema = z.object({
  chainId: z.number().int(),
  action: z.enum(["lineupUpsert", "join", "leave"]),
  smartWallet: z.string(),
  contestId: z.string().min(1),
  lineupId: z.string().default(""),
  candidates: z.array(z.string().min(1)).optional(),
  picks: z.array(z.string().min(1)).optional(),
  prediction: z.unknown().optional(),
  userOpSignature: hexSchema.optional(),
  userOp: userOpSchema.optional(),
});

botRouter.post("/actions", async (c) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const rawBody = await c.req.text();
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Check for ERC-8128 headers first
  const erc8128Result = await verifyErc8128Headers(c.req, rawBody, nowSeconds);

  let erc8128Auth: Erc8128Auth | undefined;

  if (erc8128Result) {
    // ERC-8128 headers present
    if (!erc8128Result.ok) {
      return c.json({ error: erc8128Result.error }, 401);
    }

    // Write actions MUST include a nonce for replay protection
    if (erc8128Result.replayable) {
      return c.json(
        { error: "Write actions require a nonce for replay protection (non-replayable signature)" },
        400,
      );
    }

    erc8128Auth = {
      signer: erc8128Result.address,
      chainId: erc8128Result.chainId,
      nonce: erc8128Result.nonce!,
    };

    // Parse body without signature fields
    const parsed = erc8128ActionSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.errors }, 400);
    }
    const body = parsed.data;
    const candidates = selectedCandidates(body);
    if (!Array.isArray(candidates)) {
      return c.json({ error: candidates.error }, 400);
    }

    // Verify chainId matches
    if (body.chainId !== erc8128Auth.chainId) {
      return c.json({ error: "Body chainId does not match signature keyid chainId" }, 400);
    }

    const result = await executeBotAction(
      {
        chainId: body.chainId,
        action: body.action,
        smartWallet: body.smartWallet,
        contestId: body.contestId,
        lineupId: body.lineupId,
        picks: candidates,
        ...(body.prediction !== undefined ? { prediction: body.prediction } : {}),
        deadline: BigInt(erc8128Result.expires), // Use signature expires as deadline
        signature: "0x" as Hex, // Placeholder, signature already verified
        ...(body.userOpSignature ? { userOpSignature: body.userOpSignature as Hex } : {}),
        ...(body.userOp ? { userOp: body.userOp as SerializedUserOp } : {}),
        nowSeconds,
        erc8128Auth,
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
  }

  // Legacy EIP-712 body signature format
  const parsed = actionSchema.safeParse(parsedBody);
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
      ...(body.prediction !== undefined ? { prediction: body.prediction } : {}),
      deadline: BigInt(body.deadline),
      signature: body.signature as Hex,
      ...(body.userOpSignature ? { userOpSignature: body.userOpSignature as Hex } : {}),
      ...(body.userOp ? { userOp: body.userOp as SerializedUserOp } : {}),
      nowSeconds,
    },
    deps,
  );

  if (!result.ok) {
    const status = result.status as 400 | 401 | 403 | 404 | 409 | 502 | 503;
    return c.json({ error: result.error }, status);
  }
  if (result.preparedUserOp) {
    // Add deprecation warning header for legacy format
    c.header("X-Deprecation-Warning", "EIP-712 body signatures are deprecated. Migrate to ERC-8128 HTTP Message Signatures.");
    return c.json({
      preparedUserOp: true,
      lineupId: result.lineupId,
      userOpHash: result.userOpHash,
      userOp: result.userOp,
    });
  }
  // Add deprecation warning header for legacy format
  c.header("X-Deprecation-Warning", "EIP-712 body signatures are deprecated. Migrate to ERC-8128 HTTP Message Signatures.");
  return c.json({ ok: true, lineupId: result.lineupId });
});

export default botRouter;
