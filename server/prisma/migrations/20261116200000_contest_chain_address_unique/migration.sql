-- One paid contest row per contract. Null addresses (off-chain contests) stay unrestricted.
CREATE UNIQUE INDEX "Contest_chainId_address_key" ON "Contest"("chainId", "address");
