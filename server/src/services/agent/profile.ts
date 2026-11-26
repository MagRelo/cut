import { Prisma } from "@prisma/client";
import type { AgentProfile, AgentProfilePatch, OddsFormat } from "@playthecut/agent/contract";
import { prisma } from "../../lib/prisma.js";
import { mergeUserSettings } from "../../schemas/user.js";

const ODDS: readonly OddsFormat[] = ["american", "decimal", "english"];

export function profileFromUser(user: {
  name: string | null;
  email: string | null;
  settings: unknown;
} | null): AgentProfile {
  if (!user) return { name: "", email: null, color: null, oddsFormat: null };
  const settings =
    user.settings && typeof user.settings === "object" && !Array.isArray(user.settings)
      ? (user.settings as Record<string, unknown>)
      : {};
  const color = typeof settings.color === "string" ? settings.color : null;
  const odds = settings.oddsFormat;
  const oddsFormat = ODDS.find((format) => format === odds) ?? null;
  return {
    name: user.name ?? "",
    email: user.email,
    color,
    oddsFormat,
  };
}

export type ProfileUpdateResult =
  | { ok: true; profile: AgentProfile }
  | { ok: false; status: 400 | 404; error: string };

export async function updateAgentProfile(input: {
  userId: string;
  address: string;
  chainId: number;
  signer: string | null;
  patch: AgentProfilePatch;
}): Promise<ProfileUpdateResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, settings: true },
  });
  if (!user) return { ok: false, status: 404, error: "User not found" };

  const settings =
    input.patch.color !== undefined || input.patch.oddsFormat !== undefined
      ? mergeUserSettings(user.settings, {
          ...(input.patch.color !== undefined ? { color: input.patch.color } : {}),
          ...(input.patch.oddsFormat !== undefined ? { oddsFormat: input.patch.oddsFormat } : {}),
        })
      : undefined;

  if (input.patch.name === undefined && settings === undefined) {
    return { ok: true, profile: profileFromUser(user) };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
      ...(settings !== undefined ? { settings: settings as Prisma.InputJsonValue } : {}),
    },
    select: { name: true, email: true, settings: true },
  });
  return { ok: true, profile: profileFromUser(updated) };
}
