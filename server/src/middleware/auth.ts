import { Context, Next } from "hono";
import { getPrivyClient } from "../lib/privyClient.js";
import {
  AuthNeedsProvisioningError,
  PrivyWalletIdentityConflictError,
  ReferralProvisionError,
  resolveChainId,
  resolveSessionUser,
  WalletConflictError,
  WalletNotProvisionedError,
} from "../lib/privyUserProvisioning.js";

declare module "hono" {
  interface ContextVariableMap {
    user: {
      userId: string;
      address: string;
      chainId: number;
      userType: string;
    };
    privyUserId?: string;
  }
}

export function parsePreferredChainId(c: Context): number | undefined {
  const raw = c.req.header("x-cut-chain-id");
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseBearerToken(c: Context): string | null {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1] || null;
}

export function authErrorResponse(c: Context, error: unknown): Response {
  if (error instanceof AuthNeedsProvisioningError) {
    return c.json({ error: error.message, code: error.code }, 401);
  }
  if (error instanceof WalletNotProvisionedError) {
    return c.json({ error: error.message, code: error.code }, 409);
  }
  if (error instanceof WalletConflictError) {
    return c.json({ error: error.message, code: error.code }, 409);
  }
  if (error instanceof PrivyWalletIdentityConflictError) {
    return c.json({ error: error.message, code: "WALLET_OWNED_BY_OTHER_ACCOUNT" }, 403);
  }
  if (error instanceof ReferralProvisionError) {
    return c.json({ error: error.message, code: error.code }, 400);
  }
  console.error("Auth middleware error:", error);
  return c.json({ error: "Invalid or expired token" }, 401);
}

/** Verify Privy JWT and set `privyUserId` — does not require a Cut user row. */
export async function verifyPrivyJwt(c: Context, next: Next): Promise<Response | void> {
  try {
    const token = parseBearerToken(c);
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }
    const privy = getPrivyClient();
    const access = await privy.utils().auth().verifyAccessToken(token);
    c.set("privyUserId", access.user_id);
    await next();
  } catch (error) {
    return authErrorResponse(c, error);
  }
}

type AuthResult = "ok" | "missing" | "unprovisioned";

async function authenticateRequest(
  c: Context,
  options?: { requireUser?: boolean },
): Promise<AuthResult> {
  const token = parseBearerToken(c);
  if (!token) {
    return "missing";
  }

  const chainId = resolveChainId(parsePreferredChainId(c));

  const privy = getPrivyClient();
  const access = await privy.utils().auth().verifyAccessToken(token);
  c.set("privyUserId", access.user_id);

  const resolved = await resolveSessionUser(access.user_id, chainId);
  if (!resolved) {
    if (options?.requireUser !== false) {
      throw new AuthNeedsProvisioningError();
    }
    return "unprovisioned";
  }

  c.set("user", resolved);
  return "ok";
}

/** Returns the authenticated user id when `optionalAuth` or `requireAuth` ran successfully. */
export function getOptionalUserId(c: Context): string | null {
  try {
    return c.get("user").userId;
  } catch {
    return null;
  }
}

/** Privy user id when `optionalPrivyJwt` verified a Bearer token. */
export function getOptionalPrivyUserId(c: Context): string | null {
  try {
    return c.get("privyUserId") ?? null;
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
    const result = await authenticateRequest(c, { requireUser: false });
    if (result === "missing" || result === "unprovisioned") {
      await next();
      return;
    }
    await next();
  } catch (error) {
    return authErrorResponse(c, error);
  }
};

/** Verify Privy JWT when present; no Cut user or wallet lookup. Invalid tokens 401. */
export const optionalPrivyJwt = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const token = parseBearerToken(c);
    if (!token) {
      await next();
      return;
    }
    const privy = getPrivyClient();
    const access = await privy.utils().auth().verifyAccessToken(token);
    c.set("privyUserId", access.user_id);
    await next();
  } catch (error) {
    return authErrorResponse(c, error);
  }
};

/** Require X-Cut-Chain-Id and a primary wallet for on-chain routes. Run after requireAuth. */
export const requireWalletChain = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const raw = c.req.header("x-cut-chain-id");
    if (!raw) {
      return c.json({ error: "X-Cut-Chain-Id header is required" }, 400);
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || ![8453, 84532].includes(parsed)) {
      return c.json({ error: "X-Cut-Chain-Id must be 8453 or 84532" }, 400);
    }

    const privyUserId = c.get("privyUserId");
    if (!privyUserId) {
      const token = parseBearerToken(c);
      if (!token) {
        return c.json({ error: "No token provided" }, 401);
      }
      const privy = getPrivyClient();
      const access = await privy.utils().auth().verifyAccessToken(token);
      c.set("privyUserId", access.user_id);
    }

    const resolved = await resolveSessionUser(c.get("privyUserId")!, parsed, {
      requireWallet: true,
    });
    if (!resolved) {
      throw new AuthNeedsProvisioningError();
    }

    c.set("user", resolved);
    await next();
  } catch (error) {
    return authErrorResponse(c, error);
  }
};
