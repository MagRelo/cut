import { getAddress, zeroAddress, type Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readContract } = vi.hoisted(() => ({
  readContract: vi.fn(),
}));

vi.mock("../shared/contractClient.js", () => ({
  getPublicClient: () => ({ readContract }),
}));

import { readSessionKeyEnabled, sessionKeyRefusal } from "./sessionKeyEnabled.js";

const WALLET = getAddress("0x1111111111111111111111111111111111111111");
const ECDSA_SIGNER = getAddress("0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF");
const PERMISSION = "0x5a677774" as Hex;

describe("sessionKeyRefusal", () => {
  it("names an installed key that was never granted execute", () => {
    expect(sessionKeyRefusal("cannot-execute")).toBe("Session key cannot execute");
    expect(sessionKeyRefusal(false)).toBe("Session key is not enabled");
    expect(sessionKeyRefusal(true)).toBeNull();
  });
});

describe("readSessionKeyEnabled", () => {
  beforeEach(() => {
    readContract.mockReset();
  });

  it("rejects an installed session key whose execute selector is not allowed", async () => {
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "permissionConfig") return { signer: ECDSA_SIGNER };
      if (functionName === "isAllowedSelector") return false;
      throw new Error(functionName);
    });

    await expect(readSessionKeyEnabled(WALLET, PERMISSION, 8453)).resolves.toBe("cannot-execute");
    expect(readContract).toHaveBeenCalledTimes(2);
  });

  it("accepts an installed session key that can execute", async () => {
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "permissionConfig") return { signer: ECDSA_SIGNER };
      if (functionName === "isAllowedSelector") return true;
      throw new Error(functionName);
    });

    await expect(readSessionKeyEnabled(WALLET, PERMISSION, 8453)).resolves.toBe(true);
  });

  it("still allows a permission that has never been installed", async () => {
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "permissionConfig") return { signer: zeroAddress };
      if (functionName === "validationConfig") return { nonce: 0 };
      throw new Error(functionName);
    });

    await expect(readSessionKeyEnabled(WALLET, PERMISSION, 8453)).resolves.toBe(true);
  });
});
