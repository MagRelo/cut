-- CreateEnum
CREATE TYPE "SideBetMarketStatus" AS ENUM ('UNAVAILABLE', 'OPEN', 'LOCKED', 'SETTLING', 'SETTLED', 'VOID', 'CLOSED');

-- CreateEnum
CREATE TYPE "SideBetTicketStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'VOID');

-- CreateTable
CREATE TABLE "SideBetMarket" (
    "id" TEXT NOT NULL,
    "tournamentLineupId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "status" "SideBetMarketStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "unavailableReason" TEXT,
    "quoteVersion" INTEGER NOT NULL DEFAULT 0,
    "dgEventId" INTEGER,
    "dgEventName" TEXT,
    "dgFieldLastUpdated" TEXT,
    "dgOddsLastUpdated" TEXT,
    "datagolfTour" TEXT NOT NULL DEFAULT 'pga',
    "lockedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideBetMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBetSelection" (
    "id" TEXT NOT NULL,
    "sideBetMarketId" TEXT NOT NULL,
    "hitsRequired" INTEGER NOT NULL,
    "topN" INTEGER NOT NULL,
    "decimalOdds" DOUBLE PRECISION NOT NULL,
    "americanDisplay" TEXT NOT NULL,
    "quoteVersion" INTEGER NOT NULL,

    CONSTRAINT "SideBetSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBetTicket" (
    "id" TEXT NOT NULL,
    "sideBetMarketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hitsRequired" INTEGER NOT NULL,
    "topN" INTEGER NOT NULL,
    "stakeAmount" DOUBLE PRECISION NOT NULL,
    "decimalOddsAtPlacement" DOUBLE PRECISION NOT NULL,
    "americanDisplayAtPlacement" TEXT NOT NULL,
    "quoteVersionAtPlacement" INTEGER NOT NULL,
    "status" "SideBetTicketStatus" NOT NULL DEFAULT 'OPEN',
    "settlementNotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideBetTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SideBetMarket_tournamentLineupId_key" ON "SideBetMarket"("tournamentLineupId");

-- CreateIndex
CREATE INDEX "SideBetMarket_tournamentId_idx" ON "SideBetMarket"("tournamentId");

-- CreateIndex
CREATE INDEX "SideBetMarket_status_idx" ON "SideBetMarket"("status");

-- CreateIndex
CREATE INDEX "SideBetSelection_sideBetMarketId_quoteVersion_idx" ON "SideBetSelection"("sideBetMarketId", "quoteVersion");

-- CreateIndex
CREATE UNIQUE INDEX "SideBetSelection_sideBetMarketId_hitsRequired_topN_quoteVer_key" ON "SideBetSelection"("sideBetMarketId", "hitsRequired", "topN", "quoteVersion");

-- CreateIndex
CREATE INDEX "SideBetTicket_userId_idx" ON "SideBetTicket"("userId");

-- CreateIndex
CREATE INDEX "SideBetTicket_sideBetMarketId_idx" ON "SideBetTicket"("sideBetMarketId");

-- CreateIndex
CREATE INDEX "SideBetTicket_status_idx" ON "SideBetTicket"("status");

-- AddForeignKey
ALTER TABLE "SideBetMarket" ADD CONSTRAINT "SideBetMarket_tournamentLineupId_fkey" FOREIGN KEY ("tournamentLineupId") REFERENCES "TournamentLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetMarket" ADD CONSTRAINT "SideBetMarket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetSelection" ADD CONSTRAINT "SideBetSelection_sideBetMarketId_fkey" FOREIGN KEY ("sideBetMarketId") REFERENCES "SideBetMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetTicket" ADD CONSTRAINT "SideBetTicket_sideBetMarketId_fkey" FOREIGN KEY ("sideBetMarketId") REFERENCES "SideBetMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetTicket" ADD CONSTRAINT "SideBetTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
