-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referrerAddress" TEXT,
ADD COLUMN     "referralGroupId" TEXT,
ADD COLUMN     "referredByUserId" TEXT,
ADD COLUMN     "referralChainId" INTEGER,
ADD COLUMN     "referralRecordedAt" TIMESTAMP(3),
ADD COLUMN     "referralOnchainTxHash" TEXT;

-- CreateIndex
CREATE INDEX "User_referredByUserId_idx" ON "User"("referredByUserId");

-- CreateIndex
CREATE INDEX "User_referrerAddress_idx" ON "User"("referrerAddress");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
