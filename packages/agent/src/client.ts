import { signRequest, type EthHttpSigner } from "@slicekit/erc8128";
import { getAddress, isHex, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { z } from "zod";
import {
  actionSchema,
  registerSchema,
  type ContestCreated,
  type ContestList,
  type LineupResult,
  type RegisteredAgent,
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
  settings: { primaryDeposit: number };
  description?: string;
  userGroupId?: string;
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
};

type PreparedUserOp = {
  preparedUserOp: true;
  userOpHash: Hex;
  userOp: UserOpBody;
  lineupId?: string;
};

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
    smartWallet = options.smartWallet ? getAddress(options.smartWallet) : account.address;
  } catch {
    throw new CutAgentError("Invalid smart wallet", 400, null);
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

  async function post(path: string, body: unknown): Promise<unknown> {
    return send(
      await signRequest(
        `${origin}${path}`,
        {
          method: "POST",
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
    const first = await post("/api/bot/actions", body);
    const ready = prepared(first);
    if (!ready) return first;
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
      const body = parse(actionSchema, {
        chainId,
        action: "createContest",
        smartWallet,
        name: input.name,
        eventId: input.eventId,
        endDate: input.endDate,
        settings: input.settings,
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
  };
}
