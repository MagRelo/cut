import { getAddress, isAddress, isHex, type Address, type Hex } from "viem";
import type { z } from "zod";
import {
  CUT_SIGNATURE_TTL_SECONDS,
  cutRequestPayload,
  publicKeyFromPrivate,
  signPayload,
} from "./delegateKey.js";
import {
  assertCreateContestCalls,
  assertJoinCalls,
  assertLeaveCalls,
  assertTransferCalls,
  callsMatchReturned,
  type ReturnedCall,
} from "./actionCalls.js";
import { decodeKernelExecute, type AgentCall } from "./kernelExecute.js";
import { assertQuorumAuthorization } from "./userOp.js";
import {
  agentProfileSchema,
  createFreeContestSchema,
  createLeagueSchema,
  joinLeagueSchema,
  messagePostSchema,
  registerSchema,
  type AgentAccount,
  type AgentProfile,
  type CompanionBrief,
  type ContestCreated,
  type ContestList,
  type EventOdds,
  type FreeContestCreated,
  type LeagueCreated,
  type LeagueDetail,
  type LeagueInvite,
  type LeagueJoined,
  type LeagueList,
  type SendResult,
  type LineupResult,
  type PicksBrief,
  type ReferralBrief,
  type RegisteredAgent,
  type RoomAttachmentInput,
  type RoomAudience,
  type RoomMessage,
  type RoomRef,
  type ScoutBrief,
  type TickBrief,
  type UserOpBody,
} from "./contract.js";
export { generateDelegateKey } from "./delegateKey.js";

export type CutChainId = 8453 | 84532;

export type RoomFile = {
  data: Uint8Array;
  filename: string;
  mimeType: string;
};

export class CutAgentError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "CutAgentError";
    this.status = status;
    this.body = body;
  }
}

export type CutAgentOptions = {
  privateKey: string;
  smartWallet?: string;
  chainId?: number;
  origin?: string;
  fetch?: (request: Request) => Promise<Response>;
};

export type LineupUpsertInput = {
  contestId: string;
  lineupId?: string;
  candidates: string[];
  prediction?: unknown;
};

export type LineupRef = {
  contestId: string;
  lineupId: string;
};

export type CreateContestInput = {
  name: string;
  eventId: string;
  endDate: string | number;
  settings: { primaryDeposit: number; expiryTimestamp?: number };
  description?: string;
  userGroupId?: string;
  notifyLeagueMembers?: boolean;
};

export type CreateFreeContestInput = {
  name: string;
  eventId: string;
  userGroupId: string;
  endDate: string | number;
  description?: string;
  notifyLeagueMembers?: boolean;
};

export type CutAgent = {
  readonly publicKey: string;
  readonly smartWallet: Address;
  contests(eventId?: string): Promise<ContestList>;
  lineupUpsert(input: LineupUpsertInput): Promise<LineupResult>;
  join(input: LineupRef): Promise<LineupResult>;
  leave(input: LineupRef): Promise<LineupResult>;
  field(eventId: string, input?: { view?: "card" | "full" }): Promise<{ candidates: unknown[] }>;
  odds(eventId: string): Promise<EventOdds>;
  send(input: { to: string; amount: string }): Promise<SendResult>;
  entries(): Promise<{ entries: unknown[] }>;
  contestCompanion(
    contestId: string,
    input?: { since?: string; include?: Array<"timeline" | "commentary" | "standings"> },
  ): Promise<unknown>;
  register(input: {
    email: string;
    name?: string;
    referralCode?: string;
    color?: string;
    oddsFormat?: "american" | "decimal" | "english";
  }): Promise<RegisteredAgent>;
  updateProfile(input: {
    name?: string;
    color?: string;
    oddsFormat?: "american" | "decimal" | "english";
  }): Promise<AgentProfile>;
  joinLeague(input: { inviteCode: string }): Promise<LeagueJoined>;
  leaveLeague(id: string): Promise<{ success: true }>;
  createContest(input: CreateContestInput): Promise<ContestCreated>;
  createFreeContest(input: CreateFreeContestInput): Promise<FreeContestCreated>;
  account(): Promise<AgentAccount>;
  scout(): Promise<ScoutBrief>;
  picks(contestId: string): Promise<PicksBrief>;
  companion(input?: { cursor?: string }): Promise<CompanionBrief>;
  tick(input?: { cursor?: string }): Promise<TickBrief>;
  referrals(): Promise<ReferralBrief>;
  leagues(): Promise<LeagueList>;
  league(id: string): Promise<LeagueDetail>;
  createLeague(input: { name: string; description?: string }): Promise<LeagueCreated>;
  inviteLeague(id: string): Promise<LeagueInvite>;
  sendMessage(
    room: RoomRef,
    text: string,
    input?: {
      audience?: RoomAudience;
      kind?: string;
      files?: RoomFile[];
      attachments?: RoomAttachmentInput[];
    },
  ): Promise<RoomMessage>;
  messages(
    room: RoomRef,
    input?: { limit?: number; audience?: RoomAudience },
  ): Promise<RoomMessage[]>;
};

type PreparedUserOp = {
  preparedUserOp: true;
  userOpHash: Hex;
  userOp: UserOpBody;
  calls: ReturnedCall[];
  authorization: Record<string, unknown>;
  lineupId?: string;
};

/** Unix seconds. A positive `expiryTimestamp` wins; otherwise derive it from `endDate` (ISO or unix ms). */
function contestExpiryTimestamp(
  endDate: string | number,
  supplied: number | undefined,
): number | undefined {
  if (typeof supplied === "number" && Number.isFinite(supplied) && supplied > 0) return supplied;
  const ms = typeof endDate === "number" ? endDate : Date.parse(endDate);
  if (!Number.isFinite(ms)) return undefined;
  const seconds = Math.floor(ms / 1000);
  return seconds > 0 ? seconds : undefined;
}

function encodeMultipart(
  fields: Record<string, string>,
  files: RoomFile[],
): { body: Uint8Array; contentType: string } {
  const boundary = `cut${crypto.randomUUID().replace(/-/g, "")}`;
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const push = (value: string) => parts.push(encoder.encode(value));
  for (const [name, value] of Object.entries(fields)) {
    push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  for (const file of files) {
    const filename = file.filename.replace(/["\r\n\\]/g, "").trim() || "file";
    const mime = file.mimeType.replace(/[\r\n]/g, "") || "application/octet-stream";
    push(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
    );
    parts.push(file.data);
    push("\r\n");
  }
  push(`--${boundary}--\r\n`);
  const body = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

export function createCutAgent(options: CutAgentOptions): CutAgent {
  const requestedChain = options.chainId ?? 8453;
  if (requestedChain !== 8453 && requestedChain !== 84532) {
    throw new CutAgentError("ChainId must be 8453 (Base) or 84532 (Base Sepolia)", 400, null);
  }
  const chainId: CutChainId = requestedChain;
  let publicKey: string;
  try {
    publicKey = publicKeyFromPrivate(options.privateKey);
  } catch {
    throw new CutAgentError(
      "Invalid delegate key. Use the base64 PKCS#8 private key from generateDelegateKey().",
      400,
      null,
    );
  }
  let smartWallet: Address | undefined;
  if (options.smartWallet) {
    try {
      smartWallet = getAddress(options.smartWallet);
    } catch {
      throw new CutAgentError("Invalid smart wallet", 400, null);
    }
  }
  const origin = (options.origin ?? "https://playthecut.com").replace(/\/$/, "");
  const fetchImpl = options.fetch ?? ((request: Request) => fetch(request));

  function wallet(): Address {
    if (!smartWallet) {
      throw new CutAgentError("Register the account before using it", 400, null);
    }
    return smartWallet;
  }

  function walletQuery(): Record<string, string> {
    return { smartWallet: wallet() };
  }

  function parse<T>(schema: z.ZodType<T>, body: unknown): T {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      throw new CutAgentError(message || "Invalid request body", 400, parsed.error.issues);
    }
    return parsed.data;
  }

  async function send(signed: Request): Promise<unknown> {
    const headers = new Headers(signed.headers);
    headers.set("x-cut-chain-id", String(chainId));
    const response = await fetchImpl(new Request(signed, { headers }));
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }
    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : response.statusText || "Request failed";
      throw new CutAgentError(message, response.status, body);
    }
    return body;
  }

  async function signed(url: string, method: string, body?: Uint8Array, contentType?: string): Promise<Request> {
    const created = Math.floor(Date.now() / 1000);
    const bytes = body ?? new Uint8Array();
    const payload = cutRequestPayload({
      method,
      url,
      body: bytes,
      chainId,
      created,
      expires: created + CUT_SIGNATURE_TTL_SECONDS,
      nonce: crypto.randomUUID(),
    });
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    headers.set("x-cut-public-key", publicKey);
    headers.set("x-cut-signature", signPayload(options.privateKey, payload));
    headers.set("x-cut-created", String(payload.created));
    headers.set("x-cut-expires", String(payload.expires));
    headers.set("x-cut-nonce", payload.nonce);
    return new Request(url, {
      method,
      headers,
      body: bytes.byteLength > 0 ? bytes : undefined,
    });
  }

  async function get(path: string, query: Record<string, string>): Promise<unknown> {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return send(await signed(url.toString(), "GET"));
  }

  async function post(
    path: string,
    body: unknown,
    query: Record<string, string> = {},
  ): Promise<unknown> {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const json = JSON.stringify(body);
    return send(
      await signed(url.toString(), "POST", new TextEncoder().encode(json), "application/json"),
    );
  }

  async function del(
    path: string,
    query: Record<string, string> = {},
    body?: unknown,
  ): Promise<unknown> {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const json = body === undefined ? undefined : JSON.stringify(body);
    return send(
      await signed(
        url.toString(),
        "DELETE",
        json === undefined ? undefined : new TextEncoder().encode(json),
        json === undefined ? undefined : "application/json",
      ),
    );
  }

  async function put(path: string, body: unknown): Promise<unknown> {
    const url = new URL(path, origin);
    url.searchParams.set("smartWallet", wallet());
    const json = JSON.stringify(body);
    return send(
      await signed(url.toString(), "PUT", new TextEncoder().encode(json), "application/json"),
    );
  }

  function prepared(value: unknown): PreparedUserOp | null {
    if (!value || typeof value !== "object" || !("preparedUserOp" in value)) return null;
    const row = value as Partial<PreparedUserOp>;
    if (
      row.preparedUserOp !== true ||
      !row.userOpHash ||
      !isHex(row.userOpHash) ||
      !row.userOp ||
      !row.authorization ||
      typeof row.authorization !== "object" ||
      !Array.isArray(row.calls)
    ) {
      return null;
    }
    return row as PreparedUserOp;
  }

  async function finishPrepared(
    sendBody: (body: unknown) => Promise<unknown>,
    body: unknown,
    bind?: (calls: AgentCall[]) => void,
  ): Promise<unknown> {
    const response = await sendBody(body);
    const ready = prepared(response);
    if (!ready) return response;
    try {
      if (!isHex(ready.userOp.callData)) throw new Error("Refusing to sign this authorization");
      const decoded = decodeKernelExecute(ready.userOp.callData);
      if (!callsMatchReturned(decoded, ready.calls)) {
        throw new Error("Refusing to sign this authorization");
      }
      bind?.(decoded);
      assertQuorumAuthorization({
        authorization: ready.authorization,
        userOp: ready.userOp,
        userOpHash: ready.userOpHash,
        smartWallet: wallet(),
        chainId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refusing to sign this authorization";
      throw new CutAgentError(
        message.startsWith("Refusing to sign") ? message : "Refusing to sign this authorization",
        502,
        response,
      );
    }
    const second = await sendBody({
      ...(body as Record<string, unknown>),
      userOp: ready.userOp,
      authorizationSignature: signPayload(options.privateKey, ready.authorization),
    });
    if (prepared(second)) {
      throw new CutAgentError("Server returned another prepared user operation", 502, second);
    }
    return second;
  }

  async function postAction(
    path: string,
    body: unknown,
    bind?: (calls: AgentCall[]) => void,
  ): Promise<unknown> {
    return finishPrepared((next) => post(path, next, walletQuery()), body, bind);
  }

  async function contestForAction(contestId: string): Promise<{ address: string; primaryDeposit: number }> {
    const body = await get(`/api/contests/${encodeURIComponent(contestId)}`, walletQuery());
    const row = body as { address?: unknown; rules?: { primaryDeposit?: unknown } } | null;
    const deposit = row?.rules?.primaryDeposit;
    if (!row || typeof row.address !== "string" || !isAddress(row.address) || typeof deposit !== "number") {
      throw new CutAgentError("Unexpected response", 502, body);
    }
    return { address: getAddress(row.address), primaryDeposit: deposit };
  }

  function lineupResult(value: unknown): LineupResult {
    if (!value || typeof value !== "object") {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    const lineupId = (value as { lineupId?: unknown }).lineupId;
    if ((value as { ok?: unknown }).ok !== true || typeof lineupId !== "string" || !lineupId) {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    return { ok: true, lineupId };
  }

  function cursorQuery(cursor: string | undefined): Record<string, string> {
    return cursor ? { ...walletQuery(), cursor } : walletQuery();
  }

  function readAccount(value: unknown): AgentAccount {
    if (!value || typeof value !== "object" || typeof (value as AgentAccount).wallet !== "string") {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    const account = value as AgentAccount;
    if (typeof account.userId !== "string") {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    return account;
  }

  function readCursorBrief(value: unknown): CompanionBrief {
    if (
      !value ||
      typeof value !== "object" ||
      typeof (value as CompanionBrief).cursor !== "string" ||
      !Array.isArray((value as CompanionBrief).unchanged)
    ) {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    return value as CompanionBrief;
  }

  function messageFields(
    room: RoomRef,
    text: string,
    input?: {
      audience?: RoomAudience;
      kind?: string;
      files?: RoomFile[];
      attachments?: RoomAttachmentInput[];
    },
  ) {
    const body = parse(messagePostSchema, {
      room,
      text,
      ...(input?.audience ? { audience: input.audience } : {}),
      ...(input?.kind ? { kind: input.kind } : {}),
      ...(input?.attachments ? { attachments: input.attachments } : {}),
    });
    const files = input?.files ?? [];
    const count = (body.attachments?.length ?? 0) + files.length;
    if (count > 10) throw new CutAgentError("Too many attachments", 400, null);
    if (!body.text && count === 0) {
      throw new CutAgentError("Message text or an attachment is required", 400, null);
    }
    return { body, files };
  }

  function roomQuery(input?: { limit?: number; audience?: RoomAudience }): Record<string, string> {
    const query: Record<string, string> = walletQuery();
    if (input?.limit !== undefined) {
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50) {
        throw new CutAgentError("limit must be an integer from 1 to 50", 400, null);
      }
      query.limit = String(input.limit);
    }
    if (input?.audience) query.audience = input.audience;
    return query;
  }

  function oneMessage(value: unknown): RoomMessage {
    const message =
      value && typeof value === "object" && "message" in value
        ? (value as { message: unknown }).message
        : null;
    if (!message || typeof message !== "object") {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    const row = message as RoomMessage;
    if (typeof row.id !== "string" || typeof row.text !== "string" || typeof row.userId !== "string") {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    if (row.attachments != null && !Array.isArray(row.attachments)) {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    return { ...row, attachments: row.attachments ?? [] };
  }

  function isEventOdds(value: unknown): value is EventOdds {
    if (!value || typeof value !== "object" || !Array.isArray((value as EventOdds).players)) return false;
    const source = (value as EventOdds).source;
    return source === "live" || source === "pre-tournament";
  }

  function isSendResult(value: unknown): value is SendResult {
    if (!value || typeof value !== "object") return false;
    const row = value as SendResult;
    return row.ok === true && typeof row.txHash === "string" && typeof row.to === "string" && typeof row.amount === "string";
  }

  function manyMessages(value: unknown): RoomMessage[] {
    if (!value || typeof value !== "object" || !Array.isArray((value as { messages?: unknown }).messages)) {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    return (value as { messages: unknown[] }).messages.map((message) => oneMessage({ message }));
  }

  return {
    publicKey,
    get smartWallet() {
      return wallet();
    },
    async contests(eventId) {
      const query: Record<string, string> = {
        chainId: String(chainId),
        ...walletQuery(),
      };
      if (eventId) query.eventId = eventId;
      const body = await get("/api/contests", query);
      if (!body || typeof body !== "object" || !Array.isArray((body as ContestList).contests)) {
        throw new CutAgentError("Unexpected response", 502, body);
      }
      return { contests: (body as ContestList).contests };
    },
    async field(eventId, input) {
      const view = input?.view ?? "full";
      if (view !== "card" && view !== "full") {
        throw new CutAgentError("Invalid view", 400, null);
      }
      const body = await get(`/api/events/${encodeURIComponent(eventId)}/field`, {
        ...walletQuery(),
        view,
      });
      if (!body || typeof body !== "object" || !Array.isArray((body as { candidates?: unknown }).candidates)) {
        throw new CutAgentError("Unexpected response", 502, body);
      }
      return { candidates: (body as { candidates: unknown[] }).candidates };
    },
    async odds(eventId) {
      const body = await get(`/api/events/${encodeURIComponent(eventId)}/odds`, walletQuery());
      if (!isEventOdds(body)) throw new CutAgentError("Unexpected response", 502, body);
      return body;
    },
    async send(input) {
      const to = input.to.trim();
      const amount = input.amount.trim();
      if (!isAddress(to)) throw new CutAgentError("Invalid wallet address", 400, null);
      if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
        throw new CutAgentError("Invalid amount", 400, null);
      }
      const value = await postAction("/api/auth/transfers", { to, amount }, (calls) => {
        assertTransferCalls(calls, { chainId, to, amount });
      });
      if (!isSendResult(value)) throw new CutAgentError("Unexpected response", 502, value);
      return value;
    },
    async entries() {
      const body = await get("/api/auth/entries", walletQuery());
      if (!body || typeof body !== "object" || !Array.isArray((body as { entries?: unknown }).entries)) {
        throw new CutAgentError("Unexpected response", 502, body);
      }
      return { entries: (body as { entries: unknown[] }).entries };
    },
    async contestCompanion(contestId, input) {
      if (input?.since !== undefined && Number.isNaN(Date.parse(input.since))) {
        throw new CutAgentError("Invalid since timestamp", 400, null);
      }
      const allowed = new Set(["timeline", "commentary", "standings"]);
      if (input?.include?.some((section) => !allowed.has(section))) {
        throw new CutAgentError("Invalid include", 400, null);
      }
      const query: Record<string, string> = walletQuery();
      if (input?.since) query.since = input.since;
      if (input?.include?.length) query.include = input.include.join(",");
      return get(`/api/contests/${encodeURIComponent(contestId)}/companion`, query);
    },
    async lineupUpsert(input) {
      const prediction =
        input.prediction !== undefined ? { prediction: input.prediction } : {};
      if (input.lineupId) {
        const value = await put(`/api/lineups/${encodeURIComponent(input.lineupId)}`, {
          candidates: input.candidates,
          ...prediction,
        });
        const lineupId = (value as { lineup?: { id?: string } } | null)?.lineup?.id;
        if (typeof lineupId !== "string") throw new CutAgentError("Unexpected response", 502, value);
        return { ok: true as const, lineupId };
      }
      const contest = await get(`/api/contests/${encodeURIComponent(input.contestId)}`, walletQuery());
      const eventId = (contest as { eventId?: unknown } | null)?.eventId;
      if (typeof eventId !== "string") throw new CutAgentError("Unexpected response", 502, contest);
      const value = await post(
        `/api/lineups/${encodeURIComponent(eventId)}`,
        { candidates: input.candidates, contestId: input.contestId, ...prediction },
        walletQuery(),
      );
      const lineupId = (value as { lineup?: { id?: string } } | null)?.lineup?.id;
      if (typeof lineupId !== "string") throw new CutAgentError("Unexpected response", 502, value);
      return { ok: true, lineupId };
    },
    async join(input) {
      const contest = await contestForAction(input.contestId);
      return lineupResult(
        await postAction(
          `/api/contests/${encodeURIComponent(input.contestId)}/entries`,
          { lineupId: input.lineupId },
          (calls) => {
            assertJoinCalls(calls, {
              chainId,
              contest: contest.address,
              lineupId: input.lineupId,
              primaryDeposit: contest.primaryDeposit,
            });
          },
        ),
      );
    },
    async leave(input) {
      const contest = await contestForAction(input.contestId);
      const path = `/api/contests/${encodeURIComponent(input.contestId)}/entries/${encodeURIComponent(input.lineupId)}`;
      return lineupResult(
        await finishPrepared((body) => del(path, walletQuery(), body), {}, (calls) => {
          assertLeaveCalls(calls, { contest: contest.address, lineupId: input.lineupId });
        }),
      );
    },
    async register(input) {
      const body = parse(registerSchema, { ...input, publicKey });
      const value = await post("/api/auth/register", body);
      if (
        !value ||
        typeof value !== "object" ||
        typeof (value as RegisteredAgent).userId !== "string" ||
        typeof (value as RegisteredAgent).smartWallet !== "string"
      ) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      const registered = value as RegisteredAgent;
      try {
        smartWallet = getAddress(registered.smartWallet);
      } catch {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return registered;
    },
    async updateProfile(input) {
      const body = parse(agentProfileSchema, input);
      const value = await put("/api/agent/profile", body);
      if (!value || typeof value !== "object" || typeof (value as AgentProfile).name !== "string") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as AgentProfile;
    },
    async joinLeague(input) {
      const body = parse(joinLeagueSchema, input);
      const value = await post("/api/userGroups/join", body, walletQuery());
      if (
        !value ||
        typeof value !== "object" ||
        typeof (value as LeagueJoined).id !== "string" ||
        typeof (value as LeagueJoined).name !== "string"
      ) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      const role = (value as LeagueJoined).currentUserRole;
      return {
        id: (value as LeagueJoined).id,
        name: (value as LeagueJoined).name,
        currentUserRole: typeof role === "string" ? role : null,
      };
    },
    async leaveLeague(id) {
      const current = await get("/api/agent/account", walletQuery());
      const userId = (current as AgentAccount | null)?.userId;
      if (!current || typeof current !== "object" || typeof userId !== "string") {
        throw new CutAgentError("Unexpected response", 502, current);
      }
      const value = await del(
        `/api/userGroups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
        walletQuery(),
      );
      if (!value || typeof value !== "object" || (value as { success?: unknown }).success !== true) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return { success: true };
    },
    async createContest(input) {
      const expiryTimestamp = contestExpiryTimestamp(input.endDate, input.settings.expiryTimestamp);
      const body = {
        name: input.name,
        eventId: input.eventId,
        endDate: input.endDate,
        chainId,
        settings: {
          ...input.settings,
          ...(expiryTimestamp !== undefined ? { expiryTimestamp } : {}),
        },
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.userGroupId !== undefined ? { userGroupId: input.userGroupId } : {}),
        ...(input.notifyLeagueMembers !== undefined
          ? { notifyLeagueMembers: input.notifyLeagueMembers }
          : {}),
      };
      const value = await postAction("/api/contests", body, (calls) => {
        const settings = body.settings as {
          primaryDeposit: number;
          expiryTimestamp?: number;
          referralNetworkBps?: number;
          primaryDepositSecondarySubsidyBps?: number;
        };
        assertCreateContestCalls(calls, {
          chainId,
          primaryDeposit: settings.primaryDeposit,
          expiryTimestamp: settings.expiryTimestamp,
          referralNetworkBps: settings.referralNetworkBps,
          primaryDepositSecondarySubsidyBps: settings.primaryDepositSecondarySubsidyBps,
        });
      });
      if (!value || typeof value !== "object") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      const created = value as Partial<ContestCreated>;
      if (
        created.ok !== true ||
        typeof created.contestId !== "string" ||
        typeof created.address !== "string"
      ) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return { ok: true, contestId: created.contestId, address: created.address };
    },
    async createFreeContest(input) {
      const body = parse(createFreeContestSchema, input);
      const value = await post(
        "/api/contests",
        {
          name: body.name,
          eventId: body.eventId,
          userGroupId: body.userGroupId,
          endDate: body.endDate,
          chainId,
          settings: { primaryDeposit: 0 },
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.notifyLeagueMembers ? { notifyLeagueMembers: true } : {}),
        },
        walletQuery(),
      );
      if (!value || typeof value !== "object") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      const created = value as Partial<FreeContestCreated>;
      if (
        typeof created.id !== "string" ||
        typeof created.name !== "string" ||
        typeof created.eventId !== "string" ||
        typeof created.userGroupId !== "string" ||
        typeof created.status !== "string"
      ) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return {
        id: created.id,
        name: created.name,
        eventId: created.eventId,
        userGroupId: created.userGroupId,
        status: created.status,
      };
    },
    async account() {
      return readAccount(await get("/api/agent/account", walletQuery()));
    },
    async scout() {
      const value = await get("/api/agent/scout", walletQuery());
      if (!value || typeof value !== "object" || !Array.isArray((value as ScoutBrief).contests)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as ScoutBrief;
    },
    async picks(contestId) {
      const value = await get(
        `/api/agent/contests/${encodeURIComponent(contestId)}/picks`,
        walletQuery(),
      );
      if (!value || typeof value !== "object" || !("contest" in value)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as PicksBrief;
    },
    async companion(input) {
      return readCursorBrief(await get("/api/agent/companion", cursorQuery(input?.cursor)));
    },
    async tick(input) {
      const value = await get("/api/agent/tick", cursorQuery(input?.cursor));
      if (!value || typeof value !== "object" || typeof (value as TickBrief).cursor !== "string") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as TickBrief;
    },
    async referrals() {
      const value = await get("/api/agent/referrals", walletQuery());
      if (!value || typeof value !== "object" || typeof (value as ReferralBrief).code !== "string") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as ReferralBrief;
    },
    async leagues() {
      const value = await get("/api/agent/leagues", walletQuery());
      if (!value || typeof value !== "object" || !Array.isArray((value as LeagueList).leagues)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueList;
    },
    async league(id) {
      const value = await get(`/api/agent/leagues/${encodeURIComponent(id)}`, walletQuery());
      if (!value || typeof value !== "object" || !("league" in value)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueDetail;
    },
    async createLeague(input) {
      const body = parse(createLeagueSchema, input);
      const value = await post("/api/userGroups", body, walletQuery());
      if (!value || typeof value !== "object" || typeof (value as LeagueCreated).id !== "string") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueCreated;
    },
    async inviteLeague(id) {
      const value = await post(`/api/userGroups/${encodeURIComponent(id)}/invite`, {}, walletQuery());
      if (
        !value ||
        typeof value !== "object" ||
        typeof (value as LeagueInvite).inviteCode !== "string" ||
        typeof (value as LeagueInvite).inviteUrl !== "string"
      ) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueInvite;
    },
    async sendMessage(room, text, input) {
      const { body, files } = messageFields(room, text, input);
      if (files.length === 0) {
        const value = await post("/api/agent/messages", body, walletQuery());
        return oneMessage(value);
      }
      const fields: Record<string, string> = {
        type: body.room.type,
        id: body.room.id,
        text: body.text,
      };
      if (body.audience) fields.audience = body.audience;
      if (body.kind) fields.kind = body.kind;
      if (body.attachments?.length) fields.attachments = JSON.stringify(body.attachments);
      const encoded = encodeMultipart(fields, files);
      const url = new URL("/api/agent/messages", origin);
      url.searchParams.set("smartWallet", wallet());
      const value = await send(
        await signed(url.toString(), "POST", encoded.body, encoded.contentType),
      );
      return oneMessage(value);
    },
    async messages(room, input) {
      const value = await get("/api/agent/messages", {
        ...roomQuery(input),
        type: room.type,
        id: room.id,
      });
      return manyMessages(value);
    },
  };
}
