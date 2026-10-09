import { describe, expect, it } from "vitest";
import { isTransientProcessError } from "./betterStackHeartbeat.js";

describe("isTransientProcessError", () => {
  it("keeps the process up for a dropped commentary connection", () => {
    const error = new Error("[aborted] read ECONNRESET");
    expect(isTransientProcessError(error)).toBe(true);
    expect(
      isTransientProcessError(new TypeError("Cannot read properties of null (reading 'data')")),
    ).toBe(false);
  });
});
