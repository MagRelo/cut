import { generateDelegateKey } from "@playthecut/agent";
import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyBotRequest, findUniqueWallet, findDelegate } = vi.hoisted(() => ({
  verifyBotRequest: vi.fn(),
  findUniqueWallet: vi.fn(),
  findDelegate: vi.fn(),
}));

vi.mock("../services/bot/verifyBotRequest.js", () => ({
  verifyBotRequest,
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    userWallet: { findUnique: findUniqueWallet },
    botDelegate: { findFirst: findDelegate },
  },
}));

import { optionalAuth, requireAuth, requireWalletChain } from "./auth.js";
import { requireAdmin } from "./admin.js";

const SIGNER = getAddress("0x1111111111111111111111111111111111111111");
const WALLET = getAddress("0x2222222222222222222222222222222222222222");
const KEY = generateDelegateKey();

function mockContext(init: {
  authorization?: string;
  signature?: string;
  chainHeader?: string;
  smartWallet?: string;
  user?: { userId: string; address: string; chainId: number; userType: string };
} = {}) {
  const headers = new Headers();
  if (init.authorization) headers.set("authorization", init.authorization);
  if (init.signature) headers.set("signature", init.signature);
  if (init.chainHeader) headers.set("x-cut-chain-id", init.chainHeader);
  const url = new URL("http://localhost/api/auth/me");
  if (init.smartWallet) url.searchParams.set("smartWallet", init.smartWallet);
  const request = new Request(url, { headers });
  const store = new Map<string, unknown>();
  if (init.user) store.set("user", init.user);
  const json = vi.fn((body: unknown, status?: number) => ({ body, status }));
  const next = vi.fn(async () => undefined);
  const c = {
    req: {
      header: (name: string) => request.headers.get(name) ?? undefined,
      query: (name: string) => url.searchParams.get(name) ?? undefined,
      raw: request,
    },
    json,
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => store.set(key, value),
  };
  return { c, json, next, store };
}

describe("P-256 auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyBotRequest.mockResolvedValue({ ok: true, signer: SIGNER, chainId: 84532 });
    findUniqueWallet.mockResolvedValue({
      publicKey: SIGNER.toLowerCase(),
      user: { id: "user-1", userType: "AGENT" },
    });
    findDelegate.mockResolvedValue(null);
  });

  it("rejects an address signer", async () => {
    const { c, json, next } = mockContext({ signature: "sig" });
    await requireAuth(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      { error: "No active delegate for this signature" },
      403,
    );
  });

  it("sets the account a delegate names in the signed query", async () => {
    verifyBotRequest.mockResolvedValue({ ok: true, signer: KEY.publicKey, chainId: 84532 });
    findDelegate.mockResolvedValue({
      smartWallet: WALLET.toLowerCase(),
      user: { id: "human-1", userType: "USER" },
    });
    const { c, next, store } = mockContext({ signature: "sig", smartWallet: WALLET });
    await requireAuth(c as never, next);
    expect(next).toHaveBeenCalled();
    expect(store.get("user")).toMatchObject({
      userId: "human-1",
      address: WALLET,
      userType: "USER",
    });
  });

  it("rejects a bearer token and a signature on the same request", async () => {
    const { c, json, next } = mockContext({
      authorization: "Bearer token",
      signature: "sig",
    });
    await requireAuth(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      { error: "Request uses both a bearer token and a signature" },
      400,
    );
  });

  it("rejects a signature chain that does not match the chain header", async () => {
    const { c, json, next } = mockContext({ signature: "sig", chainHeader: "8453" });
    await requireAuth(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      { error: "Signature chain does not match the request" },
      400,
    );
  });

  it("continues optional auth when the request has no credential", async () => {
    const { c, next } = mockContext();
    await optionalAuth(c as never, next);
    expect(next).toHaveBeenCalled();
  });

  it("keeps a signed user when the wallet chain header matches", async () => {
    const { c, next } = mockContext({
      chainHeader: "84532",
      user: {
        userId: "user-1",
        address: SIGNER.toLowerCase(),
        chainId: 84532,
        userType: "AGENT",
      },
    });
    await requireWalletChain(c as never, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("rejects an AGENT", async () => {
    const { c, json, next } = mockContext({
      user: {
        userId: "user-1",
        address: SIGNER.toLowerCase(),
        chainId: 84532,
        userType: "AGENT",
      },
    });
    await requireAdmin(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" }, 403);
  });

  it("rejects staff who signed without a Privy session", async () => {
    const { c, json, next } = mockContext({
      user: {
        userId: "user-1",
        address: SIGNER.toLowerCase(),
        chainId: 84532,
        userType: "ADMIN",
      },
    });
    await requireAdmin(c as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ error: "No token provided" }, 401);
  });
});
