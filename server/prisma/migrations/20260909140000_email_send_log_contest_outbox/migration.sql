-- Contest announcement outbox: per-recipient rows with send status.
ALTER TABLE "EmailSendLog" ADD COLUMN "contestId" TEXT;
ALTER TABLE "EmailSendLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SENT';
ALTER TABLE "EmailSendLog" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailSendLog" ADD COLUMN "lastError" TEXT;
ALTER TABLE "EmailSendLog" ALTER COLUMN "sentAt" DROP NOT NULL;

CREATE INDEX "EmailSendLog_contestId_idx" ON "EmailSendLog"("contestId");
CREATE INDEX "EmailSendLog_status_idx" ON "EmailSendLog"("status");
CREATE INDEX "EmailSendLog_kind_status_idx" ON "EmailSendLog"("kind", "status");

ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
