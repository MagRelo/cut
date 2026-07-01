import { describe, expect, it } from "vitest";
import {
  parseCommoditiesEventMetadata,
  parseCommodityParticipantMetadata,
} from "@cut/sport-commodities";

describe("commodities fieldSnapshot metadata", () => {
  it("parses frozen field snapshot on event metadata", () => {
    const parsed = parseCommoditiesEventMetadata({
      commodities: {
        sessionDate: "2026-06-30",
        sessionOpen: "2026-06-30T14:00:00.000Z",
        sessionClose: "2026-06-30T18:00:00.000Z",
        fieldSnapshot: [
          {
            ticker: "GOLD",
            hlCoin: "xyz:GOLD",
            hlDex: "xyz",
            displayName: "Gold",
            sector: "precious",
            iconKey: "gold",
          },
        ],
      },
    });

    expect(parsed?.fieldSnapshot).toHaveLength(1);
    expect(parsed?.fieldSnapshot?.[0]?.hlCoin).toBe("xyz:GOLD");
  });
});

describe("parseCommodityParticipantMetadata", () => {
  it("returns empty object for invalid input", () => {
    expect(parseCommodityParticipantMetadata(null)).toEqual({});
    expect(parseCommodityParticipantMetadata([])).toEqual({});
  });

  it("parses participant metadata object", () => {
    expect(
      parseCommodityParticipantMetadata({
        sector: "precious",
        iconKey: "gold",
        quote: { lastPrice: 2400 },
      }),
    ).toEqual({
      sector: "precious",
      iconKey: "gold",
      quote: { lastPrice: 2400 },
    });
  });
});
