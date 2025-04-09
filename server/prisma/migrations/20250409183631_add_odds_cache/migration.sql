-- CreateTable
CREATE TABLE "OddsCache" (
    "id" TEXT NOT NULL,
    "tournamentKey" TEXT NOT NULL,
    "bookmakers" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OddsCache_tournamentKey_bookmakers_idx" ON "OddsCache"("tournamentKey", "bookmakers");

-- CreateIndex
CREATE UNIQUE INDEX "OddsCache_tournamentKey_bookmakers_key" ON "OddsCache"("tournamentKey", "bookmakers");
