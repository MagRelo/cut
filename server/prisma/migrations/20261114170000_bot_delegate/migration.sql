-- CreateTable
CREATE TABLE "BotDelegate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smartWallet" TEXT NOT NULL,
    "delegateAddress" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approval" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotDelegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotDelegate_userId_delegateAddress_key" ON "BotDelegate"("userId", "delegateAddress");

-- CreateIndex
CREATE INDEX "BotDelegate_userId_idx" ON "BotDelegate"("userId");

-- CreateIndex
CREATE INDEX "BotDelegate_smartWallet_delegateAddress_status_idx" ON "BotDelegate"("smartWallet", "delegateAddress", "status");

-- CreateIndex
CREATE INDEX "BotActionLog_userId_createdAt_idx" ON "BotActionLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "BotDelegate" ADD CONSTRAINT "BotDelegate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotActionLog" ADD CONSTRAINT "BotActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
