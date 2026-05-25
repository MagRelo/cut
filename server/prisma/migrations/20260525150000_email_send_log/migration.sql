-- CreateTable
CREATE TABLE "EmailSendLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "userId" TEXT,
    "tournamentId" TEXT,
    "campaignId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSendLog_dedupeKey_key" ON "EmailSendLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailSendLog_kind_idx" ON "EmailSendLog"("kind");

-- CreateIndex
CREATE INDEX "EmailSendLog_userId_idx" ON "EmailSendLog"("userId");

-- CreateIndex
CREATE INDEX "EmailSendLog_tournamentId_idx" ON "EmailSendLog"("tournamentId");

-- CreateIndex
CREATE INDEX "EmailSendLog_campaignId_idx" ON "EmailSendLog"("campaignId");

-- AddForeignKey
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
