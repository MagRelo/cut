-- Update User table to support new authentication system
DO $$ 
BEGIN
    -- Add new columns with default values
    ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS "phone" TEXT,
        ADD COLUMN IF NOT EXISTS "verificationCode" TEXT,
        ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

    -- Make email and password nullable
    ALTER TABLE "User" 
        ALTER COLUMN "email" DROP NOT NULL,
        ALTER COLUMN "password" DROP NOT NULL;

    -- Add unique constraint for phone
    ALTER TABLE "User" 
        ADD CONSTRAINT "User_phone_key" UNIQUE ("phone");

    -- Add indexes for better query performance
    CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
    CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
    CREATE INDEX IF NOT EXISTS "User_verificationCode_idx" ON "User"("verificationCode");

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END $$; 