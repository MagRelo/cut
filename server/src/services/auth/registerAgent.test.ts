import { getAddress } from "viem";
import { kernelWalletAddress } from "@playthecut/agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueWallet, updateWallet, findFirstUser, createUser, updateUser, referralCode } =
  vi.hoisted(() => ({
    findUniqueWallet: vi.fn(),
    updateWallet: vi.fn(),
    findFirstUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    referralCode: vi.fn(),
  }));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    userWallet: { findUnique: findUniqueWallet, update: updateWallet },
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
const KERNEL = kernelWalletAddress(SIGNER, 84532).toLowerCase();

function walletRow(publicKey: string) {
  return {
    publicKey,
    user: {
      id: "agent-1",
      email: "first@example.com",
      userType: "AGENT",
      name: "Ada",
      referralCode: "ABCD2345",
    },
  };
}

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
      smartWallet: KERNEL,
    });
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "agent@example.com",
          userType: "AGENT",
          name: "Ada",
          wallets: {
            create: {
              chainId: 84532,
              publicKey: KERNEL,
              isPrimary: true,
            },
          },
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

  it("returns the existing Kernel account without changing the email", async () => {
    findUniqueWallet.mockImplementation(async ({ where }: { where: { chainId_publicKey: { publicKey: string } } }) => {
      return where.chainId_publicKey.publicKey === KERNEL ? walletRow(KERNEL) : null;
    });
    const account = await registerAgentAccount({
      signer: SIGNER,
      chainId: 84532,
      email: "second@example.com",
    });
    expect(account).toMatchObject({
      email: "first@example.com",
      userType: "AGENT",
      smartWallet: KERNEL,
      created: false,
    });
    expect(updateWallet).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("points an owner-key wallet row at the Kernel address", async () => {
    findUniqueWallet.mockImplementation(async ({ where }: { where: { chainId_publicKey: { publicKey: string } } }) => {
      return where.chainId_publicKey.publicKey === SIGNER.toLowerCase()
        ? walletRow(SIGNER.toLowerCase())
        : null;
    });
    const account = await registerAgentAccount({
      signer: SIGNER,
      chainId: 84532,
      email: "second@example.com",
    });
    expect(account).toMatchObject({ smartWallet: KERNEL, created: false });
    expect(updateWallet).toHaveBeenCalledWith({
      where: { chainId_publicKey: { chainId: 84532, publicKey: SIGNER.toLowerCase() } },
      data: { publicKey: KERNEL },
    });
    expect(createUser).not.toHaveBeenCalled();
  });
});
