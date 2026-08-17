import { z } from "zod";
import {
  BPS_MAX,
  BPS_MIN,
  CONTEST_TYPE_MAX_LENGTH,
  DECIMAL_ID_REGEX,
  DESCRIPTION_MAX_LENGTH,
  ETH_ADDRESS_REGEX,
  NAME_MAX_LENGTH,
  PAYMENT_TOKEN_SYMBOL_MAX_LENGTH,
  TX_HASH_REGEX,
} from "./limits.js";

const ethAddress = z.string().regex(ETH_ADDRESS_REGEX, "Invalid address");
const bps = z.number().int().min(BPS_MIN).max(BPS_MAX);

const contestSettingsSchema = z
  .object({
    contestType: z.string().max(CONTEST_TYPE_MAX_LENGTH).optional(),
    chainId: z.number().optional(),
    paymentTokenAddress: ethAddress.optional(),
    paymentTokenSymbol: z.string().max(PAYMENT_TOKEN_SYMBOL_MAX_LENGTH).optional(),
    oracle: ethAddress.optional(),
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

// Schema for creating a user group
export const createUserGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(NAME_MAX_LENGTH),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
});

// Schema for updating a user group
export const updateUserGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(NAME_MAX_LENGTH).optional(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
});

// Schema for user group member operations
export const addUserGroupMemberSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export const joinUserGroupSchema = z.object({
  inviteCode: z
    .string()
    .min(1, "Invite code is required")
    .max(32, "Invalid invite code"),
});

// Schema for creating a contest
export const createContestSchema = z.object({
  name: z.string().trim().min(1, "Contest name is required").max(NAME_MAX_LENGTH),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  eventId: z.string().cuid("Invalid event ID"),
  userGroupId: z.string().cuid("Invalid user group ID").optional(),
  startDate: z.string().datetime("Invalid start date").optional(),
  /** Contest end: ISO datetime string or Unix ms (client sends `expiryTimestamp * 1000`). */
  endDate: z.union([z.string().datetime("Invalid end date"), z.number()]),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    }),
  address: ethAddress,
  /** Factory `createContest` tx. Client may send this as `transactionId`. */
  transactionHash: z.string().regex(TX_HASH_REGEX, "Invalid transaction hash").optional(),
  transactionId: z.string().regex(TX_HASH_REGEX, "Invalid transaction hash").optional(),
  status: z.enum(["OPEN", "ACTIVE", "LOCKED", "SETTLED", "CANCELLED", "CLOSED"]).default("OPEN"),
  settings: contestSettingsSchema,
})
  .superRefine((data, ctx) => {
    if (!data.transactionHash && !data.transactionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "transactionHash is required",
        path: ["transactionHash"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    transactionHash: (data.transactionHash ?? data.transactionId) as string,
  }));

// Schema for updating a contest
export const updateContestSchema = z.object({
  name: z.string().trim().min(1, "Contest name is required").max(NAME_MAX_LENGTH).optional(),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    })
    .optional(),
  address: ethAddress.optional(),
  status: z.enum(["OPEN", "ACTIVE", "LOCKED", "SETTLED", "CANCELLED", "CLOSED"]).optional(),
  settings: contestSettingsSchema,
});

// Schema for contest ID parameter
export const contestIdSchema = z.object({
  id: z.string().cuid("Invalid contest ID"),
});

export const joinContestSchema = z.object({
  lineupId: z.string().min(1, "Lineup ID is required"),
  /** Ignored if sent; the server hashes contest address + lineupId. */
  entryId: z.string().regex(DECIMAL_ID_REGEX, "entryId must be a decimal string").optional(),
});

/** Record a wallet that added secondary (prediction) liquidity on an entry (for push payouts). */
export const recordContestSecondaryParticipantSchema = z.object({
  entryId: z.string().regex(DECIMAL_ID_REGEX, "entryId must be a decimal string"),
  transactionHash: z.string().regex(TX_HASH_REGEX, "Invalid transaction hash"),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    }),
  /** Payment-token wei for this buy (decimal string). Must match the on-chain receipt. */
  amountWei: z
    .string()
    .regex(DECIMAL_ID_REGEX, "amountWei must be a non-negative decimal integer string")
    .optional(),
});

// Schema for contest query parameters
export const contestQuerySchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    })
    .optional(), // Optional - if not provided, return contests from all chains
  userGroupId: z.string().cuid("Invalid user group ID").optional(),
});

export const contestDirectoryQuerySchema = z.object({
  scope: z.enum(["live", "past", "all"]).default("all"),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    })
    .optional(),
});

// Types derived from schemas
export type CreateUserGroupBody = z.infer<typeof createUserGroupSchema>;
export type UpdateUserGroupBody = z.infer<typeof updateUserGroupSchema>;
export type AddUserGroupMemberBody = z.infer<typeof addUserGroupMemberSchema>;
export type JoinUserGroupBody = z.infer<typeof joinUserGroupSchema>;
export type CreateContestBody = z.infer<typeof createContestSchema>;
export type UpdateContestBody = z.infer<typeof updateContestSchema>;
export type ContestIdParam = z.infer<typeof contestIdSchema>;
export type ContestQueryParams = z.infer<typeof contestQuerySchema>;
export type ContestDirectoryQueryParams = z.infer<typeof contestDirectoryQuerySchema>;
export type JoinContestBody = z.infer<typeof joinContestSchema>;
export type RecordContestSecondaryParticipantBody = z.infer<
  typeof recordContestSecondaryParticipantSchema
>;
