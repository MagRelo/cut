import { describe, expect, it } from "vitest";
import {
  COMMODITY_SYNONYM_TO_CANONICAL,
  DEX_PRIORITY,
  EXCLUDED_HL_TICKERS,
  findAllowlistEntry,
} from "@cut/sport-commodities";
import type { HlPerpDex } from "./hyperliquidClient.js";
import { buildFieldSnapshot } from "./hyperliquidCatalog.js";

const MOCK_DEXES: HlPerpDex[] = [
  {
    name: "xyz",
    assetToStreamingOiCap: [
      ["xyz:GOLD", "1"],
      ["xyz:CL", "1"],
      ["xyz:SILVER", "1"],
    ],
  },
  {
    name: "flx",
    assetToStreamingOiCap: [
      ["flx:GOLD", "1"],
      ["flx:OIL", "1"],
    ],
  },
  {
    name: "vntl",
    assetToStreamingOiCap: [
      ["vntl:SOY", "1"],
      ["vntl:GOLDJM", "1"],
    ],
  },
];

function collectFromDexes(dexes: HlPerpDex[]) {
  type Resolved = { hlCoin: string; hlDex: string; ticker: string; dexRank: number };
  const best = new Map<string, Resolved>();

  for (const dex of dexes) {
    const rank = DEX_PRIORITY.indexOf(dex.name as (typeof DEX_PRIORITY)[number]);
    const dexRank = rank >= 0 ? rank : DEX_PRIORITY.length;
    for (const [hlCoin] of dex.assetToStreamingOiCap ?? []) {
      const idx = hlCoin.indexOf(":");
      if (idx <= 0) continue;
      const raw = hlCoin.slice(idx + 1).toUpperCase();
      if (EXCLUDED_HL_TICKERS.has(raw)) continue;
      const canonical = COMMODITY_SYNONYM_TO_CANONICAL[raw];
      if (!canonical || !findAllowlistEntry(canonical)) continue;
      const existing = best.get(canonical);
      if (existing && existing.dexRank <= dexRank) continue;
      best.set(canonical, { hlCoin, hlDex: hlCoin.slice(0, idx), ticker: canonical, dexRank });
    }
  }

  return best;
}

describe("hyperliquidCatalog dedup", () => {
  it("prefers xyz over flx for GOLD", () => {
    const resolved = collectFromDexes(MOCK_DEXES);
    expect(resolved.get("GOLD")?.hlCoin).toBe("xyz:GOLD");
  });

  it("maps flx OIL to canonical CL", () => {
    const resolved = collectFromDexes(MOCK_DEXES);
    expect(resolved.get("CL")?.hlCoin).toBe("xyz:CL");
  });

  it("excludes GOLDJM synonym variant", () => {
    const resolved = collectFromDexes(MOCK_DEXES);
    expect([...resolved.keys()]).not.toContain("GOLDJM");
  });

  it("does not resolve markets removed from allowlist", () => {
    const resolved = collectFromDexes(MOCK_DEXES);
    expect(resolved.get("SOY")).toBeUndefined();
  });

  it("builds field snapshot shape", () => {
    const snapshot = buildFieldSnapshot([
      {
        ticker: "GOLD",
        hlCoin: "xyz:GOLD",
        hlDex: "xyz",
        displayName: "Gold",
        sector: "precious",
        iconKey: "gold",
      },
    ]);
    expect(snapshot[0]?.ticker).toBe("GOLD");
  });
});
