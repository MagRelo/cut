import { Prisma } from "@prisma/client";
import { getAddress, type Address } from "viem";
import type { AgentProfile, AgentProfilePatch, OddsFormat } from "@playthecut/agent/contract";
import { prisma } from "../../lib/prisma.js";
import { mergeUserSettings } from "../../schemas/user.js";
import { classifySigner } from "../bot/accountKey.js";

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
  | { ok: false; status: 400 | 403 | 404; error: string; code?: string };

export async function updateAgentProfile(input: {
  userId: string;
  address: string;
  chainId: number;
  signer: Address | null;
  patch: AgentProfilePatch;
}): Promise<ProfileUpdateResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, settings: true, privyUserId: true },
  });
  if (!user) return { ok: false, status: 404, error: "User not found" };

  if (input.patch.email !== undefined) {
    const denied = await emailDenied(input, user.privyUserId);
    if (denied) return denied;
  }

  const email = input.patch.email?.trim().toLowerCase();
  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      return {
        ok: false,
        status: 400,
        error: "This email is already linked to another account",
        code: "EMAIL_ALREADY_BOUND",
      };
    }
  }

  const settings =
    input.patch.color !== undefined || input.patch.oddsFormat !== undefined
      ? mergeUserSettings(user.settings, {
          ...(input.patch.color !== undefined ? { color: input.patch.color } : {}),
          ...(input.patch.oddsFormat !== undefined ? { oddsFormat: input.patch.oddsFormat } : {}),
        })
      : undefined;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
      ...(email ? { email } : {}),
      ...(settings !== undefined ? { settings: settings as Prisma.InputJsonValue } : {}),
    },
    select: { name: true, email: true, settings: true },
  });
  return { ok: true, profile: profileFromUser(updated) };
}

async function emailDenied(
  input: { userId: string; address: string; chainId: number; signer: Address | null },
  privyUserId: string | null,
): Promise<ProfileUpdateResult | null> {
  if (!input.signer) {
    return { ok: false, status: 403, error: "A delegate cannot set the login email" };
  }
  const wallet = await prisma.userWallet.findFirst({
    where: {
      userId: input.userId,
      chainId: input.chainId,
      publicKey: input.address.toLowerCase(),
    },
    select: { publicKey: true, ownerAddress: true },
  });
  const account = wallet ? getAddress(wallet.publicKey) : getAddress(input.address);
  const role = classifySigner(input.signer, account, input.chainId, wallet?.ownerAddress);
  if (role !== "owner") {
    return { ok: false, status: 403, error: "A delegate cannot set the login email" };
  }
  if (privyUserId) {
    return { ok: false, status: 403, error: "This account already has a login" };
  }
  return null;
}
