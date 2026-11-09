import { describe, expect, it } from "vitest";
import { readSessionPhase, sessionPhaseIsLoading, type SessionPhaseInput } from "./sessionPhase";

function input(overrides: Partial<SessionPhaseInput> = {}): SessionPhaseInput {
  return {
    privyReady: true,
    authenticated: true,
    profileBlocked: false,
    wagmiStatus: "connected",
    hasAddress: true,
    profileError: false,
    hasUser: false,
    ...overrides,
  };
}

describe("readSessionPhase", () => {
  it("follows the session table", () => {
    expect(readSessionPhase(input({ privyReady: false }))).toBe("booting");
    expect(readSessionPhase(input({ authenticated: false, hasAddress: false }))).toBe("signedOut");
    expect(readSessionPhase(input({ profileBlocked: true, hasUser: true }))).toBe("signedOut");
    expect(
      readSessionPhase(
        input({ hasAddress: false, hasUser: false, wagmiStatus: "disconnected" }),
      ),
    ).toBe("signedOut");
    expect(
      readSessionPhase(input({ hasAddress: false, hasUser: false, wagmiStatus: "connecting" })),
    ).toBe("needsWallet");
    expect(
      readSessionPhase(input({ hasAddress: false, wagmiStatus: "reconnecting" })),
    ).toBe("needsWallet");
    expect(
      readSessionPhase(input({ hasAddress: false, wagmiStatus: "connected" })),
    ).toBe("needsWallet");
    expect(readSessionPhase(input({ profileError: true }))).toBe("sessionError");
    expect(readSessionPhase(input({ hasUser: true, profileError: true }))).toBe("ready");
    expect(readSessionPhase(input())).toBe("syncingProfile");
  });

  it("counts a connecting wallet as loading and a disconnected wallet as signed out", () => {
    const connecting = readSessionPhase(
      input({ hasAddress: false, wagmiStatus: "connecting" }),
    );
    const disconnected = readSessionPhase(
      input({ hasAddress: false, wagmiStatus: "disconnected" }),
    );

    expect(connecting).toBe("needsWallet");
    expect(sessionPhaseIsLoading(connecting)).toBe(true);
    expect(disconnected).toBe("signedOut");
    expect(sessionPhaseIsLoading(disconnected)).toBe(false);
  });

  it("treats only boot, wallet connect, and profile sync as loading", () => {
    expect(sessionPhaseIsLoading("booting")).toBe(true);
    expect(sessionPhaseIsLoading("needsWallet")).toBe(true);
    expect(sessionPhaseIsLoading("syncingProfile")).toBe(true);
    expect(sessionPhaseIsLoading("signedOut")).toBe(false);
    expect(sessionPhaseIsLoading("sessionError")).toBe(false);
    expect(sessionPhaseIsLoading("ready")).toBe(false);
  });
});
