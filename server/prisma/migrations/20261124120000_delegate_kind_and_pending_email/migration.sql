ALTER TABLE "User" ADD COLUMN "pendingEmail" TEXT;

ALTER TABLE "BotDelegate" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'grant';

CREATE INDEX "User_pendingEmail_idx" ON "User"("pendingEmail");

CREATE UNIQUE INDEX "BotDelegate_account_key" ON "BotDelegate"("delegateAddress") WHERE kind = 'account';
