import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SMART_CHAIN,
  pickEvmWallet,
  resolveChainId,
  WalletConflictError,
} from "./privyUserProvisioning.js";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userWallet: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("./prisma.js", () => ({
  prisma: prismaMock,
}));

describe("resolveChainId", () => {
  it("defaults to Base Sepolia", () => {
    expect(resolveChainId()).toBe(DEFAULT_SMART_CHAIN);
    expect(resolveChainId(undefined)).toBe(DEFAULT_SMART_CHAIN);
  });

  it("accepts Base and Base Sepolia", () => {
    expect(resolveChainId(8453)).toBe(8453);
    expect(resolveChainId(84532)).toBe(84532);
  });

  it("falls back for unknown chains", () => {
    expect(resolveChainId(1)).toBe(DEFAULT_SMART_CHAIN);
  });
});

describe("pickEvmWallet", () => {
  it("prefers smart wallet over EOA", () => {
    const privyUser = {
      id: "did:privy:1",
      linked_accounts: [
        {
          type: "wallet",
          chain_type: "ethereum",
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        {
          type: "smart_wallet",
          address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
    } as Parameters<typeof pickEvmWallet>[0];

    expect(pickEvmWallet(privyUser, 84532)).toEqual({
      address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      chainId: 84532,
    });
  });
});

describe("resolveSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the Cut user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { resolveSessionUser } = await import("./privyUserProvisioning.js");

    const result = await resolveSessionUser("did:privy:missing", 84532);
    expect(result).toBeNull();
  });

  it("returns primary wallet from the database", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", userType: "USER" });
    prismaMock.userWallet.findFirst.mockResolvedValue({
      publicKey: "0xcccccccccccccccccccccccccccccccccccccccc",
    });
    const { resolveSessionUser } = await import("./privyUserProvisioning.js");

    const result = await resolveSessionUser("did:privy:1", 84532);
    expect(result).toEqual({
      userId: "user-1",
      address: "0xcccccccccccccccccccccccccccccccccccccccc",
      chainId: 84532,
      userType: "USER",
    });
  });

  it("throws when wallet is required but missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", userType: "USER" });
    prismaMock.userWallet.findFirst.mockResolvedValue(null);
    const { resolveSessionUser, WalletNotProvisionedError } = await import(
      "./privyUserProvisioning.js"
    );

    await expect(
      resolveSessionUser("did:privy:1", 84532, { requireWallet: true }),
    ).rejects.toBeInstanceOf(WalletNotProvisionedError);
  });
});

describe("syncUserWalletsForPrivyUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it("throws when a wallet belongs to another user", async () => {
    prismaMock.userWallet.findUnique.mockResolvedValue({
      userId: "other-user",
      chainId: 84532,
      publicKey: "0xdddddddddddddddddddddddddddddddddddddddd",
    });

    const privyUser = {
      id: "did:privy:1",
      linked_accounts: [
        {
          type: "smart_wallet",
          address: "0xdddddddddddddddddddddddddddddddddddddddd",
        },
      ],
    } as Parameters<typeof pickEvmWallet>[0];

    const { syncUserWalletsForPrivyUser } = await import("./privyUserProvisioning.js");

    await expect(syncUserWalletsForPrivyUser("user-1", privyUser, 84532)).rejects.toBeInstanceOf(
      WalletConflictError,
    );
  });
});

const INVITER = "0x14c110d971ef58dfeda15767a89aa3b0d9ea857e";
const INVITEE = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const GROUP_ID = `0x${"11".repeat(32)}`;

function inviterWalletRow(overrides?: {
  chainId?: number;
  wallets?: Array<{ publicKey: string; chainId: number; isPrimary: boolean }>;
}) {
  const chainId = overrides?.chainId ?? 84532;
  const wallets = overrides?.wallets ?? [
    { publicKey: INVITER, chainId, isPrimary: true },
  ];
  return {
    userId: "inviter",
    publicKey: INVITER,
    user: { wallets },
  };
}

describe("tryResolveReferralForNewUser", () => {
  const originalGroupId = process.env.REFERRAL_GROUP_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFERRAL_GROUP_ID = GROUP_ID;
  });

  afterEach(() => {
    process.env.REFERRAL_GROUP_ID = originalGroupId;
  });

  it("returns null for self-referral instead of throwing", async () => {
    const { tryResolveReferralForNewUser } = await import("./privyUserProvisioning.js");
    await expect(tryResolveReferralForNewUser(INVITEE, 84532, INVITEE)).resolves.toBeNull();
    expect(prismaMock.userWallet.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when the inviter has no Cut wallet", async () => {
    prismaMock.userWallet.findFirst.mockResolvedValue(null);
    const { tryResolveReferralForNewUser } = await import("./privyUserProvisioning.js");

    await expect(tryResolveReferralForNewUser(INVITER, 84532, INVITEE)).resolves.toBeNull();
  });

  it("attaches a Cut user found on the signup chain without a Privy or on-chain check", async () => {
    prismaMock.userWallet.findFirst.mockResolvedValueOnce(inviterWalletRow());
    const { tryResolveReferralForNewUser } = await import("./privyUserProvisioning.js");

    await expect(tryResolveReferralForNewUser(INVITER, 84532, INVITEE)).resolves.toEqual({
      referredByUserId: "inviter",
      groupIdHex: GROUP_ID,
      referrerAddress: INVITER,
    });
    expect(prismaMock.userWallet.findFirst).toHaveBeenCalledTimes(1);
  });

  it("falls back to the inviter wallet on the other Base chain", async () => {
    prismaMock.userWallet.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(inviterWalletRow({ chainId: 8453 }));
    const { tryResolveReferralForNewUser } = await import("./privyUserProvisioning.js");

    await expect(tryResolveReferralForNewUser(INVITER, 84532, INVITEE)).resolves.toEqual({
      referredByUserId: "inviter",
      groupIdHex: GROUP_ID,
      referrerAddress: INVITER,
    });
    expect(prismaMock.userWallet.findFirst).toHaveBeenCalledTimes(2);
  });

  it("parents under the inviter primary on the signup chain when the header matched a secondary wallet", async () => {
    const primary = "0xcccccccccccccccccccccccccccccccccccccccc";
    prismaMock.userWallet.findFirst.mockResolvedValueOnce(
      inviterWalletRow({
        wallets: [
          { publicKey: INVITER, chainId: 84532, isPrimary: false },
          { publicKey: primary, chainId: 84532, isPrimary: true },
        ],
      }),
    );
    const { tryResolveReferralForNewUser } = await import("./privyUserProvisioning.js");

    await expect(tryResolveReferralForNewUser(INVITER, 84532, INVITEE)).resolves.toEqual({
      referredByUserId: "inviter",
      groupIdHex: GROUP_ID,
      referrerAddress: primary,
    });
  });
});

describe("provisionUserFromPrivy referral", () => {
  const originalGroupId = process.env.REFERRAL_GROUP_ID;

  const privyUser = {
    id: "did:privy:new",
    linked_accounts: [
      { type: "smart_wallet", address: INVITEE },
      { type: "email", address: "new@example.com" },
    ],
  } as Parameters<typeof pickEvmWallet>[0];

  function stubNewUserDb() {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user" });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: "new-user" });
    prismaMock.user.findUnique.mockResolvedValue({ id: "new-user", userType: "USER" });
    prismaMock.userWallet.findUnique.mockResolvedValue(null);
    prismaMock.userWallet.create.mockResolvedValue({});
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.userWallet.findFirst.mockImplementation(async (args: { where?: { isPrimary?: boolean } }) => {
      if (args?.where?.isPrimary) {
        return { publicKey: INVITEE };
      }
      return null;
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFERRAL_GROUP_ID = GROUP_ID;
    stubNewUserDb();
  });

  afterEach(() => {
    process.env.REFERRAL_GROUP_ID = originalGroupId;
  });

  it("creates the user when the referrer is not a Cut user yet", async () => {
    const { provisionUserFromPrivy } = await import("./privyUserProvisioning.js");
    const session = await provisionUserFromPrivy(privyUser, 84532, { referrerAddress: INVITER });

    expect(session.userId).toBe("new-user");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referredByUserId: null,
          referrerAddress: null,
        }),
      }),
    );
  });

  it("creates the user when the referrer header is not a valid address", async () => {
    const { provisionUserFromPrivy } = await import("./privyUserProvisioning.js");
    await provisionUserFromPrivy(privyUser, 84532, { referrerAddress: "not-an-address" });
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it("records referredByUserId when the inviter exists only on the other Base chain", async () => {
    prismaMock.userWallet.findFirst.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
      if (args?.where?.isPrimary) {
        return { publicKey: INVITEE };
      }
      const pk = args?.where?.publicKey as { equals?: string } | string | undefined;
      const addr = typeof pk === "object" ? pk.equals : pk;
      if (addr?.toLowerCase() === INVITER) {
        if (args?.where?.chainId === 84532) return null;
        return inviterWalletRow({ chainId: 8453 });
      }
      return null;
    });

    const { provisionUserFromPrivy } = await import("./privyUserProvisioning.js");
    await provisionUserFromPrivy(privyUser, 84532, { referrerAddress: INVITER });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referredByUserId: "inviter",
          referrerAddress: INVITER,
        }),
      }),
    );
  });
});
