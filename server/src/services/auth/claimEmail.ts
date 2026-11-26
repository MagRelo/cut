import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { ReferralProvisionError } from "../../lib/privyUserProvisioning.js";
import { sendEmail } from "../../lib/email/transport.js";

const CLAIM_TTL_MS = 15 * 60 * 1000;

export class ClaimEmailError extends Error {
  readonly status: 400 | 503;
  readonly code?: string;

  constructor(status: 400 | 503, message: string, code?: string) {
    super(message);
    this.name = "ClaimEmailError";
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

function hashesEqual(stored: string, next: string): boolean {
  const left = Buffer.from(stored);
  const right = Buffer.from(next);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function emailTaken(email: string, userId: string): Promise<boolean> {
  const taken = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, NOT: { id: userId } },
    select: { id: true },
  });
  return taken != null;
}

export async function linkPrivyEmail(privyUserId: string, email: string): Promise<void> {
  const appId = process.env.PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) throw new ClaimEmailError(503, "Privy is not configured");
  const response = await fetch(
    `https://api.privy.io/v1/users/${encodeURIComponent(privyUserId)}/accounts`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "privy-app-id": appId,
        authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString("base64")}`,
      },
      body: JSON.stringify({ type: "email", address: email }),
    },
  );
  if (response.ok) return;
  const text = await response.text();
  if (response.status === 409 || /already/i.test(text)) {
    throw new ReferralProvisionError(
      "EMAIL_ALREADY_BOUND",
      "This email is already linked to another account",
    );
  }
  throw new ClaimEmailError(400, "Could not link the login email");
}

/** Store a pending email and mail a 6-digit code for the agent to claim. Does not link Privy. */
export async function issueEmailClaim(userId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (await emailTaken(normalized, userId)) {
    throw new ReferralProvisionError(
      "EMAIL_ALREADY_BOUND",
      "This email is already linked to another account",
    );
  }
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: normalized,
      verificationCode: hashCode(userId, code),
      verificationCodeExpiresAt: new Date(Date.now() + CLAIM_TTL_MS),
    },
  });
  try {
    await sendEmail({
      to: normalized,
      subject: "Give this code to your Play The Cut agent",
      html: `<p>Your agent asked to link this email to a Play The Cut account.</p><p>Give your agent this code: <strong>${code}</strong>.</p><p>It expires in 15 minutes. Your agent sends the code to Play The Cut to finish linking the email.</p>`,
      skipUnsubscribe: true,
    });
  } catch (error) {
    console.error("claim email send failed:", error);
    throw new ClaimEmailError(503, "Could not send the login code");
  }
}

export async function claimLoginEmail(email: string, code: string): Promise<{ email: string }> {
  const normalized = email.trim().toLowerCase();
  if (!/^\d{6}$/.test(code)) {
    throw new ClaimEmailError(400, "Invalid or expired code");
  }
  const rows = await prisma.user.findMany({
    where: { pendingEmail: { equals: normalized, mode: "insensitive" } },
    select: {
      id: true,
      privyUserId: true,
      email: true,
      verificationCode: true,
      verificationCodeExpiresAt: true,
    },
  });
  const now = new Date();
  const match = rows.find(
    (row) =>
      !row.email &&
      row.privyUserId &&
      row.verificationCode &&
      row.verificationCodeExpiresAt &&
      row.verificationCodeExpiresAt > now &&
      hashesEqual(row.verificationCode, hashCode(row.id, code)),
  );
  if (!match?.privyUserId) {
    throw new ClaimEmailError(400, "Invalid or expired code");
  }
  if (await emailTaken(normalized, match.id)) {
    throw new ReferralProvisionError(
      "EMAIL_ALREADY_BOUND",
      "This email is already linked to another account",
    );
  }
  await linkPrivyEmail(match.privyUserId, normalized);
  await prisma.user.update({
    where: { id: match.id },
    data: {
      email: normalized,
      pendingEmail: null,
      verificationCode: null,
      verificationCodeExpiresAt: null,
    },
  });
  return { email: normalized };
}
