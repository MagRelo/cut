import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueWallet, findFirstUser, createUser, updateUser, referralCode } = vi.hoisted(() => ({
  findUniqueWallet: vi.fn(),
  findFirstUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  referralCode: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    userWallet: { findUnique: findUniqueWallet },
    user: { findFirst: findFirstUser, create: createUser, update: updateUser },
  },
}));

vi.mock("../../utils/inviteCode.js", () => ({
  generateUniqueReferralCode: referralCode,
}));

vi.mock("../../lib/referralCode.js", () => ({
  tryResolveReferralForNewUser: vi.fn(async () => null),
}));

vi.mock("../../lib/referralConfig.js", () => ({
  parseReferralGroupIdFromEnv: () => null,
}));

vi.mock("../mintUserTokens.js", () => ({
  mintUSDCToUser: vi.fn(async () => ({ success: true })),
}));

import { ReferralProvisionError } from "../../lib/privyUserProvisioning.js";
import { registerAgentAccount } from "./registerAgent.js";

const SIGNER = getAddress("0x1111111111111111111111111111111111111111");

describe("registerAgentAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    referralCode.mockResolvedValue("ABCD2345");
    findUniqueWallet.mockResolvedValue(null);
    findFirstUser.mockResolvedValue(null);
    createUser.mockResolvedValue({
      id: "agent-1",
      email: "agent@example.com",
      userType: "AGENT",
      name: "Ada",
      referralCode: "ABCD2345",
    });
  });

  it("creates an AGENT with the email", async () => {
    const account = await registerAgentAccount({
      signer: SIGNER,
      chainId: 84532,
      email: "Agent@Example.com",
      name: "Ada",
    });
    expect(account).toMatchObject({
      userId: "agent-1",
      email: "agent@example.com",
      userType: "AGENT",
      created: true,
      smartWallet: SIGNER.toLowerCase(),
    });
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "agent@example.com",
          userType: "AGENT",
          name: "Ada",
        }),
      }),
    );
  });

  it("rejects an email that already belongs to another account", async () => {
    findFirstUser.mockResolvedValue({ id: "other" });
    await expect(
      registerAgentAccount({
        signer: SIGNER,
        chainId: 84532,
        email: "taken@example.com",
      }),
    ).rejects.toBeInstanceOf(ReferralProvisionError);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns the existing account without changing the email", async () => {
    findUniqueWallet.mockResolvedValue({
      publicKey: SIGNER.toLowerCase(),
      user: {
        id: "agent-1",
        email: "first@example.com",
        userType: "AGENT",
        name: "Ada",
        referralCode: "ABCD2345",
      },
    });
    const account = await registerAgentAccount({
      signer: SIGNER,
      chainId: 84532,
      email: "second@example.com",
    });
    expect(account).toMatchObject({
      email: "first@example.com",
      userType: "AGENT",
      created: false,
    });
    expect(updateUser).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });
});
