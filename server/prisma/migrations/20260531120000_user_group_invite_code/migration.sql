-- AlterTable
ALTER TABLE "UserGroup" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_inviteCode_key" ON "UserGroup"("inviteCode");
