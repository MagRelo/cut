import { z } from "zod";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");
const hash = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash");

export const recordOnchainPaymentSchema = z
  .object({
    kind: z.enum(["ENTRY", "WAGER", "WITHDRAW", "REFUND", "SEND", "PRIMARY", "SECONDARY"]),
    tokenAddress: address,
    amountWei: z.string().regex(/^[0-9]+$/, "Invalid amount"),
    from: address,
    to: address,
    contestId: z.string().min(1).optional(),
    entryId: z.string().min(1).optional(),
    lineupId: z.string().min(1).optional(),
    transactionHash: hash,
    logIndex: z.number().int().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== "SEND" && !value.contestId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contestId is required",
        path: ["contestId"],
      });
    }
  });

export type RecordOnchainPaymentBody = z.infer<typeof recordOnchainPaymentSchema>;
