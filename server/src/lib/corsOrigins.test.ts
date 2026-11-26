import { describe, expect, it } from "vitest";
import { resolveAllowedOrigins, resolveRequestOrigin } from "./corsOrigins.js";

describe("resolveAllowedOrigins", () => {
  it("defaults to localhost in development", () => {
    expect(resolveAllowedOrigins({ NODE_ENV: "development" })).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });

  it("throws in production when ALLOWED_ORIGINS is missing", () => {
    expect(() => resolveAllowedOrigins({ NODE_ENV: "production" })).toThrow(
      /ALLOWED_ORIGINS/,
    );
  });

  it("throws in production when ALLOWED_ORIGINS includes localhost", () => {
    expect(() =>
      resolveAllowedOrigins({
        NODE_ENV: "production",
        ALLOWED_ORIGINS: "https://playthecut.com,http://localhost:5173",
      }),
    ).toThrow(/localhost/);
  });

  it("returns configured origins in production", () => {
    expect(
      resolveAllowedOrigins({
        NODE_ENV: "production",
        ALLOWED_ORIGINS: "https://playthecut.com, https://www.playthecut.com",
      }),
    ).toEqual(["https://playthecut.com", "https://www.playthecut.com"]);
  });
});

const prodEnv = {
  NODE_ENV: "production",
  ALLOWED_ORIGINS: "https://playthecut.com",
};

describe("resolveRequestOrigin", () => {
  it("allows the Vite localhost origins on the paymaster route in production", () => {
    expect(resolveRequestOrigin("http://localhost:5173", "/api/paymaster", prodEnv)).toBe(
      "http://localhost:5173",
    );
    expect(resolveRequestOrigin("http://127.0.0.1:5173", "/api/paymaster", prodEnv)).toBe(
      "http://127.0.0.1:5173",
    );
  });

  it("rejects localhost on other API routes in production", () => {
    expect(resolveRequestOrigin("http://localhost:5173", "/api/auth/session", prodEnv)).toBeNull();
    expect(resolveRequestOrigin("http://127.0.0.1:5173", "/api/contests", prodEnv)).toBeNull();
  });

  it("rejects other localhost ports on the paymaster route in production", () => {
    expect(resolveRequestOrigin("http://localhost:3000", "/api/paymaster", prodEnv)).toBeNull();
  });

  it("allows a configured production origin on every API route", () => {
    expect(resolveRequestOrigin("https://playthecut.com", "/api/paymaster", prodEnv)).toBe(
      "https://playthecut.com",
    );
    expect(resolveRequestOrigin("https://playthecut.com", "/api/auth/session", prodEnv)).toBe(
      "https://playthecut.com",
    );
  });
});
