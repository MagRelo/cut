import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyBotRequest, registerAgentAccount } = vi.hoisted(() => ({
  verifyBotRequest: vi.fn(),
  registerAgentAccount: vi.fn(),
}));

vi.mock("../services/bot/verifyBotRequest.js", () => ({ verifyBotRequest }));
vi.mock("../services/auth/registerAgent.js", () => ({ registerAgentAccount }));

import authRouter from "./auth.js";

const SIGNER = getAddress("0x1111111111111111111111111111111111111111");
const WALLET = getAddress("0x2222222222222222222222222222222222222222");

describe("POST /auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyBotRequest.mockResolvedValue({ ok: true, signer: SIGNER, chainId: 84532 });
  });

  it("rejects a delegate naming another wallet", async () => {
    const response = await authRouter.request(`/register?smartWallet=${WALLET}`, {
      method: "POST",
      headers: { "content-type": "application/json", signature: "sig" },
      body: JSON.stringify({ email: "agent@example.com" }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "A delegate cannot register an account" });
    expect(registerAgentAccount).not.toHaveBeenCalled();
  });
});
