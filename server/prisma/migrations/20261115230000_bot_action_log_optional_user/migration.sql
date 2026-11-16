-- AlterTable: BotActionLog.userId becomes optional.
-- `register` reserves its ERC-8128 nonce (inserts the BotActionLog row) before the user exists.
ALTER TABLE "BotActionLog" ALTER COLUMN "userId" DROP NOT NULL;
