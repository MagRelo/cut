import { Hono, type Context } from "hono";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";
import { getCutBotAddress, isCutBotAddress } from "../lib/cutBotKey.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { updateUserSettingsSchema } from "../schemas/user.js";
import { NAME_MAX_LENGTH, LINEUP_PICKS_MAX } from "../schemas/limits.js";
import { packApproval, unpackApproval } from "../services/bot/approvalEnvelope.js";
import {
  addDelegate,
  createBalanceDeps,
  createDelegateDeps,
  createUserSettingsDeps,
  readBotBalance,
  revokeDelegate,
  upsertUserSettings,
  type BalanceDeps,
  type DelegateDeps,
  type UserSettingsDeps,
} from "../services/bot/botAccount.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import {
  createBotActorDeps,
  resolveBotActor,
  type BotActorDeps,
} from "../services/bot/botActor.js";
import {
  readDelegatePolicyInfo,
  type DelegatePolicyInfo,
} from "../services/bot/delegatePolicyRuntime.js";
import {
  policyAddressFromApproval,
  validateDelegateApproval,
} from "../services/bot/delegatePolicy.js";
import { createBotNonceStore, type BotNonceStore } from "../services/bot/botNonce.js";
import { authenticateBotRequest } from "../services/bot/botRequestAuth.js";
import { executeBotAction, type BotActionDeps } from "../services/bot/executeBotAction.js";
import {
  botContestListDeps,
  listBotContests,
  type ListBotContestsDeps,
} from "../services/bot/listBotContests.js";
import { createRateLimiter, type RateLimiter } from "../services/bot/rateLimit.js";
import {
  createRegisterAgentDeps,
  registerAgent,
  type RegisterAgentDeps,
} from "../services/bot/registerAgent.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";

/**
 * Bot API. Every `/api/bot/*` agent route is authenticated with ERC-8128 signed HTTP
 * requests (spec draft-2026-01-16, RFC 9421): there is no other auth path. Writes
 * (`POST /api/bot/actions`) require a nonce, reserved in BotActionLog before anything
 * executes. Reads (`GET /api/bot/contests`, `GET /api/bot/balance`) need no nonce.
 *
 * The signer is either the smart wallet's owner key or an active delegate session key.
 * `register` creates the account for a fresh owner key; delegates are optional.
 *
 * The `/delegates` routes below are the web app's Privy-session settings screen, not
 * part of the agent API.
 */

const hexSchema = z.string().regex(/^0x[0-9a-fA-F]*$/);
const addressSchema = z.string().refine((value) => isAddress(value), "Invalid address");
const uintSchema = z.string().regex(/^\d+$/);

const userOpSchema = z.object({
  sender: addressSchema,
  nonce: uintSchema,
  callData: hexSchema,
  callGasLimit: uintSchema,
  verificationGasLimit: uintSchema,
  preVerificationGas: uintSchema,
  maxFeePerGas: uintSchema,
  maxPriorityFeePerGas: uintSchema,
  paymaster: addressSchema.optional(),
  paymasterData: hexSchema.optional(),
  paymasterVerificationGasLimit: uintSchema.optional(),
  paymasterPostOpGasLimit: uintSchema.optional(),
  factory: addressSchema.optional(),
  factoryData: hexSchema.optional(),
});

const nameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);
const chainIdSchema = z.number().int();

const registerBody = z
  .object({
    action: z.literal("register"),
    chainId: chainIdSchema,
    refCode: z.string().trim().min(1).max(64).optional(),
    name: nameSchema.optional(),
    settings: updateUserSettingsSchema.optional(),
  })
  .strict();

const userSettingsBody = z
  .object({
    action: z.literal("userSettingsUpsert"),
    chainId: chainIdSchema,
    smartWallet: addressSchema,
    name: nameSchema.optional(),
    settings: updateUserSettingsSchema.optional(),
  })
  .strict();

const delegateAddBody = z
  .object({
    action: z.literal("delegateAdd"),
    chainId: chainIdSchema,
    smartWallet: addressSchema,
    kind: z.enum(["cut_bot", "external"]),
    delegateAddress: addressSchema,
    approval: z.string().min(1),
    permissionId: z.string().regex(/^0x[0-9a-fA-F]{8}$/, "Invalid permission id"),
  })
  .strict();

const delegateRevokeBody = z
  .object({
    action: z.literal("delegateRevoke"),
    chainId: chainIdSchema,
    smartWallet: addressSchema,
    delegateAddress: addressSchema,
  })
  .strict();

const lineupUpsertBody = z
  .object({
    action: z.literal("lineupUpsert"),
    chainId: chainIdSchema,
    smartWallet: addressSchema,
    contestId: z.string().min(1),
    lineupId: z.string().default(""),
    candidates: z.array(z.string().min(1)).min(1).max(LINEUP_PICKS_MAX),
    prediction: z.unknown().optional(),
  })
  .strict();

const entryBody = (action: "join" | "leave") =>
  z
    .object({
      action: z.literal(action),
      chainId: chainIdSchema,
      smartWallet: addressSchema,
      contestId: z.string().min(1),
      lineupId: z.string().min(1),
      userOpSignature: hexSchema.optional(),
      userOp: userOpSchema.optional(),
    })
    .strict();

export const botActionBodySchema = z.discriminatedUnion("action", [
  registerBody,
  userSettingsBody,
  delegateAddBody,
  delegateRevokeBody,
  lineupUpsertBody,
  entryBody("join"),
  entryBody("leave"),
]);

export type BotActionBody = z.infer<typeof botActionBodySchema>;

export type BotRouterDeps = {
  nonces: BotNonceStore;
  actors: BotActorDeps;
  actions: BotActionDeps;
  register: RegisterAgentDeps;
  settings: UserSettingsDeps;
  delegates: DelegateDeps;
  balance: BalanceDeps;
  contests: ListBotContestsDeps;
  delegatePolicy: (chainId: number) => Promise<DelegatePolicyInfo | null>;
  registerLimitByIp: RateLimiter;
  registerLimitBySigner: RateLimiter;
  now?: () => number;
};

export function createBotRouterDeps(): BotRouterDeps {
  return {
    nonces: createBotNonceStore(),
    actors: createBotActorDeps(),
    actions: createBotActionDeps(),
    register: createRegisterAgentDeps(),
    settings: createUserSettingsDeps(),
    delegates: createDelegateDeps(),
    balance: createBalanceDeps(),
    contests: botContestListDeps(),
    delegatePolicy: readDelegatePolicyInfo,
    registerLimitByIp: createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 }),
    registerLimitBySigner: createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 }),
  };
}

/** Client IP for rate limiting: the proxy's X-Real-IP, else the last X-Forwarded-For hop. */
function clientIp(c: Context): string {
  const real = c.req.header("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = c.req.header("x-forwarded-for");
  const last = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .pop();
  return last ?? "unknown";
}

type Status = 400 | 401 | 403 | 404 | 409 | 429 | 502 | 503;

export function createBotRouter(deps: BotRouterDeps): Hono {
  const router = new Hono();
  const nowSeconds = () => Math.floor((deps.now?.() ?? Date.now()) / 1000);

  router.get("/delegate-address", (c) => {
    return c.json({ address: getCutBotAddress() });
  });

  /**
   * Unsigned. The policy a delegate permission must use: CutContestPolicy, read from the
   * chain's ContestFactory (`delegatePolicy()`). `policyAddress` is null until the factory that
   * deploys it is live. See agents.md.
   */
  router.get("/delegate-policy", async (c) => {
    const chainId = Number(c.req.query("chainId"));
    if (!Number.isInteger(chainId)) return c.json({ error: "chainId is required" }, 400);
    const info = await deps.delegatePolicy(chainId);
    if (!info) return c.json({ error: "Unsupported chain" }, 404);
    return c.json(info);
  });

  /** Shared by the signed reads: authenticate without a nonce and resolve the actor. */
  async function signedRead(c: Context) {
    const authed = await authenticateBotRequest(c.req, "", {
      requireNonce: false,
      nowSeconds: nowSeconds(),
    });
    if (!authed.ok) return { response: c.json({ error: authed.error }, authed.status) };
    const smartWallet = c.req.query("smartWallet") ?? "";
    const resolved = await resolveBotActor(
      { chainId: authed.auth.chainId, smartWallet, signer: authed.auth.signer },
      deps.actors,
    );
    if (!resolved.ok) return { response: c.json({ error: resolved.error }, resolved.status) };
    return { actor: resolved.actor, chainId: authed.auth.chainId };
  }

  router.get("/contests", async (c) => {
    const read = await signedRead(c);
    if ("response" in read) return read.response;
    const eventId = c.req.query("eventId")?.trim();
    const result = await listBotContests(
      { userId: read.actor.userId, chainId: read.chainId, ...(eventId ? { eventId } : {}) },
      deps.contests,
    );
    return c.json({ contests: result.contests });
  });

  router.get("/balance", async (c) => {
    const read = await signedRead(c);
    if ("response" in read) return read.response;
    const result = await readBotBalance(read.actor, read.chainId, deps.balance);
    if (!result.ok) return c.json({ error: result.error }, result.status);
    return c.json(result.balance);
  });

  router.post("/actions", async (c) => {
    const rawBody = await c.req.text();
    const authed = await authenticateBotRequest(c.req, rawBody, {
      requireNonce: true,
      nowSeconds: nowSeconds(),
    });
    if (!authed.ok) return c.json({ error: authed.error }, authed.status);
    const { signer, chainId, nonce } = authed.auth;

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = botActionBodySchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.errors }, 400);
    }
    const body = parsed.data;
    if (body.chainId !== chainId) {
      return c.json({ error: "Body chainId does not match the keyid chainId" }, 400);
    }

    if (body.action === "register") {
      const ipOk = deps.registerLimitByIp.hit(`ip:${clientIp(c)}`);
      const signerOk = deps.registerLimitBySigner.hit(`signer:${signer.toLowerCase()}`);
      if (!ipOk || !signerOk) {
        return c.json({ error: "Too many register requests, try again later" }, 429);
      }
    }

    // Replay protection: reserve (signer, nonce) before anything executes.
    const reserved = await deps.nonces.reserve({
      signerAddress: signer,
      nonce: nonce!,
      action: body.action,
    });
    if (!reserved.ok) {
      return c.json({ error: "Nonce already used (replay rejected)" }, 409);
    }
    const finish = (userId: string | null, error?: string) =>
      deps.nonces.finish(reserved.id, { userId, action: body.action, error });

    if (body.action === "register") {
      const result = await registerAgent(
        {
          chainId,
          owner: signer,
          ...(body.refCode !== undefined ? { refCode: body.refCode } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.settings !== undefined ? { settings: body.settings } : {}),
        },
        deps.register,
      );
      if (!result.ok) {
        await finish(null, result.error);
        return c.json({ error: result.error, code: result.code }, result.status);
      }
      await finish(result.userId);
      const { ok: _ok, ...account } = result;
      return c.json(account, result.created ? 201 : 200);
    }

    const resolved = await resolveBotActor(
      { chainId, smartWallet: body.smartWallet, signer },
      deps.actors,
    );
    if (!resolved.ok) {
      await finish(null, resolved.error);
      return c.json({ error: resolved.error }, resolved.status);
    }
    const actor = resolved.actor;

    const fail = async (status: Status, error: string) => {
      await finish(actor.userId, error);
      return c.json({ error }, status);
    };

    switch (body.action) {
      case "userSettingsUpsert": {
        if (body.name === undefined && body.settings === undefined) {
          return fail(400, "Send name and/or settings");
        }
        const result = await upsertUserSettings(
          actor,
          {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.settings !== undefined ? { settings: body.settings } : {}),
          },
          deps.settings,
        );
        if (!result.ok) return fail(result.status, result.error);
        await finish(actor.userId);
        return c.json({ ok: true, name: result.name, settings: result.settings });
      }
      case "delegateAdd": {
        const result = await addDelegate(
          actor,
          {
            chainId,
            kind: body.kind,
            delegateAddress: body.delegateAddress,
            approval: body.approval,
            permissionId: body.permissionId as Hex,
          },
          deps.delegates,
        );
        if (!result.ok) return fail(result.status, result.error);
        await finish(actor.userId);
        return c.json(result);
      }
      case "delegateRevoke": {
        const result = await revokeDelegate(
          actor,
          { delegateAddress: body.delegateAddress },
          deps.delegates,
        );
        if (!result.ok) return fail(result.status, result.error);
        await finish(actor.userId);
        return c.json(result);
      }
      case "lineupUpsert":
      case "join":
      case "leave": {
        const result = await executeBotAction(
          {
            chainId,
            action: body.action,
            actor,
            contestId: body.contestId,
            lineupId: body.lineupId,
            picks: body.action === "lineupUpsert" ? body.candidates : [],
            ...(body.action === "lineupUpsert" && body.prediction !== undefined
              ? { prediction: body.prediction }
              : {}),
            ...(body.action !== "lineupUpsert" && body.userOpSignature
              ? { userOpSignature: body.userOpSignature as Hex }
              : {}),
            ...(body.action !== "lineupUpsert" && body.userOp
              ? { userOp: body.userOp as SerializedUserOp }
              : {}),
          },
          deps.actions,
        );
        if (!result.ok) return fail(result.status as Status, result.error);
        await finish(actor.userId);
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
    }
  });

  // -------------------------------------------------------------------------
  // Web app settings (Privy session). Not part of the agent API.
  // -------------------------------------------------------------------------

  const enableSchema = z.object({
    chainId: chainIdSchema,
    kind: z.enum(["cut_bot", "external"]),
    delegateAddress: addressSchema,
    smartWallet: addressSchema,
    approval: z.string().min(1),
    permissionId: z.string().regex(/^0x[0-9a-fA-F]{8}$/, "Invalid permission id"),
  });

  const revokeSchema = z.object({
    delegateAddress: addressSchema,
  });

  router.get("/delegates", requireAuth, async (c) => {
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
        approval: true,
      },
    });
    const delegates = rows.map(({ approval, ...row }) => {
      // What the browser needs to uninstall this exact permission on revoke.
      let permission: { permissionId: string; policyAddress: string } | null = null;
      try {
        const envelope = unpackApproval(approval);
        const policyAddress = policyAddressFromApproval(envelope.approval);
        permission = policyAddress ? { permissionId: envelope.permissionId, policyAddress } : null;
      } catch {
        permission = null;
      }
      return { ...row, permission };
    });
    return c.json({ delegates, cutBotAddress: getCutBotAddress() });
  });

  router.post("/delegates", requireAuth, async (c) => {
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

    const checked = await validateDelegateApproval(
      {
        chainId: body.chainId,
        smartWallet: getAddress(smartWallet),
        delegateAddress: getAddress(delegateAddress),
        approval: body.approval,
        permissionId: body.permissionId as Hex,
      },
      deps.delegates.approvals,
    );
    if (!checked.ok) return c.json({ error: checked.error }, checked.status ?? 400);
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
    return c.json({ status: "active", delegateAddress, policyAddress: checked.policyAddress });
  });

  router.post("/delegates/revoke", requireAuth, async (c) => {
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

  return router;
}

const botRouter = createBotRouter(createBotRouterDeps());

export default botRouter;
