-- CreateIndex
CREATE UNIQUE INDEX "OnchainPayment_transactionHash_logIndex_walletAddress_key" ON "OnchainPayment"("transactionHash", "logIndex", "walletAddress");
