-- AlterTable
ALTER TABLE "User" ADD COLUMN "privyUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_privyUserId_key" ON "User"("privyUserId");
