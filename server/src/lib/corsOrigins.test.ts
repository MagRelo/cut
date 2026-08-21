import { describe, expect, it } from "vitest";
import { resolveAllowedOrigins } from "./corsOrigins.js";

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
