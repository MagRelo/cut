-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('PRIMARY', 'SECONDARY', 'REFERRAL');

-- CreateTable
CREATE TABLE "OnchainPayment" (
    "id" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT,
    "contestId" TEXT,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnchainPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSecondaryParticipant" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT,
    "chainId" INTEGER NOT NULL,
    "lastTransactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestSecondaryParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnchainPayment_userId_idx" ON "OnchainPayment"("userId");

-- CreateIndex
CREATE INDEX "OnchainPayment_contestId_idx" ON "OnchainPayment"("contestId");

-- CreateIndex
CREATE INDEX "OnchainPayment_transactionHash_idx" ON "OnchainPayment"("transactionHash");

-- CreateIndex
CREATE INDEX "OnchainPayment_kind_idx" ON "OnchainPayment"("kind");

-- CreateIndex
CREATE INDEX "ContestSecondaryParticipant_contestId_entryId_idx" ON "ContestSecondaryParticipant"("contestId", "entryId");

-- CreateIndex
CREATE INDEX "ContestSecondaryParticipant_walletAddress_idx" ON "ContestSecondaryParticipant"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ContestSecondaryParticipant_contestId_entryId_walletAddress_key" ON "ContestSecondaryParticipant"("contestId", "entryId", "walletAddress");

-- AddForeignKey
ALTER TABLE "OnchainPayment" ADD CONSTRAINT "OnchainPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnchainPayment" ADD CONSTRAINT "OnchainPayment_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSecondaryParticipant" ADD CONSTRAINT "ContestSecondaryParticipant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSecondaryParticipant" ADD CONSTRAINT "ContestSecondaryParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
