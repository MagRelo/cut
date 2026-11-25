import { Prisma } from "@prisma/client";
import type { AgentProfile, AgentProfilePatch, OddsFormat } from "@playthecut/agent/contract";
import { prisma } from "../../lib/prisma.js";
import { ClaimEmailError, issueEmailClaim } from "../auth/claimEmail.js";
import { ReferralProvisionError } from "../../lib/privyUserProvisioning.js";
import { mergeUserSettings } from "../../schemas/user.js";

const ODDS: readonly OddsFormat[] = ["american", "decimal", "english"];

export function profileFromUser(user: {
  name: string | null;
  email: string | null;
  pendingEmail?: string | null;
  settings: unknown;
} | null): AgentProfile {
  if (!user) return { name: "", email: null, emailPending: false, color: null, oddsFormat: null };
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
    emailPending: !user.email && Boolean(user.pendingEmail),
    color,
    oddsFormat,
  };
}

export type ProfileUpdateResult =
  | { ok: true; profile: AgentProfile }
  | { ok: false; status: 400 | 403 | 404 | 503; error: string; code?: string };

export async function updateAgentProfile(input: {
  userId: string;
  address: string;
  chainId: number;
  signer: string | null;
  patch: AgentProfilePatch;
}): Promise<ProfileUpdateResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      name: true,
      email: true,
      pendingEmail: true,
      settings: true,
      privyUserId: true,
      lastLoginAt: true,
    },
  });
  if (!user) return { ok: false, status: 404, error: "User not found" };

  const email = input.patch.email?.trim().toLowerCase();
  let pendingEmail = user.pendingEmail;
  if (input.patch.email !== undefined) {
    const denied = await emailDenied(input, user);
    if (denied) return denied;
    if (!email) return { ok: false, status: 400, error: "A valid email is required" };
    try {
      await issueEmailClaim(user.id, email);
    } catch (error) {
      if (error instanceof ReferralProvisionError) {
        return { ok: false, status: 400, error: error.message, code: error.code };
      }
      if (error instanceof ClaimEmailError) {
        return { ok: false, status: error.status, error: error.message };
      }
      const message = error instanceof Error ? error.message : "Could not send the login code";
      return { ok: false, status: 400, error: message };
    }
    pendingEmail = email;
  }

  const settings =
    input.patch.color !== undefined || input.patch.oddsFormat !== undefined
      ? mergeUserSettings(user.settings, {
          ...(input.patch.color !== undefined ? { color: input.patch.color } : {}),
          ...(input.patch.oddsFormat !== undefined ? { oddsFormat: input.patch.oddsFormat } : {}),
        })
      : undefined;

  if (input.patch.name === undefined && settings === undefined) {
    return {
      ok: true,
      profile: profileFromUser({ ...user, pendingEmail }),
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
      ...(settings !== undefined ? { settings: settings as Prisma.InputJsonValue } : {}),
    },
    select: { name: true, email: true, pendingEmail: true, settings: true },
  });
  return {
    ok: true,
    profile: profileFromUser({
      ...updated,
      email: user.email,
      pendingEmail: updated.pendingEmail ?? pendingEmail,
    }),
  };
}

async function emailDenied(
  input: { userId: string; signer: string | null },
  user: { email: string | null; lastLoginAt: Date | null },
): Promise<ProfileUpdateResult | null> {
  if (!input.signer) {
    return { ok: false, status: 403, error: "Sign in is required to change this email" };
  }
  const delegate = await prisma.botDelegate.findFirst({
    where: { userId: input.userId, delegateAddress: input.signer, status: "active" },
    select: { id: true },
  });
  if (!delegate) {
    return { ok: false, status: 403, error: "Sign in is required to change this email" };
  }
  if (user.email || user.lastLoginAt) {
    return { ok: false, status: 403, error: "This account already has a login" };
  }
  return null;
}
