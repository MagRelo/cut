-- Add a nullable JSONB column 'settings' to the User table for flexible user settings storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='User' AND column_name='settings'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "settings" JSONB;
    END IF;
END $$; 