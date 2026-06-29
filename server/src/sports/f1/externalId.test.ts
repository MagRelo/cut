import { describe, expect, it } from "vitest";
import { parseF1SessionExternalId } from "./externalId.js";

describe("parseF1SessionExternalId", () => {
  it("parses a positive integer session key", () => {
    expect(parseF1SessionExternalId("9558")).toBe(9558);
    expect(parseF1SessionExternalId(" 9558 ")).toBe(9558);
  });

  it("rejects slug-style externalIds", () => {
    expect(() => parseF1SessionExternalId("2024-british-gp")).toThrow(/session_key/);
  });

  it("rejects non-numeric values", () => {
    expect(() => parseF1SessionExternalId("abc")).toThrow(/session_key/);
    expect(() => parseF1SessionExternalId("0")).toThrow(/session_key/);
  });
});
