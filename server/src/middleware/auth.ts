import { Context, Next } from "hono";
import { getPrivyClient } from "../lib/privyClient.js";
import {
  ensureCutUserFromPrivy,
  PrivyWalletIdentityConflictError,
  ReferralProvisionError,
} from "../lib/privyUserProvisioning.js";

declare module "hono" {
  interface ContextVariableMap {
    user: {
      userId: string;
      address: string;
      chainId: number;
      userType: string;
    };
  }
}

function parsePreferredChainId(c: Context): number | undefined {
  const raw = c.req.header("x-cut-chain-id");
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseReferrerAddressHeader(c: Context): string | undefined {
  const raw = c.req.header("x-cut-referrer-address");
  const t = raw?.trim();
  return t || undefined;
}

type AuthResult = "ok" | "missing" | "invalid";

async function authenticateRequest(c: Context): Promise<AuthResult> {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return "missing";
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return "missing";
  }

  const preferredChainId = parsePreferredChainId(c);
  const referrerAddress = parseReferrerAddressHeader(c);

  const privy = getPrivyClient();
  const access = await privy.utils().auth().verifyAccessToken(token);
  const privyUser = await privy.users()._get(access.user_id);
  const resolved = await ensureCutUserFromPrivy(
    privyUser,
    preferredChainId,
    referrerAddress ? { referrerAddress } : {},
  );

  c.set("user", {
    userId: resolved.userId,
    address: resolved.address,
    chainId: resolved.chainId,
    userType: resolved.userType,
  });

  return "ok";
}

function authErrorResponse(c: Context, error: unknown): Response {
  console.error("Auth middleware error:", error);
  if (error instanceof PrivyWalletIdentityConflictError) {
    return c.json({ error: error.message }, 403);
  }
  if (error instanceof ReferralProvisionError) {
    return c.json({ error: error.message, code: error.code }, 400);
  }
  return c.json({ error: "Invalid or expired token" }, 401);
}

/** Returns the authenticated user id when `optionalAuth` or `requireAuth` ran successfully. */
export function getOptionalUserId(c: Context): string | null {
  try {
    return c.get("user").userId;
  } catch {
    return null;
  }
}

export const requireAuth = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const result = await authenticateRequest(c);
    if (result === "missing") {
      return c.json({ error: "No token provided" }, 401);
    }
    await next();
  } catch (error) {
    return authErrorResponse(c, error);
  }
};

/** Sets `user` on the context when a valid Bearer token is present; continues without user otherwise. */
export const optionalAuth = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const result = await authenticateRequest(c);
    if (result === "missing") {
      await next();
      return;
    }
    await next();
  } catch (error) {
    return authErrorResponse(c, error);
  }
};
