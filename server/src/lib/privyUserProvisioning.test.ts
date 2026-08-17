import { beforeEach, describe, expect, it, vi } from "vitest";
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
