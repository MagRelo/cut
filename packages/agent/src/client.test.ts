import { getAddress, recoverAddress, recoverMessageAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { createCutAgent, generateDelegateKey } from "./client.js";
import { kernelWalletAddress } from "./kernelWallet.js";

const SMART_WALLET = "0x1111111111111111111111111111111111111111";
const USER_OP_HASH = `0x${"ab".repeat(32)}` as const;
const USER_OP = {
  sender: SMART_WALLET,
  nonce: "1",
  callData: "0x",
  callGasLimit: "1",
  verificationGasLimit: "1",
  preVerificationGas: "1",
  maxFeePerGas: "1",
  maxPriorityFeePerGas: "1",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createCutAgent", () => {
  it("signs a contest list that names the wallet in the query", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey,
      smartWallet: SMART_WALLET,
      origin: "https://playthecut.com",
      fetch: async (request) => {
        requests.push(request.clone());
        return json({ contests: [] });
      },
    });

    await expect(agent.contests("event-1")).resolves.toEqual({ contests: [] });

    const request = requests[0];
    expect(request?.method).toBe("GET");
    const url = new URL(request?.url ?? "");
    expect(url.pathname).toBe("/api/contests");
    expect(url.searchParams.get("chainId")).toBe("8453");
    expect(url.searchParams.get("smartWallet")).toBe(SMART_WALLET);
    expect(url.searchParams.get("eventId")).toBe("event-1");
    expect(request?.headers.get("signature-input")).toContain(
      `keyid="eip155:8453:${account.address.toLowerCase()}"`,
    );
    expect(request?.headers.get("signature")).toBeTruthy();
    expect(request?.headers.get("x-cut-chain-id")).toBe("8453");
  });

  it("signs the prepared user operation on a second join", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey,
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        if (requests.length === 1) {
          return json({
            preparedUserOp: true,
            lineupId: "lineup-1",
            userOpHash: USER_OP_HASH,
            userOp: USER_OP,
          });
        }
        return json({ ok: true, lineupId: "lineup-1" });
      },
    });

    await expect(agent.join({ contestId: "contest-1", lineupId: "lineup-1" })).resolves.toEqual({
      ok: true,
      lineupId: "lineup-1",
    });

    expect(requests).toHaveLength(2);
    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/api/contests/contest-1/entries");
    expect(requests[0]?.method).toBe("POST");
    expect(requests[1]?.method).toBe("POST");
    const firstBody = JSON.parse(await requests[0]!.text()) as { userOpSignature?: string };
    const secondBody = JSON.parse(await requests[1]!.text()) as {
      userOp: typeof USER_OP;
      userOpSignature: `0x${string}`;
    };
    expect(firstBody.userOpSignature).toBeUndefined();
    expect(secondBody.userOp).toEqual(USER_OP);
    expect(requests[0]?.headers.get("signature-input")).not.toBe(
      requests[1]?.headers.get("signature-input"),
    );
    await expect(
      recoverMessageAddress({
        message: { raw: USER_OP_HASH },
        signature: secondBody.userOpSignature,
      }),
    ).resolves.toBe(account.address);
  });

  it("uses the Kernel wallet when smartWallet is omitted", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const wallet = kernelWalletAddress(account.address, 8453);
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey,
      fetch: async (request) => {
        requests.push(request.clone());
        return json({ contests: [] });
      },
    });

    expect(agent.address).toBe(account.address);
    expect(agent.smartWallet).toBe(wallet);
    await agent.contests();
    const url = new URL(requests[0]?.url ?? "");
    expect(url.searchParams.get("smartWallet")).toBe(getAddress(wallet));
  });

  it("registers without a smartWallet query", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        return json({
          userId: "user-1",
          email: "agent@example.com",
          userType: "AGENT",
          name: "Agent",
          referralCode: "code",
          smartWallet: SMART_WALLET,
          created: true,
        });
      },
    });

    await agent.register({ email: "agent@example.com", color: "#0a73eb", oddsFormat: "decimal" });
    const url = new URL(requests[0]?.url ?? "");
    expect(url.pathname).toBe("/api/auth/register");
    expect(url.search).toBe("");
    expect(JSON.parse(await requests[0]!.text())).toEqual({
      email: "agent@example.com",
      color: "#0a73eb",
      oddsFormat: "decimal",
    });
  });

  it("registers without an email", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      fetch: async (request) => {
        requests.push(request.clone());
        return json({
          userId: "user-1",
          email: null,
          userType: "AGENT",
          name: "Agent",
          referralCode: "code",
          smartWallet: SMART_WALLET,
          created: true,
        });
      },
    });

    await expect(agent.register({})).resolves.toMatchObject({ email: null, created: true });
    expect(JSON.parse(await requests[0]!.text())).toEqual({});
  });

  it("updates a profile, joins a league, and leaves with the account user id", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        const url = new URL(request.url);
        if (url.pathname.endsWith("/profile")) {
          return json({
            name: "Ada",
            email: "ada@example.com",
            color: "#0a73eb",
            oddsFormat: "american",
          });
        }
        if (url.pathname.endsWith("/join")) {
          return json({ id: "league-1", name: "Saturday", currentUserRole: "MEMBER" });
        }
        if (url.pathname.endsWith("/account")) {
          return json({ userId: "user-1", wallet: SMART_WALLET });
        }
        return json({ success: true });
      },
    });

    await expect(
      agent.updateProfile({ name: "Ada", email: "ada@example.com", oddsFormat: "american" }),
    ).resolves.toMatchObject({ email: "ada@example.com" });
    await expect(agent.joinLeague({ inviteCode: " INVITE " })).resolves.toEqual({
      id: "league-1",
      name: "Saturday",
      currentUserRole: "MEMBER",
    });
    await expect(agent.leaveLeague("league-1")).resolves.toEqual({ success: true });

    expect(requests[0]?.method).toBe("PUT");
    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/api/agent/profile");
    expect(JSON.parse(await requests[0]!.text())).toEqual({
      name: "Ada",
      email: "ada@example.com",
      oddsFormat: "american",
    });

    expect(requests[1]?.method).toBe("POST");
    const join = new URL(requests[1]?.url ?? "");
    expect(join.pathname).toBe("/api/userGroups/join");
    expect(join.searchParams.get("smartWallet")).toBe(SMART_WALLET);
    expect(JSON.parse(await requests[1]!.text())).toEqual({ inviteCode: "INVITE" });

    expect(requests[2]?.method).toBe("GET");
    expect(requests[3]?.method).toBe("DELETE");
    const leave = new URL(requests[3]?.url ?? "");
    expect(leave.pathname).toBe("/api/userGroups/league-1/members/user-1");
    expect(leave.searchParams.get("smartWallet")).toBe(SMART_WALLET);
  });

  it("defaults createContest expiryTimestamp from endDate", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        return json({ ok: true, contestId: "contest-1", address: SMART_WALLET });
      },
    });
    const endDate = "2026-11-20T00:00:00.000Z";
    await agent.createContest({
      name: "Sunday",
      eventId: "clh0000000000000000000001",
      userGroupId: "clh0000000000000000000002",
      endDate,
      settings: { primaryDeposit: 1 },
    });
    const body = JSON.parse(await requests[0]!.text()) as {
      settings: { primaryDeposit: number; expiryTimestamp: number };
    };
    expect(body.settings.primaryDeposit).toBe(1);
    expect(body.settings.expiryTimestamp).toBe(Math.floor(Date.parse(endDate) / 1000));
  });

  it("records a free league contest without a user operation", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        return json({
          id: "contest-1",
          name: "Monday",
          eventId: "clh0000000000000000000001",
          userGroupId: "clh0000000000000000000002",
          status: "OPEN",
          address: null,
          settings: { primaryDeposit: 0 },
        });
      },
    });

    await expect(
      agent.createFreeContest({
        name: "Monday",
        eventId: "clh0000000000000000000001",
        userGroupId: "clh0000000000000000000002",
        endDate: "2026-11-20T00:00:00.000Z",
        description: "Weekly",
      }),
    ).resolves.toEqual({
      id: "contest-1",
      name: "Monday",
      eventId: "clh0000000000000000000001",
      userGroupId: "clh0000000000000000000002",
      status: "OPEN",
    });

    expect(requests[0]?.method).toBe("POST");
    const url = new URL(requests[0]?.url ?? "");
    expect(url.pathname).toBe("/api/contests");
    expect(url.searchParams.get("smartWallet")).toBe(SMART_WALLET);
    expect(requests[0]?.headers.get("x-cut-chain-id")).toBe("8453");
    expect(requests[0]?.headers.get("signature")).toBeTruthy();
    expect(JSON.parse(await requests[0]!.text())).toEqual({
      name: "Monday",
      description: "Weekly",
      eventId: "clh0000000000000000000001",
      userGroupId: "clh0000000000000000000002",
      endDate: "2026-11-20T00:00:00.000Z",
      chainId: 8453,
      settings: { primaryDeposit: 0 },
    });
  });

  it("throws the server error", async () => {
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      fetch: async () => json({ error: "No active delegate for this signature" }, 403),
    });
    await expect(agent.contests()).rejects.toMatchObject({
      name: "CutAgentError",
      status: 403,
      message: "No active delegate for this signature",
    });
  });

  it("signs scout and tick with the wallet and cursor", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      origin: "https://playthecut.com",
      fetch: async (request) => {
        requests.push(request.clone());
        const url = new URL(request.url);
        if (url.pathname.endsWith("/tick")) return json({ cursor: "next", updates: [] });
        return json({ balanceUsdc: 12, contests: [], blocked: [] });
      },
    });

    await expect(agent.scout()).resolves.toMatchObject({ contests: [] });
    await expect(agent.tick({ cursor: "baseline" })).resolves.toMatchObject({ cursor: "next" });

    const scout = new URL(requests[0]?.url ?? "");
    expect(scout.pathname).toBe("/api/agent/scout");
    expect(scout.searchParams.get("smartWallet")).toBe(SMART_WALLET);
    expect(requests[0]?.headers.get("x-cut-chain-id")).toBe("8453");

    const tick = new URL(requests[1]?.url ?? "");
    expect(tick.pathname).toBe("/api/agent/tick");
    expect(tick.searchParams.get("cursor")).toBe("baseline");
  });

  it("creates a league on the signed wallet", async () => {
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        return json({ id: "league-1", name: "Saturday", description: null });
      },
    });

    await expect(agent.createLeague({ name: "Saturday" })).resolves.toMatchObject({ id: "league-1" });

    expect(requests[0]?.method).toBe("POST");
    const leagueUrl = new URL(requests[0]?.url ?? "");
    expect(leagueUrl.pathname).toBe("/api/userGroups");
    expect(leagueUrl.searchParams.get("smartWallet")).toBe(SMART_WALLET);
  });

  it("posts and lists league and direct messages", async () => {
    const requests: Request[] = [];
    const message = {
      id: "msg-1",
      text: "hello",
      userId: "user-2",
      audience: "bots",
      kind: null,
      createdAt: "2026-11-19T12:00:00.000Z",
      attachments: [],
    };
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        if (request.method === "GET") return json({ messages: [message] });
        return json({ message });
      },
    });

    await expect(
      agent.sendMessage({ type: "league", id: "league-1" }, "hello", { audience: "bots" }),
    ).resolves.toEqual(message);
    await expect(
      agent.messages({ type: "league", id: "league-1" }, { limit: 10, audience: "bots" }),
    ).resolves.toEqual([message]);
    await expect(
      agent.sendMessage({ type: "direct", id: "user-2" }, "hello", { audience: "bots" }),
    ).resolves.toEqual(message);
    await expect(
      agent.messages({ type: "direct", id: "user-2" }, { audience: "humans" }),
    ).resolves.toEqual([message]);

    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/api/agent/messages");
    expect(requests[0]?.method).toBe("POST");
    expect(JSON.parse(await requests[0]!.text())).toEqual({
      room: { type: "league", id: "league-1" },
      text: "hello",
      audience: "bots",
    });
    const leagueList = new URL(requests[1]?.url ?? "");
    expect(leagueList.pathname).toBe("/api/agent/messages");
    expect(leagueList.searchParams.get("type")).toBe("league");
    expect(leagueList.searchParams.get("id")).toBe("league-1");
    expect(leagueList.searchParams.get("limit")).toBe("10");
    expect(leagueList.searchParams.get("audience")).toBe("bots");
    expect(new URL(requests[2]?.url ?? "").pathname).toBe("/api/agent/messages");
    expect(JSON.parse(await requests[2]!.text())).toEqual({
      room: { type: "direct", id: "user-2" },
      text: "hello",
      audience: "bots",
    });
    const directList = new URL(requests[3]?.url ?? "");
    expect(directList.searchParams.get("type")).toBe("direct");
    expect(directList.searchParams.get("id")).toBe("user-2");
    expect(directList.searchParams.get("audience")).toBe("humans");
  });

  it("posts a link attachment as json and a file as one signed multipart body", async () => {
    const requests: Request[] = [];
    const message = {
      id: "msg-1",
      text: "",
      userId: "user-1",
      audience: "humans",
      kind: null,
      createdAt: "2026-11-19T12:00:00.000Z",
      attachments: [
        {
          type: "image",
          url: "https://cdn.example/meme.png",
          thumbUrl: null,
          name: "meme.png",
        },
      ],
    };
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        return json({ message });
      },
    });

    await expect(
      agent.sendMessage({ type: "league", id: "league-1" }, "", {
        attachments: [{ type: "image", url: "https://example.com/a.png", name: "a" }],
      }),
    ).resolves.toEqual(message);
    await expect(
      agent.sendMessage({ type: "league", id: "league-1" }, "", {
        files: [{ data: new Uint8Array([1, 2, 3]), filename: "meme.png", mimeType: "image/png" }],
      }),
    ).resolves.toEqual(message);

    expect(requests[0]?.headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(await requests[0]!.text())).toEqual({
      room: { type: "league", id: "league-1" },
      text: "",
      attachments: [{ type: "image", url: "https://example.com/a.png", name: "a" }],
    });
    const contentType = requests[1]?.headers.get("content-type") ?? "";
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    const boundary = contentType.slice("multipart/form-data; boundary=".length);
    const raw = new TextDecoder().decode(await requests[1]!.arrayBuffer());
    expect(raw).toContain(`--${boundary}`);
    expect(raw).toContain('name="type"');
    expect(raw).toContain("league");
    expect(raw).toContain('filename="meme.png"');
    expect(raw).toContain("image/png");
    expect(requests[1]?.headers.get("signature")).toBeTruthy();
  });

  it("reads event odds from the signed event route", async () => {
    const requests: Request[] = [];
    const odds = {
      source: "live",
      eventName: "The RSM Classic",
      updatedAt: "2026-11-20 4:57 PM",
      deadHeats: true,
      players: [],
    };
    const agent = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        return json(odds);
      },
    });

    await expect(agent.odds("event-1")).resolves.toEqual(odds);
    const url = new URL(requests[0]?.url ?? "");
    expect(url.pathname).toBe("/api/events/event-1/odds");
    expect(url.searchParams.get("smartWallet")).toBe(SMART_WALLET);

    const broken = createCutAgent({
      privateKey: generatePrivateKey(),
      smartWallet: SMART_WALLET,
      fetch: async () => json({ players: [] }),
    });
    await expect(broken.odds("event-1")).rejects.toMatchObject({ status: 502 });
  });

  it("signs a send, then posts the user operation", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey,
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        if (requests.length === 1) {
          return json({ preparedUserOp: true, userOpHash: USER_OP_HASH, userOp: USER_OP });
        }
        return json({ ok: true, txHash: `0x${"cd".repeat(32)}`, to: SMART_WALLET, amount: "4.50" });
      },
    });

    await expect(agent.send({ to: SMART_WALLET, amount: "4.50" })).resolves.toMatchObject({
      ok: true,
      amount: "4.50",
    });
    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/api/auth/transfers");
    expect(requests[0]?.method).toBe("POST");
    const secondBody = JSON.parse(await requests[1]!.text()) as { userOpSignature: `0x${string}` };
    await expect(
      recoverMessageAddress({
        message: { raw: USER_OP_HASH },
        signature: secondBody.userOpSignature,
      }),
    ).resolves.toBe(account.address);
    await expect(agent.send({ to: "not-an-address", amount: "1" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("signs the yield enable digest, then the user operation", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const enableHash = `0x${"ef".repeat(32)}` as Hex;
    const requests: Request[] = [];
    const agent = createCutAgent({
      privateKey,
      smartWallet: SMART_WALLET,
      fetch: async (request) => {
        requests.push(request.clone());
        if (requests.length === 1) return json({ enableHash });
        if (requests.length === 2) {
          return json({ preparedUserOp: true, userOpHash: USER_OP_HASH, userOp: USER_OP });
        }
        return json({ ok: true, yielded: true });
      },
    });

    await expect(agent.yield()).resolves.toBeUndefined();
    expect(new URL(requests[0]?.url ?? "").pathname).toBe("/api/auth/yield");
    const enableBody = JSON.parse(await requests[1]!.text()) as { enableSignature: Hex };
    await expect(recoverAddress({ hash: enableHash, signature: enableBody.enableSignature })).resolves.toBe(
      account.address,
    );
    const signed = JSON.parse(await requests[2]!.text()) as { userOpSignature: Hex; enableSignature: Hex };
    expect(signed.enableSignature).toBe(enableBody.enableSignature);
    await expect(
      recoverMessageAddress({ message: { raw: USER_OP_HASH }, signature: signed.userOpSignature }),
    ).resolves.toBe(account.address);
  });
});

describe("generateDelegateKey", () => {
  it("returns a key and the address a user pastes in Settings", () => {
    const key = generateDelegateKey();
    expect(key.address).toBe(privateKeyToAccount(key.privateKey).address);
  });
});
