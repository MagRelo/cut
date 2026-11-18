import { signRequest, type EthHttpSigner } from "@slicekit/erc8128";
import { getAddress, isHex, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { kernelWalletAddress } from "./kernelWallet.js";
import type { z } from "zod";
import {
  actionSchema,
  agentPreferencesSchema,
  createFreeContestSchema,
  createLeagueSchema,
  registerSchema,
  type AgentAccount,
  type AgentPreferences,
  type CompanionBrief,
  type ContestCreated,
  type ContestList,
  type FreeContestCreated,
  type LeagueCreated,
  type LeagueDetail,
  type LeagueInvite,
  type LeagueList,
  type LineupResult,
  type PicksBrief,
  type ReferralBrief,
  type RegisteredAgent,
  type ScoutBrief,
  type TickBrief,
  type UserOpBody,
} from "./contract.js";

export type CutChainId = 8453 | 84532;

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
  privateKey: Hex;
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
  readonly address: Address;
  readonly smartWallet: Address;
  contests(eventId?: string): Promise<ContestList>;
  lineupUpsert(input: LineupUpsertInput): Promise<LineupResult>;
  join(input: LineupRef): Promise<LineupResult>;
  leave(input: LineupRef): Promise<LineupResult>;
  register(input: {
    email: string;
    name?: string;
    referralCode?: string;
  }): Promise<RegisteredAgent>;
  createContest(input: CreateContestInput): Promise<ContestCreated>;
  createFreeContest(input: CreateFreeContestInput): Promise<FreeContestCreated>;
  account(): Promise<AgentAccount>;
  yield(): Promise<void>;
  preferences(input: {
    sports?: string[];
    maxEntryFee?: number | null;
  }): Promise<AgentPreferences>;
  scout(): Promise<ScoutBrief>;
  picks(contestId: string): Promise<PicksBrief>;
  companion(input?: { cursor?: string }): Promise<CompanionBrief>;
  tick(input?: { cursor?: string }): Promise<TickBrief>;
  referrals(): Promise<ReferralBrief>;
  leagues(): Promise<LeagueList>;
  league(id: string): Promise<LeagueDetail>;
  createLeague(input: { name: string; description?: string }): Promise<LeagueCreated>;
  inviteLeague(id: string): Promise<LeagueInvite>;
};

type PreparedUserOp = {
  preparedUserOp: true;
  userOpHash: Hex;
  userOp: UserOpBody;
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

export function generateDelegateKey(): { privateKey: Hex; address: Address } {
  const privateKey = generatePrivateKey();
  return { privateKey, address: privateKeyToAccount(privateKey).address };
}

export function createCutAgent(options: CutAgentOptions): CutAgent {
  const requestedChain = options.chainId ?? 8453;
  if (requestedChain !== 8453 && requestedChain !== 84532) {
    throw new CutAgentError("ChainId must be 8453 (Base) or 84532 (Base Sepolia)", 400, null);
  }
  const chainId: CutChainId = requestedChain;
  const account = privateKeyToAccount(options.privateKey);
  let smartWallet: Address;
  try {
    smartWallet = options.smartWallet
      ? getAddress(options.smartWallet)
      : kernelWalletAddress(account.address, chainId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid smart wallet";
    throw new CutAgentError(
      options.smartWallet ? "Invalid smart wallet" : message,
      400,
      null,
    );
  }
  const origin = (options.origin ?? "https://playthecut.com").replace(/\/$/, "");
  const fetchImpl = options.fetch ?? ((request: Request) => fetch(request));
  const signer: EthHttpSigner = {
    chainId,
    address: account.address,
    signMessage: (message) => account.signMessage({ message: { raw: message } }),
  };

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

  async function get(path: string, query: Record<string, string>): Promise<unknown> {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return send(await signRequest(url.toString(), signer));
  }

  async function post(
    path: string,
    body: unknown,
    query: Record<string, string> = {},
  ): Promise<unknown> {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return send(
      await signRequest(
        url.toString(),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        signer,
      ),
    );
  }

  async function put(path: string, body: unknown): Promise<unknown> {
    const url = new URL(path, origin);
    url.searchParams.set("smartWallet", smartWallet);
    return send(
      await signRequest(
        url.toString(),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        signer,
      ),
    );
  }

  function prepared(value: unknown): PreparedUserOp | null {
    if (!value || typeof value !== "object" || !("preparedUserOp" in value)) return null;
    const row = value as Partial<PreparedUserOp>;
    if (row.preparedUserOp !== true || !row.userOpHash || !isHex(row.userOpHash) || !row.userOp) {
      return null;
    }
    return row as PreparedUserOp;
  }

  async function postAction(body: unknown): Promise<unknown> {
    const response = await post("/api/bot/actions", body);
    const ready = prepared(response);
    if (!ready) return response;
    const userOpSignature = await account.signMessage({ message: { raw: ready.userOpHash } });
    const second = await post("/api/bot/actions", {
      ...(body as Record<string, unknown>),
      userOp: ready.userOp,
      userOpSignature,
    });
    if (prepared(second)) {
      throw new CutAgentError("Server returned another prepared user operation", 502, second);
    }
    return second;
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
    return cursor ? { smartWallet, cursor } : { smartWallet };
  }

  function readAccount(value: unknown): AgentAccount {
    if (!value || typeof value !== "object" || typeof (value as AgentAccount).wallet !== "string") {
      throw new CutAgentError("Unexpected response", 502, value);
    }
    const account = value as AgentAccount;
    return { ...account, takeover: account.takeover ?? null };
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

  return {
    address: account.address,
    smartWallet,
    async contests(eventId) {
      const query: Record<string, string> = {
        chainId: String(chainId),
        smartWallet,
      };
      if (eventId) query.eventId = eventId;
      const body = await get("/api/bot/contests", query);
      if (!body || typeof body !== "object" || !Array.isArray((body as ContestList).contests)) {
        throw new CutAgentError("Unexpected response", 502, body);
      }
      return { contests: (body as ContestList).contests };
    },
    async lineupUpsert(input) {
      const body = parse(actionSchema, {
        chainId,
        action: "lineupUpsert",
        smartWallet,
        contestId: input.contestId,
        lineupId: input.lineupId ?? "",
        candidates: input.candidates,
        ...(input.prediction !== undefined ? { prediction: input.prediction } : {}),
      });
      return lineupResult(await postAction(body));
    },
    async join(input) {
      const body = parse(actionSchema, {
        chainId,
        action: "join",
        smartWallet,
        contestId: input.contestId,
        lineupId: input.lineupId,
      });
      return lineupResult(await postAction(body));
    },
    async leave(input) {
      const body = parse(actionSchema, {
        chainId,
        action: "leave",
        smartWallet,
        contestId: input.contestId,
        lineupId: input.lineupId,
      });
      return lineupResult(await postAction(body));
    },
    async register(input) {
      const body = parse(registerSchema, input);
      const value = await post("/api/auth/register", body);
      if (
        !value ||
        typeof value !== "object" ||
        typeof (value as RegisteredAgent).userId !== "string"
      ) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as RegisteredAgent;
    },
    async createContest(input) {
      const expiryTimestamp = contestExpiryTimestamp(input.endDate, input.settings.expiryTimestamp);
      const body = parse(actionSchema, {
        chainId,
        action: "createContest",
        smartWallet,
        name: input.name,
        eventId: input.eventId,
        endDate: input.endDate,
        settings: {
          ...input.settings,
          ...(expiryTimestamp !== undefined ? { expiryTimestamp } : {}),
        },
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.userGroupId !== undefined ? { userGroupId: input.userGroupId } : {}),
        ...(input.notifyLeagueMembers !== undefined
          ? { notifyLeagueMembers: input.notifyLeagueMembers }
          : {}),
      });
      const value = await postAction(body);
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
        { smartWallet },
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
      return readAccount(await get("/api/agent/account", { smartWallet }));
    },
    async yield() {
      const body = parse(actionSchema, { chainId, action: "yield", smartWallet });
      const value = await postAction(body);
      if (!value || typeof value !== "object" || (value as { yielded?: unknown }).yielded !== true) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
    },
    async preferences(input) {
      const body = parse(agentPreferencesSchema, input);
      const value = await put("/api/agent/preferences", body);
      if (!value || typeof value !== "object" || !("preferences" in value)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return (value as { preferences: AgentPreferences }).preferences;
    },
    async scout() {
      const value = await get("/api/agent/scout", { smartWallet });
      if (!value || typeof value !== "object" || !Array.isArray((value as ScoutBrief).contests)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as ScoutBrief;
    },
    async picks(contestId) {
      const value = await get(`/api/agent/contests/${encodeURIComponent(contestId)}/picks`, {
        smartWallet,
      });
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
      const value = await get("/api/agent/referrals", { smartWallet });
      if (!value || typeof value !== "object" || typeof (value as ReferralBrief).code !== "string") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as ReferralBrief;
    },
    async leagues() {
      const value = await get("/api/agent/leagues", { smartWallet });
      if (!value || typeof value !== "object" || !Array.isArray((value as LeagueList).leagues)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueList;
    },
    async league(id) {
      const value = await get(`/api/agent/leagues/${encodeURIComponent(id)}`, { smartWallet });
      if (!value || typeof value !== "object" || !("league" in value)) {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueDetail;
    },
    async createLeague(input) {
      const body = parse(createLeagueSchema, input);
      const value = await post("/api/userGroups", body, { smartWallet });
      if (!value || typeof value !== "object" || typeof (value as LeagueCreated).id !== "string") {
        throw new CutAgentError("Unexpected response", 502, value);
      }
      return value as LeagueCreated;
    },
    async inviteLeague(id) {
      const value = await post(`/api/userGroups/${encodeURIComponent(id)}/invite`, {}, { smartWallet });
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
  };
}
