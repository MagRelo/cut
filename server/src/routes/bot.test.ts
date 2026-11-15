import { Hono } from "hono";
import { getAddress, type Address } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import { packApproval } from "../services/bot/approvalEnvelope.js";
import type { BotDelegateRow } from "../services/bot/botActor.js";
import { signErc8128Request } from "../services/bot/erc8128.js";
import { kernelAddressForOwner } from "../services/bot/kernelWallet.js";
import { createRateLimiter } from "../services/bot/rateLimit.js";
import type { RegisteredAccount } from "../services/bot/registerAgent.js";
import { createBotRouter, type BotRouterDeps } from "./bot.js";

const HOST = "api.playthecut.test";
const CHAIN_ID = 84532;

type World = {
  app: Hono;
  deps: BotRouterDeps;
  accounts: Map<string, RegisteredAccount & { settings: Record<string, unknown> }>;
  delegates: Map<string, BotDelegateRow & { status: string }>;
  nonces: Set<string>;
};

function world(): World {
  const accounts: World["accounts"] = new Map();
  const delegates: World["delegates"] = new Map();
  const nonces = new Set<string>();
  let nextUser = 1;

  const deps: BotRouterDeps = {
    nonces: {
      reserve: vi.fn(async ({ signerAddress, nonce }) => {
        const key = `${signerAddress.toLowerCase()}:${nonce}`;
        if (nonces.has(key)) return { ok: false as const };
        nonces.add(key);
        return { ok: true as const, id: key };
      }),
      finish: vi.fn(async () => undefined),
    },
    actors: {
      findDelegate: async (wallet, signer) => {
        const row = delegates.get(`${wallet.toLowerCase()}:${signer.toLowerCase()}`);
        return row && row.status === "active" ? row : null;
      },
      sessionEnabled: async () => true,
      findUserIdByWallet: async (_chainId, wallet) =>
        accounts.get(wallet.toLowerCase())?.userId ?? null,
      // Undeployed wallets: the signer owns the wallet when its counterfactual address matches.
      isOwner: async (_chainId, wallet, signer) =>
        (await kernelAddressForOwner(signer)) === getAddress(wallet),
    },
    actions: {
      loadContest: vi.fn(async () => null),
      isGroupMember: vi.fn(async () => true),
      findLineup: vi.fn(async () => null),
      findLineupByPicks: vi.fn(async () => null),
      createLineup: vi.fn(async ({ userId }) => ({
        ok: true as const,
        lineup: {
          id: "lineup-1",
          userId,
          eventId: "event-1",
          contestId: "contest-1",
          picks: ["p1"],
        },
      })),
      findContestEntry: vi.fn(async () => null),
      insertContestEntry: vi.fn(async () => undefined),
      deleteContestEntry: vi.fn(async () => true),
      updateLineup: vi.fn(async () => ({ ok: true as const })),
      prepareUserOp: vi.fn(async () => ({ ok: false as const, error: "unused" })),
      submitCalls: vi.fn(async () => ({ ok: true as const })),
    },
    register: {
      findAccountByWallet: async (wallet) => accounts.get(wallet.toLowerCase()) ?? null,
      ensureWalletRows: async () => undefined,
      resolveReferral: async (code) =>
        code === "AbCdEfGh"
          ? {
              ok: true as const,
              referral: {
                referredByUserId: "inviter",
                groupIdHex: null,
                referrerAddress: "0x2222222222222222222222222222222222222222",
              },
            }
          : { ok: false as const, code: "UNKNOWN_REF_CODE" as const, message: "Unknown refCode" },
      platformGroupId: () => null,
      createAccount: async (input) => {
        const account = {
          userId: `user-${nextUser++}`,
          name: input.name,
          referralCode: "NewCode2",
          referrerAddress: input.referrerAddress,
          referralChainId: input.referrerAddress ? input.chainId : null,
          referralOnchainTxHash: null,
          settings: input.settings,
        };
        accounts.set(input.smartWallet.toLowerCase(), account);
        return account;
      },
      afterCreate: async () => undefined,
    },
    settings: {
      loadUser: async (userId) => {
        const account = [...accounts.values()].find((a) => a.userId === userId);
        return account ? { name: account.name, settings: account.settings } : null;
      },
      saveUser: async (userId, data) => {
        const account = [...accounts.values()].find((a) => a.userId === userId);
        if (account) {
          account.name = data.name;
          account.settings = data.settings;
        }
      },
    },
    delegates: {
      upsertDelegate: async (row) => {
        delegates.set(`${row.smartWallet}:${row.delegateAddress}`, { ...row, status: "active" });
      },
      revokeDelegate: async (_userId, delegateAddress) => {
        let found = false;
        for (const row of delegates.values()) {
          if (row.delegateAddress === delegateAddress) {
            row.status = "revoked";
            found = true;
          }
        }
        return found;
      },
      isCutBot: () => false,
    },
    balance: {
      paymentToken: () => getAddress("0x3333333333333333333333333333333333333333"),
      readToken: async () => ({ balance: 12_500_000n, decimals: 6, symbol: "USDC" }),
      isDeployed: async () => false,
    },
    contests: {
      loadContests: vi.fn(async () => []),
      loadCandidates: vi.fn(async () => []),
    },
    registerLimitByIp: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    registerLimitBySigner: createRateLimiter({ limit: 100, windowMs: 60_000 }),
  };

  const app = new Hono();
  app.route("/api/bot", createBotRouter(deps));
  return { app, deps, accounts, delegates, nonces };
}

let nonceCounter = 0;
function freshNonce(): string {
  nonceCounter += 1;
  return `nonce-${Date.now()}-${nonceCounter}`;
}

async function signedFetch(
  w: World,
  account: PrivateKeyAccount,
  input: {
    method: "GET" | "POST";
    path: string;
    query?: string;
    body?: unknown;
    nonce?: string | null;
    chainId?: number;
    tamper?: (body: string) => string;
  },
) {
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);
  const nonce =
    input.nonce === null
      ? undefined
      : (input.nonce ?? (input.method === "POST" ? freshNonce() : undefined));
  const signed = await signErc8128Request({
    method: input.method,
    authority: HOST,
    path: input.path,
    query: input.query,
    body,
    chainId: input.chainId ?? CHAIN_ID,
    address: account.address,
    signMessage: (message) => account.signMessage({ message: { raw: message } }),
    nonce,
  });
  const headers: Record<string, string> = {
    host: HOST,
    "signature-input": signed.signatureInput,
    signature: signed.signature,
  };
  if (signed.contentDigest) headers["content-digest"] = signed.contentDigest;
  if (body !== undefined) headers["content-type"] = "application/json";
  const sentBody = body !== undefined && input.tamper ? input.tamper(body) : body;
  return w.app.request(`http://${HOST}${input.path}${input.query ?? ""}`, {
    method: input.method,
    headers,
    ...(sentBody !== undefined ? { body: sentBody } : {}),
  });
}

async function register(
  w: World,
  account: PrivateKeyAccount,
  extra: Record<string, unknown> = {},
  nonce?: string,
) {
  return signedFetch(w, account, {
    method: "POST",
    path: "/api/bot/actions",
    body: { action: "register", chainId: CHAIN_ID, ...extra },
    ...(nonce ? { nonce } : {}),
  });
}

describe("bot API: ERC-8128 is the only auth", () => {
  it("rejects an unsigned request, including the removed EIP-712 body format", async () => {
    const w = world();
    const res = await w.app.request(`http://${HOST}/api/bot/actions`, {
      method: "POST",
      headers: { host: HOST, "content-type": "application/json" },
      body: JSON.stringify({
        chainId: CHAIN_ID,
        action: "lineupUpsert",
        smartWallet: "0x1111111111111111111111111111111111111111",
        contestId: "c",
        lineupId: "",
        candidates: ["p1"],
        deadline: "9999999999",
        signature: "0x1234",
      }),
    });
    expect(res.status).toBe(401);
    expect(w.deps.nonces.reserve).not.toHaveBeenCalled();
  });

  it("rejects a tampered body", async () => {
    const w = world();
    const agent = privateKeyToAccount(generatePrivateKey());
    const res = await signedFetch(w, agent, {
      method: "POST",
      path: "/api/bot/actions",
      body: { action: "register", chainId: CHAIN_ID },
      tamper: (body) => body.replace("register", "registeR"),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a signature whose keyid claims another address", async () => {
    const w = world();
    const agent = privateKeyToAccount(generatePrivateKey());
    const impostor = privateKeyToAccount(generatePrivateKey());
    const body = JSON.stringify({ action: "register", chainId: CHAIN_ID });
    const signed = await signErc8128Request({
      method: "POST",
      authority: HOST,
      path: "/api/bot/actions",
      body,
      chainId: CHAIN_ID,
      address: agent.address,
      signMessage: (message) => impostor.signMessage({ message: { raw: message } }),
      nonce: freshNonce(),
    });
    const res = await w.app.request(`http://${HOST}/api/bot/actions`, {
      method: "POST",
      headers: {
        host: HOST,
        "content-type": "application/json",
        "content-digest": signed.contentDigest!,
        "signature-input": signed.signatureInput,
        signature: signed.signature,
      },
      body,
    });
    expect(res.status).toBe(401);
    expect(w.accounts.size).toBe(0);
  });
});

describe("bot API: register", () => {
  it("creates the account on the agent key's counterfactual Kernel wallet", async () => {
    const w = world();
    const agent = privateKeyToAccount(generatePrivateKey());
    const res = await register(w, agent);
    expect(res.status).toBe(201);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({
      created: true,
      smartWallet: await kernelAddressForOwner(agent.address),
      owner: getAddress(agent.address),
      chainId: CHAIN_ID,
      referral: { applied: false, onchain: "none" },
    });
  });

  it("applies a refCode", async () => {
    const w = world();
    const agent = privateKeyToAccount(generatePrivateKey());
    const res = await register(w, agent, { refCode: "AbCdEfGh" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ referral: { applied: true, onchain: "pending" } });
  });

  it("returns a clear error for an unknown refCode and creates nothing", async () => {
    const w = world();
    const res = await register(w, privateKeyToAccount(generatePrivateKey()), {
      refCode: "ZZZZZZZZ",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "UNKNOWN_REF_CODE" });
    expect(w.accounts.size).toBe(0);
  });

  it("is idempotent with a fresh nonce", async () => {
    const w = world();
    const agent = privateKeyToAccount(generatePrivateKey());
    const first = (await (await register(w, agent)).json()) as { userId: string };
    const again = await register(w, agent, { refCode: "AbCdEfGh" });
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({
      created: false,
      userId: first.userId,
      refCodeIgnored: true,
      referral: { applied: false },
    });
    expect(w.accounts.size).toBe(1);
  });

  it("rejects a replayed nonce before doing anything", async () => {
    const w = world();
    const agent = privateKeyToAccount(generatePrivateKey());
    const nonce = freshNonce();
    expect((await register(w, agent, {}, nonce)).status).toBe(201);
    const replay = await register(w, agent, {}, nonce);
    expect(replay.status).toBe(409);
  });

  it("requires a nonce", async () => {
    const w = world();
    const res = await signedFetch(w, privateKeyToAccount(generatePrivateKey()), {
      method: "POST",
      path: "/api/bot/actions",
      body: { action: "register", chainId: CHAIN_ID },
      nonce: null,
    });
    expect(res.status).toBe(400);
    expect(w.deps.nonces.reserve).not.toHaveBeenCalled();
  });

  it("rejects a body chainId that differs from the keyid chain", async () => {
    const w = world();
    const res = await signedFetch(w, privateKeyToAccount(generatePrivateKey()), {
      method: "POST",
      path: "/api/bot/actions",
      body: { action: "register", chainId: 8453 },
    });
    expect(res.status).toBe(400);
  });

  it("is rate limited per signer", async () => {
    const w = world();
    w.deps.registerLimitBySigner = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const app = new Hono();
    app.route("/api/bot", createBotRouter(w.deps));
    const limited = { ...w, app };
    const agent = privateKeyToAccount(generatePrivateKey());
    expect((await register(limited, agent)).status).toBe(201);
    expect((await register(limited, agent)).status).toBe(200);
    expect((await register(limited, agent)).status).toBe(429);
  });
});

async function registered(w: World) {
  const owner = privateKeyToAccount(generatePrivateKey());
  const res = await register(w, owner);
  const json = (await res.json()) as { smartWallet: Address; userId: string };
  return { owner, smartWallet: json.smartWallet, userId: json.userId };
}

async function addDelegate(w: World, owner: PrivateKeyAccount, smartWallet: Address) {
  const delegate = privateKeyToAccount(generatePrivateKey());
  const res = await signedFetch(w, owner, {
    method: "POST",
    path: "/api/bot/actions",
    body: {
      action: "delegateAdd",
      chainId: CHAIN_ID,
      smartWallet,
      kind: "external",
      delegateAddress: delegate.address,
      approval: "serialized-permission-account",
      permissionId: "0x5a677774",
    },
  });
  return { res, delegate };
}

describe("bot API: signers", () => {
  it("lets the owner key update settings directly", async () => {
    const w = world();
    const { owner, smartWallet } = await registered(w);
    const res = await signedFetch(w, owner, {
      method: "POST",
      path: "/api/bot/actions",
      body: {
        action: "userSettingsUpsert",
        chainId: CHAIN_ID,
        smartWallet,
        name: "Ace",
        settings: { oddsFormat: "decimal" },
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      name: "Ace",
      settings: { onboardingDismissed: false, oddsFormat: "decimal" },
    });
  });

  it("rejects unknown settings fields", async () => {
    const w = world();
    const { owner, smartWallet } = await registered(w);
    const res = await signedFetch(w, owner, {
      method: "POST",
      path: "/api/bot/actions",
      body: {
        action: "userSettingsUpsert",
        chainId: CHAIN_ID,
        smartWallet,
        settings: { isAdmin: true },
      },
    });
    expect(res.status).toBe(400);
  });

  it("lets an added delegate update settings, and stops it after revoke", async () => {
    const w = world();
    const { owner, smartWallet } = await registered(w);
    const { res: added, delegate } = await addDelegate(w, owner, smartWallet);
    expect(added.status).toBe(200);
    expect(w.delegates.size).toBe(1);
    expect([...w.delegates.values()][0]?.approval).toBe(
      packApproval({ approval: "serialized-permission-account", permissionId: "0x5a677774" }),
    );

    const settings = {
      action: "userSettingsUpsert",
      chainId: CHAIN_ID,
      smartWallet,
      settings: { color: "#ff0000" },
    };
    const byDelegate = await signedFetch(w, delegate, {
      method: "POST",
      path: "/api/bot/actions",
      body: settings,
    });
    expect(byDelegate.status).toBe(200);

    const revoked = await signedFetch(w, owner, {
      method: "POST",
      path: "/api/bot/actions",
      body: {
        action: "delegateRevoke",
        chainId: CHAIN_ID,
        smartWallet,
        delegateAddress: delegate.address,
      },
    });
    expect(revoked.status).toBe(200);

    const afterRevoke = await signedFetch(w, delegate, {
      method: "POST",
      path: "/api/bot/actions",
      body: settings,
    });
    expect(afterRevoke.status).toBe(403);
  });

  it("does not let a delegate add another delegate", async () => {
    const w = world();
    const { owner, smartWallet } = await registered(w);
    const { delegate } = await addDelegate(w, owner, smartWallet);
    const { res } = await addDelegate(w, delegate, smartWallet);
    expect(res.status).toBe(403);
  });

  it("rejects a stranger key on someone else's wallet", async () => {
    const w = world();
    const { smartWallet } = await registered(w);
    const stranger = privateKeyToAccount(generatePrivateKey());
    const res = await signedFetch(w, stranger, {
      method: "POST",
      path: "/api/bot/actions",
      body: { action: "userSettingsUpsert", chainId: CHAIN_ID, smartWallet, name: "pwned" },
    });
    expect(res.status).toBe(403);
  });

  it("requires a nonce on lineupUpsert and rejects its replay", async () => {
    const w = world();
    const { owner, smartWallet } = await registered(w);
    w.deps.actions.loadContest = vi.fn(async () => ({
      id: "contest-1",
      eventId: "event-1",
      userGroupId: null,
      address: null,
      chainId: CHAIN_ID,
      status: "OPEN" as const,
      paymentToken: null,
      depositWei: 0n,
    }));
    const body = {
      action: "lineupUpsert",
      chainId: CHAIN_ID,
      smartWallet,
      contestId: "contest-1",
      candidates: ["p1"],
    };
    const missing = await signedFetch(w, owner, {
      method: "POST",
      path: "/api/bot/actions",
      body,
      nonce: null,
    });
    expect(missing.status).toBe(400);
    const nonce = freshNonce();
    const ok = await signedFetch(w, owner, {
      method: "POST",
      path: "/api/bot/actions",
      body,
      nonce,
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, lineupId: "lineup-1" });
    const replay = await signedFetch(w, owner, {
      method: "POST",
      path: "/api/bot/actions",
      body,
      nonce,
    });
    expect(replay.status).toBe(409);
    expect(w.deps.actions.createLineup).toHaveBeenCalledTimes(1);
  });
});

describe("bot API: signed reads (no nonce)", () => {
  it("returns the wallet's payment-token balance", async () => {
    const w = world();
    const { owner, smartWallet } = await registered(w);
    const res = await signedFetch(w, owner, {
      method: "GET",
      path: "/api/bot/balance",
      query: `?smartWallet=${smartWallet}`,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      chainId: CHAIN_ID,
      smartWallet,
      deployed: false,
      paymentToken: {
        address: "0x3333333333333333333333333333333333333333",
        symbol: "USDC",
        decimals: 6,
        balance: "12500000",
        formatted: "12.5",
      },
    });
    expect(w.deps.nonces.reserve).toHaveBeenCalledTimes(1); // only the register write
  });

  it("lists contests for the owner", async () => {
    const w = world();
    const { owner, smartWallet, userId } = await registered(w);
    const res = await signedFetch(w, owner, {
      method: "GET",
      path: "/api/bot/contests",
      query: `?smartWallet=${smartWallet}&eventId=event-1`,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ contests: [] });
    expect(w.deps.contests.loadContests).toHaveBeenCalledWith(userId, CHAIN_ID, "event-1");
  });

  it("rejects an unsigned read", async () => {
    const w = world();
    const res = await w.app.request(
      `http://${HOST}/api/bot/balance?smartWallet=0x1111111111111111111111111111111111111111`,
      {
        headers: { host: HOST },
      },
    );
    expect(res.status).toBe(401);
  });
});
