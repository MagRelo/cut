import { Hono } from "hono";
import {
  agentProfileSchema,
  messagePostSchema,
  roomAudienceSchema,
  roomRefSchema,
  ticketSignSchema,
  ticketVerifySchema,
} from "@playthecut/agent/contract";
import { requireAuth } from "../middleware/auth.js";
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
  type AgentActor,
} from "../services/agent/brief.js";
import {
  clampMessageLimit,
  listMessages,
  postMessage,
  StreamDisabledError,
  StreamLeagueMissingError,
  StreamMessageInvalidError,
  StreamPeerUnavailableError,
  StreamUserMissingError,
  type RoomFile,
} from "../services/stream/streamChat.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import {
  privySignTypedData,
  readKernelDomain,
  readTicketSignature,
  signTicket,
  verifyTicket,
} from "../services/bot/ticketSignature.js";

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
  const parsed = agentProfileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const empty = parsed.error.issues.find((issue) => issue.message === "No profile fields to update");
    if (empty) return c.json({ error: empty.message }, 400);
    return c.json({ error: "Invalid request body" }, 400);
  }
  // requireAuth already verified this signature and consumed its nonce.
  let signer: string | null = null;
  try {
    signer = c.get("signer") ?? null;
  } catch {
    signer = null;
  }
  const who = actor(c);
  const result = await updateAgentProfile({
    userId: who.userId,
    address: who.address,
    chainId: who.chainId,
    signer,
    patch: parsed.data,
  });
  if (!result.ok) return c.json({ error: result.error }, result.status);
  return c.json(result.profile);
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

function roomFailure(error: unknown): { status: 400 | 404 | 409; body: { error: string; code?: string } } | null {
  if (error instanceof StreamDisabledError) {
    return { status: 404, body: { error: error.message, code: error.code } };
  }
  if (error instanceof StreamLeagueMissingError || error instanceof StreamUserMissingError) {
    return { status: 404, body: { error: error.message } };
  }
  if (error instanceof StreamPeerUnavailableError) {
    return { status: 409, body: { error: error.message, code: error.code } };
  }
  if (error instanceof StreamMessageInvalidError) {
    return { status: 400, body: { error: error.message } };
  }
  if (error instanceof Error && error.message.startsWith("limit must")) {
    return { status: 400, body: { error: error.message } };
  }
  return null;
}

function audienceOf(raw: string | undefined): "humans" | "bots" | undefined {
  if (!raw) return undefined;
  const parsed = roomAudienceSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function formText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function formFiles(value: unknown): File[] | null {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  const files: File[] = [];
  for (const item of list) {
    if (!(item instanceof File)) return null;
    files.push(item);
  }
  return files;
}

async function roomFiles(files: File[]): Promise<RoomFile[]> {
  return Promise.all(
    files.map(async (file) => ({
      data: new Uint8Array(await file.arrayBuffer()),
      filename: file.name || "file",
      mimeType: file.type || "application/octet-stream",
    })),
  );
}

agentRouter.post("/messages", requireAuth, async (c) => {
  const multipart = (c.req.header("content-type") ?? "").includes("multipart/form-data");
  let raw: unknown;
  let files: RoomFile[] = [];
  if (multipart) {
    const body = await c.req.parseBody({ all: true });
    const uploaded = formFiles(body.file);
    if (!uploaded) return c.json({ error: "Invalid request body" }, 400);
    files = await roomFiles(uploaded);
    let attachments: unknown;
    const attachmentsField = formText(body.attachments);
    if (attachmentsField) {
      try {
        attachments = JSON.parse(attachmentsField) as unknown;
      } catch {
        return c.json({ error: "Invalid request body" }, 400);
      }
    }
    raw = {
      room: { type: formText(body.type), id: formText(body.id) },
      text: formText(body.text) ?? "",
      ...(formText(body.audience) ? { audience: formText(body.audience) } : {}),
      ...(formText(body.kind) ? { kind: formText(body.kind) } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
    };
  } else {
    raw = await c.req.json().catch(() => null);
  }
  const parsed = messagePostSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
  if (parsed.data.room.type === "direct" && parsed.data.room.id === actor(c).userId) {
    return c.json({ error: "Choose another account" }, 400);
  }
  try {
    const message = await postMessage({
      userId: actor(c).userId,
      room: parsed.data.room,
      text: parsed.data.text,
      audience: parsed.data.audience ?? "humans",
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.attachments
        ? {
            attachments: parsed.data.attachments.map((item) => ({
              type: item.type,
              url: item.url,
              ...(item.name ? { name: item.name } : {}),
            })),
          }
        : {}),
      ...(files.length > 0 ? { files } : {}),
    });
    return c.json({ message }, 201);
  } catch (error) {
    const mapped = roomFailure(error);
    if (mapped) return c.json(mapped.body, mapped.status);
    console.error("[stream-chat] post:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

function requestSigner(c: { get: (key: "signer") => string | null }): string | null {
  try {
    return c.get("signer") ?? null;
  } catch {
    return null;
  }
}

agentRouter.post("/messages/ticket", requireAuth, async (c) => {
  const parsed = ticketSignSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
  const signer = requestSigner(c);
  if (!signer) return c.json({ error: "A signature is required" }, 400);
  const who = actor(c);
  const result = await signTicket(
    {
      chainId: who.chainId,
      smartWallet: who.address,
      signer,
      fields: parsed.data.fields,
      ...(parsed.data.authorizationSignature
        ? { authorizationSignature: parsed.data.authorizationSignature }
        : {}),
    },
    {
      findDelegate: createBotActionDeps().findDelegate,
      readDomain: readKernelDomain,
      signTypedData: privySignTypedData,
    },
  );
  if (!result.ok) return c.json({ error: result.error }, result.status);
  if (result.prepared) return c.json({ prepared: true, hash: result.hash, authorization: result.authorization });
  return c.json({ wallet: result.wallet, hash: result.hash, signature: result.signature });
});

agentRouter.post("/messages/ticket/verify", requireAuth, async (c) => {
  const parsed = ticketVerifySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
  const result = await verifyTicket(
    {
      chainId: actor(c).chainId,
      wallet: parsed.data.wallet,
      fields: parsed.data.fields,
      signature: parsed.data.signature,
    },
    { isValidSignature: readTicketSignature },
  );
  if (!result.ok) return c.json({ error: result.error }, result.status);
  return c.json({ valid: result.valid });
});

agentRouter.get("/messages", requireAuth, async (c) => {
  const room = roomRefSchema.safeParse({ type: c.req.query("type"), id: c.req.query("id") });
  if (!room.success) return c.json({ error: "Invalid room" }, 400);
  if (room.data.type === "direct" && room.data.id === actor(c).userId) {
    return c.json({ error: "Choose another account" }, 400);
  }
  const audienceRaw = c.req.query("audience");
  const audience = audienceOf(audienceRaw);
  if (audienceRaw && !audience) return c.json({ error: "Invalid audience" }, 400);
  try {
    const messages = await listMessages({
      userId: actor(c).userId,
      room: room.data,
      limit: clampMessageLimit(c.req.query("limit")),
      ...(audience ? { audience } : {}),
    });
    return c.json({ messages });
  } catch (error) {
    const mapped = roomFailure(error);
    if (mapped) return c.json(mapped.body, mapped.status);
    console.error("[stream-chat] list:", error);
    return c.json({ error: "Failed to list messages" }, 500);
  }
});

agentRouter.get("/contests/:contestId/picks", requireAuth, async (c) => {
  const brief = await getPicksBrief(actor(c), c.req.param("contestId"));
  if (!brief) return c.json({ error: "Contest not found" }, 404);
  return c.json(brief);
});

export default agentRouter;
