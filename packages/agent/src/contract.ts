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

export const playActionSchema = z.object({
  chainId: z.number().int(),
  action: z.enum(["lineupUpsert", "join", "leave"]),
  smartWallet: z.string(),
  contestId: z.string().min(1),
  lineupId: z.string().default(""),
  candidates: z.array(z.string().min(1)).optional(),
  prediction: z.unknown().optional(),
  userOpSignature: hexSchema.optional(),
  userOp: userOpSchema.optional(),
});

export const createContestActionSchema = z.object({
  chainId: z.number().int(),
  action: z.literal("createContest"),
  smartWallet: z.string(),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  eventId: z.string().cuid(),
  userGroupId: z.string().cuid().optional(),
  endDate: z.union([z.string().datetime(), z.number()]),
  settings: contestSettingsSchema,
  notifyLeagueMembers: z.boolean().optional(),
  userOpSignature: hexSchema.optional(),
  userOp: userOpSchema.optional(),
});

export const actionSchema = z.discriminatedUnion("action", [
  playActionSchema,
  createContestActionSchema,
]);

export const registerSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  referralCode: z.string().trim().min(1).max(32).optional(),
});

export type UserOpBody = z.infer<typeof userOpSchema>;
export type PlayActionBody = z.infer<typeof playActionSchema>;
export type CreateContestActionBody = z.infer<typeof createContestActionSchema>;
export type ActionBody = z.infer<typeof actionSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;

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
  email: string;
  userType: string;
  name: string;
  referralCode: string;
  smartWallet: string;
  created: boolean;
};

export type LineupResult = { ok: true; lineupId: string };
export type ContestCreated = { ok: true; contestId: string; address: string };
export type ContestList = { contests: BotContest[] };
