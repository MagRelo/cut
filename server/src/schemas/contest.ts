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
  userId: z.string().cuid("Invalid user ID"),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

// Schema for creating a contest
export const createContestSchema = z.object({
  name: z.string().min(1, "Contest name is required"),
  description: z.string().optional(),
  tournamentId: z.string().cuid("Invalid tournament ID"),
  userGroupId: z.string().cuid("Invalid user group ID").optional(),
  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.union([z.string().datetime("Invalid end date"), z.number()]).optional(),
  chainId: z
    .number()
    .int()
    .refine((val) => [8453, 84532].includes(val), {
      message: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    }),
  address: z.string().min(1, "Contract address is required"),
  status: z.enum(["OPEN", "IN_PROGRESS", "SETTLED", "ERROR"]).default("OPEN"),
  settings: z
    .object({
      fee: z.number().optional(),
      contestType: z.string().optional(),
      chainId: z.number().optional(),
      platformTokenAddress: z.string().optional(),
      platformTokenSymbol: z.string().optional(),
      oracleFee: z.number().optional(),
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
  status: z.enum(["OPEN", "IN_PROGRESS", "SETTLED", "ERROR"]).optional(),
  settings: z
    .object({
      fee: z.number().optional(),
      contestType: z.string().optional(),
      chainId: z.number().optional(),
      platformTokenAddress: z.string().optional(),
      platformTokenSymbol: z.string().optional(),
      oracleFee: z.number().optional(),
      maxPlayers: z.number().int().positive().optional(),
      scoringType: z.enum(["STABLEFORD", "STROKE_PLAY"]).optional(),
    })
    .optional(),
});

// Schema for contest ID parameter
export const contestIdSchema = z.object({
  id: z.string().cuid("Invalid contest ID"),
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
    .default(84532), // Default to Base Sepolia
});

// Types derived from schemas
export type CreateUserGroupBody = z.infer<typeof createUserGroupSchema>;
export type UpdateUserGroupBody = z.infer<typeof updateUserGroupSchema>;
export type AddUserGroupMemberBody = z.infer<typeof addUserGroupMemberSchema>;
export type CreateContestBody = z.infer<typeof createContestSchema>;
export type UpdateContestBody = z.infer<typeof updateContestSchema>;
export type ContestIdParam = z.infer<typeof contestIdSchema>;
export type ContestQueryParams = z.infer<typeof contestQuerySchema>;
