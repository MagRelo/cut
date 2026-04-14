import { z } from "zod";

// Schema for creating a user group
export const createUserGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

// Schema for updating a user group
export const updateUserGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").optional(),
  description: z.string().optional(),
});

// Schema for user group member operations
export const addUserGroupMemberSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

// Schema for creating a contest
export const createContestSchema = z.object({
  name: z.string().min(1, "Contest name is required"),
  description: z.string().optional(),
  tournamentId: z.string().cuid("Invalid tournament ID"),
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
  address: z.string().min(1, "Contract address is required"),
  status: z.enum(["OPEN", "ACTIVE", "LOCKED", "SETTLED", "CANCELLED", "CLOSED"]).default("OPEN"),
  settings: z
    .object({
      contestType: z.string().optional(),
      chainId: z.number().optional(),
      paymentTokenAddress: z.string().optional(),
      paymentTokenSymbol: z.string().optional(),
      oracle: z.string().optional(),
      expiryTimestamp: z.number().optional(),
      primaryDeposit: z.number().min(0).optional(),
      oracleFeeBps: z.number().optional(),
      primaryEntryInvestmentShareBps: z.number().optional(),
      positionBonusShareBps: z.number().optional(),
      targetPrimaryShareBps: z.number().optional(),
      maxCrossSubsidyBps: z.number().optional(),
      maxPlayers: z.number().int().positive().optional(),
      scoringType: z.enum(["STABLEFORD", "STROKE_PLAY"]).optional(),
    })
    .optional(),
});

// Schema for updating a contest
export const updateContestSchema = z.object({
  name: z.string().min(1, "Contest name is required").optional(),
  description: z.string().optional(),
  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    })
    .optional(),
  address: z.string().min(1, "Contract address is required").optional(),
  status: z.enum(["OPEN", "ACTIVE", "LOCKED", "SETTLED", "CANCELLED", "CLOSED"]).optional(),
  settings: z
    .object({
      contestType: z.string().optional(),
      chainId: z.number().optional(),
      paymentTokenAddress: z.string().optional(),
      paymentTokenSymbol: z.string().optional(),
      oracle: z.string().optional(),
      expiryTimestamp: z.number().optional(),
      primaryDeposit: z.number().min(0).optional(),
      oracleFeeBps: z.number().optional(),
      primaryEntryInvestmentShareBps: z.number().optional(),
      positionBonusShareBps: z.number().optional(),
      targetPrimaryShareBps: z.number().optional(),
      maxCrossSubsidyBps: z.number().optional(),
      maxPlayers: z.number().int().positive().optional(),
      scoringType: z.enum(["STABLEFORD", "STROKE_PLAY"]).optional(),
    })
    .optional(),
});

// Schema for contest ID parameter
export const contestIdSchema = z.object({
  id: z.string().cuid("Invalid contest ID"),
});

/** Record a wallet that added secondary (prediction) liquidity on an entry (for push payouts). */
export const recordContestSecondaryParticipantSchema = z.object({
  entryId: z.string().regex(/^\d+$/, "entryId must be a decimal string"),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    }),
});

// Schema for contest query parameters
export const contestQuerySchema = z.object({
  tournamentId: z.string().cuid("Invalid tournament ID"),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    })
    .optional(), // Optional - if not provided, return contests from all chains
  userGroupId: z.string().cuid("Invalid user group ID").optional(),
});

// Types derived from schemas
export type CreateUserGroupBody = z.infer<typeof createUserGroupSchema>;
export type UpdateUserGroupBody = z.infer<typeof updateUserGroupSchema>;
export type AddUserGroupMemberBody = z.infer<typeof addUserGroupMemberSchema>;
export type CreateContestBody = z.infer<typeof createContestSchema>;
export type UpdateContestBody = z.infer<typeof updateContestSchema>;
export type ContestIdParam = z.infer<typeof contestIdSchema>;
export type ContestQueryParams = z.infer<typeof contestQuerySchema>;
export type RecordContestSecondaryParticipantBody = z.infer<
  typeof recordContestSecondaryParticipantSchema
>;
