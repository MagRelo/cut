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

export const agentPreferencesSchema = z
  .object({
    sports: z.array(z.string().trim().min(1)).max(8).optional(),
    maxEntryFee: z.number().int().min(0).nullable().optional(),
  })
  .refine((value) => value.sports !== undefined || value.maxEntryFee !== undefined, {
    message: "No preferences to update",
  });

export type AgentPreferencesPatch = z.infer<typeof agentPreferencesSchema>;

export type AgentPreferences = {
  sports: string[];
  maxEntryFee: number | null;
};

export function readAgentPreferences(settings: unknown): AgentPreferences {
  const agent = agentRecord(settings);
  const sports = Array.isArray(agent.sports)
    ? agent.sports.filter((sport): sport is string => typeof sport === "string" && sport.length > 0)
    : [];
  const maxEntryFee =
    typeof agent.maxEntryFee === "number" &&
    Number.isInteger(agent.maxEntryFee) &&
    agent.maxEntryFee >= 0
      ? agent.maxEntryFee
      : null;
  return { sports, maxEntryFee };
}

export function mergeAgentPreferences(
  existing: unknown,
  patch: { sports?: string[] | undefined; maxEntryFee?: number | null | undefined },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const agent = { ...agentRecord(existing) };
  if (patch.sports !== undefined) {
    agent.sports = [...new Set(patch.sports)];
  }
  if (patch.maxEntryFee !== undefined) {
    if (patch.maxEntryFee === null) delete agent.maxEntryFee;
    else agent.maxEntryFee = patch.maxEntryFee;
  }
  base.agent = agent;
  return base;
}

function agentRecord(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const agent = (settings as { agent?: unknown }).agent;
  if (!agent || typeof agent !== "object" || Array.isArray(agent)) return {};
  return { ...(agent as Record<string, unknown>) };
}

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
