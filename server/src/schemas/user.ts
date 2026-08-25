import { z } from "zod";
import { HEX_COLOR_REGEX, NAME_MAX_LENGTH } from "./limits.js";

export const updateUserNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`),
});

export const updateUserSettingsSchema = z
  .object({
    color: z.string().regex(HEX_COLOR_REGEX, "Invalid color").optional(),
    oddsFormat: z.enum(["american", "decimal", "english"]).optional(),
    onboardingDismissed: z.boolean().optional(),
  })
  .strict();

export type UpdateUserNameBody = z.infer<typeof updateUserNameSchema>;
export type UpdateUserSettingsBody = z.infer<typeof updateUserSettingsSchema>;

export function mergeUserSettings(
  existing: unknown,
  patch: UpdateUserSettingsBody,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (patch.color !== undefined) {
    base.color = patch.color;
  }
  if (patch.oddsFormat !== undefined) {
    base.oddsFormat = patch.oddsFormat;
  }
  if (patch.onboardingDismissed !== undefined) {
    base.onboardingDismissed = patch.onboardingDismissed;
  }
  return base;
}
