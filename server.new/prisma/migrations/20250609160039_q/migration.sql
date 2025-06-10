-- DropForeignKey
ALTER TABLE "Contest" DROP CONSTRAINT "Contest_userGroupId_fkey";

-- AlterTable
ALTER TABLE "Contest" ALTER COLUMN "userGroupId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
