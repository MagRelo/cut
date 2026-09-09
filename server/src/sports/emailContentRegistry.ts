import type { SportEmailContent } from "@cut/sport-sdk";
import { createPgaGolfEmailContent } from "./pga-golf/emailContent.js";
import { createF1EmailContent } from "./f1/emailContent.js";
import { createCommoditiesEmailContent } from "./commodities/emailContent.js";
import { createPlatformEmailContent } from "./platformEmailContent.js";

const modules: SportEmailContent[] = [
  createPgaGolfEmailContent(),
  createF1EmailContent(),
  createCommoditiesEmailContent(),
];
const bySportId = new Map(modules.map((m) => [m.sportId, m]));

export function getSportEmailContent(sportId: string): SportEmailContent | undefined {
  return bySportId.get(sportId);
}

/** Sport adapter when registered; otherwise a generic platform fallback. */
export function sportEmailContentFor(sportId: string): SportEmailContent {
  return getSportEmailContent(sportId) ?? createPlatformEmailContent(sportId);
}

export function requireSportEmailContent(sportId: string): SportEmailContent {
  return sportEmailContentFor(sportId);
}

export function listSportEmailContent(): SportEmailContent[] {
  return [...modules];
}
