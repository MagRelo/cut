import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "",
    },
  },
  log: ["error", "warn"],
});

const PGA_GOLF_ROSTER_RULES = {
  slotCount: 4,
  minPicks: 0,
  maxPicks: 4,
  allowDuplicates: false,
};

const PGA_GOLF_SCORING_RULES = {
  aggregation: "sum",
  direction: "higher_wins",
};

const PGA_GOLF_PREDICTION_RULES = {
  min: 1,
  max: 250,
  defaultRandomMin: 95,
  defaultRandomMax: 145,
  label: "Tie-Breaker",
};

const F1_ROSTER_RULES = {
  slotCount: 4,
  minPicks: 0,
  maxPicks: 4,
  allowDuplicates: false,
};

const F1_SCORING_RULES = {
  aggregation: "sum",
  direction: "higher_wins",
};

const F1_PREDICTION_RULES = {
  min: 1,
  max: 120,
  defaultRandomMin: 45,
  defaultRandomMax: 75,
  label: "Tie-Breaker (winning lineup pts)",
};

const COMMODITIES_ROSTER_RULES = {
  slotCount: 5,
  minPicks: 0,
  maxPicks: 5,
  allowDuplicates: false,
};

const COMMODITIES_SCORING_RULES = {
  aggregation: "sum",
  direction: "higher_wins",
};

const COMMODITIES_PREDICTION_RULES = {
  min: -1000,
  max: 2500,
  defaultRandomMin: 400,
  defaultRandomMax: 900,
  label: "Tie-Breaker (winning lineup pts)",
  displayScale: 10,
  step: 0.1,
};

async function main() {
  console.log("Seeding platform data...");

  const pgaGolf = await prisma.sport.upsert({
    where: { id: "pga-golf" },
    create: {
      id: "pga-golf",
      name: "PGA Tour Fantasy",
      slug: "golf",
      isEnabled: true,
      rosterRules: PGA_GOLF_ROSTER_RULES,
      scoringRules: PGA_GOLF_SCORING_RULES,
      predictionRules: PGA_GOLF_PREDICTION_RULES,
    },
    update: {
      name: "PGA Tour Fantasy",
      slug: "golf",
      isEnabled: true,
      rosterRules: PGA_GOLF_ROSTER_RULES,
      scoringRules: PGA_GOLF_SCORING_RULES,
      predictionRules: PGA_GOLF_PREDICTION_RULES,
    },
  });

  console.log(`Seeded sport: ${pgaGolf.id} (${pgaGolf.slug})`);

  const f1 = await prisma.sport.upsert({
    where: { id: "f1" },
    create: {
      id: "f1",
      name: "Formula 1",
      slug: "f1",
      isEnabled: true,
      rosterRules: F1_ROSTER_RULES,
      scoringRules: F1_SCORING_RULES,
      predictionRules: F1_PREDICTION_RULES,
    },
    update: {
      name: "Formula 1",
      slug: "f1",
      isEnabled: true,
      rosterRules: F1_ROSTER_RULES,
      scoringRules: F1_SCORING_RULES,
      predictionRules: F1_PREDICTION_RULES,
    },
  });

  console.log(`Seeded sport: ${f1.id} (${f1.slug})`);

  const commodities = await prisma.sport.upsert({
    where: { id: "commodities" },
    create: {
      id: "commodities",
      name: "Commodity Picks",
      slug: "commodities",
      isEnabled: false,
      rosterRules: COMMODITIES_ROSTER_RULES,
      scoringRules: COMMODITIES_SCORING_RULES,
      predictionRules: COMMODITIES_PREDICTION_RULES,
    },
    update: {
      name: "Commodity Picks",
      slug: "commodities",
      isEnabled: false,
      rosterRules: COMMODITIES_ROSTER_RULES,
      scoringRules: COMMODITIES_SCORING_RULES,
      predictionRules: COMMODITIES_PREDICTION_RULES,
    },
  });

  console.log(`Seeded sport: ${commodities.id} (${commodities.slug})`);
  console.log("Platform seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
