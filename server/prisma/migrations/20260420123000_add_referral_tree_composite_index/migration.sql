-- CreateIndex
CREATE INDEX "User_referredByUserId_referralChainId_referralGroupId_idx"
ON "User"("referredByUserId", "referralChainId", "referralGroupId");
