-- CreateTable
CREATE TABLE "BotRequestNonce" (
    "key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotRequestNonce_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "BotRequestNonce_expiresAt_idx" ON "BotRequestNonce"("expiresAt");
