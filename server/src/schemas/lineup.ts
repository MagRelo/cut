import { z } from "zod";
import { LINEUP_PREDICTION_TYPE } from "@cut/sport-sdk";
import { LINEUP_PICKS_MAX, NAME_MAX_LENGTH } from "./limits.js";

export const lineupPredictionSchema = z
  .object({
    type: z.literal(LINEUP_PREDICTION_TYPE),
    value: z.number().int(),
  })
  .strict();

export const lineupWriteBodySchema = z.object({
  picks: z
    .array(z.string().min(1), {
      invalid_type_error: "picks must be an array of eventParticipant IDs",
    })
    .max(LINEUP_PICKS_MAX),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  contestId: z.string().min(1).optional(),
  prediction: lineupPredictionSchema.nullish(),
});

export const cloneLineupBodySchema = z.object({
  contestId: z.string().min(1, "contestId is required"),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
});

export type LineupWriteBody = z.infer<typeof lineupWriteBodySchema>;
export type CloneLineupBody = z.infer<typeof cloneLineupBodySchema>;
