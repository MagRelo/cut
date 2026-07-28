import type { SportEmailContent } from "@cut/sport-sdk";
import { createPgaGolfEmailContent } from "./pga-golf/emailContent.js";

const modules: SportEmailContent[] = [createPgaGolfEmailContent()];
const bySportId = new Map(modules.map((m) => [m.sportId, m]));

export function getSportEmailContent(sportId: string): SportEmailContent | undefined {
  return bySportId.get(sportId);
}

export function requireSportEmailContent(sportId: string): SportEmailContent {
  const module = getSportEmailContent(sportId);
  if (!module) {
    throw new Error(`No email content adapter registered for sportId: ${sportId}`);
  }
  return module;
}

export function listSportEmailContent(): SportEmailContent[] {
  return [...modules];
}
