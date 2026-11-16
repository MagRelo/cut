-- AlterTable: Add ERC-8128 nonce and signerAddress columns to BotActionLog
-- The unique constraint on (signerAddress, nonce) provides replay protection:
-- insert a nonce row BEFORE executing the action so concurrent replays fail.
ALTER TABLE "BotActionLog" ADD COLUMN "nonce" TEXT;
ALTER TABLE "BotActionLog" ADD COLUMN "signerAddress" TEXT;

-- CreateIndex: Unique constraint for ERC-8128 replay protection
-- Only enforced when both signerAddress and nonce are non-null
CREATE UNIQUE INDEX "BotActionLog_signerAddress_nonce_key" ON "BotActionLog"("signerAddress", "nonce");
