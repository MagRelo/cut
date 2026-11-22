UPDATE "BotDelegate"
SET status = 'revoked', "revokedAt" = CURRENT_TIMESTAMP
WHERE kind = 'cut_bot' AND status = 'active';

ALTER TABLE "BotDelegate" DROP COLUMN "kind";
