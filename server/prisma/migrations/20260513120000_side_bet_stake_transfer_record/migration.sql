-- Drop legacy ledger table if an earlier migration revision created it.
DROP TABLE IF EXISTS "SideBetStakeTransferRecord";

ALTER TYPE "SideBetTicketStatus" ADD VALUE 'REFUND_PENDING';

ALTER TABLE "SideBetTicket" ADD COLUMN IF NOT EXISTS "fundingTxHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "SideBetTicket_userId_fundingTxHash_key" ON "SideBetTicket"("userId", "fundingTxHash");
