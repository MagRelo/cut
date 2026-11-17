import { recoverMessageAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { createCutAgent, generateDelegateKey } from "./client.js";

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
    expect(url.pathname).toBe("/api/bot/contests");
    expect(url.searchParams.get("chainId")).toBe("8453");
    expect(url.searchParams.get("smartWallet")).toBe(SMART_WALLET);
    expect(url.searchParams.get("eventId")).toBe("event-1");
    expect(request?.headers.get("signature-input")).toBeTruthy();
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

    await agent.register({ email: "agent@example.com" });
    const url = new URL(requests[0]?.url ?? "");
    expect(url.pathname).toBe("/api/auth/register");
    expect(url.search).toBe("");
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
});

describe("generateDelegateKey", () => {
  it("returns a key and the address a user pastes in Settings", () => {
    const key = generateDelegateKey();
    expect(key.address).toBe(privateKeyToAccount(key.privateKey).address);
  });
});
