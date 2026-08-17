import { describe, expect, it } from "vitest";
import { cacheControlForStaticPath } from "./staticCacheControl.js";

describe("cacheControlForStaticPath", () => {
  it("does not cache HTML", () => {
    expect(cacheControlForStaticPath("public/index.html")).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(cacheControlForStaticPath("./public/index.html")).toBe(
      "no-cache, no-store, must-revalidate",
    );
  });

  it("caches Vite hashed assets for a year and marks them immutable", () => {
    const expected = "public, max-age=31536000, immutable";
    expect(cacheControlForStaticPath("public/assets/index-abc123.js")).toBe(expected);
    expect(cacheControlForStaticPath("./public/assets/vendor-def456.js")).toBe(expected);
    expect(cacheControlForStaticPath("assets/index-abc123.css")).toBe(expected);
    expect(cacheControlForStaticPath("/assets/logo-xyz.png")).toBe(expected);
  });

  it("caches unhashed public files for one day", () => {
    const expected = "public, max-age=86400";
    expect(cacheControlForStaticPath("public/manifest.json")).toBe(expected);
    expect(cacheControlForStaticPath("public/logo-transparent.png")).toBe(expected);
    expect(cacheControlForStaticPath("public/commodities/avatars/gold.png")).toBe(expected);
  });
});
