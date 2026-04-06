-- AlterTable
ALTER TABLE "OnchainPayment" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OnchainPayment_notifiedAt_idx" ON "OnchainPayment"("notifiedAt");
