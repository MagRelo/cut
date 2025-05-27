-- Add missing PGA fields to Player table
ALTER TABLE "Player" 
    ADD COLUMN IF NOT EXISTS "pga_owgr" TEXT,
    ADD COLUMN IF NOT EXISTS "pga_fedex" TEXT,
    ADD COLUMN IF NOT EXISTS "pga_performance" JSONB; 