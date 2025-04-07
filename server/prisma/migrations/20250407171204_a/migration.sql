-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_tournamentId_key" ON "Schedule"("tournamentId");
