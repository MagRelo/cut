-- DropForeignKey
ALTER TABLE "SideBetTicket" DROP CONSTRAINT "SideBetTicket_sideBetMarketId_fkey";
ALTER TABLE "SideBetTicket" DROP CONSTRAINT "SideBetTicket_userId_fkey";
ALTER TABLE "SideBetSelection" DROP CONSTRAINT "SideBetSelection_sideBetMarketId_fkey";
ALTER TABLE "SideBetMarket" DROP CONSTRAINT "SideBetMarket_lineupId_fkey";
ALTER TABLE "SideBetMarket" DROP CONSTRAINT "SideBetMarket_eventId_fkey";

-- DropTable
DROP TABLE "SideBetTicket";
DROP TABLE "SideBetSelection";
DROP TABLE "SideBetMarket";

-- DropEnum
DROP TYPE "SideBetTicketStatus";
DROP TYPE "SideBetMarketStatus";
