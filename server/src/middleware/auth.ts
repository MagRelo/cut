import { Context, Next } from "hono";
import { getPrivyClient } from "../lib/privyClient.js";
import {
  AuthNeedsProvisioningError,
  type CutAuthUser,
  PrivyWalletIdentityConflictError,
  ReferralProvisionError,
  resolveChainId,
  resolveSessionUser,
  WalletConflictError,
  WalletNotProvisionedError,
} from "../lib/privyUserProvisioning.js";
import { resolveSignedAccount } from "../services/bot/resolveSignedAccount.js";
import { verifyBotRequest } from "../services/bot/verifyBotRequest.js";

export class RequestCredentialError extends Error {
  readonly status: 400 | 401 | 403 | 503;
  constructor(status: 400 | 401 | 403 | 503, message: string) {
    super(message);
    this.name = "RequestCredentialError";
    this.status = status;
  }
}

declare module "hono" {
  interface ContextVariableMap {
    user: {
      userId: string;
      address: string;
      chainId: number;
      userType: string;
    };
    privyUserId?: string;
    signer?: string;
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
  if (error instanceof RequestCredentialError) {
    return c.json({ error: error.message }, error.status);
  }
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

function hasRequestSignature(c: Context): boolean {
  return Boolean(
    c.req.header("signature") || c.req.header("signature-input") || c.req.header("x-cut-signature"),
  );
}

function rejectMixedCredentials(c: Context): void {
  if (parseBearerToken(c) && hasRequestSignature(c)) {
    throw new RequestCredentialError(
      400,
      "Request uses both a bearer token and a signature",
    );
  }
}

async function authenticateSignedRequest(c: Context): Promise<void> {
  const verified = await verifyBotRequest(c.req.raw.clone());
  if (!verified.ok) {
    throw new RequestCredentialError(verified.status, verified.error);
  }
  const headerChain = parsePreferredChainId(c);
  if (headerChain !== undefined && headerChain !== verified.chainId) {
    throw new RequestCredentialError(400, "Signature chain does not match the request");
  }
  const resolved = await resolveSignedAccount({
    signer: verified.signer,
    chainId: verified.chainId,
    smartWallet: c.req.query("smartWallet"),
  });
  if (!resolved.ok) {
    throw new RequestCredentialError(resolved.status, resolved.error);
  }
  c.set("user", resolved.user);
  c.set("signer", verified.signer);
}

function sessionUser(c: Context): CutAuthUser | undefined {
  try {
    return c.get("user");
  } catch {
    return undefined;
  }
}

type AuthResult = "ok" | "missing" | "unprovisioned";

async function authenticateRequest(
  c: Context,
  options?: { requireUser?: boolean },
): Promise<AuthResult> {
  rejectMixedCredentials(c);
  const token = parseBearerToken(c);
  if (!token) {
    if (!hasRequestSignature(c)) return "missing";
    await authenticateSignedRequest(c);
    return "ok";
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

/** After `requireAuth`. Session, wallet sync, and delegate install stay on the Privy bearer. */
export const requirePrivySession = async (c: Context, next: Next): Promise<Response | void> => {
  if (!c.get("privyUserId")) {
    return c.json({ error: "No token provided" }, 401);
  }
  await next();
};

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

/** Sets `user` when a Bearer token or a P-256 `x-cut-*` signature is present; continues without a user otherwise. */
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
    rejectMixedCredentials(c);
    const token = parseBearerToken(c);
    if (!token) {
      if (hasRequestSignature(c)) {
        await authenticateSignedRequest(c);
      }
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

    const signedIn = sessionUser(c);
    let privyUserId: string | undefined;
    try {
      privyUserId = c.get("privyUserId");
    } catch {
      privyUserId = undefined;
    }
    if (!privyUserId && signedIn?.address) {
      if (signedIn.chainId !== parsed) {
        return c.json({ error: "Signature chain does not match the request" }, 400);
      }
      await next();
      return;
    }

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
