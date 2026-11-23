import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyBotRequest, resolveSignedAccount, executeYield } = vi.hoisted(() => ({
  verifyBotRequest: vi.fn(),
  resolveSignedAccount: vi.fn(),
  executeYield: vi.fn(),
}));

vi.mock("../services/bot/verifyBotRequest.js", () => ({ verifyBotRequest }));
vi.mock("../services/bot/resolveSignedAccount.js", () => ({ resolveSignedAccount }));
vi.mock("../services/bot/executeYield.js", () => ({ executeYield }));

import authRouter from "./auth.js";

const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const WALLET = getAddress("0x2222222222222222222222222222222222222222");

function request(body: unknown) {
  let verifications = 0;
  verifyBotRequest.mockImplementation(async () => {
    verifications += 1;
    if (verifications > 1) {
      return { ok: false, status: 401, error: "Action nonce has already been used" };
    }
    return { ok: true, signer: OWNER, chainId: 84532 };
  });
  return authRouter.request(`/yield?smartWallet=${WALLET}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      signature: "sig",
      "x-cut-chain-id": "84532",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /auth/yield", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSignedAccount.mockResolvedValue({
      ok: true,
      user: {
        userId: "agent-1",
        address: WALLET.toLowerCase(),
        chainId: 84532,
        userType: "AGENT",
      },
    });
  });

  it("yields with the signer auth already verified", async () => {
    const enableHash = `0x${"ab".repeat(32)}`;
    executeYield.mockResolvedValue({ ok: true, enableHash });
    const response = await request({});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enableHash });
    expect(verifyBotRequest).toHaveBeenCalledTimes(1);
    expect(executeYield).toHaveBeenCalledWith({
      chainId: 84532,
      smartWallet: WALLET.toLowerCase(),
      signer: OWNER,
    });
  });

  it("rejects a body that is not a yield step", async () => {
    const response = await request({ enableSignature: "nope" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid request body" });
    expect(executeYield).not.toHaveBeenCalled();
  });
});
