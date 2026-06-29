/**
 * Phase 9 — migrate production legacy schema → v4 platform schema.
 *
 * Reads from LEGACY_DATABASE_URL (Tournament / Player / … tables) and writes to
 * DATABASE_URL (CompetitionEvent / Participant / Lineup / …). Preserves primary
 * keys and on-chain invariants: Contest.address, ContestLineup.entryId,
 * ContestSecondaryParticipant.entryId.
 *
 * Prerequisites:
 *   - Target DB has platform schema (`pnpm --filter server run prisma:migrate`)
 *   - Target DB seeded or empty (`pnpm --filter server run prisma:seed` for Sport row)
 *   - Legacy DB is a prod snapshot (or local legacy volume)
 *
 * Run:
 *   pnpm --filter server run script:migrate-from-legacy -- --dry-run
 *   pnpm --filter server run script:migrate-from-legacy -- --apply
 *   pnpm --filter server run script:migrate-from-legacy -- --validate
 *
 * Optional flags:
 *   --force          Allow apply when target already has migrated rows
 *   --legacy-url=... Override LEGACY_DATABASE_URL
 */

import "dotenv/config";
import { Prisma, PrismaClient, SideBetMarketStatus, SideBetTicketStatus } from "@prisma/client";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

const PGA_GOLF_ROSTER_RULES = {
  slotCount: 4,
  minPicks: 0,
  maxPicks: 4,
  allowDuplicates: false,
};

const PGA_GOLF_SCORING_RULES = {
  aggregation: "sum",
  direction: "higher_wins",
};

// ---------------------------------------------------------------------------
// Legacy row types (legacy Prisma schema on main)
// ---------------------------------------------------------------------------

interface LegacyUser {
  id: string;
  privyUserId: string | null;
  email: string | null;
  phone: string | null;
  password: string | null;
  name: string;
  userType: string;
  createdAt: Date;
  updatedAt: Date;
  settings: unknown;
  isVerified: boolean;
  lastLoginAt: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  verificationCode: string | null;
  verificationCodeExpiresAt: Date | null;
  referrerAddress: string | null;
  referralGroupId: string | null;
  referredByUserId: string | null;
  referralChainId: number | null;
  referralRecordedAt: Date | null;
  referralOnchainTxHash: string | null;
}

interface LegacyTournament {
  id: string;
  pgaTourId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  course: string;
  city: string;
  state: string;
  timezone: string;
  venue: unknown;
  purse: number | null;
  status: string;
  roundStatusDisplay: string | null;
  roundDisplay: string | null;
  currentRound: number | null;
  weather: unknown;
  beautyImage: string | null;
  cutLine: string | null;
  cutRound: string | null;
  summarySections: unknown;
  manualActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyPlayer {
  id: string;
  pga_pgaTourId: string | null;
  pga_imageUrl: string | null;
  pga_displayName: string | null;
  pga_firstName: string | null;
  pga_lastName: string | null;
  pga_shortName: string | null;
  pga_country: string | null;
  pga_countryFlag: string | null;
  pga_age: number | null;
  pga_owgr: string | null;
  pga_fedex: string | null;
  pga_performance: unknown;
  isActive: boolean;
  inField: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
}

interface LegacyTournamentPlayer {
  id: string;
  tournamentId: string;
  playerId: string;
  leaderboardPosition: string | null;
  r1: unknown;
  r2: unknown;
  r3: unknown;
  r4: unknown;
  rCurrent: unknown;
  cut: number | null;
  bonus: number | null;
  stableford: number | null;
  total: number | null;
  createdAt: Date;
  updatedAt: Date;
  leaderboardTotal: string | null;
  teeTimes: unknown;
}

interface LegacyTournamentLineup {
  id: string;
  userId: string;
  tournamentId: string;
  name: string;
  winningScorePrediction: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyTournamentLineupPlayer {
  id: string;
  tournamentLineupId: string;
  tournamentPlayerId: string;
  createdAt: Date;
}

interface LegacyContest {
  id: string;
  name: string;
  endTime: Date;
  address: string;
  chainId: number;
  tournamentId: string;
  status: string;
  userGroupId: string | null;
  description: string | null;
  settings: unknown;
  results: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyContestLineup {
  id: string;
  contestId: string;
  tournamentLineupId: string;
  userId: string;
  entryId: string | null;
  status: string;
  score: number | null;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyContestLineupTimeline {
  id: string;
  contestLineupId: string;
  contestId: string;
  timestamp: Date;
  roundNumber: number;
  score: number;
  position: number;
  sharePrice: number | null;
  createdAt: Date;
}

interface LegacySideBetMarket {
  id: string;
  tournamentLineupId: string;
  tournamentId: string;
  status: string;
  unavailableReason: string | null;
  quoteVersion: number;
  dgEventId: number | null;
  dgEventName: string | null;
  dgFieldLastUpdated: string | null;
  dgOddsLastUpdated: string | null;
  datagolfTour: string;
  lockedAt: Date | null;
  settledAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacySideBetSelection {
  id: string;
  sideBetMarketId: string;
  hitsRequired: number;
  topN: number;
  decimalOdds: number;
  americanDisplay: string;
  quoteVersion: number;
}

interface LegacySideBetTicket {
  id: string;
  sideBetMarketId: string;
  userId: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  decimalOddsAtPlacement: number;
  americanDisplayAtPlacement: string;
  quoteVersionAtPlacement: number;
  playerIds: string[];
  status: string;
  fundingTxHash: string | null;
  settlementNotes: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyEmailSendLog {
  id: string;
  kind: string;
  dedupeKey: string;
  recipientEmail: string;
  userId: string | null;
  tournamentId: string | null;
  campaignId: string | null;
  sentAt: Date;
}

interface LegacySnapshot {
  users: LegacyUser[];
  userWallets: Awaited<ReturnType<typeof readLegacyUserWallets>>;
  userGroups: Awaited<ReturnType<typeof readLegacyUserGroups>>;
  userGroupMembers: Awaited<ReturnType<typeof readLegacyUserGroupMembers>>;
  tournaments: LegacyTournament[];
  players: LegacyPlayer[];
  tournamentPlayers: LegacyTournamentPlayer[];
  tournamentLineups: LegacyTournamentLineup[];
  tournamentLineupPlayers: LegacyTournamentLineupPlayer[];
  contests: LegacyContest[];
  contestLineups: LegacyContestLineup[];
  contestLineupTimelines: LegacyContestLineupTimeline[];
  onchainPayments: Awaited<ReturnType<typeof readLegacyOnchainPayments>>;
  secondaryParticipants: Awaited<ReturnType<typeof readLegacySecondaryParticipants>>;
  sideBetMarkets: LegacySideBetMarket[];
  sideBetSelections: LegacySideBetSelection[];
  sideBetTickets: LegacySideBetTicket[];
  emailSendLogs: LegacyEmailSendLog[];
}

interface MigrationStats {
  users: number;
  userWallets: number;
  userGroups: number;
  userGroupMembers: number;
  events: number;
  participants: number;
  eventParticipants: number;
  lineups: number;
  lineupPicks: number;
  contests: number;
  contestLineups: number;
  contestLineupTimelines: number;
  onchainPayments: number;
  secondaryParticipants: number;
  sideBetMarkets: number;
  sideBetSelections: number;
  sideBetTickets: number;
  emailSendLogs: number;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const apply = argv.includes("--apply");
  const validate = argv.includes("--validate");
  const force = argv.includes("--force");
  const legacyUrlArg = argv.find((a) => a.startsWith("--legacy-url="));
  const legacyUrl = legacyUrlArg ? legacyUrlArg.split("=", 2)[1]!.trim() : undefined;

  const modeCount = [dryRun, apply, validate].filter(Boolean).length;
  if (modeCount !== 1) {
    console.error("Pass exactly one of: --dry-run | --apply | --validate");
    process.exit(1);
  }

  return { dryRun, apply, validate, force, legacyUrl };
}

function requireEnv(name: string, override?: string): string {
  const value = override?.trim() || process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name} (or --legacy-url for legacy source)`);
    process.exit(1);
  }
  return value;
}

/** Single connection — safe for managed Postgres with low connection limits. */
function appendMigrationConnectionParams(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=1&pool_timeout=60&connect_timeout=30`;
}

function createMigrationClient(url: string) {
  return new PrismaClient({
    datasourceUrl: appendMigrationConnectionParams(url),
    log: ["error"],
  });
}

async function readLegacyTable<T>(label: string, read: () => Promise<T>): Promise<T> {
  const rows = await read();
  if (Array.isArray(rows)) {
    console.log(`  ${label}: ${rows.length}`);
  } else {
    console.log(`  ${label}: done`);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Legacy reads
// ---------------------------------------------------------------------------

async function readLegacyUserWallets(legacy: PrismaClient) {
  return legacy.$queryRaw<
    {
      id: string;
      userId: string;
      chainId: number;
      publicKey: string;
      isPrimary: boolean;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >`SELECT * FROM "UserWallet" ORDER BY "id"`;
}

async function readLegacyUserGroups(legacy: PrismaClient) {
  return legacy.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      inviteCode: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >`SELECT * FROM "UserGroup" ORDER BY "id"`;
}

async function readLegacyUserGroupMembers(legacy: PrismaClient) {
  return legacy.$queryRaw<
    {
      id: string;
      userId: string;
      userGroupId: string;
      role: string;
      joinedAt: Date;
    }[]
  >`SELECT * FROM "UserGroupMember" ORDER BY "id"`;
}

async function readLegacyOnchainPayments(legacy: PrismaClient) {
  return legacy.$queryRaw<
    {
      id: string;
      kind: string;
      walletAddress: string;
      userId: string | null;
      contestId: string | null;
      chainId: number;
      tokenAddress: string;
      amountWei: string;
      transactionHash: string;
      logIndex: number | null;
      metadata: unknown;
      notifiedAt: Date | null;
      createdAt: Date;
    }[]
  >`SELECT * FROM "OnchainPayment" ORDER BY "id"`;
}

async function readLegacySecondaryParticipants(legacy: PrismaClient) {
  return legacy.$queryRaw<
    {
      id: string;
      contestId: string;
      entryId: string;
      walletAddress: string;
      userId: string | null;
      chainId: number;
      lastTransactionHash: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >`SELECT * FROM "ContestSecondaryParticipant" ORDER BY "id"`;
}

async function readLegacySnapshot(legacy: PrismaClient): Promise<LegacySnapshot> {
  // Sequential reads — Promise.all opened ~18 connections and exhausted DO Postgres limits.
  const users = await readLegacyTable("User", () =>
    legacy.$queryRaw<LegacyUser[]>`SELECT * FROM "User" ORDER BY "id"`,
  );
  const userWallets = await readLegacyTable("UserWallet", () => readLegacyUserWallets(legacy));
  const userGroups = await readLegacyTable("UserGroup", () => readLegacyUserGroups(legacy));
  const userGroupMembers = await readLegacyTable("UserGroupMember", () =>
    readLegacyUserGroupMembers(legacy),
  );
  const tournaments = await readLegacyTable("Tournament", () =>
    legacy.$queryRaw<LegacyTournament[]>`SELECT * FROM "Tournament" ORDER BY "startDate"`,
  );
  const players = await readLegacyTable("Player", () =>
    legacy.$queryRaw<LegacyPlayer[]>`SELECT * FROM "Player" ORDER BY "id"`,
  );
  const tournamentPlayers = await readLegacyTable("TournamentPlayer", () =>
    legacy.$queryRaw<LegacyTournamentPlayer[]>`SELECT * FROM "TournamentPlayer" ORDER BY "id"`,
  );
  const tournamentLineups = await readLegacyTable("TournamentLineup", () =>
    legacy.$queryRaw<LegacyTournamentLineup[]>`SELECT * FROM "TournamentLineup" ORDER BY "id"`,
  );
  const tournamentLineupPlayers = await readLegacyTable("TournamentLineupPlayer", () =>
    legacy.$queryRaw<LegacyTournamentLineupPlayer[]>`SELECT * FROM "TournamentLineupPlayer" ORDER BY "id"`,
  );
  const contests = await readLegacyTable("Contest", () =>
    legacy.$queryRaw<LegacyContest[]>`SELECT * FROM "Contest" ORDER BY "createdAt"`,
  );
  const contestLineups = await readLegacyTable("ContestLineup", () =>
    legacy.$queryRaw<LegacyContestLineup[]>`SELECT * FROM "ContestLineup" ORDER BY "id"`,
  );
  const contestLineupTimelines = await readLegacyTable("ContestLineupTimeline", () =>
    legacy.$queryRaw<LegacyContestLineupTimeline[]>`SELECT * FROM "ContestLineupTimeline" ORDER BY "id"`,
  );
  const onchainPayments = await readLegacyTable("OnchainPayment", () =>
    readLegacyOnchainPayments(legacy),
  );
  const secondaryParticipants = await readLegacyTable("ContestSecondaryParticipant", () =>
    readLegacySecondaryParticipants(legacy),
  );
  const sideBetMarkets = await readLegacyTable("SideBetMarket", () =>
    legacy.$queryRaw<LegacySideBetMarket[]>`SELECT * FROM "SideBetMarket" ORDER BY "id"`,
  );
  const sideBetSelections = await readLegacyTable("SideBetSelection", () =>
    legacy.$queryRaw<LegacySideBetSelection[]>`SELECT * FROM "SideBetSelection" ORDER BY "id"`,
  );
  const sideBetTickets = await readLegacyTable("SideBetTicket", () =>
    legacy.$queryRaw<LegacySideBetTicket[]>`SELECT * FROM "SideBetTicket" ORDER BY "id"`,
  );
  const emailSendLogs = await readLegacyTable("EmailSendLog", () =>
    legacy.$queryRaw<LegacyEmailSendLog[]>`SELECT * FROM "EmailSendLog" ORDER BY "id"`,
  );

  return {
    users,
    userWallets,
    userGroups,
    userGroupMembers,
    tournaments,
    players,
    tournamentPlayers,
    tournamentLineups,
    tournamentLineupPlayers,
    contests,
    contestLineups,
    contestLineupTimelines,
    onchainPayments,
    secondaryParticipants,
    sideBetMarkets,
    sideBetSelections,
    sideBetTickets,
    emailSendLogs,
  };
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

function tournamentToEventMetadata(t: LegacyTournament): Prisma.InputJsonValue {
  return {
    name: t.name,
    pgaTourId: t.pgaTourId,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate.toISOString(),
    course: t.course,
    city: t.city,
    state: t.state,
    timezone: t.timezone,
    venue: t.venue ?? null,
    purse: t.purse,
    status: t.status,
    roundStatusDisplay: t.roundStatusDisplay,
    roundDisplay: t.roundDisplay,
    currentRound: t.currentRound,
    weather: t.weather ?? null,
    beautyImage: t.beautyImage,
    cutLine: t.cutLine,
    cutRound: t.cutRound,
    summarySections: t.summarySections ?? null,
  };
}

function playerToParticipantMetadata(p: LegacyPlayer): Prisma.InputJsonValue {
  return {
    pgaTourId: p.pga_pgaTourId,
    imageUrl: p.pga_imageUrl,
    displayName: p.pga_displayName,
    firstName: p.pga_firstName,
    lastName: p.pga_lastName,
    shortName: p.pga_shortName,
    country: p.pga_country,
    countryFlag: p.pga_countryFlag,
    age: p.pga_age,
    owgr: p.pga_owgr,
    fedex: p.pga_fedex,
    performance: p.pga_performance ?? null,
    inField: p.inField,
    isActive: p.isActive,
    lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
  };
}

function tournamentPlayerToScoreData(tp: LegacyTournamentPlayer): Prisma.InputJsonValue {
  return {
    leaderboardPosition: tp.leaderboardPosition,
    leaderboardTotal: tp.leaderboardTotal,
    cut: tp.cut,
    bonus: tp.bonus,
    stableford: tp.stableford,
    r1: tp.r1 ?? null,
    r2: tp.r2 ?? null,
    r3: tp.r3 ?? null,
    r4: tp.r4 ?? null,
    rCurrent: tp.rCurrent ?? null,
    teeTimes: tp.teeTimes ?? null,
  };
}

function tournamentPlayerTotal(tp: LegacyTournamentPlayer): number {
  if (typeof tp.stableford === "number" && Number.isFinite(tp.stableford)) {
    return tp.stableford;
  }
  if (typeof tp.total === "number" && Number.isFinite(tp.total)) {
    return tp.total;
  }
  return 0;
}

function lineupPrediction(
  winningScorePrediction: number | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (winningScorePrediction == null) {
    return Prisma.DbNull;
  }
  return { type: "winningLineupTotal", value: winningScorePrediction };
}

function mapSideBetTicketPlayerIds(
  playerIds: string[],
  tournamentPlayerIds: Set<string>,
): { eventParticipantIds: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const eventParticipantIds: string[] = [];
  for (const playerId of playerIds) {
    if (!tournamentPlayerIds.has(playerId)) {
      warnings.push(`SideBetTicket playerId ${playerId} not found in TournamentPlayer`);
      continue;
    }
    // TournamentPlayer.id is preserved as EventParticipant.id
    eventParticipantIds.push(playerId);
  }
  eventParticipantIds.sort((a, b) => a.localeCompare(b));
  return { eventParticipantIds, warnings };
}

function snapshotStats(snapshot: LegacySnapshot): MigrationStats {
  return {
    users: snapshot.users.length,
    userWallets: snapshot.userWallets.length,
    userGroups: snapshot.userGroups.length,
    userGroupMembers: snapshot.userGroupMembers.length,
    events: snapshot.tournaments.length,
    participants: snapshot.players.length,
    eventParticipants: snapshot.tournamentPlayers.length,
    lineups: snapshot.tournamentLineups.length,
    lineupPicks: snapshot.tournamentLineupPlayers.length,
    contests: snapshot.contests.length,
    contestLineups: snapshot.contestLineups.length,
    contestLineupTimelines: snapshot.contestLineupTimelines.length,
    onchainPayments: snapshot.onchainPayments.length,
    secondaryParticipants: snapshot.secondaryParticipants.length,
    sideBetMarkets: snapshot.sideBetMarkets.length,
    sideBetSelections: snapshot.sideBetSelections.length,
    sideBetTickets: snapshot.sideBetTickets.length,
    emailSendLogs: snapshot.emailSendLogs.length,
  };
}

function printStats(label: string, stats: MigrationStats) {
  console.log(`\n${label}`);
  for (const [key, value] of Object.entries(stats)) {
    console.log(`  ${key}: ${value}`);
  }
}

// ---------------------------------------------------------------------------
// Preflight checks
// ---------------------------------------------------------------------------

async function assertLegacySchema(legacy: PrismaClient) {
  try {
    await legacy.$queryRaw`SELECT 1 FROM "Tournament" LIMIT 1`;
    await legacy.$queryRaw`SELECT 1 FROM "TournamentLineup" LIMIT 1`;
  } catch (error) {
    console.error(
      "LEGACY_DATABASE_URL does not look like a legacy schema (missing Tournament tables).",
    );
    throw error;
  }
}

async function assertPlatformSchema(target: PrismaClient) {
  try {
    await target.$queryRaw`SELECT 1 FROM "CompetitionEvent" LIMIT 1`;
    await target.$queryRaw`SELECT 1 FROM "Lineup" LIMIT 1`;
  } catch (error) {
    console.error(
      "DATABASE_URL does not look like a platform schema. Run prisma:migrate on the target first.",
    );
    throw error;
  }
}

async function assertTargetWritable(target: PrismaClient, force: boolean) {
  const [events, contests] = await Promise.all([
    target.competitionEvent.count(),
    target.contest.count(),
  ]);
  if ((events > 0 || contests > 0) && !force) {
    console.error(
      `Target DB already has data (events=${events}, contests=${contests}). ` +
        "Pass --force to apply anyway (idempotent upserts).",
    );
    process.exit(1);
  }
}

function validateSnapshot(snapshot: LegacySnapshot): string[] {
  const errors: string[] = [];
  const tournamentIds = new Set(snapshot.tournaments.map((t) => t.id));
  const lineupIds = new Set(snapshot.tournamentLineups.map((l) => l.id));
  const tournamentPlayerIds = new Set(snapshot.tournamentPlayers.map((tp) => tp.id));
  const contestIds = new Set(snapshot.contests.map((c) => c.id));

  for (const contest of snapshot.contests) {
    if (!tournamentIds.has(contest.tournamentId)) {
      errors.push(`Contest ${contest.id} references missing tournament ${contest.tournamentId}`);
    }
    if (!contest.address?.trim()) {
      errors.push(`Contest ${contest.id} has empty address`);
    }
  }

  const entryIdsByContest = new Map<string, Set<string>>();
  for (const cl of snapshot.contestLineups) {
    if (!contestIds.has(cl.contestId)) {
      errors.push(`ContestLineup ${cl.id} references missing contest ${cl.contestId}`);
    }
    if (!lineupIds.has(cl.tournamentLineupId)) {
      errors.push(
        `ContestLineup ${cl.id} references missing lineup ${cl.tournamentLineupId}`,
      );
    }
    if (cl.entryId) {
      const set = entryIdsByContest.get(cl.contestId) ?? new Set<string>();
      if (set.has(cl.entryId)) {
        errors.push(`Duplicate entryId ${cl.entryId} in contest ${cl.contestId}`);
      }
      set.add(cl.entryId);
      entryIdsByContest.set(cl.contestId, set);
    }
  }

  for (const pick of snapshot.tournamentLineupPlayers) {
    if (!lineupIds.has(pick.tournamentLineupId)) {
      errors.push(
        `TournamentLineupPlayer ${pick.id} references missing lineup ${pick.tournamentLineupId}`,
      );
    }
    if (!tournamentPlayerIds.has(pick.tournamentPlayerId)) {
      errors.push(
        `TournamentLineupPlayer ${pick.id} references missing tournamentPlayer ${pick.tournamentPlayerId}`,
      );
    }
  }

  for (const market of snapshot.sideBetMarkets) {
    if (!lineupIds.has(market.tournamentLineupId)) {
      errors.push(
        `SideBetMarket ${market.id} references missing lineup ${market.tournamentLineupId}`,
      );
    }
    if (!tournamentIds.has(market.tournamentId)) {
      errors.push(
        `SideBetMarket ${market.id} references missing tournament ${market.tournamentId}`,
      );
    }
  }

  for (const ticket of snapshot.sideBetTickets) {
    const { warnings } = mapSideBetTicketPlayerIds(ticket.playerIds, tournamentPlayerIds);
    for (const w of warnings) {
      errors.push(`SideBetTicket ${ticket.id}: ${w}`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Apply migration
// ---------------------------------------------------------------------------

async function seedSport(target: PrismaClient) {
  await target.sport.upsert({
    where: { id: PGA_GOLF_SPORT_ID },
    create: {
      id: PGA_GOLF_SPORT_ID,
      name: "PGA Tour Fantasy",
      slug: "golf",
      isEnabled: true,
      rosterRules: PGA_GOLF_ROSTER_RULES,
      scoringRules: PGA_GOLF_SCORING_RULES,
    },
    update: {
      name: "PGA Tour Fantasy",
      slug: "golf",
      isEnabled: true,
      rosterRules: PGA_GOLF_ROSTER_RULES,
      scoringRules: PGA_GOLF_SCORING_RULES,
    },
  });
}

async function applyMigration(target: PrismaClient, snapshot: LegacySnapshot) {
  await seedSport(target);

  const tournamentPlayerIds = new Set(snapshot.tournamentPlayers.map((tp) => tp.id));

  await target.$transaction(async (tx) => {
    for (const user of snapshot.users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: user,
        update: user,
      });
    }

    if (snapshot.userWallets.length > 0) {
      await tx.userWallet.createMany({
        data: snapshot.userWallets,
        skipDuplicates: true,
      });
    }

    for (const group of snapshot.userGroups) {
      await tx.userGroup.upsert({
        where: { id: group.id },
        create: group,
        update: group,
      });
    }

    if (snapshot.userGroupMembers.length > 0) {
      await tx.userGroupMember.createMany({
        data: snapshot.userGroupMembers,
        skipDuplicates: true,
      });
    }

    for (const tournament of snapshot.tournaments) {
      await tx.competitionEvent.upsert({
        where: { id: tournament.id },
        create: {
          id: tournament.id,
          sportId: PGA_GOLF_SPORT_ID,
          externalId: tournament.pgaTourId,
          isActive: tournament.manualActive,
          metadata: tournamentToEventMetadata(tournament),
          createdAt: tournament.createdAt,
          updatedAt: tournament.updatedAt,
        },
        update: {
          sportId: PGA_GOLF_SPORT_ID,
          externalId: tournament.pgaTourId,
          isActive: tournament.manualActive,
          metadata: tournamentToEventMetadata(tournament),
          updatedAt: tournament.updatedAt,
        },
      });
    }

    for (const player of snapshot.players) {
      await tx.participant.upsert({
        where: { id: player.id },
        create: {
          id: player.id,
          sportId: PGA_GOLF_SPORT_ID,
          externalId: player.pga_pgaTourId,
          displayName: player.pga_displayName,
          metadata: playerToParticipantMetadata(player),
          createdAt: player.createdAt,
          updatedAt: player.updatedAt,
        },
        update: {
          sportId: PGA_GOLF_SPORT_ID,
          externalId: player.pga_pgaTourId,
          displayName: player.pga_displayName,
          metadata: playerToParticipantMetadata(player),
          updatedAt: player.updatedAt,
        },
      });
    }

    for (const tp of snapshot.tournamentPlayers) {
      await tx.eventParticipant.upsert({
        where: { id: tp.id },
        create: {
          id: tp.id,
          eventId: tp.tournamentId,
          participantId: tp.playerId,
          scoreData: tournamentPlayerToScoreData(tp),
          total: tournamentPlayerTotal(tp),
          createdAt: tp.createdAt,
          updatedAt: tp.updatedAt,
        },
        update: {
          eventId: tp.tournamentId,
          participantId: tp.playerId,
          scoreData: tournamentPlayerToScoreData(tp),
          total: tournamentPlayerTotal(tp),
          updatedAt: tp.updatedAt,
        },
      });
    }

    for (const lineup of snapshot.tournamentLineups) {
      await tx.lineup.upsert({
        where: { id: lineup.id },
        create: {
          id: lineup.id,
          userId: lineup.userId,
          eventId: lineup.tournamentId,
          name: lineup.name,
          prediction: lineupPrediction(lineup.winningScorePrediction),
          createdAt: lineup.createdAt,
          updatedAt: lineup.updatedAt,
        },
        update: {
          userId: lineup.userId,
          eventId: lineup.tournamentId,
          name: lineup.name,
          prediction: lineupPrediction(lineup.winningScorePrediction),
          updatedAt: lineup.updatedAt,
        },
      });
    }

    const picksByLineup = new Map<string, LegacyTournamentLineupPlayer[]>();
    for (const pick of snapshot.tournamentLineupPlayers) {
      const list = picksByLineup.get(pick.tournamentLineupId) ?? [];
      list.push(pick);
      picksByLineup.set(pick.tournamentLineupId, list);
    }

    for (const [lineupId, picks] of picksByLineup) {
      const ordered = [...picks].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
      );
      for (let slotIndex = 0; slotIndex < ordered.length; slotIndex++) {
        const pick = ordered[slotIndex]!;
        await tx.lineupPick.upsert({
          where: { id: pick.id },
          create: {
            id: pick.id,
            lineupId,
            eventParticipantId: pick.tournamentPlayerId,
            slotIndex,
            createdAt: pick.createdAt,
          },
          update: {
            lineupId,
            eventParticipantId: pick.tournamentPlayerId,
            slotIndex,
          },
        });
      }
    }

    for (const contest of snapshot.contests) {
      await tx.contest.upsert({
        where: { id: contest.id },
        create: {
          id: contest.id,
          name: contest.name,
          endTime: contest.endTime,
          address: contest.address,
          chainId: contest.chainId,
          eventId: contest.tournamentId,
          status: contest.status,
          userGroupId: contest.userGroupId,
          description: contest.description,
          settings: contest.settings as Prisma.InputJsonValue,
          results: contest.results as Prisma.InputJsonValue,
          createdAt: contest.createdAt,
          updatedAt: contest.updatedAt,
        },
        update: {
          name: contest.name,
          endTime: contest.endTime,
          address: contest.address,
          chainId: contest.chainId,
          eventId: contest.tournamentId,
          status: contest.status,
          userGroupId: contest.userGroupId,
          description: contest.description,
          settings: contest.settings as Prisma.InputJsonValue,
          results: contest.results as Prisma.InputJsonValue,
          updatedAt: contest.updatedAt,
        },
      });
    }

    for (const cl of snapshot.contestLineups) {
      await tx.contestLineup.upsert({
        where: { id: cl.id },
        create: {
          id: cl.id,
          contestId: cl.contestId,
          lineupId: cl.tournamentLineupId,
          userId: cl.userId,
          entryId: cl.entryId,
          status: cl.status,
          score: cl.score,
          position: cl.position,
          createdAt: cl.createdAt,
          updatedAt: cl.updatedAt,
        },
        update: {
          contestId: cl.contestId,
          lineupId: cl.tournamentLineupId,
          userId: cl.userId,
          entryId: cl.entryId,
          status: cl.status,
          score: cl.score,
          position: cl.position,
          updatedAt: cl.updatedAt,
        },
      });
    }

    if (snapshot.contestLineupTimelines.length > 0) {
      await tx.contestLineupTimeline.createMany({
        data: snapshot.contestLineupTimelines,
        skipDuplicates: true,
      });
    }

    if (snapshot.onchainPayments.length > 0) {
      await tx.onchainPayment.createMany({
        data: snapshot.onchainPayments.map((p) => ({
          ...p,
          kind: p.kind as "PRIMARY" | "SECONDARY" | "REFERRAL",
        })),
        skipDuplicates: true,
      });
    }

    if (snapshot.secondaryParticipants.length > 0) {
      await tx.contestSecondaryParticipant.createMany({
        data: snapshot.secondaryParticipants,
        skipDuplicates: true,
      });
    }

    for (const market of snapshot.sideBetMarkets) {
      await tx.sideBetMarket.upsert({
        where: { id: market.id },
        create: {
          id: market.id,
          lineupId: market.tournamentLineupId,
          eventId: market.tournamentId,
          status: market.status as SideBetMarketStatus,
          unavailableReason: market.unavailableReason,
          quoteVersion: market.quoteVersion,
          dgEventId: market.dgEventId,
          dgEventName: market.dgEventName,
          dgFieldLastUpdated: market.dgFieldLastUpdated,
          dgOddsLastUpdated: market.dgOddsLastUpdated,
          datagolfTour: market.datagolfTour,
          lockedAt: market.lockedAt,
          settledAt: market.settledAt,
          closedAt: market.closedAt,
          createdAt: market.createdAt,
          updatedAt: market.updatedAt,
        },
        update: {
          lineupId: market.tournamentLineupId,
          eventId: market.tournamentId,
          status: market.status as SideBetMarketStatus,
          unavailableReason: market.unavailableReason,
          quoteVersion: market.quoteVersion,
          dgEventId: market.dgEventId,
          dgEventName: market.dgEventName,
          dgFieldLastUpdated: market.dgFieldLastUpdated,
          dgOddsLastUpdated: market.dgOddsLastUpdated,
          datagolfTour: market.datagolfTour,
          lockedAt: market.lockedAt,
          settledAt: market.settledAt,
          closedAt: market.closedAt,
          updatedAt: market.updatedAt,
        },
      });
    }

    if (snapshot.sideBetSelections.length > 0) {
      await tx.sideBetSelection.createMany({
        data: snapshot.sideBetSelections,
        skipDuplicates: true,
      });
    }

    for (const ticket of snapshot.sideBetTickets) {
      const { eventParticipantIds } = mapSideBetTicketPlayerIds(
        ticket.playerIds,
        tournamentPlayerIds,
      );
      await tx.sideBetTicket.upsert({
        where: { id: ticket.id },
        create: {
          id: ticket.id,
          sideBetMarketId: ticket.sideBetMarketId,
          userId: ticket.userId,
          hitsRequired: ticket.hitsRequired,
          topN: ticket.topN,
          stakeAmount: ticket.stakeAmount,
          decimalOddsAtPlacement: ticket.decimalOddsAtPlacement,
          americanDisplayAtPlacement: ticket.americanDisplayAtPlacement,
          quoteVersionAtPlacement: ticket.quoteVersionAtPlacement,
          eventParticipantIds,
          status: ticket.status as SideBetTicketStatus,
          fundingTxHash: ticket.fundingTxHash,
          settlementNotes: ticket.settlementNotes as Prisma.InputJsonValue,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
        update: {
          sideBetMarketId: ticket.sideBetMarketId,
          userId: ticket.userId,
          hitsRequired: ticket.hitsRequired,
          topN: ticket.topN,
          stakeAmount: ticket.stakeAmount,
          decimalOddsAtPlacement: ticket.decimalOddsAtPlacement,
          americanDisplayAtPlacement: ticket.americanDisplayAtPlacement,
          quoteVersionAtPlacement: ticket.quoteVersionAtPlacement,
          eventParticipantIds,
          status: ticket.status as SideBetTicketStatus,
          fundingTxHash: ticket.fundingTxHash,
          settlementNotes: ticket.settlementNotes as Prisma.InputJsonValue,
          updatedAt: ticket.updatedAt,
        },
      });
    }

    for (const log of snapshot.emailSendLogs) {
      await tx.emailSendLog.upsert({
        where: { id: log.id },
        create: {
          id: log.id,
          kind: log.kind,
          dedupeKey: log.dedupeKey,
          recipientEmail: log.recipientEmail,
          userId: log.userId,
          eventId: log.tournamentId,
          campaignId: log.campaignId,
          sentAt: log.sentAt,
        },
        update: {
          kind: log.kind,
          dedupeKey: log.dedupeKey,
          recipientEmail: log.recipientEmail,
          userId: log.userId,
          eventId: log.tournamentId,
          campaignId: log.campaignId,
          sentAt: log.sentAt,
        },
      });
    }
  }, { timeout: 600_000 });
}

// ---------------------------------------------------------------------------
// Post-migration validation (legacy vs target)
// ---------------------------------------------------------------------------

interface ReconciliationReport {
  ok: boolean;
  mismatches: string[];
}

async function reconcile(
  legacy: PrismaClient,
  target: PrismaClient,
  snapshot: LegacySnapshot,
): Promise<ReconciliationReport> {
  const mismatches: string[] = [];

  const targetCounts: MigrationStats = {
    users: await target.user.count(),
    userWallets: await target.userWallet.count(),
    userGroups: await target.userGroup.count(),
    userGroupMembers: await target.userGroupMember.count(),
    events: await target.competitionEvent.count(),
    participants: await target.participant.count(),
    eventParticipants: await target.eventParticipant.count(),
    lineups: await target.lineup.count(),
    lineupPicks: await target.lineupPick.count(),
    contests: await target.contest.count(),
    contestLineups: await target.contestLineup.count(),
    contestLineupTimelines: await target.contestLineupTimeline.count(),
    onchainPayments: await target.onchainPayment.count(),
    secondaryParticipants: await target.contestSecondaryParticipant.count(),
    sideBetMarkets: await target.sideBetMarket.count(),
    sideBetSelections: await target.sideBetSelection.count(),
    sideBetTickets: await target.sideBetTicket.count(),
    emailSendLogs: await target.emailSendLog.count(),
  };

  const expected = snapshotStats(snapshot);
  for (const key of Object.keys(expected) as (keyof MigrationStats)[]) {
    if (targetCounts[key] !== expected[key]) {
      mismatches.push(`count ${key}: expected ${expected[key]}, got ${targetCounts[key]}`);
    }
  }

  const legacyContests = snapshot.contests;
  const targetContests = await target.contest.findMany({
    select: { id: true, address: true, eventId: true },
  });
  const targetById = new Map(targetContests.map((c) => [c.id, c]));

  for (const legacyContest of legacyContests) {
    const row = targetById.get(legacyContest.id);
    if (!row) {
      mismatches.push(`contest ${legacyContest.id} missing on target`);
      continue;
    }
    if (row.address !== legacyContest.address) {
      mismatches.push(
        `contest ${legacyContest.id} address mismatch: legacy=${legacyContest.address} target=${row.address}`,
      );
    }
    if (row.eventId !== legacyContest.tournamentId) {
      mismatches.push(
        `contest ${legacyContest.id} eventId mismatch: expected ${legacyContest.tournamentId}, got ${row.eventId}`,
      );
    }
  }

  const legacyEntries = snapshot.contestLineups.filter((cl) => cl.entryId);
  const targetEntries = await target.contestLineup.findMany({
    where: { entryId: { not: null } },
    select: { id: true, contestId: true, entryId: true, lineupId: true },
  });
  const targetEntryById = new Map(targetEntries.map((e) => [e.id, e]));

  for (const legacyEntry of legacyEntries) {
    const row = targetEntryById.get(legacyEntry.id);
    if (!row) {
      mismatches.push(`contestLineup ${legacyEntry.id} missing on target`);
      continue;
    }
    if (row.entryId !== legacyEntry.entryId) {
      mismatches.push(
        `contestLineup ${legacyEntry.id} entryId mismatch: legacy=${legacyEntry.entryId} target=${row.entryId}`,
      );
    }
    if (row.lineupId !== legacyEntry.tournamentLineupId) {
      mismatches.push(
        `contestLineup ${legacyEntry.id} lineupId mismatch: expected ${legacyEntry.tournamentLineupId}, got ${row.lineupId}`,
      );
    }
  }

  const legacySecondary = await legacy.$queryRaw<
    { contestId: string; entryId: string; walletAddress: string }[]
  >`SELECT "contestId", "entryId", "walletAddress" FROM "ContestSecondaryParticipant"`;
  const targetSecondary = await target.contestSecondaryParticipant.findMany({
    select: { contestId: true, entryId: true, walletAddress: true },
  });
  const secondaryKey = (r: { contestId: string; entryId: string; walletAddress: string }) =>
    `${r.contestId}:${r.entryId}:${r.walletAddress.toLowerCase()}`;
  const targetSecondaryKeys = new Set(targetSecondary.map(secondaryKey));
  for (const row of legacySecondary) {
    if (!targetSecondaryKeys.has(secondaryKey(row))) {
      mismatches.push(
        `secondary participant missing: contest=${row.contestId} entryId=${row.entryId}`,
      );
    }
  }

  const legacyTickets = snapshot.sideBetTickets.filter((t) => t.playerIds.length > 0);
  const targetTickets = await target.sideBetTicket.findMany({
    where: { eventParticipantIds: { isEmpty: false } },
    select: { id: true, eventParticipantIds: true },
  });
  const targetTicketMap = new Map(targetTickets.map((t) => [t.id, t.eventParticipantIds]));
  const tpIds = new Set(snapshot.tournamentPlayers.map((tp) => tp.id));

  for (const ticket of legacyTickets) {
    const expectedIds = mapSideBetTicketPlayerIds(ticket.playerIds, tpIds).eventParticipantIds;
    const got = targetTicketMap.get(ticket.id);
    if (!got) {
      mismatches.push(`sideBetTicket ${ticket.id} missing eventParticipantIds on target`);
      continue;
    }
    const gotSorted = [...got].sort((a, b) => a.localeCompare(b));
    if (gotSorted.join(",") !== expectedIds.join(",")) {
      mismatches.push(
        `sideBetTicket ${ticket.id} participant ids mismatch: expected [${expectedIds.join(", ")}], got [${gotSorted.join(", ")}]`,
      );
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { dryRun, apply, validate, force, legacyUrl } = parseArgs();
  const legacyDatabaseUrl = requireEnv("LEGACY_DATABASE_URL", legacyUrl);
  const targetDatabaseUrl = requireEnv("DATABASE_URL");

  if (legacyDatabaseUrl === targetDatabaseUrl) {
    console.error("LEGACY_DATABASE_URL and DATABASE_URL must differ.");
    process.exit(1);
  }

  const legacy = createMigrationClient(legacyDatabaseUrl);
  const target = createMigrationClient(targetDatabaseUrl);

  try {
    await assertLegacySchema(legacy);
    await assertPlatformSchema(target);

    console.log("Reading legacy snapshot…");
    const snapshot = await readLegacySnapshot(legacy);
    printStats("Legacy row counts", snapshotStats(snapshot));

    const preflightErrors = validateSnapshot(snapshot);
    if (preflightErrors.length > 0) {
      console.error("\nPreflight validation failed:");
      for (const err of preflightErrors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log("\nPreflight validation passed.");

    const contestsWithEntryId = snapshot.contestLineups.filter((cl) => cl.entryId).length;
    console.log(
      `\nOn-chain invariants: ${snapshot.contests.length} contests (address preserved), ` +
        `${contestsWithEntryId} contest lineups with entryId`,
    );

    if (dryRun) {
      console.log("\nDry run complete — no writes performed.");
      return;
    }

    if (apply) {
      await assertTargetWritable(target, force);
      console.log("\nApplying migration to target…");
      await applyMigration(target, snapshot);
      console.log("Migration apply complete.");
    }

    console.log("\nRunning reconciliation…");
    const report = await reconcile(legacy, target, snapshot);
    if (report.ok) {
      console.log("Reconciliation passed.");
    } else {
      console.error(`Reconciliation failed (${report.mismatches.length} issues):`);
      for (const m of report.mismatches.slice(0, 50)) {
        console.error(`  - ${m}`);
      }
      if (report.mismatches.length > 50) {
        console.error(`  … and ${report.mismatches.length - 50} more`);
      }
      process.exit(1);
    }

    if (validate && !apply) {
      console.log("Validate-only run complete.");
    }
  } finally {
    await legacy.$disconnect();
    await target.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
