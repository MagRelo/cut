import { getAddress } from "viem";
import { kernelWalletAddress } from "@playthecut/agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyBotRequest, resolveSignedAccount, findUnique, findFirst, update, findWallet } =
  vi.hoisted(() => ({
    verifyBotRequest: vi.fn(),
    resolveSignedAccount: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    findWallet: vi.fn(),
  }));

vi.mock("../services/bot/verifyBotRequest.js", () => ({ verifyBotRequest }));
vi.mock("../services/bot/resolveSignedAccount.js", () => ({ resolveSignedAccount }));
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique, findFirst, update },
    userWallet: { findFirst: findWallet },
  },
}));

import agentRouter from "./agent.js";

const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const DELEGATE = getAddress("0x3333333333333333333333333333333333333333");
const KERNEL = kernelWalletAddress(OWNER, 84532);

function request(signer: string, body: unknown) {
  let verifications = 0;
  verifyBotRequest.mockImplementation(async () => {
    verifications += 1;
    if (verifications > 1) {
      return { ok: false, status: 401, error: "Action nonce has already been used" };
    }
    return { ok: true, signer, chainId: 84532 };
  });
  return agentRouter.request(`/profile?smartWallet=${KERNEL}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      signature: "sig",
      "x-cut-chain-id": "84532",
    },
    body: JSON.stringify(body),
  });
}

describe("PUT /agent/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSignedAccount.mockResolvedValue({
      ok: true,
      user: {
        userId: "agent-1",
        address: KERNEL.toLowerCase(),
        chainId: 84532,
        userType: "AGENT",
      },
    });
    findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Ada",
      email: null,
      settings: { onboardingDismissed: false },
      privyUserId: null,
    });
    findWallet.mockResolvedValue({
      publicKey: KERNEL.toLowerCase(),
      ownerAddress: OWNER.toLowerCase(),
    });
    findFirst.mockResolvedValue(null);
    update.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
      settings: { onboardingDismissed: false },
    });
  });

  it("lets the owner set the login email", async () => {
    const response = await request(OWNER, { email: "Ada@Example.com" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ email: "ada@example.com", name: "Ada" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "ada@example.com" }),
      }),
    );
  });

  it("lets a delegate set the display name and color", async () => {
    update.mockResolvedValue({
      name: "Sunday",
      email: null,
      settings: { onboardingDismissed: false, color: "#112233" },
    });
    const response = await request(DELEGATE, { name: "Sunday", color: "#112233" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Sunday", color: "#112233" });
    expect(verifyBotRequest).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Sunday" }),
      }),
    );
  });

  it("rejects a delegate setting the login email", async () => {
    const response = await request(DELEGATE, { email: "ada@example.com" });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "A delegate cannot set the login email" });
    expect(update).not.toHaveBeenCalled();
  });
});
