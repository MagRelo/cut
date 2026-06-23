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

async function main() {
  console.log("Seeding platform data...");

  const sport = await prisma.sport.upsert({
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

  console.log(`Seeded sport: ${sport.id} (${sport.slug})`);
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
