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

const F1_ROSTER_RULES = {
  slotCount: 4,
  minPicks: 4,
  maxPicks: 4,
  allowDuplicates: false,
};

const F1_SCORING_RULES = {
  aggregation: "sum",
  direction: "higher_wins",
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
    },
    update: {
      name: "PGA Tour Fantasy",
      slug: "golf",
      isEnabled: true,
      rosterRules: PGA_GOLF_ROSTER_RULES,
      scoringRules: PGA_GOLF_SCORING_RULES,
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
    },
    update: {
      name: "Formula 1",
      slug: "f1",
      isEnabled: true,
      rosterRules: F1_ROSTER_RULES,
      scoringRules: F1_SCORING_RULES,
    },
  });

  console.log(`Seeded sport: ${f1.id} (${f1.slug})`);
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
