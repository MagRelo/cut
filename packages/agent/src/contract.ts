import { isAddress } from "viem";
import { z } from "zod";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 2000;

const hexSchema = z.string().regex(/^0x[0-9a-fA-F]*$/);
const uintSchema = z.string().regex(/^\d+$/);
const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");
const bps = z.number().int().min(0).max(10_000);

export const contestSettingsSchema = z
  .object({
    contestType: z.string().max(32).optional(),
    chainId: z.number().optional(),
    paymentTokenAddress: ethAddress.optional(),
    paymentTokenSymbol: z.string().max(16).optional(),
    operator: ethAddress.optional(),
    expiryTimestamp: z.number().optional(),
    primaryDeposit: z.number().min(0).optional(),
    referralNetworkBps: bps.optional(),
    oracleFeeBps: bps.optional(),
    referralGroupId: z.string().optional(),
    primaryDepositSecondarySubsidyBps: bps.optional(),
    primaryEntryInvestmentShareBps: bps.optional(),
    positionBonusShareBps: bps.optional(),
    targetPrimaryShareBps: bps.optional(),
    maxCrossSubsidyBps: bps.optional(),
    maxPlayers: z.number().int().positive().optional(),
    scoringType: z.enum(["STABLEFORD", "STROKE_PLAY"]).optional(),
  })
  .optional();

export const userOpSchema = z.object({
  sender: z.string().refine((value) => isAddress(value), "Invalid user operation sender"),
  nonce: uintSchema,
  callData: hexSchema,
  callGasLimit: uintSchema,
  verificationGasLimit: uintSchema,
  preVerificationGas: uintSchema,
  maxFeePerGas: uintSchema,
  maxPriorityFeePerGas: uintSchema,
  paymaster: z.string().optional(),
  paymasterData: hexSchema.optional(),
  paymasterVerificationGasLimit: uintSchema.optional(),
  paymasterPostOpGasLimit: uintSchema.optional(),
  factory: z.string().optional(),
  factoryData: hexSchema.optional(),
});

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const oddsFormatSchema = z.enum(["american", "decimal", "english"]);

export const registerSchema = z.object({
  publicKey: z
    .string()
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Invalid public key")
    .refine((value) => value.length >= 80 && value.length <= 200, "Invalid public key"),
  email: z.string("A valid email is required").trim().email("A valid email is required"),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  referralCode: z.string().trim().min(1).max(32).optional(),
  color: z.string().regex(HEX_COLOR, "Invalid color").optional(),
  oddsFormat: oddsFormatSchema.optional(),
});

export const agentProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
    color: z.string().regex(HEX_COLOR, "Invalid color").optional(),
    oddsFormat: oddsFormatSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.color !== undefined || value.oddsFormat !== undefined,
    { message: "No profile fields to update" },
  );

export const joinLeagueSchema = z.object({
  inviteCode: z.string().trim().min(1).max(32),
});

export const createLeagueSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
});

/** $0 league contest. `POST /api/contests` — no factory deploy. */
export const createFreeContestSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  eventId: z.string().cuid(),
  userGroupId: z.string().cuid(),
  endDate: z.union([z.string().datetime(), z.number()]),
  notifyLeagueMembers: z.boolean().optional(),
});

export type UserOpBody = z.infer<typeof userOpSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type AgentProfilePatch = z.infer<typeof agentProfileSchema>;
export type OddsFormat = z.infer<typeof oddsFormatSchema>;

export type BotCandidate = {
  eventParticipantId: string;
  participantId: string;
  displayName: string;
  sortKeys: Record<string, number | string>;
  metadata: unknown;
};

export type BotContest = {
  contestId: string;
  name: string;
  eventId: string;
  sportId: string;
  chainId: number;
  status: string;
  address: string | null;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: string;
  candidates: BotCandidate[];
};

export type RegisteredAgent = {
  userId: string;
  email: string | null;
  userType: string;
  name: string;
  referralCode: string;
  smartWallet: string;
  created: boolean;
};

export type AgentProfile = {
  name: string;
  email: string | null;
  color: string | null;
  oddsFormat: OddsFormat | null;
};

export type LineupResult = { ok: true; lineupId: string };
export type ContestCreated = { ok: true; contestId: string; address: string };
export type FreeContestCreated = {
  id: string;
  name: string;
  eventId: string;
  userGroupId: string;
  status: string;
};
export type ContestCard = {
  id: string;
  name: string;
  status: string;
  eventId: string;
  chainId: number;
  address: string | null;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: string;
  entryCount: number;
  pot: number | null;
  entered: boolean;
  event: {
    id: string;
    sportId: string;
    sportName: string;
    externalId: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
  };
};

export type ContestList = { contests: ContestCard[] };

export type AgentAccount = {
  userId: string;
  wallet: string;
  chainId: number;
  balanceUsdc: number | null;
  profile: AgentProfile;
  leagues: { id: string; name: string; role: string }[];
  referral: { code: string; url: string; totalEarned: number };
  entries: Record<string, number>;
};

export type LeagueJoined = {
  id: string;
  name: string;
  currentUserRole: string | null;
};

export type ScoutContest = {
  contestId: string;
  name: string;
  sportId: string;
  chainId: number;
  status: string;
  userGroupId: string | null;
  userGroupName: string | null;
  primaryDeposit: number | null;
  endTime: string;
  rosterSize: number;
  predictionRange: { min: number; max: number };
  fieldCount: number;
  alreadyEntered: false;
  event: { id: string; name: string; start: string | null; end: string | null; status: string };
  fit: string[];
};

export type ScoutBrief = {
  balanceUsdc: number | null;
  contests: ScoutContest[];
  blocked: { contestId: string; name: string; reason: string; primaryDeposit: number | null }[];
};

export type PicksBrief = {
  contest: {
    contestId: string;
    name: string;
    sportId: string;
    chainId: number;
    status: string;
    primaryDeposit: number | null;
    rosterSize: number;
    predictionRange: { min: number; max: number };
    endTime: string;
    userGroupId: string | null;
    userGroupName: string | null;
  };
  lineup: { lineupId: string; candidates: string[]; prediction: unknown } | null;
  entry: { lineupId: string; position: number | null; total: number | null } | null;
  candidates: BotCandidate[];
};

export type CompanionBrief = {
  cursor: string;
  unchanged: string[];
  updates: unknown[];
};

export type TickBrief = {
  cursor: string;
  account: { balanceUsdc: number | null };
  scout: { openAffordable: number };
  companion: { updates: unknown[]; unchanged: string[] };
  leagues: {
    needsContest: string[];
    unentered: { contestId: string; leagueId: string; missingMemberIds: string[] }[];
    settled: {
      contestId: string;
      leagueId: string;
      winnerName: string | null;
      winningTotal: number | null;
    }[];
  };
  referrals: { totalEarned: number; newMembers: number };
};

export type ReferralBrief = {
  code: string;
  url: string;
  totalEarned: number;
  recorded: boolean;
  levels: { depth: number; count: number }[];
  earnings: { contestId: string | null; amount: number; settledAt: string }[];
  recent: { name: string; depth: number; joinedAt: string }[];
};

export type LeagueSummary = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  openContests: number;
  activeContests: number;
  invite: { code: string; url: string } | null;
};

export type LeagueList = { leagues: LeagueSummary[] };

export type EventOddsPlayer = {
  dgId: number | null;
  pgaTourId: string | null;
  eventParticipantId: string | null;
  participantId: string | null;
  playerName: string;
  displayName: string;
  country: string | null;
  win: number | null;
  top5: number | null;
  top10: number | null;
};

export type EventOdds = {
  source: "live" | "pre-tournament";
  eventName: string;
  updatedAt: string;
  deadHeats: boolean;
  players: EventOddsPlayer[];
};

export type SendResult = {
  ok: true;
  txHash: string;
  to: string;
  amount: string;
};

export type LeagueDetail = {
  league: { id: string; name: string; role: string; memberCount: number };
  members: { id: string; name: string; wallet: string | null }[];
  contests: unknown[];
};

export type LeagueCreated = { id: string; name: string; description: string | null };
export type LeagueInvite = { inviteCode: string; inviteUrl: string };

export const roomAudienceSchema = z.enum(["humans", "bots"]);
export const roomTypeSchema = z.enum(["league", "direct"]);
export const roomRefSchema = z.object({
  type: roomTypeSchema,
  id: z.string().trim().min(1),
});
export const roomAttachmentTypeSchema = z.enum(["image", "video", "audio", "file"]);
const httpsUrlSchema = z.string().trim().regex(/^https:\/\/\S+$/, "Attachment URL must be https");
export const roomAttachmentInputSchema = z.object({
  type: roomAttachmentTypeSchema,
  url: httpsUrlSchema,
  name: z.string().trim().min(1).max(200).optional(),
});
export const messagePostSchema = z.object({
  room: roomRefSchema,
  text: z.string().trim().max(2000, "Message text is too long").optional().default(""),
  audience: roomAudienceSchema.optional(),
  kind: z.string().trim().min(1).max(64).optional(),
  attachments: z.array(roomAttachmentInputSchema).max(10).optional(),
});

export type RoomAudience = z.infer<typeof roomAudienceSchema>;
export type RoomRef = z.infer<typeof roomRefSchema>;
export type RoomAttachmentType = z.infer<typeof roomAttachmentTypeSchema>;
export type RoomAttachmentInput = z.infer<typeof roomAttachmentInputSchema>;
export type RoomAttachment = {
  type: RoomAttachmentType;
  url: string;
  thumbUrl: string | null;
  name: string | null;
};
export type RoomMessage = {
  id: string;
  text: string;
  userId: string;
  audience: RoomAudience;
  kind: string | null;
  createdAt: string;
  attachments: RoomAttachment[];
};

const ticketStakeSchema = z.union([
  z.number().int().nonnegative().refine((value) => Number.isSafeInteger(value), "Stake is too large"),
  z.string().regex(/^(0|[1-9]\d*)$/, "Stake must be a whole number of base units"),
]).transform((value) => (typeof value === "number" ? String(value) : value));

export const ticketFieldsSchema = z
  .object({
    partyA: z.string().trim().min(1).max(200),
    partyB: z.string().max(200),
    proposition: z.string().trim().min(1).max(500),
    partyAPosition: z.string().trim().min(1).max(80),
    partyBPosition: z.string().trim().min(1).max(80),
    partyAStake: ticketStakeSchema,
    partyBStake: ticketStakeSchema,
    total: ticketStakeSchema,
    price: z.string().trim().min(1).max(80),
    terms: z.string().trim().min(1).max(500),
  })
  .refine(
    (fields) => BigInt(fields.partyAStake) + BigInt(fields.partyBStake) === BigInt(fields.total),
    "Total must equal the two stakes",
  );

export const ticketSignSchema = z.object({
  fields: ticketFieldsSchema,
  authorizationSignature: z.string().trim().min(1).optional(),
});

export const ticketVerifySchema = z.object({
  wallet: z.string().trim().min(1),
  fields: ticketFieldsSchema,
  signature: z.string().trim().min(1),
});

export type TicketFields = z.infer<typeof ticketFieldsSchema>;
export type TicketSignature = { wallet: string; hash: string; signature: string };
export type TicketVerification = { valid: boolean };
