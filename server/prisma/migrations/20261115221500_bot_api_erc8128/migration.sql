-- Bot API on ERC-8128 signed requests.
-- BotActionLog is the nonce record: every bot API write inserts (signerAddress, nonce)
-- BEFORE it executes, so a replayed or concurrent duplicate fails on the unique index.
-- userId is nullable because `register` reserves its nonce before the user exists.
ALTER TABLE "BotActionLog" ADD COLUMN "nonce" TEXT;
ALTER TABLE "BotActionLog" ADD COLUMN "signerAddress" TEXT;
ALTER TABLE "BotActionLog" ALTER COLUMN "userId" DROP NOT NULL;

-- Postgres treats NULLs as distinct, so web-session rows without a nonce never collide.
CREATE UNIQUE INDEX "BotActionLog_signerAddress_nonce_key" ON "BotActionLog"("signerAddress", "nonce");
