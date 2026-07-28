import { describe, expect, it } from "vitest";
import {
  clampPublishedDecimal,
  decimalToAmerican,
  PUBLISHED_DECIMAL_MAX,
  PUBLISHED_DECIMAL_MIN,
} from "./decimalAmerican.js";

describe("clampPublishedDecimal", () => {
  it("caps at published min and max", () => {
    expect(clampPublishedDecimal(500)).toBe(PUBLISHED_DECIMAL_MAX);
    expect(clampPublishedDecimal(1.001)).toBe(PUBLISHED_DECIMAL_MIN);
    expect(clampPublishedDecimal(5.764)).toBe(5.764);
  });

  it("maps clamped decimals to expected american display", () => {
    expect(decimalToAmerican(clampPublishedDecimal(500))).toBe("+20000");
    expect(decimalToAmerican(clampPublishedDecimal(1.001))).toBe("-10000");
  });
});
