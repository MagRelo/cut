import { generateDelegateKey } from "@playthecut/agent";
import { Prisma } from "@prisma/client";
import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFirstDelegate,
  findFirstWallet,
  findFirstUser,
  createUser,
  updateUser,
  referralCode,
  quorumCreate,
  userCreate,
  getByCustomAuthID,
  walletGet,
} = vi.hoisted(() => ({
  findFirstDelegate: vi.fn(),
  findFirstWallet: vi.fn(),
  findFirstUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  referralCode: vi.fn(),
  quorumCreate: vi.fn(),
  userCreate: vi.fn(),
  getByCustomAuthID: vi.fn(),
  walletGet: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    botDelegate: { findFirst: findFirstDelegate },
    userWallet: { findFirst: findFirstWallet },
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

vi.mock("../../lib/privyClient.js", () => ({
  getPrivyClient: () => ({
    keyQuorums: () => ({ create: quorumCreate }),
    users: () => ({ create: userCreate, getByCustomAuthID }),
    wallets: () => ({ get: walletGet }),
  }),
}));

vi.mock("../../lib/email/transport.js", () => ({
  sendEmail: vi.fn(async () => undefined),
}));

import { ReferralProvisionError } from "../../lib/privyUserProvisioning.js";
import { registerAgentAccount } from "./registerAgent.js";

const KEY = generateDelegateKey();
const KERNEL = getAddress("0x2222222222222222222222222222222222222222");
const EMBEDDED = getAddress("0x3333333333333333333333333333333333333333");

function privyUser(email?: string) {
  return {
    id: "did:privy:agent",
    linked_accounts: [
      ...(email ? [{ type: "email", address: email }] : []),
      {
        type: "wallet",
        id: "wallet-1",
        address: EMBEDDED,
        chain_type: "ethereum",
        connector_type: "embedded",
      },
      { type: "smart_wallet", address: KERNEL },
    ],
  };
}

describe("registerAgentAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    referralCode.mockResolvedValue("ABCD2345");
    findFirstDelegate.mockResolvedValue(null);
    findFirstWallet.mockResolvedValue(null);
    findFirstUser.mockResolvedValue(null);
    getByCustomAuthID.mockRejectedValue(Object.assign(new Error("missing"), { status: 404 }));
    quorumCreate.mockResolvedValue({ id: "quorum-1" });
    userCreate.mockImplementation(async (body: { linked_accounts: { type: string; address?: string }[] }) => {
      const email = body.linked_accounts.find((account) => account.type === "email")?.address;
      return privyUser(email);
    });
    createUser.mockResolvedValue({
      id: "agent-1",
      email: null,
      userType: "AGENT",
      name: "Ada",
      referralCode: "ABCD2345",
    });
    updateUser.mockResolvedValue({});
  });

  it("creates an AGENT on the Privy smart wallet", async () => {
    const account = await registerAgentAccount({
      publicKey: KEY.publicKey,
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
    expect(quorumCreate).toHaveBeenCalledWith(
      expect.objectContaining({ public_keys: [KEY.publicKey], authorization_threshold: 1 }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_accounts: [
          { type: "custom_auth", custom_user_id: KEY.publicKey },
          { type: "email", address: "agent@example.com" },
        ],
        wallets: [
          expect.objectContaining({
            chain_type: "ethereum",
            create_smart_wallet: true,
            additional_signers: [{ signer_id: "quorum-1" }],
          }),
        ],
      }),
    );
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          privyUserId: "did:privy:agent",
          userType: "AGENT",
          email: "agent@example.com",
          wallets: {
            create: {
              chainId: 84532,
              publicKey: KERNEL.toLowerCase(),
              isPrimary: true,
            },
          },
        }),
      }),
    );
    expect(createUser.mock.calls[0]?.[0].data.wallets.create.ownerAddress).toBeUndefined();
  });

  it("rejects register without an email", async () => {
    await expect(
      registerAgentAccount({
        publicKey: KEY.publicKey,
        chainId: 84532,
        name: "Ada",
      }),
    ).rejects.toMatchObject({ status: 400, message: "A valid email is required" });
    expect(userCreate).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects an email that already belongs to another account", async () => {
    findFirstUser.mockResolvedValue({ id: "other" });
    await expect(
      registerAgentAccount({
        publicKey: KEY.publicKey,
        chainId: 84532,
        email: "taken@example.com",
      }),
    ).rejects.toBeInstanceOf(ReferralProvisionError);
    expect(createUser).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("returns the existing account for the same public key", async () => {
    findFirstDelegate.mockResolvedValue({
      status: "active",
      userId: "agent-1",
      smartWallet: KERNEL.toLowerCase(),
      user: {
        id: "agent-1",
        email: "first@example.com",
        userType: "AGENT",
        name: "Ada",
        referralCode: "ABCD2345",
      },
    });
    findFirstWallet.mockResolvedValue({ publicKey: KERNEL.toLowerCase() });
    const account = await registerAgentAccount({
      publicKey: KEY.publicKey,
      chainId: 84532,
      email: "second@example.com",
    });
    expect(account).toMatchObject({
      email: "first@example.com",
      smartWallet: KERNEL,
      created: false,
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
    expect(findFirstDelegate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: "account" }),
      }),
    );
  });

  it("opens a new account when the key is only a grant on someone else", async () => {
    findFirstDelegate.mockResolvedValue(null);
    userCreate.mockResolvedValue(privyUser("grant@example.com"));
    createUser.mockResolvedValue({
      id: "agent-2",
      email: null,
      userType: "AGENT",
      name: "Ada",
      referralCode: "ABCD2345",
    });
    const account = await registerAgentAccount({
      publicKey: KEY.publicKey,
      chainId: 84532,
      email: "grant@example.com",
    });
    expect(account).toMatchObject({
      created: true,
      userId: "agent-2",
      email: "grant@example.com",
    });
  });

  it("rejects a revoked account key", async () => {
    findFirstDelegate.mockResolvedValue({
      status: "revoked",
      userId: "agent-1",
      user: {
        id: "agent-1",
      email: null,
      userType: "AGENT",
        name: "Ada",
        referralCode: "ABCD2345",
      },
    });
    await expect(
      registerAgentAccount({ publicKey: KEY.publicKey, chainId: 84532 }),
    ).rejects.toMatchObject({ status: 409, message: "This key was revoked" });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("reuses the Privy user when the Cut row was not saved", async () => {
    getByCustomAuthID.mockResolvedValue(privyUser("ada@example.com"));
    walletGet.mockResolvedValue({ additional_signers: [{ signer_id: "quorum-existing" }] });
    const account = await registerAgentAccount({
      publicKey: KEY.publicKey,
      chainId: 84532,
      email: "ada@example.com",
    });
    expect(account).toMatchObject({ userId: "agent-1", created: true, smartWallet: KERNEL });
    expect(userCreate).not.toHaveBeenCalled();
    expect(quorumCreate).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          botDelegates: {
            create: expect.objectContaining({
              approval: expect.stringContaining("quorum-existing"),
            }),
          },
        }),
      }),
    );
  });

  it("rejects a reused Privy user that does not have this email", async () => {
    getByCustomAuthID.mockResolvedValue(privyUser());
    await expect(
      registerAgentAccount({
        publicKey: KEY.publicKey,
        chainId: 84532,
        email: "ada@example.com",
      }),
    ).rejects.toMatchObject({ status: 409, message: "This key is already registered" });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 409 when the account key insert conflicts", async () => {
    createUser.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(
      registerAgentAccount({
        publicKey: KEY.publicKey,
        chainId: 84532,
        email: "ada@example.com",
      }),
    ).rejects.toMatchObject({ status: 409, message: "This key is already registered" });
  });
});
