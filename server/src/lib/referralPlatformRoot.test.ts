import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

describe("assertPlatformRootNotOperator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects when the platform root is the hot operator", async () => {
    const pk = generatePrivateKey();
    const operator = privateKeyToAccount(pk).address;
    vi.stubEnv("OPERATOR_PK", pk);

    const { assertPlatformRootNotOperator } = await import("./referralPlatformRoot.js");
    expect(() => assertPlatformRootNotOperator(operator)).toThrow(
      /must differ from the operator.*must not receive those funds/i,
    );
  });

  it("accepts a distinct nonzero platform root", async () => {
    const pk = generatePrivateKey();
    vi.stubEnv("OPERATOR_PK", pk);

    const { assertPlatformRootNotOperator } = await import("./referralPlatformRoot.js");
    expect(() =>
      assertPlatformRootNotOperator("0x00000000000000000000000000000000000000aa"),
    ).not.toThrow();
  });
});

describe("parseNonzeroEvmAddress", () => {
  it("rejects REFERRAL_ROOT", async () => {
    const { parseNonzeroEvmAddress } = await import("./referralPlatformRoot.js");
    expect(() =>
      parseNonzeroEvmAddress("0x0000000000000000000000000000000000000001", "root"),
    ).toThrow(/cannot be zero or REFERRAL_ROOT/);
  });
});
