import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["error", "warn"],
});

async function main() {
  try {
    console.log("Starting main database seeding...");

    // Import and run the PGA seed script
    const seedPGAModule = await import("./seedPGA.js");
    await seedPGAModule.default();

    console.log("Main database seeding completed successfully!");
  } catch (error) {
    console.error("Error in main seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
