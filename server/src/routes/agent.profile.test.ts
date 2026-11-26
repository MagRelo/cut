import { getAddress } from "viem";
import { kernelWalletAddress } from "@playthecut/agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyBotRequest, resolveSignedAccount, findUnique, findFirst, update, findDelegate } =
  vi.hoisted(() => ({
    verifyBotRequest: vi.fn(),
    resolveSignedAccount: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    findDelegate: vi.fn(),
  }));

vi.mock("../services/bot/verifyBotRequest.js", () => ({ verifyBotRequest }));
vi.mock("../services/bot/resolveSignedAccount.js", () => ({ resolveSignedAccount }));
vi.mock("../lib/email/transport.js", () => ({
  sendEmail: vi.fn(async () => undefined),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique, findFirst, update },
    botDelegate: { findFirst: findDelegate },
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
      pendingEmail: null,
      settings: { onboardingDismissed: false },
      privyUserId: null,
      lastLoginAt: null,
    });
    findDelegate.mockImplementation(async (args: { where: { delegateAddress: string } }) =>
      args.where.delegateAddress === OWNER ? { id: "delegate-1" } : null,
    );
    findFirst.mockResolvedValue(null);
    update.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
      settings: { onboardingDismissed: false },
    });
  });

  it("rejects a login email after the account is created", async () => {
    const response = await request(OWNER, { email: "Ada@Example.com" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Email is set when the account is created" });
    expect(update).not.toHaveBeenCalled();
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

  it("rejects email after the human has signed in", async () => {
    findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Ada",
      email: null,
      pendingEmail: null,
      settings: { onboardingDismissed: false },
      privyUserId: "did:privy:agent",
      lastLoginAt: new Date(),
    });
    const response = await request(OWNER, { email: "ada@example.com" });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "This account already has a login" });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects email after the address is already claimed", async () => {
    findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Ada",
      email: "ada@example.com",
      pendingEmail: null,
      settings: { onboardingDismissed: false },
      privyUserId: "did:privy:agent",
      lastLoginAt: null,
    });
    const response = await request(OWNER, { email: "other@example.com" });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "This account already has a login" });
  });
});
