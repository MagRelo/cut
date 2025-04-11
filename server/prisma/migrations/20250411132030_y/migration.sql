-- CreateTable
CREATE TABLE "SystemProcessRecord" (
    "id" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemProcessRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemProcessRecord_processType_idx" ON "SystemProcessRecord"("processType");

-- CreateIndex
CREATE INDEX "SystemProcessRecord_status_idx" ON "SystemProcessRecord"("status");

-- CreateIndex
CREATE INDEX "SystemProcessRecord_createdAt_idx" ON "SystemProcessRecord"("createdAt");
