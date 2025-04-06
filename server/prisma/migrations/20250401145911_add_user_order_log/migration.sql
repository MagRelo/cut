-- CreateTable
CREATE TABLE "UserOrderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "orderAttemptLog" JSONB,
    "orderResultLog" JSONB,
    "hyperliquidOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserOrderLog_userId_idx" ON "UserOrderLog"("userId");

-- CreateIndex
CREATE INDEX "UserOrderLog_status_idx" ON "UserOrderLog"("status");

-- AddForeignKey
ALTER TABLE "UserOrderLog" ADD CONSTRAINT "UserOrderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
