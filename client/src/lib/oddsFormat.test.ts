import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  clampPublishedDecimal,
  convertOdds,
  decimalOddsFromStakeReturn,
  decimalToAmerican,
  decimalToDecimalDisplay,
  decimalToEnglishFractional,
  englishToDecimal,
  formatOddsFromDecimal,
  formatStakeReturnOdds,
  oddsToDecimal,
  PUBLISHED_DECIMAL_MAX,
  PUBLISHED_DECIMAL_MIN,
} from "./oddsFormat";

describe("clampPublishedDecimal", () => {
  it("caps at published min and max", () => {
    expect(clampPublishedDecimal(500)).toBe(PUBLISHED_DECIMAL_MAX);
    expect(clampPublishedDecimal(1.001)).toBe(PUBLISHED_DECIMAL_MIN);
    expect(clampPublishedDecimal(5.764)).toBe(5.764);
  });
});

describe("decimalToAmerican", () => {
  it("maps common values", () => {
    expect(decimalToAmerican(3)).toBe("+200");
    expect(decimalToAmerican(1.91)).toBe("-110");
    expect(decimalToAmerican(clampPublishedDecimal(500))).toBe("+20000");
    expect(decimalToAmerican(clampPublishedDecimal(1.001))).toBe("-10000");
  });
});

describe("decimalToEnglishFractional", () => {
  it("maps profit to reduced fractions", () => {
    expect(decimalToEnglishFractional(3)).toBe("2/1");
    expect(decimalToEnglishFractional(1.5)).toBe("1/2");
  });
});

describe("decimalToDecimalDisplay", () => {
  it("trims trailing zeros", () => {
    expect(decimalToDecimalDisplay(3)).toBe("3");
    expect(decimalToDecimalDisplay(1.148)).toBe("1.148");
    expect(decimalToDecimalDisplay(5.29)).toBe("5.29");
  });
});

describe("formatOddsFromDecimal", () => {
  it("formats by display type", () => {
    expect(formatOddsFromDecimal(3, "american")).toBe("+200");
    expect(formatOddsFromDecimal(3, "decimal")).toBe("3");
    expect(formatOddsFromDecimal(3, "english")).toBe("2/1");
  });
});

describe("americanToDecimal", () => {
  it("parses signed american odds", () => {
    expect(americanToDecimal("+200")).toBeCloseTo(3);
    expect(americanToDecimal("-110")).toBeCloseTo(1.909, 2);
    expect(americanToDecimal("210")).toBeCloseTo(3.1);
  });
});

describe("englishToDecimal", () => {
  it("parses fractional odds", () => {
    expect(englishToDecimal("2/1")).toBe(3);
    expect(englishToDecimal("10/11")).toBeCloseTo(1.909, 2);
  });
});

describe("convertOdds", () => {
  it("round-trips through decimal", () => {
    expect(convertOdds("+200", "american", "decimal")).toBe("3");
    expect(convertOdds("2/1", "english", "american")).toBe("+200");
    expect(convertOdds("3", "decimal", "english")).toBe("2/1");
  });

  it("reads odds from any format via oddsToDecimal", () => {
    expect(oddsToDecimal("+200", "american")).toBeCloseTo(3);
    expect(oddsToDecimal("2/1", "english")).toBe(3);
    expect(oddsToDecimal("3.00", "decimal")).toBe(3);
  });
});

describe("decimalOddsFromStakeReturn", () => {
  it("derives decimal odds from stake and total return", () => {
    expect(decimalOddsFromStakeReturn(10, 30)).toBe(3);
    expect(decimalOddsFromStakeReturn(10, 0)).toBeNull();
  });
});

describe("formatStakeReturnOdds", () => {
  it("formats stake/return pairs in the selected display format", () => {
    expect(formatStakeReturnOdds(10, 30, "american")).toBe("+200");
    expect(formatStakeReturnOdds(10, 30, "english")).toBe("2/1");
    expect(formatStakeReturnOdds(10, 30, "decimal")).toBe("3");
  });
});
