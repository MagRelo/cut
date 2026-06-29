import type { PredictionRules, RosterRules, ScoringRules } from "@cut/sport-sdk";
import { prisma } from "../../lib/prisma.js";

export type SportResponse = {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  rosterRules: RosterRules;
  scoringRules: ScoringRules;
  predictionRules: PredictionRules;
};

export async function listEnabledSports(): Promise<SportResponse[]> {
  const sports = await prisma.sport.findMany({
    where: { isEnabled: true },
    orderBy: { name: "asc" },
  });

  return sports.map((sport) => ({
    id: sport.id,
    name: sport.name,
    slug: sport.slug,
    isEnabled: sport.isEnabled,
    rosterRules: sport.rosterRules as unknown as RosterRules,
    scoringRules: sport.scoringRules as unknown as ScoringRules,
    predictionRules: sport.predictionRules as unknown as PredictionRules,
  }));
}
