import { describe, expect, it } from "vitest";
import {
  adminDecision,
  onboardingDecision,
  protectedDecision,
  readAccess,
  type Access,
  type AccessAccount,
} from "./access";

const account: AccessAccount = {
  userType: "USER",
  settings: { onboardingDismissed: false },
};

const base = {
  privyReady: true,
  authenticated: false,
  walletAddress: null as string | null,
  account: undefined,
  accountError: null,
  accountPending: false,
};

describe("readAccess", () => {
  it("stays starting until Privy is ready", () => {
    expect(readAccess({ ...base, privyReady: false, authenticated: true })).toEqual({
      kind: "starting",
      authenticated: false,
    });
  });

  it("is anonymous when Privy is ready and signed out", () => {
    expect(readAccess(base)).toEqual({ kind: "anonymous" });
  });

  it("stays starting when authenticated but wagmi has not connected an address yet", () => {
    expect(readAccess({ ...base, authenticated: true, walletAddress: null })).toEqual({
      kind: "starting",
      authenticated: true,
    });
  });

  it("stays starting while the account query is in flight", () => {
    expect(
      readAccess({
        ...base,
        authenticated: true,
        walletAddress: "0xabc",
        accountPending: true,
      }),
    ).toEqual({ kind: "starting", authenticated: true });
  });

  it("returns the account when the query succeeded", () => {
    expect(
      readAccess({
        ...base,
        authenticated: true,
        walletAddress: "0xabc",
        account,
      }),
    ).toEqual({ kind: "account", account });
  });

  it("is blocked when the query failed", () => {
    expect(
      readAccess({
        ...base,
        authenticated: true,
        walletAddress: "0xabc",
        accountError: "This email is already linked to another account",
      }),
    ).toEqual({
      kind: "blocked",
      message: "This email is already linked to another account",
    });
  });
});

const signedIn: Access = { kind: "account", account };

describe("protectedDecision", () => {
  it("renders while access is starting or an account is open", () => {
    expect(protectedDecision({ kind: "starting", authenticated: true })).toEqual({ kind: "render" });
    expect(protectedDecision(signedIn)).toEqual({ kind: "render" });
  });

  it("sends anonymous and blocked visitors to connect", () => {
    expect(protectedDecision({ kind: "anonymous" })).toEqual({ kind: "redirect", to: "/connect" });
    expect(protectedDecision({ kind: "blocked", message: "No" })).toEqual({
      kind: "redirect",
      to: "/connect",
    });
  });
});

describe("onboardingDecision", () => {
  it("sends a new account to onboarding, except connect and onboarding", () => {
    expect(onboardingDecision(signedIn, "/contests")).toEqual({
      kind: "redirect",
      to: "/onboarding",
    });
    expect(onboardingDecision(signedIn, "/connect")).toEqual({ kind: "render" });
    expect(onboardingDecision(signedIn, "/onboarding")).toEqual({ kind: "render" });
  });

  it("does not onboard when the flag is missing", () => {
    const settled: Access = { kind: "account", account: { ...account, settings: {} } };
    expect(onboardingDecision(settled, "/contests")).toEqual({ kind: "render" });
  });

  it("waits out starting without redirecting", () => {
    expect(onboardingDecision({ kind: "starting", authenticated: true }, "/contests")).toEqual({
      kind: "render",
    });
  });
});

describe("adminDecision", () => {
  it("holds while access is starting", () => {
    expect(adminDecision({ kind: "starting", authenticated: true })).toEqual({ kind: "wait" });
  });

  it("sends anonymous and blocked visitors to connect", () => {
    expect(adminDecision({ kind: "anonymous" })).toEqual({ kind: "redirect", to: "/connect" });
    expect(adminDecision({ kind: "blocked", message: "No" })).toEqual({
      kind: "redirect",
      to: "/connect",
    });
  });

  it("keeps non-staff on account and lets staff through", () => {
    expect(adminDecision(signedIn)).toEqual({ kind: "redirect", to: "/account" });
    const staff: Access = {
      kind: "account",
      account: { ...account, userType: "ADMIN", settings: { onboardingDismissed: true } },
    };
    expect(adminDecision(staff)).toEqual({ kind: "render" });
  });
});
