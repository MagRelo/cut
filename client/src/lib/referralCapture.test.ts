import { describe, expect, it } from "vitest";
import { parseValidRefFromSearch } from "./referralCapture";

describe("parseValidRefFromSearch", () => {
  it("accepts an 8-character alphabet code without changing case", () => {
    expect(parseValidRefFromSearch("?ref=k7xPm2Qd")).toBe("k7xPm2Qd");
    expect(parseValidRefFromSearch("?foo=1&ref=AbCdEf23")).toBe("AbCdEf23");
  });

  it("rejects 0x wallet addresses", () => {
    expect(
      parseValidRefFromSearch("?ref=0x14c110d971ef58dfeda15767a89aa3b0d9ea857e"),
    ).toBeNull();
    expect(
      parseValidRefFromSearch("?ref=0X14c110d971ef58dfeda15767a89aa3b0d9ea857e"),
    ).toBeNull();
  });

  it("rejects wrong length and invalid characters", () => {
    expect(parseValidRefFromSearch("?ref=short")).toBeNull();
    expect(parseValidRefFromSearch("?ref=k7xPm2Qd9")).toBeNull();
    expect(parseValidRefFromSearch("?ref=k7xPm2O0")).toBeNull();
    expect(parseValidRefFromSearch("?ref=")).toBeNull();
    expect(parseValidRefFromSearch("")).toBeNull();
  });
});
