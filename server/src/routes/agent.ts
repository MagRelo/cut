import { Hono } from "hono";
import { agentProfileSchema } from "@playthecut/agent/contract";
import type { Address } from "viem";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { agentPreferencesSchema } from "../schemas/user.js";
import { verifyBotRequest } from "../services/bot/verifyBotRequest.js";
import { updateAgentProfile } from "../services/agent/profile.js";
import { decodeCursor, InvalidCursorError } from "../services/agent/cursor.js";
import {
  getAgentAccount,
  getAgentTick,
  getCompanionBrief,
  getLeagueDetail,
  getLeagueList,
  getPicksBrief,
  getReferralBrief,
  getScoutBrief,
  saveAgentPreferences,
  type AgentActor,
} from "../services/agent/brief.js";

const agentRouter = new Hono();

function actor(c: { get: (key: "user") => { userId: string; address: string; chainId: number } }): AgentActor {
  const user = c.get("user");
  return { userId: user.userId, address: user.address, chainId: user.chainId };
}

function cursorOf(c: { req: { query: (name: string) => string | undefined } }): string | undefined {
  const raw = c.req.query("cursor")?.trim();
  return raw ? raw : undefined;
}

agentRouter.get("/account", requireAuth, async (c) => {
  return c.json(await getAgentAccount(actor(c)));
});

agentRouter.put("/profile", requireAuth, async (c) => {
  const raw = c.req.raw.clone();
  const parsed = agentProfileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  let signer: Address | null = null;
  if (c.req.header("signature") || c.req.header("signature-input")) {
    const verified = await verifyBotRequest(raw);
    if (!verified.ok) return c.json({ error: verified.error }, verified.status);
    signer = verified.signer;
  }
  const who = actor(c);
  const result = await updateAgentProfile({
    userId: who.userId,
    address: who.address,
    chainId: who.chainId,
    signer,
    patch: parsed.data,
  });
  if (!result.ok) {
    return c.json(
      result.code ? { error: result.error, code: result.code } : { error: result.error },
      result.status,
    );
  }
  return c.json(result.profile);
});

agentRouter.put("/preferences", requireAuth, async (c) => {
  const parsed = agentPreferencesSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  if (parsed.data.sports) {
    const sports = await prisma.sport.findMany({
      where: { isEnabled: true },
      select: { id: true },
    });
    const known = new Set(sports.map((sport) => sport.id));
    if (parsed.data.sports.some((id) => !known.has(id))) {
      return c.json({ error: "Unknown sport" }, 400);
    }
  }
  const preferences = await saveAgentPreferences(actor(c).userId, parsed.data);
  if (!preferences) return c.json({ error: "User not found" }, 404);
  return c.json({ preferences });
});

agentRouter.get("/scout", requireAuth, async (c) => {
  return c.json(await getScoutBrief(actor(c)));
});

agentRouter.get("/companion", requireAuth, async (c) => {
  try {
    const raw = cursorOf(c);
    const previous = raw ? decodeCursor(raw) : null;
    return c.json(await getCompanionBrief(actor(c), previous));
  } catch (error) {
    if (error instanceof InvalidCursorError) return c.json({ error: error.message }, 400);
    throw error;
  }
});

agentRouter.get("/tick", requireAuth, async (c) => {
  try {
    return c.json(await getAgentTick(actor(c), cursorOf(c)));
  } catch (error) {
    if (error instanceof InvalidCursorError) return c.json({ error: error.message }, 400);
    throw error;
  }
});

agentRouter.get("/referrals", requireAuth, async (c) => {
  return c.json(await getReferralBrief(actor(c)));
});

agentRouter.get("/leagues", requireAuth, async (c) => {
  return c.json(await getLeagueList(actor(c)));
});

agentRouter.get("/leagues/:id", requireAuth, async (c) => {
  const detail = await getLeagueDetail(actor(c), c.req.param("id"));
  if (!detail) return c.json({ error: "League not found" }, 404);
  return c.json(detail);
});

agentRouter.get("/contests/:contestId/picks", requireAuth, async (c) => {
  const brief = await getPicksBrief(actor(c), c.req.param("contestId"));
  if (!brief) return c.json({ error: "Contest not found" }, 404);
  return c.json(brief);
});

export default agentRouter;
