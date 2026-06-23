-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('PRIMARY', 'SECONDARY', 'REFERRAL');

-- CreateEnum
CREATE TYPE "SideBetMarketStatus" AS ENUM ('UNAVAILABLE', 'OPEN', 'LOCKED', 'SETTLING', 'SETTLED', 'VOID', 'CLOSED');

-- CreateEnum
CREATE TYPE "SideBetTicketStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'VOID', 'REFUND_PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "privyUserId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "userType" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settings" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "verificationCode" TEXT,
    "verificationCodeExpiresAt" TIMESTAMP(3),
    "referrerAddress" TEXT,
    "referralGroupId" TEXT,
    "referredByUserId" TEXT,
    "referralChainId" INTEGER,
    "referralRecordedAt" TIMESTAMP(3),
    "referralOnchainTxHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inviteCode" TEXT,
    "inviteReferrerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroupMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userGroupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rosterRules" JSONB NOT NULL,
    "scoringRules" JSONB NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEvent" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "externalId" TEXT,
    "displayName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "scoreData" JSONB,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lineup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contestId" TEXT,
    "name" TEXT NOT NULL,
    "prediction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupPick" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "eventParticipantId" TEXT NOT NULL,
    "slotIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineupPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userGroupId" TEXT,
    "description" TEXT,
    "settings" JSONB,
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestLineup" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestLineupTimeline" (
    "id" TEXT NOT NULL,
    "contestLineupId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "sharePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestLineupTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnchainPayment" (
    "id" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT,
    "contestId" TEXT,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER,
    "metadata" JSONB,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnchainPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSecondaryParticipant" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT,
    "chainId" INTEGER NOT NULL,
    "lastTransactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestSecondaryParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBetMarket" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "SideBetMarketStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "unavailableReason" TEXT,
    "quoteVersion" INTEGER NOT NULL DEFAULT 0,
    "dgEventId" INTEGER,
    "dgEventName" TEXT,
    "dgFieldLastUpdated" TEXT,
    "dgOddsLastUpdated" TEXT,
    "datagolfTour" TEXT NOT NULL DEFAULT 'pga',
    "lockedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideBetMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBetSelection" (
    "id" TEXT NOT NULL,
    "sideBetMarketId" TEXT NOT NULL,
    "hitsRequired" INTEGER NOT NULL,
    "topN" INTEGER NOT NULL,
    "decimalOdds" DOUBLE PRECISION NOT NULL,
    "americanDisplay" TEXT NOT NULL,
    "quoteVersion" INTEGER NOT NULL,

    CONSTRAINT "SideBetSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBetTicket" (
    "id" TEXT NOT NULL,
    "sideBetMarketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hitsRequired" INTEGER NOT NULL,
    "topN" INTEGER NOT NULL,
    "stakeAmount" DOUBLE PRECISION NOT NULL,
    "decimalOddsAtPlacement" DOUBLE PRECISION NOT NULL,
    "americanDisplayAtPlacement" TEXT NOT NULL,
    "quoteVersionAtPlacement" INTEGER NOT NULL,
    "eventParticipantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SideBetTicketStatus" NOT NULL DEFAULT 'OPEN',
    "fundingTxHash" TEXT,
    "settlementNotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideBetTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSendLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "userId" TEXT,
    "eventId" TEXT,
    "campaignId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_privyUserId_key" ON "User"("privyUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_verificationCode_idx" ON "User"("verificationCode");

-- CreateIndex
CREATE INDEX "User_referredByUserId_idx" ON "User"("referredByUserId");

-- CreateIndex
CREATE INDEX "User_referrerAddress_idx" ON "User"("referrerAddress");

-- CreateIndex
CREATE INDEX "User_referredByUserId_referralChainId_referralGroupId_idx" ON "User"("referredByUserId", "referralChainId", "referralGroupId");

-- CreateIndex
CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_chainId_idx" ON "UserWallet"("chainId");

-- CreateIndex
CREATE INDEX "UserWallet_publicKey_idx" ON "UserWallet"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_chainId_publicKey_key" ON "UserWallet"("chainId", "publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_inviteCode_key" ON "UserGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "UserGroup_name_idx" ON "UserGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroupMember_userId_userGroupId_key" ON "UserGroupMember"("userId", "userGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE INDEX "CompetitionEvent_sportId_isActive_idx" ON "CompetitionEvent"("sportId", "isActive");

-- CreateIndex
CREATE INDEX "CompetitionEvent_sportId_externalId_idx" ON "CompetitionEvent"("sportId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEvent_sportId_externalId_key" ON "CompetitionEvent"("sportId", "externalId");

-- CreateIndex
CREATE INDEX "Participant_sportId_idx" ON "Participant"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_sportId_externalId_key" ON "Participant"("sportId", "externalId");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_idx" ON "EventParticipant"("eventId");

-- CreateIndex
CREATE INDEX "EventParticipant_participantId_idx" ON "EventParticipant"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_participantId_key" ON "EventParticipant"("eventId", "participantId");

-- CreateIndex
CREATE INDEX "Lineup_userId_eventId_idx" ON "Lineup"("userId", "eventId");

-- CreateIndex
CREATE INDEX "Lineup_userId_eventId_contestId_idx" ON "Lineup"("userId", "eventId", "contestId");

-- CreateIndex
CREATE INDEX "LineupPick_lineupId_idx" ON "LineupPick"("lineupId");

-- CreateIndex
CREATE UNIQUE INDEX "LineupPick_lineupId_eventParticipantId_key" ON "LineupPick"("lineupId", "eventParticipantId");

-- CreateIndex
CREATE INDEX "Contest_eventId_idx" ON "Contest"("eventId");

-- CreateIndex
CREATE INDEX "Contest_userGroupId_idx" ON "Contest"("userGroupId");

-- CreateIndex
CREATE INDEX "Contest_status_idx" ON "Contest"("status");

-- CreateIndex
CREATE INDEX "Contest_chainId_idx" ON "Contest"("chainId");

-- CreateIndex
CREATE INDEX "Contest_chainId_eventId_idx" ON "Contest"("chainId", "eventId");

-- CreateIndex
CREATE INDEX "ContestLineup_contestId_idx" ON "ContestLineup"("contestId");

-- CreateIndex
CREATE INDEX "ContestLineup_userId_idx" ON "ContestLineup"("userId");

-- CreateIndex
CREATE INDEX "ContestLineup_status_idx" ON "ContestLineup"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContestLineup_contestId_lineupId_key" ON "ContestLineup"("contestId", "lineupId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestLineup_contestId_entryId_key" ON "ContestLineup"("contestId", "entryId");

-- CreateIndex
CREATE INDEX "ContestLineupTimeline_contestId_timestamp_idx" ON "ContestLineupTimeline"("contestId", "timestamp");

-- CreateIndex
CREATE INDEX "ContestLineupTimeline_contestLineupId_timestamp_idx" ON "ContestLineupTimeline"("contestLineupId", "timestamp");

-- CreateIndex
CREATE INDEX "OnchainPayment_userId_idx" ON "OnchainPayment"("userId");

-- CreateIndex
CREATE INDEX "OnchainPayment_contestId_idx" ON "OnchainPayment"("contestId");

-- CreateIndex
CREATE INDEX "OnchainPayment_transactionHash_idx" ON "OnchainPayment"("transactionHash");

-- CreateIndex
CREATE INDEX "OnchainPayment_kind_idx" ON "OnchainPayment"("kind");

-- CreateIndex
CREATE INDEX "OnchainPayment_notifiedAt_idx" ON "OnchainPayment"("notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnchainPayment_transactionHash_logIndex_walletAddress_key" ON "OnchainPayment"("transactionHash", "logIndex", "walletAddress");

-- CreateIndex
CREATE INDEX "ContestSecondaryParticipant_contestId_entryId_idx" ON "ContestSecondaryParticipant"("contestId", "entryId");

-- CreateIndex
CREATE INDEX "ContestSecondaryParticipant_walletAddress_idx" ON "ContestSecondaryParticipant"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ContestSecondaryParticipant_contestId_entryId_walletAddress_key" ON "ContestSecondaryParticipant"("contestId", "entryId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "SideBetMarket_lineupId_key" ON "SideBetMarket"("lineupId");

-- CreateIndex
CREATE INDEX "SideBetMarket_eventId_idx" ON "SideBetMarket"("eventId");

-- CreateIndex
CREATE INDEX "SideBetMarket_status_idx" ON "SideBetMarket"("status");

-- CreateIndex
CREATE INDEX "SideBetSelection_sideBetMarketId_quoteVersion_idx" ON "SideBetSelection"("sideBetMarketId", "quoteVersion");

-- CreateIndex
CREATE UNIQUE INDEX "SideBetSelection_sideBetMarketId_hitsRequired_topN_quoteVer_key" ON "SideBetSelection"("sideBetMarketId", "hitsRequired", "topN", "quoteVersion");

-- CreateIndex
CREATE INDEX "SideBetTicket_userId_idx" ON "SideBetTicket"("userId");

-- CreateIndex
CREATE INDEX "SideBetTicket_sideBetMarketId_idx" ON "SideBetTicket"("sideBetMarketId");

-- CreateIndex
CREATE INDEX "SideBetTicket_status_idx" ON "SideBetTicket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SideBetTicket_userId_fundingTxHash_key" ON "SideBetTicket"("userId", "fundingTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSendLog_dedupeKey_key" ON "EmailSendLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailSendLog_kind_idx" ON "EmailSendLog"("kind");

-- CreateIndex
CREATE INDEX "EmailSendLog_userId_idx" ON "EmailSendLog"("userId");

-- CreateIndex
CREATE INDEX "EmailSendLog_eventId_idx" ON "EmailSendLog"("eventId");

-- CreateIndex
CREATE INDEX "EmailSendLog_campaignId_idx" ON "EmailSendLog"("campaignId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEvent" ADD CONSTRAINT "CompetitionEvent_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CompetitionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CompetitionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupPick" ADD CONSTRAINT "LineupPick_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "Lineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupPick" ADD CONSTRAINT "LineupPick_eventParticipantId_fkey" FOREIGN KEY ("eventParticipantId") REFERENCES "EventParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CompetitionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineup" ADD CONSTRAINT "ContestLineup_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineup" ADD CONSTRAINT "ContestLineup_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "Lineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineup" ADD CONSTRAINT "ContestLineup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineupTimeline" ADD CONSTRAINT "ContestLineupTimeline_contestLineupId_fkey" FOREIGN KEY ("contestLineupId") REFERENCES "ContestLineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineupTimeline" ADD CONSTRAINT "ContestLineupTimeline_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnchainPayment" ADD CONSTRAINT "OnchainPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnchainPayment" ADD CONSTRAINT "OnchainPayment_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSecondaryParticipant" ADD CONSTRAINT "ContestSecondaryParticipant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSecondaryParticipant" ADD CONSTRAINT "ContestSecondaryParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetMarket" ADD CONSTRAINT "SideBetMarket_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "Lineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetMarket" ADD CONSTRAINT "SideBetMarket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CompetitionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetSelection" ADD CONSTRAINT "SideBetSelection_sideBetMarketId_fkey" FOREIGN KEY ("sideBetMarketId") REFERENCES "SideBetMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetTicket" ADD CONSTRAINT "SideBetTicket_sideBetMarketId_fkey" FOREIGN KEY ("sideBetMarketId") REFERENCES "SideBetMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetTicket" ADD CONSTRAINT "SideBetTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CompetitionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

