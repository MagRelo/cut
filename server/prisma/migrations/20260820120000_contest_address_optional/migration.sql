-- $0 contests are off-chain: Contest.address is null when there is no ContestController.
ALTER TABLE "Contest" ALTER COLUMN "address" DROP NOT NULL;
