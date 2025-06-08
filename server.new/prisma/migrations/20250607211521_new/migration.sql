-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
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
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "pga_pgaTourId" TEXT,
    "pga_imageUrl" TEXT,
    "pga_displayName" TEXT,
    "pga_firstName" TEXT,
    "pga_lastName" TEXT,
    "pga_shortName" TEXT,
    "pga_country" TEXT,
    "pga_countryFlag" TEXT,
    "pga_age" INTEGER,
    "pga_owgr" TEXT,
    "pga_fedex" TEXT,
    "pga_performance" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "inField" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "pgaTourId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "course" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "venue" JSONB,
    "purse" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "roundStatusDisplay" TEXT,
    "roundDisplay" TEXT,
    "currentRound" INTEGER,
    "weather" JSONB,
    "beautyImage" TEXT,
    "cutLine" TEXT,
    "cutRound" TEXT,
    "manualActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leaderboardPosition" TEXT,
    "r1" JSONB,
    "r2" JSONB,
    "r3" JSONB,
    "r4" JSONB,
    "cut" INTEGER,
    "bonus" INTEGER,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leaderboardTotal" TEXT,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayerTimeline" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPlayerTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentLineup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentLineupPlayer" (
    "id" TEXT NOT NULL,
    "tournamentLineupId" TEXT NOT NULL,
    "tournamentPlayerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentLineupPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tournamentId" TEXT NOT NULL,
    "userGroupId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestLineup" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "tournamentLineupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestLineup_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "UserGroup_name_idx" ON "UserGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroupMember_userId_userGroupId_key" ON "UserGroupMember"("userId", "userGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_pga_pgaTourId_key" ON "Player"("pga_pgaTourId");

-- CreateIndex
CREATE INDEX "Player_pga_pgaTourId_idx" ON "Player"("pga_pgaTourId");

-- CreateIndex
CREATE INDEX "Player_isActive_idx" ON "Player"("isActive");

-- CreateIndex
CREATE INDEX "Player_inField_idx" ON "Player"("inField");

-- CreateIndex
CREATE INDEX "Tournament_pgaTourId_idx" ON "Tournament"("pgaTourId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");

-- CreateIndex
CREATE INDEX "TournamentPlayerTimeline_tournamentId_playerId_timestamp_idx" ON "TournamentPlayerTimeline"("tournamentId", "playerId", "timestamp");

-- CreateIndex
CREATE INDEX "TournamentLineup_userId_tournamentId_idx" ON "TournamentLineup"("userId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentLineupPlayer_tournamentLineupId_tournamentPlayerI_key" ON "TournamentLineupPlayer"("tournamentLineupId", "tournamentPlayerId");

-- CreateIndex
CREATE INDEX "Contest_tournamentId_idx" ON "Contest"("tournamentId");

-- CreateIndex
CREATE INDEX "Contest_userGroupId_idx" ON "Contest"("userGroupId");

-- CreateIndex
CREATE INDEX "Contest_status_idx" ON "Contest"("status");

-- CreateIndex
CREATE INDEX "ContestLineup_contestId_idx" ON "ContestLineup"("contestId");

-- CreateIndex
CREATE INDEX "ContestLineup_userId_idx" ON "ContestLineup"("userId");

-- CreateIndex
CREATE INDEX "ContestLineup_status_idx" ON "ContestLineup"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContestLineup_contestId_tournamentLineupId_key" ON "ContestLineup"("contestId", "tournamentLineupId");

-- AddForeignKey
ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayerTimeline" ADD CONSTRAINT "TournamentPlayerTimeline_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayerTimeline" ADD CONSTRAINT "TournamentPlayerTimeline_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentLineup" ADD CONSTRAINT "TournamentLineup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentLineup" ADD CONSTRAINT "TournamentLineup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentLineupPlayer" ADD CONSTRAINT "TournamentLineupPlayer_tournamentLineupId_fkey" FOREIGN KEY ("tournamentLineupId") REFERENCES "TournamentLineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentLineupPlayer" ADD CONSTRAINT "TournamentLineupPlayer_tournamentPlayerId_fkey" FOREIGN KEY ("tournamentPlayerId") REFERENCES "TournamentPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineup" ADD CONSTRAINT "ContestLineup_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineup" ADD CONSTRAINT "ContestLineup_tournamentLineupId_fkey" FOREIGN KEY ("tournamentLineupId") REFERENCES "TournamentLineup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLineup" ADD CONSTRAINT "ContestLineup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
